import { NextRequest, NextResponse } from "next/server";
import { getRooms, addRoom, updateRoom, deleteRoom } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(getRooms());
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, text, image, rate, sample, hidden } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Room name required" }, { status: 400 });
  const rooms = addRoom({ name: name.trim(), text: text || "", image: image || "/images/image-14.jpeg", rate: rate || "", sample: !!sample, hidden: !!hidden });
  return NextResponse.json({ rooms }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { index, ...updates } = body;
  if (index === undefined) return NextResponse.json({ error: "Index required" }, { status: 400 });
  const rooms = updateRoom(index, updates);
  return NextResponse.json({ rooms });
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const index = Number(searchParams.get("index"));
  if (isNaN(index)) return NextResponse.json({ error: "Index required" }, { status: 400 });
  const rooms = deleteRoom(index);
  return NextResponse.json({ rooms });
}
