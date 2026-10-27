import Link from 'next/link';

export const Field = ({ label, hint, children }) => (<div>{label && <label className="label">{label}</label>}{children}{hint && <p className="muted mt-1">{hint}</p>}</div>);
export const Input = ({ label, hint, className = '', ...p }) => (<Field label={label} hint={hint}><input className={'input ' + className} {...p} /></Field>);
export const Textarea = ({ label, hint, ...p }) => (<Field label={label} hint={hint}><textarea rows={4} className="input" {...p} /></Field>);
export const Select = ({ label, options = [], placeholder, ...p }) => (
  <Field label={label}><select className="input" {...p}>{placeholder !== undefined && <option value="">{placeholder}</option>}{options.map(o => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}</select></Field>);
export const Check = ({ label, ...p }) => (<label className="mt-3 flex items-center gap-3 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" {...p} />{label}</label>);
export const Msg = ({ m, ok }) => (m ? <p className={'mt-3 ' + (ok ? 'msg-ok' : 'msg-err')} role="status">{m}</p> : null);
export const Spinner = () => <p className="muted py-10 text-center">⏳ በመጫን ላይ…</p>;
export const Empty = ({ children }) => <div className="card muted text-center">{children}</div>;
export const Section = ({ title, right, children }) => (<section className="mt-6"><div className="mb-2 flex items-center justify-between"><h2 className="text-lg">{title}</h2>{right}</div>{children}</section>);
export const Stars = ({ n = 0 }) => <span className="tracking-widest text-gold" aria-label={n + ' ከ 5'}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}</span>;
export const PageTitle = ({ children, sub }) => (<div className="mb-4"><h1 className="text-2xl">{children}</h1>{sub && <p className="muted mt-1">{sub}</p>}</div>);
export const LinkBtn = ({ href, children, kind = 'primary', className = '' }) => <Link href={href} className={`btn-${kind} ${className}`}>{children}</Link>;
export const StatusTag = ({ s }) => {
  const m = { active: ['🟢 ክፍት'], open: ['🟢 ክፍት'], pending: ['⏳ በግምገማ', 'warn'], hidden: ['🙈 ተደብቋል', 'warn'], closed: ['⚪ ተዘግቷል', 'warn'], rejected: ['❌ አልተቀበለም', 'bad'], suspended: ['⛔ ታግዷል', 'bad'] }[s] || [s];
  return <span className={m[1] === 'bad' ? 'tag-bad' : m[1] === 'warn' ? 'tag-warn' : 'tag'}>{m[0]}</span>;
};
export const Verified = ({ v, small }) => (v ? <span title="በአድሚን የተረጋገጠ" className={'ml-1 inline-flex items-center gap-1 rounded-full bg-sky-100 font-extrabold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 ' + (small ? 'px-1.5 text-[11px]' : 'px-2.5 py-0.5 text-xs')}>✅ {small ? '' : 'የተረጋገጠ'}</span> : null);
