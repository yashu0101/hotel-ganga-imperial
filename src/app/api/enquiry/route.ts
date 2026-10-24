import { NextRequest, NextResponse } from "next/server";
import { addEnquiry } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, type, guests, checkin, checkout, message } =
      body;

    if (!name?.trim() || !phone?.trim() || !type || !checkin) {
      return NextResponse.json(
        { error: "Name, phone, enquiry type and check-in date are required." },
        { status: 400 }
      );
    }

    const phoneClean = phone.replace(/[^\d+]/g, "");
    if (phoneClean.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const enquiry = addEnquiry({
      name: name.trim(),
      phone: phoneClean,
      email: email?.trim() || "",
      type,
      guests: Number(guests) || 2,
      checkin,
      checkout: checkout || "",
      message: message?.trim() || "",
    });

    return NextResponse.json(
      { success: true, enquiry },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
