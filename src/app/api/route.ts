import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isUsingDefaultEncryptionKey, getEncryptionKeyHint } from "@/lib/security";

const VERSION = process.env.npm_package_version ?? "0.2.0";

export async function GET() {
  let dbStatus: "ok" | "unreachable" = "ok";

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "unreachable";
  }

  const healthy = dbStatus === "ok";
  const usingDefaultKey = isUsingDefaultEncryptionKey();

  const warnings: string[] = [];
  if (usingDefaultKey) {
    warnings.push("INSECURE: ENCRYPTION_KEY is still the default value. Change it in production!");
  }

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      version: VERSION,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        encryptionKey: usingDefaultKey ? "default_insecure" : "custom",
        encryptionKeyHint: getEncryptionKeyHint(),
      },
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    { status: healthy ? 200 : 503 }
  );
}
