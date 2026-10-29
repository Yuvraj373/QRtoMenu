// Admin login lives at a path customers never see; set VITE_ADMIN_LOGIN_PATH to something private before going live
export const LOGIN_PATH = import.meta.env.VITE_ADMIN_LOGIN_PATH || '/login';

// Public address printed in the QR code; falls back to wherever the admin panel is open
export const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, '') + '/';
