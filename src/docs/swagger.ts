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
        summary: "System analytics summary (Public)",
        tags: ["Analytics"],
        responses: {
          200: { description: "Aggregated totals and breakdowns" },
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

const customCss = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
body {
  margin: 0;
  background: #0f172a;
}
.swagger-ui {
  font-family: 'Inter', sans-serif !important;
  background: radial-gradient(circle at top right, #1e1b4b, #0f172a 60%) !important;
  color: #f1f5f9 !important;
  min-height: 100vh;
  padding-bottom: 50px;
}
.swagger-ui .topbar {
  background-color: rgba(15, 23, 42, 0.8) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.swagger-ui .info .title {
  color: #ffffff !important;
  font-size: 2.5rem !important;
  font-weight: 700 !important;
  letter-spacing: -0.025em !important;
  background: linear-gradient(135deg, #a78bfa, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info td {
  color: #94a3b8 !important;
}
.swagger-ui .scheme-container {
  background: rgba(30, 41, 59, 0.5) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  margin: 20px 0 !important;
  padding: 15px 20px !important;
}
.swagger-ui select, .swagger-ui input[type=text] {
  background: #0f172a !important;
  color: #f1f5f9 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
}
.swagger-ui .btn {
  border-radius: 8px !important;
  transition: all 0.2s ease-in-out !important;
}
.swagger-ui .btn.authorize {
  background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
  color: white !important;
  border: none !important;
}
.swagger-ui .btn.authorize:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
.swagger-ui .opblock {
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  background: rgba(30, 41, 59, 0.3) !important;
  backdrop-filter: blur(4px);
  transition: transform 0.2s, box-shadow 0.2s;
}
.swagger-ui .opblock:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
}
.swagger-ui .opblock .opblock-summary {
  padding: 12px 20px !important;
}
.swagger-ui .opblock .opblock-summary-method {
  border-radius: 6px !important;
  font-weight: 600 !important;
}
.swagger-ui .opblock-post {
  background: rgba(16, 185, 129, 0.05) !important;
}
.swagger-ui .opblock-get {
  background: rgba(59, 130, 246, 0.05) !important;
}
.swagger-ui .opblock-put {
  background: rgba(245, 158, 11, 0.05) !important;
}
.swagger-ui .opblock-delete {
  background: rgba(239, 68, 68, 0.05) !important;
}
.swagger-ui .opblock-patch {
  background: rgba(139, 92, 246, 0.05) !important;
}
.swagger-ui .model-box {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 8px !important;
}
`;

/**
 * Mount Swagger UI at `/docs`.
 */
export function setupDocs(app: Application): void {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss,
      swaggerOptions: {
        defaultModelsExpandDepth: -1,
      },
    })
  );
}
