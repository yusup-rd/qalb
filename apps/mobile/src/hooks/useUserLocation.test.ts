import { describe, expect, it, jest as mockJestApi } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
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
});
