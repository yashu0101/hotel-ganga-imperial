// Links to the hotel's configured phone and WhatsApp numbers. An empty string means
// "not configured": callers hide the action rather than render a broken link.
function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function telHref(phone: string) {
  if (digits(phone).length < 6) return "";
  return "tel:" + (phone.trim().startsWith("+") ? "+" : "") + digits(phone);
}

export function whatsappHref(number: string, text = "") {
  const n = digits(number);
  if (n.length < 6) return "";
  return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
}
