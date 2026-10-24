import { NextRequest, NextResponse } from "next/server";
import { getDiningOptions, addDiningOption, updateDiningOption, deleteDiningOption } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(await getDiningOptions());
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, description, price, category, active } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const opt = await addDiningOption({
    name: name.trim(), description: description || "", price: price || "",
    category: category || "dinner", active: active !== false,
  });
  return NextResponse.json({ option: opt }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const opt = await updateDiningOption(id, updates);
  if (!opt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ option: opt });
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const ok = await deleteDiningOption(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
