import type { NearbyMosque } from "@/hooks/useNearbyMosques";
import { useTheme } from "@/providers/ThemeProvider";
import { useLocationStore } from "@/store/locationStore";
import type { Route } from "@/types/routing";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline, type Region } from "react-native-maps";
import MosqueMarker from "./MosqueMarker";

interface MosqueMapProps {
  mosques: NearbyMosque[];
  radiusKm: number;
  selectedMosqueId: string | null;
  onSelectMosque: (mosqueId: string) => void;
  route: Route | null;
}

const EARTH_RADIUS_KM = 111;
const MAP_PADDING_FACTOR = 1.5;

const getRegionForRadius = (
  latitude: number,
  longitude: number,
  radiusKm: number,
): Region => {
  const latitudeDelta = (radiusKm * 2 * MAP_PADDING_FACTOR) / EARTH_RADIUS_KM;
  const longitudeScale = Math.cos((latitude * Math.PI) / 180);
  const longitudeDelta = latitudeDelta / Math.max(longitudeScale, 0.1);

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
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

  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    const region = getRegionForRadius(latitude, longitude, radiusKm);

    mapRef.current?.animateToRegion(region, 500);
  }, [latitude, longitude, radiusKm]);

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
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
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
        <Marker
          key={mosque.id}
          coordinate={{
            latitude: mosque.latitude,
            longitude: mosque.longitude,
          }}
          onPress={() => onSelectMosque(mosque.id)}
          tracksViewChanges={false}
          zIndex={mosque.id === selectedMosqueId ? 1000 : 0}
        >
          <MosqueMarker selected={mosque.id === selectedMosqueId} />
        </Marker>
      ))}
    </MapView>
  );
};

export default MosqueMap;
