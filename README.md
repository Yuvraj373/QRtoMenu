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
| `/`         | Customer | Menu with search, veg-only filter and category navigation |
| `/login`*   | Admin    | Password login (`ADMIN_PASSWORD`) |
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
