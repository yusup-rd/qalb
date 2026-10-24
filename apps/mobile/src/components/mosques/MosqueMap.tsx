import type { NearbyMosque } from "@/hooks/useNearbyMosques";
import { useTheme } from "@/providers/ThemeProvider";
import { useLocationStore } from "@/store/locationStore";
import type { Route } from "@/types/routing";
import { useEffect, useRef, type ComponentRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, type Region } from "react-native-maps";
import MosqueMarker from "./MosqueMarker";

interface MosqueMapProps {
  mosques: NearbyMosque[];
  radiusKm: number;
  selectedMosqueId: string | null;
  onSelectMosque: (mosqueId: string) => void;
  route: Route | null;
}

interface MosqueMapMarkerProps {
  mosque: NearbyMosque;
  selected: boolean;
  onSelect: (mosqueId: string) => void;
  registerMarker: (
    mosqueId: string,
    marker: ComponentRef<typeof Marker> | null,
  ) => void;
}

const EARTH_RADIUS_KM = 111;
const MAP_PADDING_FACTOR = 1.25;
const MIN_VISIBLE_RADIUS_KM = 2;
const MAX_VISIBLE_RADIUS_KM = 75;
const SELECTED_MOSQUE_LATITUDE_DELTA = 0.05;
const SELECTED_MOSQUE_LONGITUDE_DELTA = 0.05;

const getRegionForRadius = (
  latitude: number,
  longitude: number,
  radiusKm: number,
): Region => {
  const visibleRadiusKm = Math.min(
    MAX_VISIBLE_RADIUS_KM,
    Math.max(MIN_VISIBLE_RADIUS_KM, radiusKm * MAP_PADDING_FACTOR),
  );

  const latitudeDelta = (visibleRadiusKm * 2) / EARTH_RADIUS_KM;
  const longitudeScale = Math.cos((latitude * Math.PI) / 180);
  const longitudeDelta = latitudeDelta / Math.max(longitudeScale, 0.1);

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

const getMapAnimationDuration = (
  previousRadius: number | null,
  radius: number,
) => {
  if (previousRadius == null) {
    return 500;
  }

  const changeRatio =
    Math.max(radius, previousRadius) /
    Math.max(Math.min(radius, previousRadius), 1);

  if (changeRatio >= 5) {
    return 800;
  }

  if (changeRatio >= 2) {
    return 650;
  }

  return 500;
};

const MosqueMapMarker = ({
  mosque,
  selected,
  onSelect,
  registerMarker,
}: MosqueMapMarkerProps) => {
  const markerRef = useRef<ComponentRef<typeof Marker>>(null);
  const previousSelectedRef = useRef(selected);

  useEffect(() => {
    if (Platform.OS === "android" && previousSelectedRef.current !== selected) {
      markerRef.current?.redraw();
    }

    previousSelectedRef.current = selected;
  }, [selected]);

  return (
    <Marker
      ref={(marker) => {
        markerRef.current = marker;
        registerMarker(mosque.id, marker);
      }}
      coordinate={{
        latitude: mosque.latitude,
        longitude: mosque.longitude,
      }}
      onPress={() => onSelect(mosque.id)}
      tracksViewChanges={false}
      // NOTE: Apply zIndex on iOS only; changing Android marker zIndex can cause stale overlapping snapshots.
      {...(Platform.OS === "ios" && selected ? { zIndex: 1 } : {})}
    >
      <MosqueMarker selected={selected} />
    </Marker>
  );
};

const MosqueMap = ({
  mosques,
  radiusKm,
  selectedMosqueId,
  onSelectMosque,
  route,
}: MosqueMapProps) => {
  const { colors } = useTheme();

  const mapRef = useRef<MapView>(null);
  const previousRadiusRef = useRef<number | null>(null);
  const markerRefs = useRef(new Map<string, ComponentRef<typeof Marker>>());

  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);

  const selectedMosque = mosques.find(
    (mosque) => mosque.id === selectedMosqueId,
  );

  const selectedMosqueLatitude = selectedMosque?.latitude;
  const selectedMosqueLongitude = selectedMosque?.longitude;
  const hasRoute = route != null;

  const registerMarker = (
    mosqueId: string,
    marker: ComponentRef<typeof Marker> | null,
  ) => {
    if (marker) {
      markerRefs.current.set(mosqueId, marker);
    } else {
      markerRefs.current.delete(mosqueId);
    }
  };

  const handleMapReady = () => {
    if (Platform.OS !== "android") {
      return;
    }

    markerRefs.current.forEach((marker) => {
      marker.redraw();
    });
  };

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    const region = getRegionForRadius(latitude, longitude, radiusKm);
    const duration = getMapAnimationDuration(
      previousRadiusRef.current,
      radiusKm,
    );

    previousRadiusRef.current = radiusKm;
    mapRef.current?.animateToRegion(region, duration);
  }, [latitude, longitude, radiusKm]);

  // Center the map on the selected mosque when no route is being displayed.
  useEffect(() => {
    if (selectedMosqueLatitude == null || selectedMosqueLongitude == null) {
      return;
    }

    if (hasRoute) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: selectedMosqueLatitude,
        longitude: selectedMosqueLongitude,
        latitudeDelta: SELECTED_MOSQUE_LATITUDE_DELTA,
        longitudeDelta: SELECTED_MOSQUE_LONGITUDE_DELTA,
      },
      500,
    );
  }, [
    selectedMosqueId,
    selectedMosqueLatitude,
    selectedMosqueLongitude,
    hasRoute,
  ]);

  useEffect(() => {
    if (!route || route.coordinates.length === 0) {
      return;
    }

    mapRef.current?.fitToCoordinates(route.coordinates, {
      edgePadding: {
        top: 30,
        right: 30,
        bottom: 30,
        left: 30,
      },
      animated: true,
    });
  }, [route]);

  if (latitude == null || longitude == null) {
    return null;
  }

  const initialRegion = getRegionForRadius(latitude, longitude, radiusKm);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        onMapReady={handleMapReady}
        showsUserLocation
        showsMyLocationButton
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled
        pitchEnabled={false}
        initialRegion={initialRegion}
      >
        {route ? (
          <Polyline
            coordinates={route.coordinates}
            strokeColor={colors.secondary}
            strokeWidth={5}
          />
        ) : null}

        {mosques.map((mosque) => (
          <MosqueMapMarker
            key={mosque.id}
            mosque={mosque}
            selected={mosque.id === selectedMosqueId}
            onSelect={onSelectMosque}
            registerMarker={registerMarker}
          />
        ))}
      </MapView>
    </View>
  );
};

export default MosqueMap;
