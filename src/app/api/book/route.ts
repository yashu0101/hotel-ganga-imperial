import {deliverNotifications} from "@/lib/notifications";
import { NextRequest, NextResponse } from 'next/server';
import { addBooking, getRooms, getBanquetPackages } from '@/lib/db';
import { allowRequest } from '@/lib/request-limit';
import { cleanText, dateError } from '@/lib/reservation';
export async function POST(req: NextRequest) {
    try {
        if (Number(req.headers.get('content-length')) > 12000)
            return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
        const b = await req.json();
        const name = cleanText(b.name, 100), mobile = cleanText(b.mobile, 30), email = cleanText(b.email, 150), roomType = cleanText(b.roomType, 150);
        const guests = Number(b.guests);
        if (!name || mobile.replace(/\D/g, '').length < 10 || mobile.replace(/\D/g, '').length > 15 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
            return NextResponse.json({ error: 'Enter your name, a valid phone number and a valid email if provided.' }, { status: 400 });
        if (!allowRequest("reservation:" + mobile.replace(/\D/g, "")))
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        const [rooms, packages] = await Promise.all([getRooms(), getBanquetPackages()]);
        const room = rooms.find(r => !r.hidden && r.name === roomType);
        const pkg = packages.find(p => p.active && 'Banquet - ' + p.name === roomType);
        const event = roomType === 'Banquet hall' || !!pkg;
        const dining = roomType === 'Dining enquiry';
        if (!room && !event && !dining)
            return NextResponse.json({ error: 'Please choose an available room or enquiry type.' }, { status: 400 });
        const roomsRequested = room ? Number(b.roomsRequested ?? 1) : 0;
        if (room && (!Number.isInteger(roomsRequested) || roomsRequested < 1 || roomsRequested > 10)) return NextResponse.json({error:"Request between 1 and 10 rooms."},{status:400});
        const error = dateError(b.checkin, b.checkout, !!room);
        if (error)
            return NextResponse.json({ error }, { status: 400 });
        const maximum = event ? 300 : dining ? 20 : 20;
        if (!Number.isInteger(guests) || guests < 1 || guests > maximum)
            return NextResponse.json({ error: 'Enter a guest count between 1 and ' + maximum + '.' }, { status: 400 });
        // A request does not reserve inventory. Availability is confirmed by the hotel.
        const booking = await addBooking({ name, mobile, email, city: '', country: '', gender: 'other', roomType, checkin: b.checkin, checkout: b.checkout || '', guests, roomsRequested, amount: 0 });
        try { await deliverNotifications(booking.id); } catch { /* Saved requests remain available for notification retry in admin. */ }
        return NextResponse.json({ success: true, reference: booking.id }, { status: 201 });
    }
    catch {
        return NextResponse.json({ error: 'We could not save your request. Please try again.' }, { status: 500 });
    }
}
