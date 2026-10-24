import { NextRequest, NextResponse } from "next/server";
import { addBooking } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, mobile, email, city, country, gender, roomType, checkin, checkout, guests } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!mobile?.trim() || mobile.replace(/[^\d]/g, "").length < 10) {
      return NextResponse.json({ error: "Valid mobile number is required." }, { status: 400 });
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (!city?.trim()) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }
    if (!country?.trim()) {
      return NextResponse.json({ error: "Country is required." }, { status: 400 });
    }
    if (!roomType || !checkin) {
      return NextResponse.json({ error: "Room type and check-in date are required." }, { status: 400 });
    }

    const booking = addBooking({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      city: city.trim(),
      country: country.trim(),
      gender: gender || "other",
      roomType,
      checkin,
      checkout: checkout || "",
      guests: Number(guests) || 1,
      amount: 0,
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
