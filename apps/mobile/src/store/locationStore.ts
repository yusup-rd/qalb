import { create } from "zustand";

export type LocationPermissionStatus =
  "checking" | "granted" | "denied" | "blocked";

type LocationNameStatus = "idle" | "loading" | "resolved" | "failed";

interface LocationStore {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  locationNameStatus: LocationNameStatus;
  locationLoading: boolean;
  locationError: string | null;
  locationPermissionStatus: LocationPermissionStatus;

  retryLocation: () => Promise<void>;

  setLocation: (latitude: number, longitude: number) => void;
  setLocationName: (name: string | null) => void;
  setLocationNameStatus: (status: LocationNameStatus) => void;
  setLocationLoading: (loading: boolean) => void;
  setLocationError: (error: string | null) => void;
  setLocationPermissionStatus: (status: LocationPermissionStatus) => void;
  setRetryLocation: (retry: () => Promise<void>) => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  locationName: null,
  locationNameStatus: "idle",
  locationLoading: true,
  locationError: null,
  locationPermissionStatus: "checking",
  retryLocation: async () => {},

  setLocation: (latitude, longitude) =>
    set((state) => {
      const coordinatesChanged =
        state.latitude !== latitude || state.longitude !== longitude;

      return {
        latitude,
        longitude,
        locationLoading: false,
        locationError: null,
        locationPermissionStatus: "granted",
        ...(coordinatesChanged
          ? {
              locationName: null,
              locationNameStatus: "idle",
            }
          : {}),
      };
    }),

  setLocationName: (name) =>
    set({
      locationName: name,
    }),

  setLocationNameStatus: (status) =>
    set({
      locationNameStatus: status,
    }),

  setLocationLoading: (loading) =>
    set({
      locationLoading: loading,
    }),

  setLocationError: (error) =>
    set({
      locationError: error,
      ...(error === null
        ? {}
        : {
            locationLoading: false,
            locationName: null,
            locationNameStatus: "idle",
          }),
    }),

  setLocationPermissionStatus: (status) =>
    set({
      locationPermissionStatus: status,
      ...(status === "denied" || status === "blocked"
        ? {
            latitude: null,
            longitude: null,
            locationName: null,
          }
        : {}),
    }),

  setRetryLocation: (retry) =>
    set({
      retryLocation: retry,
    }),
}));
