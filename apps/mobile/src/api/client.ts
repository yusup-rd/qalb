function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const localDevelopmentFallback =
    typeof __DEV__ !== "undefined" && __DEV__
      ? "http://localhost:3000"
      : undefined;
  const value = configuredUrl || localDevelopmentFallback;

  if (!value) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is required in release builds. Set it to the HTTPS base URL of the Qalb API.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "EXPO_PUBLIC_API_URL must be a valid absolute HTTPS URL in release builds.",
    );
  }

  const isDevelopmentHttp =
    typeof __DEV__ !== "undefined" && __DEV__ && parsed.protocol === "http:";
  if (
    (parsed.protocol !== "https:" && !isDevelopmentHttp) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "EXPO_PUBLIC_API_URL must use HTTPS and must not contain credentials, a query, or a fragment.",
    );
  }

  return value.replace(/\/+$/, "");
}

const API_BASE_URL = resolveApiBaseUrl();

const REQUEST_TIMEOUTS_MS = [15_000, 20_000, 45_000] as const;
const RETRY_DELAYS_MS = [2_000, 8_000] as const;
const DEFAULT_MAX_ATTEMPTS = 3;

export type ApiErrorKind = "timeout" | "network" | "http" | "cancelled";

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly kind: ApiErrorKind;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(
    status: number | null,
    message: string,
    kind: ApiErrorKind,
    retryable: boolean,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.kind = kind;
    this.retryable = retryable;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export interface ApiRequestOptions {
  timeoutMs?: number;
  maxAttempts?: number;
}

function pathForLogs(path: string): string {
  const queryIndex = path.indexOf("?");
  return queryIndex === -1 ? path : path.slice(0, queryIndex);
}

function isDev(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function isAbortLike(error: unknown, aborted: boolean): boolean {
  if (aborted) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      new ApiClientError(
        null,
        "The request was cancelled.",
        "cancelled",
        false,
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
    };

    const abort = () => {
      cleanup();

      reject(
        new ApiClientError(
          null,
          "The request was cancelled.",
          "cancelled",
          false,
        ),
      );
    };

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", abort, { once: true });
  });
}

function toApiClientError(error: unknown, aborted: boolean): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (isAbortLike(error, aborted)) {
    return new ApiClientError(
      null,
      "The request timed out.",
      "timeout",
      true,
      error,
    );
  }

  return new ApiClientError(
    null,
    "The network request failed.",
    "network",
    true,
    error,
  );
}

function logRequestFailure(
  path: string,
  method: string,
  error: ApiClientError,
  attempt: number,
  willRetry: boolean,
): void {
  if (!willRetry || isDev()) {
    console.error(
      `[API] ${method} ${pathForLogs(path)} ${willRetry ? "retrying" : "failed"}`,
      {
        attempt,
        kind: error.kind,
        status: error.status,
        retryable: error.retryable,
      },
    );
  }
}

async function sendRequest<T>(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const callerSignal = init?.signal;
  const abortFromCaller = () => controller.abort();

  if (callerSignal?.aborted) {
    throw new ApiClientError(
      null,
      "The request was cancelled.",
      "cancelled",
      false,
    );
  }

  callerSignal?.addEventListener("abort", abortFromCaller, {
    once: true,
  });

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => {
      if (controller.signal.aborted) {
        throw new Error("The request was aborted.");
      }

      return null;
    })) as { message?: string } | null;

    if (controller.signal.aborted) {
      throw new Error("The request was aborted.");
    }

    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        data?.message ?? `API request failed with status ${response.status}`,
        "http",
        isRetryableStatus(response.status),
      );
    }

    return data as T;
  } catch (error) {
    if (callerSignal?.aborted) {
      throw new ApiClientError(
        null,
        "The request was cancelled.",
        "cancelled",
        false,
        error,
      );
    }

    throw toApiClientError(error, controller.signal.aborted);
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const defaultMaxAttempts =
    method === "GET" || method === "HEAD" ? DEFAULT_MAX_ATTEMPTS : 1;
  const maxAttempts = options.maxAttempts ?? defaultMaxAttempts;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer.");
  }

  let lastError: ApiClientError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeoutMs =
      options.timeoutMs ??
      REQUEST_TIMEOUTS_MS[Math.min(attempt, REQUEST_TIMEOUTS_MS.length) - 1];

    try {
      return await sendRequest<T>(path, init, timeoutMs);
    } catch (error) {
      lastError = toApiClientError(error, false);

      if (init?.signal?.aborted) {
        throw new ApiClientError(
          null,
          "The request was cancelled.",
          "cancelled",
          false,
          error,
        );
      }

      const willRetry = lastError.retryable && attempt < maxAttempts;
      logRequestFailure(path, method, lastError, attempt, willRetry);

      if (!willRetry) {
        throw lastError;
      }

      const delayMs =
        RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1) ?? 2_000;

      await wait(delayMs, init?.signal);
    }
  }

  throw (
    lastError ??
    new ApiClientError(null, "The network request failed.", "network", false)
  );
}
