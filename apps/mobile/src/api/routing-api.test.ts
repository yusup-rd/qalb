import { afterEach, expect, it, jest } from "@jest/globals";
import { fetchRoute, fetchRouteMetrics } from "./routing-api";

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => {} },
}));

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it.each(["route", "metrics"] as const)(
  "recovers %s after the first startup request times out",
  async (operation) => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});
    const route = {
      distanceMeters: 1200,
      durationSeconds: 180,
      coordinates: [],
    };
    const expected = operation === "route" ? route : [route];
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(
                Object.assign(new Error("Timed out"), { name: "AbortError" }),
              ),
            );
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expected,
      } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const origin = { latitude: 3.139, longitude: 101.6869 };
    const destination = { latitude: 3.1579, longitude: 101.7123 };
    const request =
      operation === "route"
        ? fetchRoute(origin, destination)
        : fetchRouteMetrics(origin, [destination]);
    const completion = expect(request).resolves.toEqual(expected);

    await jest.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2_000);
    await completion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toEqual(fetchMock.mock.calls[0][0]);
    expect(fetchMock.mock.calls[1][1]?.body).toEqual(
      fetchMock.mock.calls[0][1]?.body,
    );
  },
);
