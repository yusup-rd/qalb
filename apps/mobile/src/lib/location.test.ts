import {
  afterEach,
  describe,
  expect,
  it,
  jest as mockJestApi,
} from "@jest/globals";
import * as Location from "expo-location";
import * as reverseGeocodingApi from "@/api/reverse-geocoding-api";
import { reverseGeocode } from "./location";

// @ts-ignore Jest hoists these global mocks ahead of module imports.
jest.mock("@/api/reverse-geocoding-api", () => ({
  reverseGeocodeWithAPI: mockJestApi.fn(),
}));
// @ts-ignore Jest hoists these global mocks ahead of module imports.
jest.mock("expo-location", () => ({
  reverseGeocodeAsync: mockJestApi.fn(),
}));

describe("reverseGeocode", () => {
  let warning: { mockRestore: () => void } | undefined;

  afterEach(() => {
    warning?.mockRestore();
    mockJestApi.clearAllMocks();
  });

  it("shares concurrent API failure and Expo fallback for the same coordinates", async () => {
    const apiRequest = mockJestApi.mocked(
      reverseGeocodingApi.reverseGeocodeWithAPI,
    );
    const expoRequest = mockJestApi.mocked(Location.reverseGeocodeAsync);
    apiRequest.mockRejectedValue(new Error("offline"));
    expoRequest.mockResolvedValue([
      {
        city: "Ashgabat",
        country: "Turkmenistan",
      } as unknown as Location.LocationGeocodedAddress,
    ]);
    warning = mockJestApi.spyOn(console, "warn").mockImplementation(() => {});

    const first = reverseGeocode(37.95, 58.38, "en");
    const second = reverseGeocode(37.95, 58.38, "en");
    expect(second).toBe(first);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { city: "Ashgabat", country: "Turkmenistan" },
      { city: "Ashgabat", country: "Turkmenistan" },
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(expoRequest).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledTimes(1);

    await reverseGeocode(37.96, 58.38, "en");
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(expoRequest).toHaveBeenCalledTimes(2);
  });
});
