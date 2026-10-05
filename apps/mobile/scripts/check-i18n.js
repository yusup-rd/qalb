const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const LOCALES_DIR = path.join(SRC_DIR, "i18n", "locales");
const EN_FILE = path.join(LOCALES_DIR, "en.json");
const RU_FILE = path.join(LOCALES_DIR, "ru.json");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function flattenObject(value, prefix = "") {
  const result = new Set();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) result.add(prefix);
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (child && typeof child === "object" && !Array.isArray(child)) {
      for (const nestedKey of flattenObject(child, fullKey)) {
        result.add(nestedKey);
      }
    } else {
      result.add(fullKey);
    }
  }

  return result;
}

function getAllSourceFiles(directory) {
  const files = [];

  function walk(currentDirectory) {
    for (const entry of fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    })) {
      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  walk(directory);

  return files;
}

function isStringLiteral(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function getStringLiteral(node) {
  return isStringLiteral(node) ? node.text : null;
}

function getTemplatePrefix(node) {
  if (!ts.isTemplateExpression(node)) {
    return null;
  }

  const head = node.head.text;

  if (!head) {
    return null;
  }

  return head;
}

function joinPrefix(prefix, key) {
  if (!prefix) return key;
  if (!key) return prefix;

  return `${prefix}.${key}`;
}

function isUseTranslationCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "useTranslation"
  );
}

function getKeyPrefixFromUseTranslation(call) {
  const options = call.arguments[1];

  if (!options || !ts.isObjectLiteralExpression(options)) {
    return "";
  }

  for (const property of options.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      !ts.isIdentifier(property.name) ||
      property.name.text !== "keyPrefix"
    ) {
      continue;
    }

    return getStringLiteral(property.initializer) ?? "";
  }

  return "";
}

function getTranslationFunctionInfo(sourceFile) {
  const translationFunctions = new Map();

  function register(name, prefix) {
    translationFunctions.set(name, prefix);
  }

  function visit(node) {
    if (isUseTranslationCall(node)) {
      const prefix = getKeyPrefixFromUseTranslation(node);
      const parent = node.parent;

      /*
       * const { t } = useTranslation(...)
       * const { t: tAsr } = useTranslation(...)
       */
      if (
        ts.isVariableDeclaration(parent) &&
        ts.isObjectBindingPattern(parent.name)
      ) {
        for (const element of parent.name.elements) {
          if (!ts.isBindingElement(element)) continue;

          const propertyName =
            element.propertyName?.getText() ?? element.name.getText();

          if (propertyName !== "t") continue;

          const localName = element.name.getText();

          if (ts.isIdentifier(element.name)) {
            register(localName, prefix);
          }
        }
      }
    }

    /*
     * const i18n = useTranslation(...).i18n
     *
     * We intentionally do NOT inherit keyPrefix for i18n.t().
     * i18n.t() is global and therefore should use the full key.
     */
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isPropertyAccessExpression(node.initializer) &&
      node.initializer.name.text === "i18n" &&
      isUseTranslationCall(node.initializer.expression)
    ) {
      register(`__i18n__${node.name.text}`, "");
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return translationFunctions;
}

function addProtectedPrefix(prefixes, prefix) {
  if (!prefix) return;

  prefixes.add(prefix.endsWith(".") ? prefix : `${prefix}.`);
}

function hasCountOption(node) {
  if (!node || !ts.isObjectLiteralExpression(node)) {
    return false;
  }

  return node.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "count",
  );
}

function analyzeSourceFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");

  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : filePath.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.TS,
  );

  const translationFunctions = getTranslationFunctionInfo(sourceFile);
  const staticKeys = new Set();
  const countUsedKeys = new Set();
  const protectedPrefixes = new Set();
  const uncertainUsages = [];

  function visit(node) {
    /*
     * t("foo")
     * t(`foo`)
     * t(`foo.${value}`)
     */
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const functionName = node.expression.text;
      const prefix = translationFunctions.get(functionName);

      if (prefix !== undefined && node.arguments.length > 0) {
        const keyNode = node.arguments[0];
        const literal = getStringLiteral(keyNode);

        if (literal !== null) {
          const fullKey = joinPrefix(prefix, literal);

          staticKeys.add(fullKey);

          if (hasCountOption(node.arguments[1])) {
            countUsedKeys.add(fullKey);
          }
        } else {
          const templatePrefix = getTemplatePrefix(keyNode);

          if (templatePrefix !== null) {
            addProtectedPrefix(
              protectedPrefixes,
              joinPrefix(prefix, templatePrefix),
            );
          } else {
            /*
             * We know this translation function is being called,
             * but the key is completely dynamic.
             *
             * Protect the entire keyPrefix rather than guessing.
             */
            if (prefix) {
              addProtectedPrefix(protectedPrefixes, prefix);
            } else {
              uncertainUsages.push({
                filePath,
                line:
                  sourceFile.getLineAndCharacterOfPosition(
                    node.getStart(sourceFile),
                  ).line + 1,
                expression: node.getText().slice(0, 120),
              });
            }
          }
        }
      }
    }

    /*
     * i18n.t("foo")
     * i18n.t(`foo.${value}`)
     */
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "t"
    ) {
      const objectName = node.expression.expression.getText();

      /*
       * Ignore calls already handled as t()/tAlias().
       */
      if (translationFunctions.has(objectName)) {
        ts.forEachChild(node, visit);
        return;
      }

      if (node.arguments.length > 0) {
        const keyNode = node.arguments[0];
        const literal = getStringLiteral(keyNode);

        if (literal !== null) {
          staticKeys.add(literal);

          if (hasCountOption(node.arguments[1])) {
            countUsedKeys.add(literal);
          }
        } else {
          const templatePrefix = getTemplatePrefix(keyNode);

          if (templatePrefix !== null) {
            addProtectedPrefix(protectedPrefixes, templatePrefix);
          } else {
            uncertainUsages.push({
              filePath,
              line:
                sourceFile.getLineAndCharacterOfPosition(
                  node.getStart(sourceFile),
                ).line + 1,
              expression: node.getText().slice(0, 120),
            });
          }
        }
      }
    }

    /*
     * <Trans i18nKey="foo" />
     * <Trans i18nKey={`foo.${value}`} />
     */
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes = ts.isJsxElement(node)
        ? node.openingElement.attributes
        : node.attributes;

      for (const property of attributes.properties) {
        if (!ts.isJsxAttribute(property)) continue;
        if (property.name.text !== "i18nKey") continue;
        if (!property.initializer) continue;

        if (ts.isStringLiteral(property.initializer)) {
          staticKeys.add(property.initializer.text);
          continue;
        }

        if (
          ts.isJsxExpression(property.initializer) &&
          property.initializer.expression
        ) {
          const expression = property.initializer.expression;
          const literal = getStringLiteral(expression);

          if (literal !== null) {
            staticKeys.add(literal);
            continue;
          }

          const templatePrefix = getTemplatePrefix(expression);

          if (templatePrefix !== null) {
            addProtectedPrefix(protectedPrefixes, templatePrefix);
          } else {
            uncertainUsages.push({
              filePath,
              line:
                sourceFile.getLineAndCharacterOfPosition(
                  node.getStart(sourceFile),
                ).line + 1,
              expression: `Trans i18nKey={${expression.getText()}}`,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    staticKeys,
    countUsedKeys,
    protectedPrefixes,
    uncertainUsages,
  };
}

function isProtectedByPrefix(key, protectedPrefixes) {
  for (const prefix of protectedPrefixes) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

function formatList(items) {
  return [...items].sort((a, b) => a.localeCompare(b));
}

function printSection(title, items) {
  if (items.length === 0) return;

  console.log(`\n${title}`);

  for (const item of items) {
    console.log(`  ${item}`);
  }
}

if (!fs.existsSync(EN_FILE)) {
  console.error(`Missing locale file: ${EN_FILE}`);
  process.exit(1);
}

if (!fs.existsSync(RU_FILE)) {
  console.error(`Missing locale file: ${RU_FILE}`);
  process.exit(1);
}

const en = JSON.parse(fs.readFileSync(EN_FILE, "utf8"));
const ru = JSON.parse(fs.readFileSync(RU_FILE, "utf8"));

const englishKeys = flattenObject(en);
const russianKeys = flattenObject(ru);

const sourceFiles = getAllSourceFiles(SRC_DIR);

const staticKeys = new Set();
const countUsedKeys = new Set();
const protectedPrefixes = new Set();
const uncertainUsages = [];

for (const filePath of sourceFiles) {
  const result = analyzeSourceFile(filePath);

  for (const key of result.staticKeys) {
    staticKeys.add(key);
  }

  for (const key of result.countUsedKeys) {
    countUsedKeys.add(key);
  }

  for (const prefix of result.protectedPrefixes) {
    protectedPrefixes.add(prefix);
  }

  uncertainUsages.push(...result.uncertainUsages);
}

const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];

const definitelyUnused = new Set();

for (const key of englishKeys) {
  if (staticKeys.has(key)) continue;

  if (isProtectedByPrefix(key, protectedPrefixes)) {
    continue;
  }

  /*
   * A key used with count may resolve to one of its plural variants.
   * Keep all variants belonging to that source key from being reported
   * as unused.
   */
  let belongsToCountUsedKey = false;

  for (const usedKey of countUsedKeys) {
    if (
      key.startsWith(`${usedKey}_`) &&
      PLURAL_SUFFIXES.some((suffix) => key.endsWith(suffix))
    ) {
      belongsToCountUsedKey = true;
      break;
    }
  }

  if (belongsToCountUsedKey) {
    continue;
  }

  definitelyUnused.add(key);
}

const missingRussian = new Set(
  [...englishKeys].filter((key) => !russianKeys.has(key)),
);

const extraRussian = new Set(
  [...russianKeys].filter((key) => !englishKeys.has(key)),
);

const missingEnglish = new Set();

for (const key of staticKeys) {
  if (englishKeys.has(key)) {
    continue;
  }

  /*
   * When a source key is used with count, English must define both
   * _one and _other. Having only one of them is not sufficient.
   */
  if (countUsedKeys.has(key)) {
    if (!englishKeys.has(`${key}_one`)) {
      missingEnglish.add(`${key}_one`);
    }

    if (!englishKeys.has(`${key}_other`)) {
      missingEnglish.add(`${key}_other`);
    }

    continue;
  }

  /*
   * Non-count usages may still refer to a plural base key if the
   * locale defines one of its plural variants.
   */
  if (!PLURAL_SUFFIXES.some((suffix) => englishKeys.has(`${key}${suffix}`))) {
    missingEnglish.add(key);
  }
}

const dynamicallyUsedKeys = new Set();

for (const key of englishKeys) {
  if (isProtectedByPrefix(key, protectedPrefixes)) {
    dynamicallyUsedKeys.add(key);
  }
}

console.log("");

console.log("i18n audit");
console.log("────────────────────────────────────────");
console.log(`${englishKeys.size} translation keys`);
console.log(`${sourceFiles.length} source files`);
console.log("");

console.log(`✓ Used directly              ${staticKeys.size}`);
console.log(`✓ Used dynamically           ${dynamicallyUsedKeys.size}`);
console.log(`⚠ Cannot statically verify   ${uncertainUsages.length}`);
console.log(`✗ Definitely unused         ${definitelyUnused.size}`);

if (protectedPrefixes.size > 0) {
  console.log("\nDynamic translation families");

  for (const prefix of [...protectedPrefixes].sort()) {
    console.log(`  ${prefix}*`);
  }
}

printSection("Definitely unused", formatList(definitelyUnused));

if (uncertainUsages.length > 0) {
  console.log("\nCannot statically verify");

  for (const usage of uncertainUsages) {
    const relativePath = path.relative(ROOT, usage.filePath);

    console.log(`  ${relativePath}:${usage.line} → ${usage.expression}`);
  }
}

printSection("Missing from Russian", formatList(missingRussian));

printSection(
  "Used in source but missing from English",
  formatList(missingEnglish),
);

printSection("Only in Russian", formatList(extraRussian));

console.log("\n────────────────────────────────────────");
console.log("No files modified.");
