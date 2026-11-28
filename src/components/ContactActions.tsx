import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";
import { telHref, whatsappHref } from "@/lib/contact";
import Icon, { NewTabNote } from "@/components/Icon";

// Call / WhatsApp the hotel directly. Falls back to the contact page when no number is configured.
export default function ContactActions({
  message = "",
  className = "contact-actions",
}: {
  message?: string;
  className?: string;
}) {
  const tel = telHref(SITE_CONFIG.contact.phone);
  const whatsapp = whatsappHref(SITE_CONFIG.contact.whatsapp, message);
  if (!tel && !whatsapp)
    return (
      <div className={className}>
        <Link href="/contact">Hotel contact details</Link>
      </div>
    );
  return (
    <div className={className}>
      {tel && (
        <a href={tel}>
          <Icon name="phone" position="start" />
          Call the hotel
        </a>
      )}
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noreferrer">
          <Icon name="chat" position="start" />
          WhatsApp
          <NewTabNote />
        </a>
      )}
    </div>
  );
}
