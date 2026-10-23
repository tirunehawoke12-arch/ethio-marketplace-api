import { ETB } from '@/lib/api';

export const salaryText = s => (!s || (!s.min && !s.max) ? 'በስምምነት' : `${s.min ? ETB(s.min) : ''}${s.max ? ' – ' + ETB(s.max) : ''} / ${s.per}`);
export const ago = ts => {
  const d = Date.now() - Number(ts || 0); if (!ts || d < 0) return '';
  const m = Math.floor(d / 60000); if (m < 60) return m <= 1 ? 'አሁን' : `ከ${m} ደቂቃ በፊት`;
  const h = Math.floor(m / 60); if (h < 24) return `ከ${h} ሰዓት በፊት`;
  const dd = Math.floor(h / 24); if (dd < 30) return `ከ${dd} ቀን በፊት`;
  return new Date(ts).toLocaleDateString('am-ET');
};
export const isNew = ts => !!ts && Date.now() - ts < 3 * 864e5;
