import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const VERSION = process.env.npm_package_version ?? "0.2.0";

export async function GET() {
  let dbStatus: "ok" | "unreachable" = "ok";

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "unreachable";
  }

  const healthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      version: VERSION,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}