import { NextRequest, NextResponse } from "next/server";
import { getReviews, addReview, updateReview, deleteReview } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(await getReviews());
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, rating, text, city, active } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const review = await addReview({
    name: name.trim(), rating: rating || 5, text: text || "",
    city: city || "", active: active !== false,
  });
  return NextResponse.json({ review }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const review = await updateReview(id, updates);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ review });
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const ok = await deleteReview(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
