export type HeadingPermissionStatus =
  "checking" | "granted" | "denied" | "error";

export type HeadingSensorStatus =
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export interface DeviceHeading {
  heading: number | null;
  accuracy: number;
  sensorStatus: HeadingSensorStatus;
  permissionStatus: HeadingPermissionStatus;
}

export type CompassLabel = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
