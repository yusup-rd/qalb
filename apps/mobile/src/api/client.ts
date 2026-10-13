const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const REQUEST_TIMEOUTS_MS = [15_000, 20_000, 45_000] as const;
const RETRY_DELAYS_MS = [2_000, 8_000] as const;
const DEFAULT_MAX_ATTEMPTS = 3;

export type ApiErrorKind = "timeout" | "network" | "http";

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

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
    throw toApiClientError(error, controller.signal.aborted);
  } finally {
    clearTimeout(timeoutId);
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
      const willRetry = lastError.retryable && attempt < maxAttempts;
      logRequestFailure(path, method, lastError, attempt, willRetry);

      if (!willRetry) {
        throw lastError;
      }

      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1);
      await wait(delayMs ?? 2_000);
    }
  }

  throw (
    lastError ??
    new ApiClientError(null, "The network request failed.", "network", false)
  );
}
