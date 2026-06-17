/**
 * SQL DDL statements to create all Prisma-managed tables.
 * Used as a programmatic fallback when `prisma db push` fails on Render.
 * Mirrors prisma/schema.prisma — keep in sync when the schema changes.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT,
    "quartier" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "email" TEXT,
    "web" TEXT,
    "webVerified" BOOLEAN NOT NULL DEFAULT false,
    "webVerifiedAt" DATETIME,
    "webStatus" TEXT,
    "fb" TEXT,
    "wa" TEXT,
    "bookingUrl" TEXT,
    "tripadvisorUrl" TEXT,
    "ratingBooking" REAL NOT NULL DEFAULT 0,
    "reviewsBooking" INTEGER NOT NULL DEFAULT 0,
    "ratingTripadvisor" REAL NOT NULL DEFAULT 0,
    "reviewsTripadvisor" INTEGER NOT NULL DEFAULT 0,
    "priceUsd" TEXT,
    "rooms" INTEGER NOT NULL DEFAULT 0,
    "amenities" TEXT,
    "hasBooking" BOOLEAN NOT NULL DEFAULT false,
    "hasTripadvisor" BOOLEAN NOT NULL DEFAULT false,
    "hasAgoda" BOOLEAN NOT NULL DEFAULT false,
    "hasExpedia" BOOLEAN NOT NULL DEFAULT false,
    "lat" REAL,
    "lng" REAL,
    "notes" TEXT,
    "statusDigital" TEXT NOT NULL DEFAULT 'none',
    "score" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'cold',
    "source" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'nouveau',
    "lastContactAt" DATETIME,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "AIProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "AIProvider_providerId_key" ON "AIProvider"("providerId");

CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Contact_hotelId_idx" ON "Contact"("hotelId");

CREATE TABLE IF NOT EXISTS "AIAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIAnalysis_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "AIAnalysis_hotelId_idx" ON "AIAnalysis"("hotelId");

CREATE TABLE IF NOT EXISTS "VerificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseMs" INTEGER,
    "error" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "VerificationLog_hotelId_idx" ON "VerificationLog"("hotelId");

CREATE TABLE IF NOT EXISTS "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "roomType" TEXT NOT NULL DEFAULT 'standard',
    "specialRequests" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmationCode" TEXT,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Reservation_hotelId_idx" ON "Reservation"("hotelId");
CREATE INDEX IF NOT EXISTS "Reservation_status_idx" ON "Reservation"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_confirmationCode_key" ON "Reservation"("confirmationCode");

CREATE TABLE IF NOT EXISTS "PlanningStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanningStep_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "PlanningStep_reservationId_idx" ON "PlanningStep"("reservationId");

CREATE TABLE IF NOT EXISTS "AgencySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'HotelScout Guinea',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "CollectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultsFound" INTEGER NOT NULL DEFAULT 0,
    "hotelsAdded" INTEGER NOT NULL DEFAULT 0,
    "hotelsUpdated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);
`
