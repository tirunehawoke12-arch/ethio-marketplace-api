// ከመሳል በፊት ጨለማ/ብርሃን ገጽታን ያስቀምጣል (ብልጭታ እንዳይኖር) — ደንበኛ-ብቻ ሞጁል አይደለም
export const THEME_SCRIPT = "try{var m=localStorage.getItem('etm_theme')||'auto',d=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}";
