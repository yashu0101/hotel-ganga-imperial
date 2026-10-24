export type Lang = "en" | "hi";

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Header
    "nav.home": "Home",
    "nav.about": "About",
    "nav.rooms": "Rooms",
    "nav.amenities": "Amenities",
    "nav.banquet": "Banquet",
    "nav.dining": "Dining",
    "nav.gallery": "Gallery",
    "nav.enquire": "Enquire",
    "nav.book": "Book Now",

    // Hero
    "hero.title": "Hotel Ganga Imperial",
    "hero.subtitle": "Premium rooms, a rooftop swimming pool and a banquet hall under one warmly lit roof.",
    "hero.book": "Book Now",
    "hero.rooms": "See the rooms",

    // About
    "about.title": "Where marble meets warmth",
    "about.p1": "Hotel Ganga Imperial is a premium stay in the heart of the city. Every floor is finished in polished marble and brass, with cove-lit corridors that lead to spacious, thoughtfully designed rooms.",
    "about.p2": "Above the city, a rooftop swimming pool catches the morning light while the spa and gym sit one floor below. On the ground level, a chandeliered banquet hall opens its doors for weddings, receptions and family celebrations.",
    "about.roomTypes": "Room types",
    "about.rooftopPool": "Rooftop pool",
    "about.security": "Security",
    "about.banquetHall": "Banquet hall",

    // Rooms
    "rooms.title": "Rooms",
    "rooms.subtitle": "Each room is designed for comfort, with marble flooring, cove lighting and a city view.",
    "rooms.types": "Room types",
    "rooms.typesSubtitle": "Rates depend on dates and availability. Choose a room and send an enquiry.",
    "rooms.rateOnRequest": "Rate on request",
    "rooms.enquire": "Enquire",
    "rooms.note": "All rooms include complimentary Wi-Fi, daily housekeeping and 24-hour room service.",
    "rooms.samplePhoto": "Sample photo",

    // Amenities
    "amenities.title": "Amenities",
    "amenities.subtitle": "Everything you need for a comfortable and complete stay.",
    "amenities.poolTitle": "Rooftop swimming pool",
    "amenities.poolText": "The pool sits on the top floor, open to the sky. Swim in the morning light or float under the stars. Towels, loungers and a poolside bar are all included.",
    "amenities.pool": "Rooftop Swimming Pool",
    "amenities.poolDesc": "An open-air pool on the top floor with skyline views.",
    "amenities.spa": "Spa",
    "amenities.spaDesc": "Professional treatments to unwind after a long day.",
    "amenities.gym": "Fitness Gym",
    "amenities.gymDesc": "Modern equipment available round the clock.",
    "amenities.lounge": "Club Lounge",
    "amenities.loungeDesc": "A quiet space to work, read or meet over coffee.",
    "amenities.security": "24/7 Security",
    "amenities.securityDesc": "CCTV surveillance and trained staff at every entrance.",

    // Events
    "events.title": "Banquet hall",
    "events.text": "A grand, chandeliered hall for weddings, receptions, corporate events and family functions. The space seats up to 300 guests and includes in-house catering, AV equipment and dedicated event coordination.",
    "events.cta": "Enquire about events",

    // Dining
    "dining.title": "Dining",
    "dining.subtitle": "From a hearty breakfast to a candlelit dinner, every meal is prepared fresh by our in-house chefs.",
    "dining.breakfast": "Breakfast",
    "dining.breakfastDesc": "A buffet of Indian and continental options to start your day.",
    "dining.roomService": "Room service",
    "dining.roomServiceDesc": "Order from the full menu, delivered to your door any time.",
    "dining.evening": "Evening dining",
    "dining.eveningDesc": "A relaxed restaurant with seasonal menus and local specialties.",

    // Gallery
    "gallery.title": "Gallery",
    "gallery.subtitle": "Select any photo to view it full screen.",

    // Enquiry
    "enquiry.title": "Plan your stay",
    "enquiry.subtitle": "Tell us your dates, what you're looking for and how to reach you. The team will confirm availability.",
    "enquiry.name": "Full name",
    "enquiry.phone": "Phone",
    "enquiry.email": "Email (optional)",
    "enquiry.type": "Enquiry for",
    "enquiry.guests": "Guests",
    "enquiry.checkin": "Check-in / event date",
    "enquiry.checkout": "Check-out (optional)",
    "enquiry.message": "Message (optional)",
    "enquiry.submit": "Send enquiry",
    "enquiry.sending": "Sending...",
    "enquiry.success": "Your enquiry has been received! The team will get back to you shortly.",

    // Booking
    "book.title": "Book a Room",
    "book.subtitle": "Fill in your details and we will confirm your booking.",
    "book.name": "Full Name",
    "book.mobile": "Mobile",
    "book.email": "Email",
    "book.city": "City",
    "book.country": "Country",
    "book.gender": "Gender",
    "book.male": "Male",
    "book.female": "Female",
    "book.other": "Other",
    "book.roomType": "Room Type",
    "book.checkin": "Check-in",
    "book.checkout": "Check-out",
    "book.guests": "Number of Guests",
    "book.submit": "Book Now",
    "book.submitting": "Submitting...",
    "book.another": "Make Another Booking",
    "book.back": "Back to website",

    // Offers
    "offers.title": "Special Offers",
    "offers.subtitle": "Take advantage of our current deals and packages.",

    // Footer
    "footer.copyright": "Hotel Ganga Imperial",

    // Theme
    "theme.light": "Light",
    "theme.dark": "Dark",

    // Lang
    "lang.en": "English",
    "lang.hi": "Hindi",
  },
  hi: {
    "nav.home": "होम",
    "nav.about": "हमारे बारे में",
    "nav.rooms": "कमरे",
    "nav.amenities": "सुविधाएं",
    "nav.banquet": "बैंक्वेट",
    "nav.dining": "भोजन",
    "nav.gallery": "गैलरी",
    "nav.enquire": "पूछताछ",
    "nav.book": "बुक करें",

    "hero.title": "होटल गंगा इंपीरियल",
    "hero.subtitle": "प्रीमियम कमरे, छत पर स्विमिंग पूल और एक बैंक्वेट हॉल — सब एक छत के नीचे।",
    "hero.book": "बुक करें",
    "hero.rooms": "कमरे देखें",

    "about.title": "जहां संगमरमर गर्मजोशी से मिलता है",
    "about.p1": "होटल गंगा इंपीरियल शहर के केंद्र में एक प्रीमियम ठहरने का स्थान है। हर मंजिल पॉलिश किए गए संगमरमर और पीतल से सजी है।",
    "about.p2": "शहर के ऊपर, छत पर स्विमिंग पूल सुबह की रोशनी में चमकता है जबकि स्पा और जिम एक मंजिल नीचे हैं। भूतल पर, एक झूमर से सजा बैंक्वेट हॉल शादियों और पारिवारिक समारोहों के लिए अपने दरवाजे खोलता है।",
    "about.roomTypes": "कमरे के प्रकार",
    "about.rooftopPool": "छत पर पूल",
    "about.security": "सुरक्षा",
    "about.banquetHall": "बैंक्वेट हॉल",

    "rooms.title": "कमरे",
    "rooms.subtitle": "हर कमरा आराम के लिए डिज़ाइन किया गया है, संगमरमर फर्श, कोव लाइटिंग और शहर का दृश्य।",
    "rooms.types": "कमरे के प्रकार",
    "rooms.typesSubtitle": "दरें तिथियों और उपलब्धता पर निर्भर करती हैं। एक कमरा चुनें और पूछताछ भेजें।",
    "rooms.rateOnRequest": "दर अनुरोध पर",
    "rooms.enquire": "पूछताछ",
    "rooms.note": "सभी कमरों में मुफ्त Wi-Fi, दैनिक हाउसकीपिंग और 24 घंटे रूम सर्विस शामिल है।",
    "rooms.samplePhoto": "नमूना फोटो",

    "amenities.title": "सुविधाएं",
    "amenities.subtitle": "आरामदायक और पूर्ण ठहरने के लिए आपको जो कुछ भी चाहिए।",
    "amenities.poolTitle": "छत पर स्विमिंग पूल",
    "amenities.poolText": "पूल शीर्ष मंजिल पर है, आसमान के लिए खुला है। सुबह की रोशनी में तैरें या सितारों के नीचे तैरें।",
    "amenities.pool": "छत पर स्विमिंग पूल",
    "amenities.poolDesc": "स्काईलाइन दृश्यों के साथ शीर्ष मंजिल पर खुला पूल।",
    "amenities.spa": "स्पा",
    "amenities.spaDesc": "लंबे दिन के बाद आराम के लिए पेशेवर उपचार।",
    "amenities.gym": "फिटनेस जिम",
    "amenities.gymDesc": "चौबीसों घंटे उपलब्ध आधुनिक उपकरण।",
    "amenities.lounge": "क्लब लाउंज",
    "amenities.loungeDesc": "काम करने, पढ़ने या कॉफी पर मिलने के लिए एक शांत जगह।",
    "amenities.security": "24/7 सुरक्षा",
    "amenities.securityDesc": "CCTV निगरानी और हर प्रवेश द्वार पर प्रशिक्षित कर्मचारी।",

    "events.title": "बैंक्वेट हॉल",
    "events.text": "शादियों, रिसेप्शन, कॉर्पोरेट इवेंट्स और पारिवारिक समारोहों के लिए एक भव्य हॉल। 300 मेहमानों तक की क्षमता।",
    "events.cta": "इवेंट के बारे में पूछें",

    "dining.title": "भोजन",
    "dining.subtitle": "हार्दिक नाश्ते से लेकर कैंडललाइट डिनर तक, हर भोजन हमारे शेफ द्वारा ताज़ा तैयार किया जाता है।",
    "dining.breakfast": "नाश्ता",
    "dining.breakfastDesc": "आपके दिन की शुरुआत के लिए भारतीय और कॉन्टिनेंटल विकल्पों का बुफ़े।",
    "dining.roomService": "रूम सर्विस",
    "dining.roomServiceDesc": "पूर्ण मेनू से ऑर्डर करें, किसी भी समय आपके दरवाजे पर।",
    "dining.evening": "शाम का भोजन",
    "dining.eveningDesc": "मौसमी मेनू और स्थानीय विशेषताओं के साथ एक आरामदायक रेस्तरां।",

    "gallery.title": "गैलरी",
    "gallery.subtitle": "फ़ुल स्क्रीन में देखने के लिए किसी भी फ़ोटो पर क्लिक करें।",

    "enquiry.title": "अपने ठहरने की योजना बनाएं",
    "enquiry.subtitle": "अपनी तिथियां, आप क्या खोज रहे हैं और आप तक कैसे पहुंचें, बताएं। टीम उपलब्धता की पुष्टि करेगी।",
    "enquiry.name": "पूरा नाम",
    "enquiry.phone": "फ़ोन",
    "enquiry.email": "ईमेल (वैकल्पिक)",
    "enquiry.type": "पूछताछ किसके लिए",
    "enquiry.guests": "मेहमान",
    "enquiry.checkin": "चेक-इन / इवेंट तिथि",
    "enquiry.checkout": "चेक-आउट (वैकल्पिक)",
    "enquiry.message": "संदेश (वैकल्पिक)",
    "enquiry.submit": "पूछताछ भेजें",
    "enquiry.sending": "भेज रहे हैं...",
    "enquiry.success": "आपकी पूछताछ प्राप्त हो गई है! टीम जल्द ही आपसे संपर्क करेगी।",

    "book.title": "कमरा बुक करें",
    "book.subtitle": "अपने विवरण भरें और हम आपकी बुकिंग की पुष्टि करेंगे।",
    "book.name": "पूरा नाम",
    "book.mobile": "मोबाइल",
    "book.email": "ईमेल",
    "book.city": "शहर",
    "book.country": "देश",
    "book.gender": "लिंग",
    "book.male": "पुरुष",
    "book.female": "महिला",
    "book.other": "अन्य",
    "book.roomType": "कमरे का प्रकार",
    "book.checkin": "चेक-इन",
    "book.checkout": "चेक-आउट",
    "book.guests": "मेहमानों की संख्या",
    "book.submit": "बुक करें",
    "book.submitting": "जमा कर रहे हैं...",
    "book.another": "एक और बुकिंग करें",
    "book.back": "वेबसाइट पर वापस जाएं",

    "offers.title": "विशेष ऑफ़र",
    "offers.subtitle": "हमारे मौजूदा सौदों और पैकेजों का लाभ उठाएं।",

    "footer.copyright": "होटल गंगा इंपीरियल",

    "theme.light": "लाइट",
    "theme.dark": "डार्क",

    "lang.en": "English",
    "lang.hi": "हिंदी",
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}
