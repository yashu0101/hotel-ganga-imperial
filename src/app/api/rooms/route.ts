import { NextResponse } from "next/server";
import { SITE_CONFIG } from "@/lib/config";

export async function GET() {
  return NextResponse.json(SITE_CONFIG.rooms);
}
