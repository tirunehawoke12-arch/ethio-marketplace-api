// ለ Server Components፦ በአንድ ሰርቨር ውስጥ ያለውን API በቀጥታ ይጠራል
export async function sget(path) {
  const base = process.env.INTERNAL_API || `http://127.0.0.1:${process.env.PORT || 3000}`;
  try { const r = await fetch(base + path, { cache: 'no-store' }); return await r.json(); } catch (e) { return { ok: false }; }
}
