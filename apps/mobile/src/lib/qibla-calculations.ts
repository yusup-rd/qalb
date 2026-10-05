import type { CompassLabel } from "@/types/qibla";

const KAABA_LATITUDE = 21.4225;
const KAABA_LONGITUDE = 39.8262;
const EARTH_RADIUS_KM = 6371;

export const getQiblaBearing = (
  latitude: number,
  longitude: number,
): number => {
  const latitude1 = (latitude * Math.PI) / 180;
  const latitude2 = (KAABA_LATITUDE * Math.PI) / 180;

  const deltaLongitude = ((KAABA_LONGITUDE - longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLongitude) * Math.cos(latitude2);

  const x =
    Math.cos(latitude1) * Math.sin(latitude2) -
    Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(deltaLongitude);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
};

export const getDistanceToKaaba = (
  latitude: number,
  longitude: number,
): number => {
  const latitude1 = (latitude * Math.PI) / 180;
  const latitude2 = (KAABA_LATITUDE * Math.PI) / 180;

  const deltaLatitude = ((KAABA_LATITUDE - latitude) * Math.PI) / 180;

  const deltaLongitude = ((KAABA_LONGITUDE - longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

const normalizeDegrees = (degrees: number): number => {
  return ((degrees % 360) + 360) % 360;
};

export const getAngularDifference = (first: number, second: number): number => {
  const normalizedFirst = normalizeDegrees(first);
  const normalizedSecond = normalizeDegrees(second);
  const difference = Math.abs(normalizedFirst - normalizedSecond);

  return Math.min(difference, 360 - difference);
};

export const shortestRotationPath = (from: number, to: number): number => {
  const normalizedFrom = normalizeDegrees(from);
  const normalizedTo = normalizeDegrees(to);

  let delta = normalizedTo - normalizedFrom;

  if (delta > 180) {
    delta -= 360;
  }

  if (delta < -180) {
    delta += 360;
  }

  return from + delta;
};

export const degreesToCompassLabel = (degrees: number): CompassLabel => {
  const normalized = normalizeDegrees(degrees);

  const labels: CompassLabel[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  return labels[Math.round(normalized / 45) % 8];
};
