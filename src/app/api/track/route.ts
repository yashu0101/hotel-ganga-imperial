import { NextRequest, NextResponse } from "next/server";
import { getBookingByIdAndEmail, StorageUnavailableError } from "@/lib/db";
import { allowRequest, clientKey } from "@/lib/request-limit";
import { cleanText } from "@/lib/reservation";
import { logError } from "@/lib/log";

export async function POST(req: NextRequest) {
  try {
    if (!allowRequest("track:" + clientKey(req.headers), 20))
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    const b = await req.json();
    const reference = cleanText(b.reference, 64),
      email = cleanText(b.email, 150);
    if (reference.length < 8 || !email)
      return NextResponse.json({ error: "Enter your request reference and the email you used." }, { status: 400 });
    const booking = await getBookingByIdAndEmail(reference, email);
    if (!booking)
      return NextResponse.json(
        { error: "We could not find a request with that reference and email. Please check both and try again." },
        { status: 404 },
      );
    // Only what the guest already gave us, plus the hotel's status. No contact details are returned.
    return NextResponse.json({
      reference: booking.id.slice(0, 8).toUpperCase(),
      roomType: booking.roomType,
      roomsRequested: booking.roomsRequested ?? 0,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guests: booking.guests,
      status: booking.bookingStatus,
      createdAt: booking.createdAt,
    });
  } catch (error) {
    if (!(error instanceof SyntaxError)) logError("track.lookup_failed", error);
    if (error instanceof StorageUnavailableError)
      return NextResponse.json({ error: "Request tracking is temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
