-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
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
    "webVerifiedAt" TIMESTAMP(3),
    "webStatus" TEXT,
    "fb" TEXT,
    "wa" TEXT,
    "bookingUrl" TEXT,
    "tripadvisorUrl" TEXT,
    "ratingBooking" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsBooking" INTEGER NOT NULL DEFAULT 0,
    "ratingTripadvisor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsTripadvisor" INTEGER NOT NULL DEFAULT 0,
    "priceUsd" TEXT,
    "rooms" INTEGER NOT NULL DEFAULT 0,
    "amenities" TEXT,
    "hasBooking" BOOLEAN NOT NULL DEFAULT false,
    "hasTripadvisor" BOOLEAN NOT NULL DEFAULT false,
    "hasAgoda" BOOLEAN NOT NULL DEFAULT false,
    "hasExpedia" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "statusDigital" TEXT NOT NULL DEFAULT 'none',
    "score" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'cold',
    "source" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'nouveau',
    "lastContactAt" TIMESTAMP(3),
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseMs" INTEGER,
    "error" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultsFound" INTEGER NOT NULL DEFAULT 0,
    "hotelsAdded" INTEGER NOT NULL DEFAULT 0,
    "hotelsUpdated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_providerId_key" ON "AIProvider"("providerId");

-- CreateIndex
CREATE INDEX "Contact_hotelId_idx" ON "Contact"("hotelId");

-- CreateIndex
CREATE INDEX "AIAnalysis_hotelId_idx" ON "AIAnalysis"("hotelId");

-- CreateIndex
CREATE INDEX "VerificationLog_hotelId_idx" ON "VerificationLog"("hotelId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
