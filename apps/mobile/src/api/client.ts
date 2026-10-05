const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10_000;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
    if (!response.ok)
      throw new ApiClientError(
        response.status,
        data?.message ?? `API request failed with status ${response.status}`,
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError(
      null,
      error instanceof Error && error.name === "AbortError"
        ? "The request timed out."
        : "The network request failed.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
