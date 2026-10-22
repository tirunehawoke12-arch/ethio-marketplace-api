'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, setTok, tok } from './api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState([]);
  const refresh = useCallback(async () => {
    if (!tok()) { setUser(null); setReady(true); return; }
    const r = await get('/api/auth/me');
    if (r.ok) setUser(r); else if (r.http === 401) { setTok(null); setUser(null); }
    setReady(true);
  }, []);
  useEffect(() => { refresh(); try { setCart(JSON.parse(localStorage.getItem('etm_cart13') || '[]')); } catch (e) { } }, [refresh]);
  const save = c => { setCart(c); try { localStorage.setItem('etm_cart13', JSON.stringify(c)); } catch (e) { } };
  const value = useMemo(() => ({
    user, ready, isAdmin: user && user.kind === 'admin', cart, cartCount: cart.reduce((a, i) => a + i.qty, 0),
    async login(token) { setTok(token); await refresh(); },
    logout() { setTok(null); setUser(null); },
    refresh,
    addToCart(p, q = 1) { const c = cart.slice(), x = c.find(i => i.pid === p.id); if (x) x.qty = Math.min(99, x.qty + q); else c.push({ pid: p.id, qty: q, title: p.title, price: p.price, img: (p.imgs && p.imgs[0]) || '', shopId: p.shop.id, shopName: p.shop.name }); save(c); },
    setQty(pid, q) { save(cart.map(i => (i.pid === pid ? { ...i, qty: Math.max(1, Math.min(99, q)) } : i))); },
    removeFromCart(pid) { save(cart.filter(i => i.pid !== pid)); },
    clearCart() { save([]); },
  }), [user, ready, cart, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
