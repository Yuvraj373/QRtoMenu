// Customer mobile numbers are stored as 10 digits (India)
export const formatPhone = (phone) => `+91 ${String(phone).replace(/(\d{5})(\d{5})/, '$1 $2')}`;

export const callLink = (phone) => `tel:+91${phone}`;

// Opens WhatsApp on the admin's phone/computer with the message typed in; free, no account needed
export const whatsappLink = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
