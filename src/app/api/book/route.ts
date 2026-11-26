import { deliverNotifications } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { addBooking, getRooms, getBanquetPackages, getOffers, StorageUnavailableError } from "@/lib/db";
import { allowRequest, clientKey } from "@/lib/request-limit";
import { cleanText, couponPercent, dateError, findCoupon, normalizeCoupon, phoneError } from "@/lib/reservation";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length")) > 12000)
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const b = await req.json();
    const name = cleanText(b.name, 100),
      mobile = cleanText(b.mobile, 30),
      email = cleanText(b.email, 150),
      roomType = cleanText(b.roomType, 150),
      specialRequests = cleanText(b.specialRequests, 500),
      couponCode = normalizeCoupon(b.couponCode);
    if (!name) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    const phoneProblem = phoneError(mobile);
    if (phoneProblem) return NextResponse.json({ error: phoneProblem }, { status: 400 });
    if (email && !EMAIL.test(email))
      return NextResponse.json({ error: "Enter a valid email address, or leave it blank." }, { status: 400 });
    // Limited per client address: changing the phone number does not bypass it, and nobody can
    // block a guest by submitting with the guest's number.
    if (!allowRequest("reservation:" + clientKey(req.headers), 8))
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

    const [rooms, packages] = await Promise.all([getRooms(), getBanquetPackages()]);
    const room = rooms.find(r => !r.hidden && r.name === roomType);
    const pkg = packages.find(p => p.active && "Banquet - " + p.name === roomType);
    const event = roomType === "Banquet hall" || !!pkg;
    const dining = roomType === "Dining enquiry";
    if (!room && !event && !dining)
      return NextResponse.json({ error: "Please choose an available room or enquiry type." }, { status: 400 });

    const roomsRequested = room ? Number(b.roomsRequested ?? 1) : 0;
    if (room && (!Number.isInteger(roomsRequested) || roomsRequested < 1 || roomsRequested > 10))
      return NextResponse.json({ error: "Request between 1 and 10 rooms." }, { status: 400 });
    const error = dateError(b.checkin, b.checkout, !!room);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const guests = Number(b.guests),
      maximum = event ? 300 : 20;
    if (!Number.isInteger(guests) || guests < 1 || guests > maximum)
      return NextResponse.json({ error: "Enter a guest count between 1 and " + maximum + "." }, { status: 400 });

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
      roomType,
      checkin: b.checkin,
      checkout: b.checkout || "",
      guests,
      roomsRequested,
      specialRequests: coupon
        ? [`Coupon ${coupon.code} (${coupon.title})`, specialRequests].filter(Boolean).join(" · ")
        : specialRequests,
      amount: 0,
    });
    try {
      await deliverNotifications(booking.id);
    } catch {
      /* Saved requests remain available for notification retry in admin. */
    }
    return NextResponse.json(
      coupon ? { success: true, reference: booking.id, coupon } : { success: true, reference: booking.id },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof StorageUnavailableError)
      return NextResponse.json(
        { error: "Online requests are temporarily unavailable. Please call or message the hotel." },
        { status: 503 },
      );
    return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }
}
