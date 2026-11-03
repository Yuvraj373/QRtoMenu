# QRMenu

Digital QR menu for restaurants — customers scan a QR code and browse the menu; the owner manages items and branding from an admin panel.

## Setup

### Backend (`backend/`)

Create `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/qrmenu
JWT_SECRET=<long random string>
ADMIN_PASSWORD=<admin login password>
```

```
cd backend
npm install
npm run dev
```

On first start with an empty database, the starter menu (pizzas, burgers, sandwiches, momos, fries, drinks) is seeded automatically. After adding dishes to `backend/seed.js`, run `npm run sync-menu` to add only the missing ones; it never changes prices or items edited in the admin panel.

**Automatic photos:** when an admin adds an item without a photo, one is picked from a curated, veg-only Unsplash library in `backend/lib/foodImages.js` based on the item name, then the category. For example, "Kurkure Momos" gets fried momos and "Peri Peri Fries" gets fries. The admin form shows the auto photo plus alternatives to choose from, or a custom image link can be pasted. To support a new dish, add a keyword group to that file.

### Frontend (`frontend/`)

```
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to the backend, using `PORT` from `backend/.env` (default 5000). Set `API_URL` to override it. For a production build pointing at a separate API host, set `VITE_API_URL` (e.g. `https://api.example.com/api`).

The dev server listens on your LAN too, so phones on the same Wi-Fi can open the menu at `http://<your-ip>:5173`.

## Pages

| Route       | Who      | What |
|-------------|----------|------|
| `/`         | Customer | Menu, cart, checkout (name + mobile number) and demo payment; customer reviews; orders are collected at the counter |
| `/order/:trackingId` | Customer | Live order status with the kitchen's "ready in N min" countdown; asks for a rating (stars, tags, comment — all on the page) after payment; rings the phone when the order is ready |
| `/login`*   | Admin    | Password login (`ADMIN_PASSWORD`) |
| `/orders`   | Admin    | Live orders board (new → preparing → ready for pickup → picked up): set the prep time when accepting, "+5/+10 min", call/WhatsApp, repeat-customer history, sound + device alerts |
| `/customers` | Admin   | Everyone who has ordered (one row per mobile number) with all their past orders, spend and ratings |
| `/admin`    | Admin    | Add / edit / delete items, mark sold out |
| `/settings` | Admin    | Restaurant details, theme colour, menu link, printable QR posters |

\* Change it with `VITE_ADMIN_LOGIN_PATH` (see below). Customers only ever see the menu: the menu has no admin links, and `/admin`, `/settings` or any unknown URL sends a visitor without a valid session back to the menu.

## Deploying to Render

The backend serves the built frontend, so the whole site runs as **one Render Web Service** on one URL. That URL goes in the QR code.

1. Push the project to GitHub. The root `.gitignore` keeps `backend/.env` and `node_modules` out of the repo.
2. In Render: **New → Blueprint**, then pick the repo. `render.yaml` sets everything up. To configure it by hand instead, use **New → Web Service** with:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Environment variables (Render dashboard → Environment):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22` |
   | `MONGO_URI` | Atlas URI. URL-encode special characters in the password (`@` → `%40`) |
   | `JWT_SECRET` | Long random string (the Blueprint generates one) |
   | `ADMIN_PASSWORD` | 10+ characters. The server refuses to start with a weak one |
   | `VITE_ADMIN_LOGIN_PATH` | Private admin login path, e.g. `/staff-login-7x`. Used at build time, so redeploy after changing it |

   Do not set `PORT`. Render provides it.
4. **MongoDB Atlas → Network Access:** add `0.0.0.0/0`. Render does not have fixed outgoing IPs.
5. After the deploy succeeds, open `https://<service>.onrender.com<login path>`, log in, go to **Settings**, put the site URL in **Menu link (QR code)**, save, then download or print a QR poster.

Free instances sleep after ~15 minutes without traffic, so the first scan after a quiet period can take up to a minute to load. Use a paid instance for a menu that customers rely on.

Security in place: admin APIs need a signed JWT (checked on every request and when opening admin pages), login is limited to 5 failed attempts per 15 minutes per IP, item image URLs must be http(s), and Helmet security headers are on.

## API

| Method | Path               | Auth |
|--------|--------------------|------|
| POST   | `/api/auth/login`  | –    |
| GET    | `/api/auth/me`     | ✓    |
| GET    | `/api/items`       | –    |
| GET    | `/api/items/image-suggestions?name=&category=` | ✓ |
| POST   | `/api/items`       | ✓    |
| PUT    | `/api/items/:id`   | ✓    |
| DELETE | `/api/items/:id`   | ✓    |
| GET    | `/api/settings`    | –    |
| PUT    | `/api/settings`    | ✓    |
| POST   | `/api/orders`      | –    (demo payment; prices are taken from the database) |
| GET    | `/api/orders/track/:trackingId` (+ `/stream`) | – |
| POST   | `/api/orders/track/:trackingId/review` | – (rating, tags, comment) |
| GET    | `/api/orders/reviews` | – (average rating + recent comments for the menu) |
| GET    | `/api/orders?since=` | ✓  |
| GET    | `/api/orders/stream` | ✓  (Server-Sent Events, live new/updated orders) |
| PATCH  | `/api/orders/:id/status` | ✓  (`preparing` takes `prepMinutes`; `ready` starts ringing the customer's phone) |
| POST   | `/api/orders/:id/delay` | ✓  (`{ minutes }` added to the promised time; customer is notified) |
| POST   | `/api/orders/:id/ring` | ✓  (ring the customer again) |
| POST   | `/api/orders/track/:trackingId/pickup-ack` | – (customer tapped OK; stops ringing) |
| GET    | `/api/orders/push-key` | – (VAPID public key) |
| POST   | `/api/orders/track/:trackingId/push` | – (save the phone's push subscription) |
| POST   | `/api/orders/track/:trackingId/push-test` | – (send a test notification to the customer's phone) |
| POST/DELETE | `/api/orders/admin-push` | ✓  (turn "new order" alerts on/off for an admin device) |
| POST   | `/api/orders/admin-push/test` | ✓  |
| GET    | `/api/customers?q=` | ✓  (search by name or mobile) |
| GET    | `/api/customers/:id` | ✓  (customer + all their orders) |

### Ordering notes
- **Payments are demo only.** Any UPI id / 10-digit number or 12–19 digit card number is accepted; only a masked value is stored.
- **Customers are identified by mobile number** (required at checkout, 10-digit Indian number). Every order from the same number is linked to one customer, so the admin sees "2nd order", other open orders from the same person, and the full history. Orders placed before this existed are linked automatically on server start (`backend/lib/linkCustomers.js`).
- **Reviews stay on the site**: stars, quick tags and an optional comment are saved with the order and shown on the menu ("What our customers say"). The Google review link in Settings is only used for the printable poster.
- **Prep time**: the kitchen picks 10–45 min when accepting; the customer sees a live countdown and gets a notification when it is accepted or pushed back.
- **Free Cold Coffee** is added automatically when the item total is ₹600 or more (`backend/lib/offer.js` and `frontend/src/lib/offer.js`).
- **Notifications** (service worker `frontend/public/sw.js`, sending in `backend/lib/notify.js`):
  - Customer: order accepted (with time), running late, ready, cancelled — even with the page or browser closed. Works on Android and desktop browsers; on iPhone only after *Add to Home Screen* (iOS 16.4+). Customers are asked to allow notifications right after paying and can send themselves a test alert.
  - **Pickup alert:** "ready" rings until the customer taps OK — in-page ring + vibration + popup when the page is open, and a push notification re-sent 10 times over ~6 minutes (`backend/lib/pickupRinger.js`) with an "OK, I'm coming" button. The admin card shows whether the customer's phone can get alerts; if not, use the call / WhatsApp buttons.
  - Admin: "Get alerts on this device" on the Orders page sends a notification for every new order, even when the admin panel is closed.
  - Without notifications the order page keeps the screen awake so its in-page ring can be heard.
  - VAPID keys are generated once and stored in MongoDB (`config` collection). To manage them yourself set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and optionally `VAPID_SUBJECT` (`mailto:you@example.com`). Changing the keys invalidates existing subscriptions.
- **Live updates** use Server-Sent Events from a single server process. If you ever run more than one instance, move the event bus (`backend/lib/events.js`) to Redis or MongoDB change streams.
