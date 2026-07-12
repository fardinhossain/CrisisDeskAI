import type { Urgency } from "../constants/enums";

/**
 * Result of geocoding a location string to geographic coordinates.
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  provider: string;
}

/**
 * Weather forecast and context retrieved from Open-Meteo for a specific location.
 * Stored inside the report's `weatherContext` JSON column.
 */
export interface WeatherResult {
  temperatureC: number | null;
  precipitationMm: number;
  rain24hMm: number;
  weatherCode: number | null;
  condition: string;
  source: string;
  fetchedAt: string;
}

/**
 * Outcome of evaluating weather context against the report's urgency.
 */
export interface WeatherUrgencyAdjustment {
  urgency: Urgency;
  adjusted: boolean;
}

/**
 * Input for sending a critical email alert.
 */
export interface EmailAlertInput {
  to: string[];
  subject: string;
  html: string;
}
