'use client';
import { useEffect, useState } from 'react';
import { get } from './api';

export function useForm(init) {
  const [f, setF] = useState(init);
  const bind = k => ({ value: f[k] == null ? '' : f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.value })) });
  const chk = k => ({ checked: !!f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.checked })) });
  return { f, setF, bind, chk, set: (k, v) => setF(s => ({ ...s, [k]: v })) };
}
let CACHE = null;
export function useConfig() {
  const [c, setC] = useState(CACHE || { cats: [], kinds: [], accounts: [], workCats: [], jobTypes: [], per: [] });
  useEffect(() => { if (CACHE) return; Promise.all([get('/api/market/config'), get('/api/people/config')]).then(([a, b]) => { CACHE = { ...a, ...b }; setC(CACHE); }); }, []);
  return c;
}
