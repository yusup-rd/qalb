export interface LocationAddress {
  city: string | null;
  country: string | null;
}

export interface Mosque {
  id: string;
  name: string;
  street?: string;
  latitude: number;
  longitude: number;
  tags?: string[];
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface Route {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
}

export interface ZakatMarketPrices {
  goldPerGram: number;
  silverPerGram: number;
  updatedAt: string;
}

export interface IslamicEventsApiDay {
  date: string;
  hijriDate: {
    day: number;
    month: number;
    year: number;
  };
  events: string[];
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}
