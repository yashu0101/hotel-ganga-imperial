"use client";

import { useState, FormEvent } from "react";
import { SITE_CONFIG } from "@/lib/config";

export default function EnquiryForm() {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roomOptions = SITE_CONFIG.rooms.map((r) => r.name);
  const allOptions = [...roomOptions, "Banquet hall", "Spa", "Something else"];

  const validate = (form: HTMLFormElement) => {
    const errs: Record<string, string> = {};
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const checkin = (form.elements.namedItem("checkin") as HTMLInputElement).value;
    const checkout = (form.elements.namedItem("checkout") as HTMLInputElement).value;
    const guests = Number((form.elements.namedItem("guests") as HTMLInputElement).value);

    if (!name) errs.name = "Please enter your name.";
    if (!phone || phone.replace(/[^\d]/g, "").length < 10)
      errs.phone = "Please enter a valid phone number.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Please enter a valid email.";
    if (!checkin) errs.checkin = "Please select a date.";
    if (checkout && checkout < checkin) errs.checkout = "Check-out must be after check-in.";
    if (guests < 1 || guests > 1000) errs.guests = "Enter a valid number of guests.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!validate(form)) return;

    setSubmitting(true);
    setStatus("");

    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      type: (form.elements.namedItem("type") as HTMLSelectElement).value,
      guests: Number((form.elements.namedItem("guests") as HTMLInputElement).value),
      checkin: (form.elements.namedItem("checkin") as HTMLInputElement).value,
      checkout: (form.elements.namedItem("checkout") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim(),
    };

    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("Your enquiry has been received! The team will get back to you shortly.");
        form.reset();
        setErrors({});
      } else {
        const err = await res.json();
        setStatus(err.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("Could not send your enquiry. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const contact = SITE_CONFIG.contact;

  return (
    <section id="enquire">
      <div className="wrap enq">
        <div>
          <h2>Plan your stay</h2>
          <p style={{ marginTop: 24 }}>
            Tell us your dates, what you&apos;re looking for and how to reach you.
            The team will confirm availability.
          </p>
          <ul className="contact-lines">
            {contact.phone && (
              <li>
                <span>Phone</span>
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
              </li>
            )}
            {contact.whatsapp && (
              <li>
                <span>WhatsApp</span>
                <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  Chat with the front desk
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <span>Email</span>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            )}
            {contact.address && (
              <li>
                <span>Address</span>{contact.address}
              </li>
            )}
          </ul>

          <div className="keycard-wrap" aria-hidden="true">
            <div className="keycard">
              <div className="kc-face kc-front">
                <div className="kc-name"><small>Hotel</small>Ganga Imperial</div>
                <div className="kc-row"><div className="kc-chip" /><span>Guest key</span></div>
              </div>
              <div className="kc-face kc-back">
                <div className="strip" />
                <span style={{ fontSize: "0.8rem" }}>Please return this card at checkout.</span>
              </div>
            </div>
          </div>
        </div>

        <form id="enquiry-form" noValidate onSubmit={handleSubmit}>
          <div className="f">
            <label htmlFor="f-name">Full name</label>
            <input id="f-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} />
            {errors.name && <span className="err">{errors.name}</span>}
          </div>
          <div className="f">
            <label htmlFor="f-phone">Phone</label>
            <input id="f-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required aria-invalid={!!errors.phone} />
            {errors.phone && <span className="err">{errors.phone}</span>}
          </div>
          <div className="f full">
            <label htmlFor="f-email">Email (optional)</label>
            <input id="f-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} />
            {errors.email && <span className="err">{errors.email}</span>}
          </div>
          <div className="f">
            <label htmlFor="f-type">Enquiry for</label>
            <select id="f-type" name="type">
              {allOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="f">
            <label htmlFor="f-guests">Guests</label>
            <input id="f-guests" name="guests" type="number" min={1} max={1000} defaultValue={2} required aria-invalid={!!errors.guests} />
            {errors.guests && <span className="err">{errors.guests}</span>}
          </div>
          <div className="f">
            <label htmlFor="f-in">Check-in / event date</label>
            <input id="f-in" name="checkin" type="date" required aria-invalid={!!errors.checkin} />
            {errors.checkin && <span className="err">{errors.checkin}</span>}
          </div>
          <div className="f">
            <label htmlFor="f-out">Check-out (optional)</label>
            <input id="f-out" name="checkout" type="date" aria-invalid={!!errors.checkout} />
            {errors.checkout && <span className="err">{errors.checkout}</span>}
          </div>
          <div className="f full">
            <label htmlFor="f-msg">Message (optional)</label>
            <textarea id="f-msg" name="message" />
          </div>
          {status && (
            <div className="form-status show" role="status" aria-live="polite">
              {status}
            </div>
          )}
          <button className="btn btn-solid" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send enquiry"}
          </button>
        </form>
      </div>
    </section>
  );
}
