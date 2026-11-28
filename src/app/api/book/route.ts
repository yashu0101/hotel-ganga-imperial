import { deliverNotifications } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { addBooking, getRooms, getBanquetPackages, getOffers, StorageUnavailableError } from "@/lib/db";
import { allowRequest, clientKey } from "@/lib/request-limit";
import { logError } from "@/lib/log";
import { cleanText, contactError, couponPercent, findCoupon, normalizeCoupon, resolveStay } from "@/lib/reservation";

export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length")) > 12000)
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const b = await req.json();
    // Honeypot: guests never see the "website" field, so a value means an automated submission.
    // Answer like a success so the bot learns nothing, but save and notify nothing.
    if (cleanText(b.website, 200))
      return NextResponse.json({ success: true, reference: crypto.randomUUID() }, { status: 201 });
    const name = cleanText(b.name, 100),
      mobile = cleanText(b.mobile, 30),
      email = cleanText(b.email, 150),
      specialRequests = cleanText(b.specialRequests, 500),
      couponCode = normalizeCoupon(b.couponCode);
    const contactProblem = contactError({ name, mobile, email });
    if (contactProblem) return NextResponse.json({ error: contactProblem }, { status: 400 });
    // Limited per client address: changing the phone number does not bypass it, and nobody can
    // block a guest by submitting with the guest's number.
    if (!allowRequest("reservation:" + clientKey(req.headers), 8))
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

    const [rooms, packages] = await Promise.all([getRooms(), getBanquetPackages()]);
    const resolved = resolveStay(b, rooms, packages);
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });
    const { stay } = resolved;

    // Coupons are optional. The hotel applies the offer when it confirms the final rate.
    let coupon: { code: string; title: string; percent: number } | null = null;
    if (couponCode) {
      const offer = findCoupon(await getOffers(), couponCode);
      if (!offer) return NextResponse.json({ error: "That coupon code is not valid or has expired." }, { status: 400 });
      coupon = { code: couponCode, title: offer.title, percent: couponPercent(offer) };
    }

    // A request does not reserve inventory. Availability is confirmed by the hotel.
    const booking = await addBooking({
      name,
      mobile,
      email,
      city: "",
      country: "",
      gender: "other",
      roomType: stay.roomType,
      roomId: stay.roomId,
      checkin: stay.checkin,
      checkout: stay.checkout,
      guests: stay.guests,
      roomsRequested: stay.roomsRequested,
      specialRequests: coupon
        ? [`Coupon ${coupon.code} (${coupon.title})`, specialRequests].filter(Boolean).join(" · ")
        : specialRequests,
      amount: 0,
    });
    try {
      await deliverNotifications(booking.id);
    } catch (error) {
      // The request is saved; its notification stays queued for the next retry.
      logError("book.notification_failed", error, { reference: booking.id });
    }
    return NextResponse.json(
      coupon ? { success: true, reference: booking.id, coupon } : { success: true, reference: booking.id },
      { status: 201 },
    );
  } catch (error) {
    logError("book.request_failed", error);
    if (error instanceof StorageUnavailableError)
      return NextResponse.json(
        { error: "Online requests are temporarily unavailable. Please call or message the hotel." },
        { status: 503 },
      );
    return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }
}
