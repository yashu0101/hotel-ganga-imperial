"use client";

import { useState, FormEvent } from "react";
import { SITE_CONFIG } from "@/lib/config";
import { useApp } from "@/lib/context";

export default function EnquiryForm() {
  const { t } = useApp();
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
    if (!name) errs.name = "Required";
    if (!phone || phone.replace(/[^\d]/g, "").length < 10) errs.phone = "Valid phone required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Valid email required";
    if (!checkin) errs.checkin = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!validate(form)) return;
    setSubmitting(true); setStatus("");
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
      const res = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { setStatus(t("enquiry.success")); form.reset(); setErrors({}); }
      else { const err = await res.json(); setStatus(err.error); }
    } catch { setStatus("Error. Please try again."); }
    finally { setSubmitting(false); }
  };

  const contact = SITE_CONFIG.contact;

  return (
    <section id="enquire">
      <div className="wrap enq">
        <div>
          <h2>{t("enquiry.title")}</h2>
          <p style={{ marginTop: 24 }}>{t("enquiry.subtitle")}</p>
          <ul className="contact-lines">
            {contact.phone && <li><span>Phone</span><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a></li>}
            {contact.whatsapp && <li><span>WhatsApp</span><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">Chat</a></li>}
            {contact.email && <li><span>Email</span><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            {contact.address && <li><span>Address</span>{contact.address}</li>}
          </ul>
          <div className="keycard-wrap" aria-hidden="true">
            <div className="keycard">
              <div className="kc-face kc-front"><div className="kc-name"><small>Hotel</small>Ganga Imperial</div><div className="kc-row"><div className="kc-chip" /><span>Guest key</span></div></div>
              <div className="kc-face kc-back"><div className="strip" /><span style={{ fontSize: "0.8rem" }}>Please return this card at checkout.</span></div>
            </div>
          </div>
        </div>
        <form noValidate onSubmit={handleSubmit}>
          <div className="f"><label htmlFor="f-name">{t("enquiry.name")}</label><input id="f-name" name="name" autoComplete="name" required />{errors.name && <span className="err">{errors.name}</span>}</div>
          <div className="f"><label htmlFor="f-phone">{t("enquiry.phone")}</label><input id="f-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required />{errors.phone && <span className="err">{errors.phone}</span>}</div>
          <div className="f full"><label htmlFor="f-email">{t("enquiry.email")}</label><input id="f-email" name="email" type="email" autoComplete="email" />{errors.email && <span className="err">{errors.email}</span>}</div>
          <div className="f"><label htmlFor="f-type">{t("enquiry.type")}</label><select id="f-type" name="type">{allOptions.map((opt) => <option key={opt}>{opt}</option>)}</select></div>
          <div className="f"><label htmlFor="f-guests">{t("enquiry.guests")}</label><input id="f-guests" name="guests" type="number" min={1} max={1000} defaultValue={2} required /></div>
          <div className="f"><label htmlFor="f-in">{t("enquiry.checkin")}</label><input id="f-in" name="checkin" type="date" required />{errors.checkin && <span className="err">{errors.checkin}</span>}</div>
          <div className="f"><label htmlFor="f-out">{t("enquiry.checkout")}</label><input id="f-out" name="checkout" type="date" /></div>
          <div className="f full"><label htmlFor="f-msg">{t("enquiry.message")}</label><textarea id="f-msg" name="message" /></div>
          {status && <div className="form-status show" role="status">{status}</div>}
          <button className="btn btn-solid" type="submit" disabled={submitting}>{submitting ? t("enquiry.sending") : t("enquiry.submit")}</button>
        </form>
      </div>
    </section>
  );
}
