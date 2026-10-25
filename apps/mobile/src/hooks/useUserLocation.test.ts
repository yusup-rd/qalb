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
import { AppState, type AppStateStatus } from "react-native";
import { useUserLocation } from "./useUserLocation";

let mockLanguage = "en";

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `${mockLanguage}:${key}`,
  }),
}));

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => `${mockLanguage}:${key}` },
}));

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: () => Promise.resolve("accepted"),
}));

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: mockJestApi.fn(),
  getCurrentPositionAsync: mockJestApi.fn(),
}));

const mockedLocation = mockJestApi.mocked(Location);

describe("useUserLocation", () => {
  beforeEach(() => {
    mockJestApi.clearAllMocks();
  });
  afterEach(() => {
    mockJestApi.restoreAllMocks();
  });

  it("does not restart the native location request on a locale rerender", async () => {
    mockLanguage = "en";
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40, longitude: 50 },
    } as Location.LocationObject);

    const { result, rerender, unmount } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);

    mockLanguage = "ru";
    rerender({});

    expect(result.current.location).toEqual({ latitude: 40, longitude: 50 });
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("ignores Control Center interruptions but checks permission after backgrounding", async () => {
    const realNow = Date.now.bind(Date);
    let elapsedMs = 0;
    mockJestApi
      .spyOn(Date, "now")
      .mockImplementation(() => realNow() + elapsedMs);
    let emitAppState: ((state: AppStateStatus) => void) | undefined;
    mockJestApi
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        emitAppState = listener as (state: AppStateStatus) => void;
        return { remove: mockJestApi.fn() };
      });
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40, longitude: 50 },
    } as Location.LocationObject);

    const { result, unmount } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      emitAppState?.("inactive");
      emitAppState?.("active");
    });
    expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);

    act(() => {
      emitAppState?.("background");
      emitAppState?.("inactive");
      emitAppState?.("active");
    });
    await waitFor(() =>
      expect(
        mockedLocation.getForegroundPermissionsAsync,
      ).toHaveBeenCalledTimes(2),
    );
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);

    elapsedMs += 10 * 60 * 1000 + 1;
    let resolveBackgroundFix:
      ((location: Location.LocationObject) => void) | undefined;
    mockedLocation.getCurrentPositionAsync.mockImplementationOnce(
      () =>
        new Promise<Location.LocationObject>((resolve) => {
          resolveBackgroundFix = resolve;
        }),
    );
    act(() => {
      emitAppState?.("background");
      emitAppState?.("inactive");
      emitAppState?.("active");
    });
    await waitFor(() =>
      expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2),
    );
    expect(result.current.loading).toBe(false);
    await act(async () => {
      resolveBackgroundFix?.({
        coords: { latitude: 40.0002, longitude: 50 },
      } as Location.LocationObject);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toEqual({ latitude: 40, longitude: 50 });

    elapsedMs += 10 * 60 * 1000 + 1;
    mockedLocation.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 40.01, longitude: 50 },
    } as Location.LocationObject);
    act(() => {
      emitAppState?.("background");
      emitAppState?.("active");
    });
    await waitFor(() =>
      expect(result.current.location).toEqual({
        latitude: 40.01,
        longitude: 50,
      }),
    );

    mockedLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    } as Location.LocationPermissionResponse);
    act(() => {
      emitAppState?.("background");
      emitAppState?.("active");
    });
    await waitFor(() =>
      expect(result.current.permissionStatus).toBe("blocked"),
    );
    expect(result.current.location).toBeNull();
    unmount();
  });
});
