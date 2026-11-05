"use client";
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RequestReceipt, {type ReceiptDetails} from "@/components/RequestReceipt";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_CONFIG } from '@/lib/config';
import { hotelToday, dateError, nightlyRate } from '@/lib/reservation';
import type { Room, BanquetPackage } from '@/lib/types';
export default function BookPage() {
    const [rooms, setRooms] = useState<Room[]>(SITE_CONFIG.rooms);
    const [packages, setPackages] = useState<BanquetPackage[]>([]);
    const [type, setType] = useState('room');
    const [choice, setChoice] = useState(SITE_CONFIG.rooms[0].name);
    const [checkin, setCheckin] = useState('');
    const [checkout, setCheckout] = useState('');
    const [guests, setGuests] = useState(2);
    const [roomsRequested,setRoomsRequested]=useState(1);
    const [receipt,setReceipt]=useState<ReceiptDetails|null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reference, setReference] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    useEffect(() => { const q = new URLSearchParams(window.location.search); const initial = q.get('type') || 'room'; Promise.all([fetch('/api/rooms').then(r => { if (!r.ok)
            throw Error(); return r.json(); }), fetch('/api/banquet').then(r => { if (!r.ok)
            throw Error(); return r.json(); })]).then(([rs, ps]) => { const visible = rs.filter((r: Room) => !r.hidden); const active = ps.filter((p: BanquetPackage) => p.active); setRooms(visible); setPackages(active); setType(['banquet', 'dining'].includes(initial) ? initial : 'room'); setChoice(initial === 'banquet' ? (active.some((p:BanquetPackage)=>'Banquet - '+p.name===q.get('package')) ? q.get('package')! : 'Banquet hall') : initial === 'dining' ? 'Dining enquiry' : visible.some((r: Room) => r.name === q.get('room')) ? q.get('room')! : visible[0]?.name || ''); setGuests(initial === 'banquet' ? 50 : 2); setLoaded(true); }).catch(() => { setLoadError(true); }); }, []);
    const room = rooms.find(r => r.name === choice);
    const nightly = room ? nightlyRate(room.rate) || 0 : 0;
    const nights = checkin && checkout ? Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000) : 0;
    async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); const invalid = dateError(checkin, checkout, type === 'room'); if (invalid) {
        setError(invalid);
        return;
    } setBusy(true); const values = new FormData(e.currentTarget); try {
        const res = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.get('name'), mobile: values.get('mobile'), email: values.get('email'), roomType: choice, checkin, checkout, guests, roomsRequested:type==='room'?roomsRequested:0 }) });
        const data = await res.json();
        if (!res.ok)
            throw Error(data.error || 'Please try again.');
        setReceipt({name:String(values.get('name')||''),preference:choice,checkin,checkout,guests,rooms:type==='room'?roomsRequested:0});
        setReference(data.reference);
    }
    catch (err) {
        setError(err instanceof Error ? err.message : 'Please try again.');
    }
    finally {
        setBusy(false);
    } }
    return <div className="reservation-page"><header className="reservation-header"><Link className="wordmark" href="/"><small>Hotel</small>Ganga Imperial</Link><div className="booking-header-actions"><ThemeToggle/><Link href="/">← Back to hotel</Link></div></header><main className="reservation-layout"><aside className="reservation-aside"><Image src="/images/image-49.jpeg" alt="Representative guest room with warm lighting" width={700} height={600} sizes="(max-width:800px) 100vw, 40vw"/><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>Let us take care<br />of the details.</h2><p>A quiet stay, a shared meal or a special celebration. Tell us what you have in mind.</p><ul><li>No payment taken on this website</li><li>Availability confirmed by the hotel</li><li>Final price and terms agreed before booking</li></ul></div></aside><section className="reservation-form"><span className="eyebrow">DIRECT RESERVATION REQUEST</span><h1>{reference ? 'Thank you. We have your request.' : type === 'banquet' ? 'Plan your celebration' : type === 'dining' ? 'Plan a meal with us' : 'Plan your stay'}</h1>{reference && receipt ? <RequestReceipt reference={reference} details={receipt}/> : <><p className="reservation-intro">Share a few details. This is a request, with no payment or commitment at this stage.</p><div className="reservation-tabs" aria-label="Enquiry type">{[['room', 'A room'], ['banquet', 'A celebration'], ['dining', 'Dining']].map(([value, label]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => { setType(value); setChoice(value === 'room' ? rooms[0]?.name || '' : value === 'banquet' ? 'Banquet hall' : 'Dining enquiry'); setGuests(value === 'banquet' ? 50 : 2); setError(''); }}>{label}</button>)}</div>{loadError && <p role="alert">Room options could not be loaded. <button type="button" onClick={() => window.location.reload()}>Try again</button></p>}<form onSubmit={submit}><fieldset><legend><span>01</span> {type === 'room' ? 'Your stay' : 'Your plans'}</legend><div className="reservation-fields"><div className="field"><label htmlFor="arrival">{type === 'room' ? 'Check-in' : 'Event date'} *</label><input id="arrival" type="date" min={hotelToday()} required value={checkin} onChange={e => setCheckin(e.target.value)}/></div><div className="field"><label htmlFor="departure">{type === 'room' ? 'Check-out *' : 'End date (optional)'}</label><input id="departure" type="date" min={checkin || hotelToday()} required={type === 'room'} value={checkout} onChange={e => setCheckout(e.target.value)}/></div><div className="field"><label htmlFor="room">{type === 'room' ? 'Room preference' : type === 'banquet' ? 'Package preference' : 'Enquiry'} *</label><select id="room" value={choice} onChange={e => setChoice(e.target.value)} required>{type === 'room' ? rooms.map(r => <option key={r.name}>{r.name}</option>) : type === 'banquet' ? <><option>Banquet hall</option>{packages.map(p => <option key={p.id} value={'Banquet - ' + p.name}>{p.name} — {p.price}</option>)}</> : <option>Dining enquiry</option>}</select></div>{type==='room'&&<div className="field"><label htmlFor="rooms-requested">Rooms requested *</label><input id="rooms-requested" type="number" min={1} max={10} value={roomsRequested} onChange={e=>setRoomsRequested(Number(e.target.value))} required/></div>}<div className="field"><label htmlFor="guests">Total guests in your party *</label><input id="guests" type="number" min="1" max={type === 'banquet' ? 300 : 20} required value={guests} onChange={e => setGuests(Number(e.target.value))}/></div></div>{type === 'room' && nightly > 0 && <div className="quote-summary"><span>{nights > 0 ? nightly.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) + ' × ' + roomsRequested + ' room(s) × ' + nights + ' night' + (nights === 1 ? '' : 's') : 'Indicative nightly rate'}</span><strong>₹{(nightly * roomsRequested * (nights > 0 ? nights : 1)).toLocaleString('en-IN')}</strong><small>Estimate for the requested room count, before taxes. Guest capacity, inclusions and final rate are subject to hotel confirmation.</small></div>}</fieldset><fieldset><legend><span>02</span> How can we reach you?</legend><div className="field"><label htmlFor="name">Full name *</label><input id="name" name="name" autoComplete="name" maxLength={100} required/></div><div className="reservation-fields"><div className="field"><label htmlFor="mobile">Phone number *</label><input id="mobile" name="mobile" type="tel" autoComplete="tel" inputMode="tel" pattern="[+0-9 ()-]{10,25}" maxLength={25} required/><small>Include your country code.</small></div><div className="field"><label htmlFor="email">Email (optional)</label><input id="email" name="email" type="email" autoComplete="email" maxLength={150}/></div></div></fieldset>{error && <div className="reservation-error" role="alert">{error}</div>}<p className="small-note">We use your details to respond to this request. <Link href="/privacy">Privacy information</Link>. Read the <Link href="/guest-information">guest guide and policies</Link> before confirmation.</p><button className="btn btn-solid request-submit" disabled={busy || !loaded} type="submit">{busy ? 'Sending your request…' : 'Send reservation request ↗'}</button></form></>}</section></main></div>;
}
