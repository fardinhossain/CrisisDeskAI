import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { Category, Urgency } from "../../constants/enums";
import type { WeatherResult, WeatherUrgencyAdjustment } from "../../types/external.types";

/**
 * Weather enrichment service using Open-Meteo (free, no API key required).
 * Retrieves current precipitation and 24h rain accumulation for geocoded coordinates.
 * Evaluates weather conditions against incident categories to dynamically adjust triage urgency.
 */
class WeatherService {
  /**
   * Fetch weather data for given latitude and longitude.
   * @param lat - Latitude in decimal degrees.
   * @param lng - Longitude in decimal degrees.
   * @returns WeatherResult or null if weather check fails/disabled.
   */
  async getWeather(lat: number, lng: number): Promise<WeatherResult | null> {
    if (!env.WEATHER_ENABLED) {
      return null;
    }

    if (env.MOCK_EXTERNAL) {
      return this.mockWeather();
    }

    const url = `${env.OPEN_METEO_BASE_URL}?latitude=${lat}&longitude=${lng}&current=precipitation,rain,weather_code,temperature_2m&past_days=1&daily=precipitation_sum`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.EXTERNAL_API_TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal }).finally(() =>
        clearTimeout(timer),
      );

      if (!response.ok) {
        logger.warn({ status: response.status }, "Open-Meteo API returned non-2xx status");
        return null;
      }

      const data = (await response.json()) as {
        current?: {
          temperature_2m?: number;
          precipitation?: number;
          rain?: number;
          weather_code?: number;
        };
        daily?: {
          precipitation_sum?: number[];
        };
      };

      const current = data.current ?? {};
      const daily = data.daily ?? {};

      // Calculate 24h rain accumulation (past day + current rain)
      const pastDayRain = Array.isArray(daily.precipitation_sum) && daily.precipitation_sum[0] !== undefined
        ? daily.precipitation_sum[0]
        : 0;
      const currentRain = current.rain ?? current.precipitation ?? 0;
      const rain24hMm = pastDayRain + currentRain;

      const weatherCode = typeof current.weather_code === "number" ? current.weather_code : null;

      return {
        temperatureC: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
        precipitationMm: current.precipitation ?? 0,
        rain24hMm,
        weatherCode,
        condition: this.getWeatherCondition(weatherCode),
        source: "open-meteo",
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "Open-Meteo weather fetch failed",
      );
      return null;
    }
  }

  /**
   * Adjust report urgency based on environmental weather severity.
   * If heavy rain (>= WEATHER_HEAVY_RAIN_MM) is detected during a flood, infrastructure,
   * or utility incident, urgency is nudged up by one level.
   *
   * @param category - Report category.
   * @param urgency - Initial AI-assigned urgency.
   * @param weather - Fetched WeatherResult.
   * @returns WeatherUrgencyAdjustment with updated urgency and adjusted boolean flag.
   */
  adjustUrgency(
    category: Category,
    urgency: Urgency,
    weather: WeatherResult | null,
  ): WeatherUrgencyAdjustment {
    if (!weather || !env.WEATHER_ENABLED) {
      return { urgency, adjusted: false };
    }

    const eligibleCategories = env.WEATHER_CATEGORIES.map((c: string) => c.trim().toLowerCase());
    if (!eligibleCategories.includes(category.toLowerCase())) {
      return { urgency, adjusted: false };
    }

    // Check if rain accumulation meets/exceeds heavy rain threshold
    if (weather.rain24hMm >= env.WEATHER_HEAVY_RAIN_MM || weather.precipitationMm >= 25) {
      let nudged: Urgency = urgency;
      if (urgency === "low") nudged = "medium";
      else if (urgency === "medium") nudged = "high";
      else if (urgency === "high") nudged = "critical";
      // if critical, stays critical

      const adjusted = nudged !== urgency;
      if (adjusted) {
        logger.info(
          { category, oldUrgency: urgency, newUrgency: nudged, rain24hMm: weather.rain24hMm },
          "Urgency nudged upward by severe weather conditions",
        );
      }
      return { urgency: nudged, adjusted };
    }

    return { urgency, adjusted: false };
  }

  private getWeatherCondition(code: number | null): string {
    if (code === null) return "Unknown";
    if (code === 0) return "Clear sky";
    if (code >= 1 && code <= 3) return "Partly cloudy";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code >= 61 && code <= 65) return "Rain";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 95 && code <= 99) return "Thunderstorm";
    return "Cloudy/Other";
  }

  private mockWeather(): WeatherResult {
    return {
      temperatureC: 28.5,
      precipitationMm: 15.0,
      rain24hMm: 65.0, // Deliberately > 50mm threshold to demonstrate urgency nudge when testing
      weatherCode: 63,
      condition: "Moderate/Heavy Rain",
      source: "mock-open-meteo",
      fetchedAt: new Date().toISOString(),
    };
  }
}

/** Singleton weather service instance. */
export const weatherService = new WeatherService();
