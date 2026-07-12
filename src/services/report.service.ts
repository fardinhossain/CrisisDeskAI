import type { Prisma } from "@prisma/client";
import { reportRepository, toReportResponse } from "../repositories/report.repository";
import { ApiError } from "../utils/ApiError";
import { MESSAGES } from "../constants/messages";
import type {
  CreateReportDto,
  PaginatedResult,
  ReportFilters,
  ReportResponse,
  TriageFields,
} from "../types/report.types";
import type { ReportStatus } from "../constants/enums";
import { aiRouter } from "./ai/ai-router.service";
import { duplicateService } from "./duplicate.service";
import { geocodingService } from "./external/geocoding.service";
import { weatherService } from "./external/weather.service";
import { notificationService } from "./notification/notification.service";
import { detectLanguage } from "../utils/language";
import { buildUserMessage } from "../utils/prompt";

/**
 * Report service — business logic + orchestration.
 * Pipeline: validate → geocode → AI classify & embed → weather/urgency check →
 * duplicate check → persist → critical email alert.
 */

export const reportService = {
  /**
   * Create + triage a report with full external API enrichments.
   */
  async create(dto: CreateReportDto): Promise<ReportResponse> {
    // 1. Auto-detect language if unknown
    const language = dto.language === "unknown" ? detectLanguage(dto.description) : dto.language;
    dto.language = language;

    // 2. Geocode location best-effort (Nominatim / LocationIQ / Mock)
    const geocodeRes = await geocodingService.geocode(dto.location);

    // 3. AI classification via the 3-provider fallback chain
    const aiText = buildUserMessage(dto.description, dto.location);
    const aiResult = await aiRouter.classify({ text: aiText, language });

    const triage: TriageFields = {
      category: aiResult.category,
      urgency: aiResult.urgency,
      summary: aiResult.summary,
      suggestedAction: aiResult.suggestedAction,
      confidence: aiResult.confidence,
      aiProvider: aiResult.provider ?? "unknown",
    };

    // 4. Weather check & dynamic urgency adjustment (if coords exist and category eligible)
    let weatherContext: Prisma.InputJsonValue | undefined = undefined;
    let weatherAdjusted = false;

    if (geocodeRes) {
      const weatherRes = await weatherService.getWeather(geocodeRes.latitude, geocodeRes.longitude);
      if (weatherRes) {
        weatherContext = weatherRes as unknown as Prisma.InputJsonValue;
        const adj = weatherService.adjustUrgency(triage.category, triage.urgency, weatherRes);
        if (adj.adjusted) {
          triage.urgency = adj.urgency;
          weatherAdjusted = true;
        }
      }
    }

    // 5. Generate vector embedding (Gemini text-embedding-004 if configured, else null/[])
    const embedding = (await aiRouter.embed(dto.description)) ?? [];

    // 6. Duplicate check (uses coordinate Haversine distance when geocoding succeeded)
    const dup = await duplicateService.check({
      id: "",
      description: dto.description,
      location: dto.location,
      category: triage.category,
      latitude: geocodeRes?.latitude ?? null,
      longitude: geocodeRes?.longitude ?? null,
      embedding,
    });

    // 7. Persist enriched report
    const data: Prisma.ReportCreateInput = {
      name: dto.name ?? null,
      contact: dto.contact ?? null,
      location: dto.location,
      description: dto.description,
      language: dto.language,
      category: triage.category,
      urgency: triage.urgency,
      summary: triage.summary,
      suggestedAction: triage.suggestedAction,
      confidence: triage.confidence,
      aiProvider: triage.aiProvider,
      possibleDuplicate: dup.possibleDuplicate,
      embedding,
      weatherAdjusted,
      latitude: geocodeRes?.latitude ?? null,
      longitude: geocodeRes?.longitude ?? null,
      formattedAddress: geocodeRes?.formattedAddress ?? null,
      geocodeProvider: geocodeRes?.provider ?? null,
      ...(weatherContext !== undefined ? { weatherContext } : {}),
      ...(dup.matchedReportId
        ? { matchedReport: { connect: { id: dup.matchedReportId } } }
        : {}),
    };

    const report = await reportRepository.create(data);

    // 8. Fire high/critical email alert (best-effort; never fails the submission)
    await notificationService.maybeAlert({
      id: report.id,
      category: report.category,
      urgency: report.urgency,
      location: report.location,
      summary: report.summary,
      suggestedAction: report.suggestedAction,
      confidence: report.confidence,
      latitude: report.latitude,
      longitude: report.longitude,
      formattedAddress: report.formattedAddress,
    });

    // Re-fetch so the response reflects alertSent set by the notification service
    const finalRow = (await reportRepository.findById(report.id)) ?? report;
    return toReportResponse(finalRow);
  },

  /** List reports with filters, pagination and sort. */
  async list(filters: ReportFilters): Promise<PaginatedResult<ReportResponse>> {
    return reportRepository.findMany(filters);
  },

  /** Get one report or throw 404. */
  async getById(id: string): Promise<ReportResponse> {
    const row = await reportRepository.findById(id);
    if (!row) throw ApiError.notFound(MESSAGES.REPORT_NOT_FOUND);
    return toReportResponse(row);
  },

  /** Update status or throw 404. */
  async updateStatus(id: string, status: ReportStatus): Promise<ReportResponse> {
    const row = await reportRepository.updateStatus(id, status);
    if (!row) throw ApiError.notFound(MESSAGES.REPORT_NOT_FOUND);
    return toReportResponse(row);
  },

  /** Soft-delete a report or throw 404. Returns the deleted id. */
  async remove(id: string): Promise<{ id: string }> {
    const row = await reportRepository.softDelete(id);
    if (!row) throw ApiError.notFound(MESSAGES.REPORT_NOT_FOUND);
    return { id: row.id };
  },
};
