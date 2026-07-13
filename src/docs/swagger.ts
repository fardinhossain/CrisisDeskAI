import type { Application } from "express";
import swaggerUi from "swagger-ui-express";

/**
 * OpenAPI 3.0 specification for CrisisDesk AI.
 */
export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "CrisisDesk AI API",
    version: "1.0.0",
    description:
      "Automated emergency report intake and multi-provider AI triage platform for Bangladesh.",
  },
  servers: [
    {
      url: "/api",
      description: "API server base path",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: { type: "object", nullable: true },
          errors: { type: "array", items: { type: "string" } },
        },
      },
      CreateReportInput: {
        type: "object",
        required: ["description", "location"],
        properties: {
          name: { type: "string", example: "Rahim" },
          contact: { type: "string", example: "017xxxxxxxx" },
          location: { type: "string", example: "Sylhet Bondor Bazar" },
          description: { type: "string", example: "There is a fire near a shop and people are trapped." },
          language: { type: "string", enum: ["bn", "en", "unknown"], example: "bn" },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@crisisdesk.ai" },
          password: { type: "string", example: "admin123" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "System health check",
        tags: ["System"],
        responses: {
          200: { description: "Service and database online" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Admin authentication",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          200: { description: "JWT issued successfully" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/reports": {
      post: {
        summary: "Submit emergency report (Public)",
        tags: ["Reports"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateReportInput" },
            },
          },
        },
        responses: {
          201: { description: "Report triaged and saved" },
          400: { description: "Validation error" },
        },
      },
      get: {
        summary: "List emergency reports (Admin)",
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "urgency", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: { description: "Reports listed with pagination" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/reports/stats/summary": {
      get: {
        summary: "System analytics summary (Admin)",
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Aggregated totals and breakdowns" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/reports/{id}": {
      get: {
        summary: "Get report by ID (Admin)",
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Report details" },
          404: { description: "Report not found" },
        },
      },
      delete: {
        summary: "Soft delete report (Admin)",
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Report soft deleted" },
          404: { description: "Report not found" },
        },
      },
    },
    "/reports/{id}/status": {
      patch: {
        summary: "Update report triage status (Admin)",
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", example: "assigned" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Status updated" },
          400: { description: "Invalid enum" },
        },
      },
    },
  },
};

/**
 * Mount Swagger UI at `/docs`.
 */
export function setupDocs(app: Application): void {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
