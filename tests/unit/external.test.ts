import { geocodingService } from "../../src/services/external/geocoding.service";
import { weatherService } from "../../src/services/external/weather.service";
import { notificationService } from "../../src/services/notification/notification.service";
import { notificationRepository } from "../../src/repositories/notification.repository";
import { reportRepository } from "../../src/repositories/report.repository";
import type { Report } from "@prisma/client";

describe("External API Enrichment Services (unit — MOCK_EXTERNAL=true)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("geocodingService.geocode()", () => {
    it("returns deterministic coordinates for known Bangladeshi cities in mock mode", async () => {
      const res = await geocodingService.geocode("Sylhet, Bangladesh");
      expect(res).not.toBeNull();
      if (res) {
        expect(res.latitude).toBeCloseTo(24.8949, 2);
        expect(res.longitude).toBeCloseTo(91.8687, 2);
        expect(res.provider).toBe("mock-nominatim");
      }
    });
  });

  describe("weatherService.getWeather() & adjustUrgency()", () => {
    it("returns mock weather context containing rainfall summary", async () => {
      const weather = await weatherService.getWeather(25.1, 91.8);
      expect(weather).not.toBeNull();
      if (weather) {
        expect(weather.rain24hMm).toBeGreaterThanOrEqual(0);
        expect(typeof weather.condition).toBe("string");
      }
    });

    it("nudges urgency upward for flood reports during heavy rain condition", () => {
      const mockWeather = {
        temperatureC: 28,
        precipitationMm: 30,
        rain24hMm: 65,
        weatherCode: 63,
        condition: "Heavy rain",
        source: "open-meteo",
        fetchedAt: new Date().toISOString(),
      };

      const adjusted = weatherService.adjustUrgency("flood", "high", mockWeather);
      expect(adjusted.urgency).toBe("critical");
      expect(adjusted.adjusted).toBe(true);
    });
  });

  describe("notificationService.maybeAlert()", () => {
    it("executes simulated email alert dispatch for critical urgency reports without throwing", async () => {
      jest.spyOn(notificationRepository, "create").mockResolvedValue({
        id: "mock-note",
        reportId: "mock-critical-report-1",
        channel: "email",
        recipient: "alert@crisisdesk.ai",
        subject: "Critical Emergency Alert",
        body: "Alert details",
        status: "sent",
        errorMessage: null,
        sentAt: new Date(),
        createdAt: new Date(),
      } as any);

      const mockReport: Report = {
        id: "mock-critical-report-1",
        name: null,
        contact: null,
        description: "Severe flash flood in progress",
        location: "Sylhet",
        category: "flood",
        urgency: "critical",
        status: "pending",
        language: "en",
        summary: "Flash flood alert",
        suggestedAction: "",
        confidence: 0.96,
        embedding: [],
        aiProvider: "gemini",
        latitude: 25.1,
        longitude: 91.8,
        formattedAddress: "Sylhet, Bangladesh",
        geocodeProvider: "nominatim",
        possibleDuplicate: false,
        matchedReportId: null,
        weatherContext: "65mm rain in 24h",
        weatherAdjusted: true,
        alertSent: false,
        alertSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(reportRepository, "markAlertSent").mockResolvedValue(mockReport);

      await expect(notificationService.maybeAlert(mockReport)).resolves.not.toThrow();
    });
  });
});
