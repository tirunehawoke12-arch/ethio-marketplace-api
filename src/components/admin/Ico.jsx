/* አድሚን አዶዎች — ቀላል SVG (ውጫዊ ጥገኝነት የለም) */
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', store: 'M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  briefcase: 'M3 7h18v13H3zM8 7V4h8v3M3 13h18', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8', megaphone: 'M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1zM19 8a5 5 0 0 1 0 8',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3', bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4', refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0', cart: 'M3 4h2l2.5 11h10L20 7H6M9 20h.01M17 20h.01',
  coins: 'M12 6c4.4 0 8 1.1 8 2.5S16.4 11 12 11 4 9.9 4 8.5 7.6 6 12 6zM4 8.5v4C4 13.9 7.6 15 12 15s8-1.1 8-2.5v-4M4 12.5v4C4 17.9 7.6 19 12 19s8-1.1 8-2.5v-4',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8M7.5 7.5h.01', activity: 'M22 12h-4l-3 9L9 3l-3 9H2', check: 'M5 13l4 4L19 7', x: 'M6 6l12 12M18 6L6 18',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12', server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01', download: 'M12 3v12M7 10l5 5 5-5M4 21h16', log: 'M5 3h11l3 3v15H5zM8 9h8M8 13h8M8 17h5',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M5.6 5.6l12.8 12.8', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6', user: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2', arrow: 'M5 12h14M13 6l6 6-6 6',
};
export default function Ico({ n, s = 20, className = '' }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={'shrink-0 ' + className}>{(P[n] || P.box).split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}</svg>);
}
