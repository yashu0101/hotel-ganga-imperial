export function hotelToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function dateError(checkin: unknown, checkout: unknown, overnight: boolean) { if (!validDate(checkin) || checkin < hotelToday())
    return 'Choose a valid arrival or event date today or later.'; if (overnight && !checkout)
    return 'Choose a check-out date.'; if (checkout && (!validDate(checkout) || checkout <= checkin))
    return 'The end date must be after the arrival or event date.'; return ''; }
export function cleanText(value: unknown, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function nightlyRate(value:string):number|null {
  const match=value.match(/^\s*(?:₹|INR\s*)?(\d[\d,]*(?:\.\d{1,2})?)(?:\s*\/\s*night|\s+per\s+night)?\s*$/i);
  if(!match)return null;
  const rate=Number(match[1].replaceAll(',',''));
  return Number.isFinite(rate)&&rate>0?rate:null;
}
