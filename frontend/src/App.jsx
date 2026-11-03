import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import OrderStatus from './pages/OrderStatus';
import { SettingsProvider } from './lib/SettingsContext';
import { CartProvider } from './lib/cart';
import { OrdersProvider } from './lib/orders';
import { ToastProvider } from './Components/Toast';
import api, { auth } from './lib/api';
import { LOGIN_PATH } from './lib/config';

// Admin-only pages. Visitors without a session are sent to the menu (not the login page),
// so customers never discover the admin area; an expired admin session goes to login.
function Protected({ children }) {
  const [status, setStatus] = useState(auth.token ? 'checking' : 'guest');

  useEffect(() => {
    if (!auth.token) return;
    api
      .get('/auth/me')
      .then(() => setStatus('ok'))
      .catch((err) => {
        if (err.response?.status === 401) {
          auth.clear();
          setStatus('expired');
        } else {
          setStatus('ok'); // server unreachable: let the page show its own error state
        }
      });
  }, []);

  if (status === 'guest') return <Navigate to="/" replace />;
  if (status === 'expired') return <Navigate to={LOGIN_PATH} replace />;
  if (status === 'checking')
    return (
      <div className="min-h-dvh grid place-items-center">
        <span className="w-8 h-8 rounded-full border-[3px] border-stone-200 border-t-brand animate-spin" />
      </div>
    );
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<CartProvider><Menu /></CartProvider>} />
            <Route path="/order/:trackingId" element={<OrderStatus />} />
            <Route path={LOGIN_PATH} element={<Login />} />
            {/* One live-orders connection shared by every admin page */}
            <Route element={<Protected><OrdersProvider><Outlet /></OrdersProvider></Protected>}>
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
