import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { GeocodeResult } from "../../types/external.types";

/**
 * Geocoding service using Nominatim (OpenStreetMap) with optional LocationIQ fallback.
 * Converts free-text location descriptions into accurate latitude/longitude coordinates.
 * Features:
 *   - Respects Nominatim 1 request/sec rate limit
 *   - Best-effort execution: returns null on failure/timeout (never throws)
 *   - Supports MOCK_EXTERNAL=true for deterministic offline testing
 */
class GeocodingService {
  private lastRequestTime = 0;

  /**
   * Geocode a location string into coordinates and formatted address.
   * @param location - Raw location text from report.
   * @returns GeocodeResult or null if geocoding fails or is disabled.
   */
  async geocode(location: string): Promise<GeocodeResult | null> {
    if (!env.GEOCODING_ENABLED || !location || location.trim().length === 0) {
      return null;
    }

    if (env.MOCK_EXTERNAL) {
      return this.mockGeocode(location);
    }

    // Rate-limit: wait if < 1000ms since last Nominatim request
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
    }
    this.lastRequestTime = Date.now();

    // 1. Try Nominatim
    const nominatimRes = await this.tryNominatim(location);
    if (nominatimRes) return nominatimRes;

    // 2. Try LocationIQ fallback if key is configured
    if (env.LOCATIONIQ_API_KEY) {
      return this.tryLocationIQ(location);
    }

    return null;
  }

  private async tryNominatim(location: string): Promise<GeocodeResult | null> {
    const url = `${env.NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.EXTERNAL_API_TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          "User-Agent": env.NOMINATIM_USER_AGENT,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        logger.warn({ status: response.status }, "Nominatim geocoding returned non-2xx status");
        return null;
      }

      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (isNaN(lat) || isNaN(lon)) return null;

      return {
        latitude: lat,
        longitude: lon,
        formattedAddress: item.display_name,
        provider: "nominatim",
      };
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "Nominatim geocoding failed",
      );
      return null;
    }
  }

  private async tryLocationIQ(location: string): Promise<GeocodeResult | null> {
    const url = `https://eu1.locationiq.com/v1/search.php?key=${env.LOCATIONIQ_API_KEY}&q=${encodeURIComponent(location)}&format=json&limit=1`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.EXTERNAL_API_TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!response.ok) return null;

      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!Array.isArray(data) || data.length === 0) return null;

      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (isNaN(lat) || isNaN(lon)) return null;

      return {
        latitude: lat,
        longitude: lon,
        formattedAddress: item.display_name,
        provider: "locationiq",
      };
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "LocationIQ fallback geocoding failed",
      );
      return null;
    }
  }

  private mockGeocode(location: string): GeocodeResult {
    const lower = location.toLowerCase();
    if (lower.includes("sylhet") || lower.includes("সিলেট") || lower.includes("bondor")) {
      return {
        latitude: 24.8949,
        longitude: 91.8687,
        formattedAddress: "Bondor Bazar, Sylhet, Bangladesh",
        provider: "mock-nominatim",
      };
    }
    if (lower.includes("dhaka") || lower.includes("ঢাকা") || lower.includes("gulshan")) {
      return {
        latitude: 23.8103,
        longitude: 90.4125,
        formattedAddress: "Gulshan, Dhaka, Bangladesh",
        provider: "mock-nominatim",
      };
    }
    if (lower.includes("chittagong") || lower.includes("চট্টগ্রাম") || lower.includes("chattogram")) {
      return {
        latitude: 22.3569,
        longitude: 91.7832,
        formattedAddress: "Chattogram, Bangladesh",
        provider: "mock-nominatim",
      };
    }
    return {
      latitude: 23.685,
      longitude: 90.3563,
      formattedAddress: `${location}, Bangladesh`,
      provider: "mock-nominatim",
    };
  }
}

/** Singleton geocoding service instance. */
export const geocodingService = new GeocodingService();
