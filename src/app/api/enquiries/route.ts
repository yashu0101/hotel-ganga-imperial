import { NextRequest, NextResponse } from "next/server";
import {
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const enquiries = await getEnquiries();
  return NextResponse.json(enquiries);
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }
    const updated = await updateEnquiryStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { error: "Enquiry not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }
    const success = await deleteEnquiry(id);
    if (!success) {
      return NextResponse.json(
        { error: "Enquiry not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
