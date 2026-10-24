import { NextRequest, NextResponse } from "next/server";
import { getOffers, addOffer, updateOffer, deleteOffer } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(await getOffers());
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, description, discount, validFrom, validTo, active } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const offer = await addOffer({
    title: title.trim(), description: description || "", discount: discount || "",
    validFrom: validFrom || "", validTo: validTo || "", active: active !== false,
  });
  return NextResponse.json({ offer }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const offer = await updateOffer(id, updates);
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ offer });
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const ok = await deleteOffer(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
