// Replace these values with approved property information before public launch.
export const HOTEL_INFORMATION = {
  checkIn: "To be confirmed by the hotel",
  checkOut: "To be confirmed by the hotel",
  cancellation: "Cancellation terms will be included in your individual quote.",
  deposits: "Deposit and payment terms will be included in your individual quote.",
  children: "Child rates and extra-bed arrangements are confirmed with your quote.",
  identification: "The hotel will confirm identification requirements before arrival.",
  accessibility: "Please contact the hotel to confirm step-free access and accessible room features before making travel arrangements.",
  responseTime: "The hotel will respond after reviewing your request. A response timeframe has not yet been published.",
};
export const ROOM_SPECIFICATIONS: Record<string, {size:string;bed:string;occupancy:string; bathroom:string}> = {
  "Deluxe Room": {size:"To be updated",bed:"To be confirmed",occupancy:"To be confirmed",bathroom:"Details to be updated"},
  "Premium Room": {size:"To be updated",bed:"To be confirmed",occupancy:"To be confirmed",bathroom:"Details to be updated"},
  "Suite": {size:"To be updated",bed:"To be confirmed",occupancy:"To be confirmed",bathroom:"Details to be updated"},
  "Family Room": {size:"To be updated",bed:"To be confirmed",occupancy:"To be confirmed",bathroom:"Details to be updated"},
};
export const roomSlug = (name:string) => name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export function roomPhoto(room:{name:string;image:string;sample:boolean}) {
 if(!room.sample)return room.image;
 return room.name === "Family Room" ? "/images/image-40.jpeg" : room.name === "Suite" ? "/images/image-46.jpeg" : "/images/image-49.jpeg";
}
export const GUEST_FAQS = [
 {question:"Is my reservation confirmed when I submit the form?",answer:"No. Your submission is a request. The hotel must confirm availability, the final price and applicable terms before your stay or event is reserved."},
 {question:"Will I be charged on this website?",answer:"No payment is collected on this website. Any deposit and payment arrangements will be explained in your quote."},
 {question:"Are the displayed rates final?",answer:"Rates are indicative. Dates, room allocation, taxes, inclusions and any offers are subject to hotel confirmation."},
 {question:"Can I request several rooms?",answer:"Yes. Select the number of rooms and your total party size on the reservation form. The hotel will confirm suitable room allocation and occupancy."},
 {question:"Can I plan an event or ask about dining?",answer:"Choose A celebration or Dining on the reservation form, share your date and guest count, and send a request for the hotel to review."},
 {question:"How can I ask about accessibility or special arrangements?",answer:"Use the published contact details when available, or submit a reservation request. Confirm any essential accessibility arrangements with the hotel before booking."},
];
