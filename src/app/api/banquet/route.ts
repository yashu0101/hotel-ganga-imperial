import { NextRequest, NextResponse } from "next/server";
import { getBanquetPackages, addBanquetPackage, updateBanquetPackage, deleteBanquetPackage } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(await getBanquetPackages());
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, description, capacity, price, includes, active } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Package name required" }, { status: 400 });
  const pkg = await addBanquetPackage({
    name: name.trim(), description: description || "", capacity: capacity || "",
    price: price || "", includes: includes || [], active: active !== false,
  });
  return NextResponse.json({ package: pkg }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const pkg = await updateBanquetPackage(id, updates);
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ package: pkg });
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const ok = await deleteBanquetPackage(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
