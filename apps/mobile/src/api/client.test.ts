import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { apiRequest } from "./client";

const originalFetch = globalThis.fetch;

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe("apiRequest retry policy", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("awaits 2-second and 8-second backoffs for retryable network errors", async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});

    const fetchMock = jest
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ available: true }),
      } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const events: {
      type: string;
      attempt?: number;
      retryDelayMs?: number;
    }[] = [];
    const request = apiRequest<{ available: boolean }>(
      "/api/reverse-geocoding",
      undefined,
      { onEvent: (event) => events.push(event) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await flushMicrotasks();
    expect(
      events
        .filter((event) => event.type === "retry")
        .map(({ type, attempt, retryDelayMs }) => ({
          type,
          attempt,
          retryDelayMs,
        })),
    ).toEqual([{ type: "retry", attempt: 1, retryDelayMs: 2_000 }]);

    await jest.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      events
        .filter((event) => event.type === "retry")
        .map(({ type, attempt, retryDelayMs }) => ({
          type,
          attempt,
          retryDelayMs,
        })),
    ).toEqual([
      { type: "retry", attempt: 1, retryDelayMs: 2_000 },
      { type: "retry", attempt: 2, retryDelayMs: 8_000 },
    ]);

    await jest.advanceTimersByTimeAsync(7_999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    await flushMicrotasks();

    await expect(request).resolves.toEqual({ available: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable HTTP errors", async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Bad request" }),
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiRequest("/api/mosques/nearby")).rejects.toMatchObject({
      kind: "http",
      status: 400,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
