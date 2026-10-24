import { NextRequest, NextResponse } from "next/server";
import { addBooking, getBookings } from "@/lib/db";

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

    // Date validation
    const today = new Date().toISOString().split("T")[0];
    if (checkin < today) {
      return NextResponse.json({ error: "Check-in date cannot be in the past." }, { status: 400 });
    }
    if (checkout && checkout <= checkin) {
      return NextResponse.json({ error: "Check-out must be after check-in." }, { status: 400 });
    }

    // Room availability check (skip for banquet bookings)
    if (!roomType.startsWith("Banquet")) {
      const allBookings = await getBookings();
      const checkoutDate = checkout || checkin;
      const conflict = allBookings.find(b =>
        b.roomType === roomType &&
        b.bookingStatus !== "cancelled" &&
        b.bookingStatus !== "checked-out" &&
        b.checkin <= checkoutDate &&
        (b.checkout || b.checkin) >= checkin
      );
      if (conflict) {
        return NextResponse.json({ error: `${roomType} is not available for the selected dates. Please choose different dates or another room type.` }, { status: 409 });
      }
    }

    const booking = await addBooking({
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
