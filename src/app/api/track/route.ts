import { NextRequest, NextResponse } from "next/server";
import { getBookingByIdAndEmail } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, email } = await req.json();
    if (!bookingId?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Booking ID and email are required." }, { status: 400 });
    }

    const booking = await getBookingByIdAndEmail(bookingId.trim(), email.trim());
    if (!booking) {
      return NextResponse.json({ error: "No booking found. Please check your booking ID and email." }, { status: 404 });
    }

    return NextResponse.json({
      id: booking.id,
      name: booking.name,
      roomType: booking.roomType,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guests: booking.guests,
      amount: booking.amount,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
