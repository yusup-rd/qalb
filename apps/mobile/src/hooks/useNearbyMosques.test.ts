import {
  beforeEach,
  afterEach,
  expect,
  it,
  jest as mockJestApi,
} from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { fetchNearbyMosques } from "@/api/mosques-api";
import { fetchRouteMetrics } from "@/api/routing-api";
import { useLocationStore } from "@/store/locationStore";
import { useNearbyMosques } from "./useNearbyMosques";

// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@/api/mosques-api", () => ({
  fetchNearbyMosques: mockJestApi.fn(),
}));
// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@/api/routing-api", () => ({ fetchRouteMetrics: mockJestApi.fn() }));
// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: mockJestApi.fn(() => () => {}) },
}));

const mosque = {
  id: "mosque",
  name: "Mosque",
  latitude: 3.14,
  longitude: 101.69,
};
const metric = { distanceMeters: 1200, durationSeconds: 180 };

beforeEach(() => {
  mockJestApi.clearAllMocks();
  mockJestApi.spyOn(console, "error").mockImplementation(() => {});
  useLocationStore.getState().setLocation(3.139, 101.6869);
  mockJestApi.mocked(fetchNearbyMosques).mockResolvedValue([mosque]);
  mockJestApi
    .mocked(fetchRouteMetrics)
    .mockRejectedValueOnce(new Error("Startup timeout"))
    .mockResolvedValue([metric]);
});

afterEach(() => {
  mockJestApi.restoreAllMocks();
});

it.each(["manual", "reconnect"] as const)(
  "retries failed driving metrics through %s recovery without moving location",
  async (recovery) => {
    const { result, unmount } = renderHook(() => useNearbyMosques());
    await waitFor(() => expect(result.current.mosques).toHaveLength(1));
    await waitFor(() =>
      expect(result.current.mosques[0].routeMetricsLoading).toBe(false),
    );
    expect(result.current.mosques[0].drivingDistanceMeters).toBeNull();

    await act(async () => {
      if (recovery === "manual") {
        result.current.retry();
      } else {
        const listener = mockJestApi
          .mocked(NetInfo.addEventListener)
          .mock.calls.at(-1)![0];
        listener({
          isConnected: false,
          isInternetReachable: false,
        } as NetInfoState);
        listener({
          isConnected: true,
          isInternetReachable: true,
        } as NetInfoState);
      }
    });

    await waitFor(() =>
      expect(result.current.mosques[0].drivingDistanceMeters).toBe(1200),
    );
    expect(result.current.mosques[0].durationSeconds).toBe(180);
    expect(fetchRouteMetrics).toHaveBeenCalledTimes(2);
    unmount();
  },
);
