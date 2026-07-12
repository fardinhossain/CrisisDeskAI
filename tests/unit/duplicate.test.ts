import { duplicateService } from "../../src/services/duplicate.service";
import { reportRepository } from "../../src/repositories/report.repository";
import type { Report } from "@prisma/client";

const mockCandidate: Report = {
  id: "candidate-uuid-1",
  name: null,
  contact: null,
  description: "Large fire at Mirpur 10 market stalls, spreading fast!",
  location: "Mirpur 10, Dhaka",
  category: "fire",
  urgency: "critical",
  status: "pending",
  language: "en",
  summary: "Fire at Mirpur 10 stalls",
  suggestedAction: "",
  confidence: 0.95,
  embedding: [],
  aiProvider: "gemini",
  latitude: 23.8069,
  longitude: 90.3687,
  formattedAddress: "Mirpur 10, Dhaka",
  geocodeProvider: "nominatim",
  possibleDuplicate: false,
  matchedReportId: null,
  weatherContext: null,
  weatherAdjusted: false,
  alertSent: false,
  alertSentAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("Duplicate Detection Service (unit)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("flags a near-duplicate when description and coordinate locations are very close", async () => {
    jest.spyOn(reportRepository, "findDuplicateCandidates").mockResolvedValue([mockCandidate]);

    const target = {
      id: "target-uuid-2",
      description: "Large fire reported at Mirpur 10 market stalls spreading fast!",
      location: "Mirpur 10 Circle, Dhaka",
      category: "fire" as const,
      latitude: 23.807,
      longitude: 90.3688,
    };

    const res = await duplicateService.check(target);
    expect(res.possibleDuplicate).toBe(true);
    expect(res.matchedReportId).toBe(mockCandidate.id);
  });

  it("returns possibleDuplicate=false when no candidate reaches the threshold score", async () => {
    jest.spyOn(reportRepository, "findDuplicateCandidates").mockResolvedValue([mockCandidate]);

    const target = {
      id: "target-uuid-3",
      description: "Minor road accident involving two motorcycles near Uttara Sector 4",
      location: "Uttara Sector 4, Dhaka",
      category: "accident" as const,
      latitude: 23.87,
      longitude: 90.4,
    };

    const res = await duplicateService.check(target);
    expect(res.possibleDuplicate).toBe(false);
    expect(res.matchedReportId).toBeNull();
  });
});
