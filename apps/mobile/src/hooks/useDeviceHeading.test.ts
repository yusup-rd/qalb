import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest as mockJestApi,
} from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as React from "react";
import { useLocationStore } from "@/store/locationStore";
import useDeviceHeading from "./useDeviceHeading";

const mockReact = React;
let mockFocusCallback: (() => void | (() => void)) | undefined;
let mockFocusCleanup: (() => void) | undefined;

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockFocusCallback = callback;
    mockReact.useEffect(() => {
      mockFocusCleanup = callback() || undefined;
      return () => mockFocusCleanup?.();
    }, [callback]);
  },
}));

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("expo-location", () => {
  return {
    getForegroundPermissionsAsync: mockJestApi.fn(),
    hasServicesEnabledAsync: mockJestApi.fn(),
    watchHeadingAsync: mockJestApi.fn(),
  };
});

const mockedLocation = mockJestApi.mocked(Location);

describe("useDeviceHeading", () => {
  beforeEach(() => {
    mockFocusCallback = undefined;
    mockFocusCleanup = undefined;
    useLocationStore.setState({ locationPermissionStatus: "granted" });
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
    mockedLocation.hasServicesEnabledAsync.mockResolvedValue(true);
    mockedLocation.watchHeadingAsync.mockResolvedValue({
      remove: mockJestApi.fn(),
    } as Location.LocationSubscription);
  });

  afterEach(() => {
    mockJestApi.useRealTimers();
    mockJestApi.clearAllMocks();
  });

  it("starts in a non-error state, then reports availability from a reading", async () => {
    let emitHeading:
      ((heading: Location.LocationHeadingObject) => void) | undefined;
    const remove = mockJestApi.fn();
    mockedLocation.watchHeadingAsync.mockImplementation(
      async (callback: (heading: Location.LocationHeadingObject) => void) => {
        emitHeading = callback;
        return { remove } as Location.LocationSubscription;
      },
    );

    const { result, unmount } = renderHook(() => useDeviceHeading({}));
    expect(result.current.sensorStatus).toBe("checking");

    await waitFor(() => expect(emitHeading).toBeDefined());
    act(() => emitHeading?.({ trueHeading: 90, magHeading: 90, accuracy: 2 }));

    expect(result.current.sensorStatus).toBe("available");
    expect(result.current.heading).toBe(90);

    act(() => mockFocusCleanup?.());
    expect(remove).toHaveBeenCalledTimes(1);
    act(() => {
      mockFocusCleanup = mockFocusCallback?.() || undefined;
    });
    await waitFor(() =>
      expect(mockedLocation.watchHeadingAsync).toHaveBeenCalledTimes(2),
    );
    expect(result.current.sensorStatus).toBe("checking");
    // Reopening retains the last reading while the sensor reconnects.
    expect(result.current.heading).toBe(90);
    await new Promise((resolve) => setTimeout(resolve, 110));
    act(() => emitHeading?.({ trueHeading: 91, magHeading: 91, accuracy: 2 }));
    expect(result.current.sensorStatus).toBe("available");
    expect(result.current.heading).toBe(91);

    unmount();

    const remounted = renderHook(() => useDeviceHeading({}));
    expect(remounted.result.current.sensorStatus).toBe("checking");
    remounted.unmount();
  });

  it("reports unavailable when the sensor never emits its first heading", async () => {
    mockJestApi.useFakeTimers();
    const { result, unmount } = renderHook(() => useDeviceHeading({}));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockedLocation.watchHeadingAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await mockJestApi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.sensorStatus).toBe("unavailable");
    unmount();
  });

  it("reports unavailable when device location services are disabled", async () => {
    mockedLocation.hasServicesEnabledAsync.mockResolvedValue(false);

    const { result } = renderHook(() => useDeviceHeading({}));
    await waitFor(() =>
      expect(result.current.sensorStatus).toBe("unavailable"),
    );
    expect(mockedLocation.watchHeadingAsync).not.toHaveBeenCalled();
  });
});
