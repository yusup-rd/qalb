import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { requestCached } from "./client-cache";

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
  },
}));

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe("requestCached", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a fresh value for a caller with a longer TTL during another request", async () => {
    let now = 0;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    await requestCached("cache:ttl", 100, async () => "cached");
    now = 20;

    let resolveRequest!: (value: string) => void;
    const request = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const pending = requestCached("cache:ttl", 10, request);
    await flushMicrotasks();
    expect(request).toHaveBeenCalledTimes(1);

    await expect(requestCached("cache:ttl", 100, request)).resolves.toBe(
      "cached",
    );
    expect(request).toHaveBeenCalledTimes(1);

    resolveRequest("updated");
    await expect(pending).resolves.toBe("updated");
  });

  it("applies stale fallback separately for callers sharing a failed request", async () => {
    let now = 0;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    await requestCached("cache:fallback", 100, async () => "cached");
    now = 200;

    let rejectRequest!: (error: Error) => void;
    const request = jest.fn(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    const onStaleFallback = jest.fn();
    const permissive = requestCached("cache:fallback", 100, request, {
      allowStaleOnError: true,
      onStaleFallback,
    });
    await flushMicrotasks();
    const strict = requestCached("cache:fallback", 100, request);
    await flushMicrotasks();
    expect(request).toHaveBeenCalledTimes(1);

    const strictAssertion = expect(strict).rejects.toThrow("offline");
    rejectRequest(new Error("offline"));
    await expect(permissive).resolves.toBe("cached");
    await strictAssertion;
    expect(onStaleFallback).toHaveBeenCalledTimes(1);
  });
});
