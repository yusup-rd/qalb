const assert = require("node:assert/strict");
const { compile } = require("react-native-css/compiler");

// TODO: Remove with the patch once nativewind/nativewind#1870 is fixed.
// Exercise the installed compiler, including the JSON boundary used by Metro.
function checkCssOpacity() {
  for (const weights of [
    ["50%", ""],
    ["", "20%"],
    ["", ""],
    ["80%", "20%"],
  ]) {
    const [left, right] = weights;
    const stylesheet = JSON.parse(
      JSON.stringify(
        compile(
          `.probe { color: color-mix(in oklab, var(--color-primary) ${left}, transparent ${right}); }`,
        ).stylesheet(),
      ),
    );
    const descriptors = [];
    function visit(value) {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value) && value[1] === "colorMix")
        descriptors.push(value);
      for (const child of Object.values(value)) visit(child);
    }
    visit(stylesheet);
    const expected = [
      "oklab",
      [{}, "var", "color-primary", 1],
      ...[left].filter(Boolean),
      "transparent",
      ...[right].filter(Boolean),
    ];
    try {
      assert.ok(descriptors.length > 0);
      for (const descriptor of descriptors)
        assert.deepEqual(descriptor[2], expected);
    } catch (cause) {
      throw new Error(
        "react-native-css opacity patch is missing or incompatible. Run yarn postinstall from the repository root, then restart Expo with --clear.",
        { cause },
      );
    }
  }
}

module.exports = { checkCssOpacity };
if (require.main === module) checkCssOpacity();
