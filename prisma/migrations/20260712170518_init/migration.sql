-- CreateEnum
CREATE TYPE "Category" AS ENUM ('medical', 'fire', 'accident', 'crime', 'flood', 'utility', 'public_service', 'infrastructure', 'other');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'in_review', 'assigned', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('bn', 'en', 'unknown');

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'unknown',
    "category" "Category" NOT NULL DEFAULT 'other',
    "urgency" "Urgency" NOT NULL DEFAULT 'medium',
    "summary" TEXT NOT NULL DEFAULT '',
    "suggestedAction" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "embedding" DOUBLE PRECISION[],
    "aiProvider" TEXT NOT NULL DEFAULT 'unknown',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "formattedAddress" TEXT,
    "geocodeProvider" TEXT,
    "weatherContext" JSONB,
    "weatherAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "alertSentAt" TIMESTAMP(3),
    "matchedReportId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "target" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_category_idx" ON "reports"("category");

-- CreateIndex
CREATE INDEX "reports_urgency_idx" ON "reports"("urgency");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "reports_deletedAt_idx" ON "reports"("deletedAt");

-- CreateIndex
CREATE INDEX "reports_category_createdAt_idx" ON "reports"("category", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_reportId_idx" ON "notifications"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_matchedReportId_fkey" FOREIGN KEY ("matchedReportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
