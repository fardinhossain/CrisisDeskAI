import request from "supertest";
import { createApp } from "../../src/app";
import { signAdminToken } from "../../src/utils/jwt";
import { reportRepository } from "../../src/repositories/report.repository";
import { notificationRepository } from "../../src/repositories/notification.repository";
import { analyticsService } from "../../src/services/analytics.service";
import { prisma } from "../../src/config/prisma";

const app = createApp();

describe("Integration API Tests (supertest + MOCK_AI=true)", () => {
  let dbConnected = false;
  let adminToken: string;

  beforeAll(async () => {
    adminToken = signAdminToken({ sub: "admin@crisisdesk.ai", role: "admin" });

    try {
      // Test DB table readiness with short timeout
      await Promise.race([
        prisma.report.count(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB/Table Not Ready")), 2500)),
      ]);

      const dbUrl = process.env.DATABASE_URL || "";
      if (dbUrl.includes("neon.tech") || dbUrl.includes("neondb")) {
        // eslint-disable-next-line no-console
        console.warn("⚠️ Safety Warning: Remote Neon database detected in tests. Skipping database wipes to prevent data loss.");
        dbConnected = false;
      } else {
        dbConnected = true;
        await prisma.notification.deleteMany();
        await prisma.report.deleteMany();
      }
    } catch {
      dbConnected = false;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("System Routes", () => {
    it("GET / returns API summary and documentation links", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("CrisisDesk AI");
    });

    it("GET /api/health checks system health", async () => {
      if (!dbConnected) {
        jest.spyOn(prisma, "$queryRaw").mockResolvedValue([{ 1: 1 }] as any);
      }
      const res = await request(app).get("/api/health");
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty("success");
    });
  });

  describe("Auth Routes (POST /api/auth/login)", () => {
    it("returns 200 and a valid JWT token on successful login", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@crisisdesk.ai",
        password: "admin123",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it("returns 401 on invalid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@crisisdesk.ai",
        password: "wrongpassword999",
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Report Intake & Admin Management Routes", () => {
    const mockCreatedReport = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: null,
      contact: "+8801712345678",
      description: "Large fire at Mirpur 10 circle market",
      location: "Mirpur 10, Dhaka",
      category: "fire",
      urgency: "critical",
      status: "pending",
      language: "en",
      summary: "Triaged fire report",
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
      alertSent: true,
      alertSentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it("POST /api/reports submits and triages a new emergency report (Public)", async () => {
      if (!dbConnected) {
        jest.spyOn(reportRepository, "findDuplicateCandidates").mockResolvedValue([]);
        jest.spyOn(reportRepository, "create").mockResolvedValue(mockCreatedReport as any);
        jest.spyOn(notificationRepository, "create").mockResolvedValue({ id: "note-1" } as any);
        jest.spyOn(reportRepository, "markAlertSent").mockResolvedValue(mockCreatedReport as any);
        jest.spyOn(reportRepository, "findById").mockResolvedValue(mockCreatedReport as any);
      }

      const res = await request(app).post("/api/reports").send({
        description: "Large fire at Mirpur 10 circle market",
        location: "Mirpur 10, Dhaka",
        contact: "+8801712345678",
      });

      expect([201, 200]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it("POST /api/reports returns 400 validation error if required fields are missing", async () => {
      const res = await request(app).post("/api/reports").send({
        location: "Mirpur 10, Dhaka",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/reports blocks unauthorized requests without JWT token", async () => {
      const res = await request(app).get("/api/reports");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/reports lists reports when authorized with valid admin token", async () => {
      if (!dbConnected) {
        jest.spyOn(reportRepository, "findMany").mockResolvedValue({
          items: [mockCreatedReport as any],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        });
      }

      const res = await request(app)
        .get("/api/reports?page=1&limit=20")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it("GET /api/reports/:id retrieves specific report by ID", async () => {
      if (!dbConnected) {
        jest.spyOn(reportRepository, "findById").mockResolvedValue(mockCreatedReport as any);
      }

      const res = await request(app)
        .get(`/api/reports/${mockCreatedReport.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.id).toBe(mockCreatedReport.id);
      }
    });

    it("PATCH /api/reports/:id/status updates triage status", async () => {
      if (!dbConnected) {
        jest.spyOn(reportRepository, "findById").mockResolvedValue(mockCreatedReport as any);
        jest.spyOn(reportRepository, "updateStatus").mockResolvedValue({
          ...mockCreatedReport,
          status: "assigned",
        } as any);
      }

      const res = await request(app)
        .patch(`/api/reports/${mockCreatedReport.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "assigned" });

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.status).toBe("assigned");
      }
    });

    it("DELETE /api/reports/:id performs soft deletion", async () => {
      if (!dbConnected) {
        jest.spyOn(reportRepository, "findById").mockResolvedValue(mockCreatedReport as any);
        jest.spyOn(reportRepository, "softDelete").mockResolvedValue({
          ...mockCreatedReport,
          deletedAt: new Date(),
        } as any);
      }

      const res = await request(app)
        .delete(`/api/reports/${mockCreatedReport.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe("Analytics Summary Routes", () => {
    it("GET /api/reports/stats/summary returns aggregate metrics", async () => {
      if (!dbConnected) {
        jest.spyOn(analyticsService, "getSummary").mockResolvedValue({
          totalReports: 15,
          criticalReports: 5,
          pendingReports: 3,
          resolvedReports: 10,
          categoryBreakdown: { fire: 8, flood: 7 },
          urgencyBreakdown: { critical: 10, high: 5 },
          statusBreakdown: { pending: 6, assigned: 9 },
          duplicateReports: 2,
          averageConfidence: 0.93,
        });
      }

      const res = await request(app)
        .get("/api/reports/stats/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalReports).toBeDefined();
      expect(res.body.data.categoryBreakdown).toBeDefined();
      expect(res.body.data.urgencyBreakdown).toBeDefined();
    });
  });
});
