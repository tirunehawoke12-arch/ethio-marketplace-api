import { STEPS, STATUS_X } from '@/lib/consts';

export function OrderStepper({ status, mini }) {
  const i = STEPS.findIndex(x => x[0] === status);
  if (i < 0) return <span className="tag-bad mt-2">{STATUS_X[status] || status}</span>;
  return (
    <ol className="my-3 flex overflow-x-auto">
      {STEPS.map((x, k) => (
        <li key={x[0]} className={'min-w-[64px] flex-1 text-center text-[11px] ' + (k <= i ? 'font-bold text-ink dark:text-white' : 'text-mute')}>
          <span className={'mx-auto mb-1 grid h-9 w-9 place-items-center rounded-full text-base ' + (k < i ? 'bg-brand text-white' : k === i ? 'bg-gold ring-4 ring-gold/30' : 'bg-line dark:bg-[#25352c]')}>{k < i ? '✓' : x[1]}</span>
          {!mini && x[2]}
        </li>
      ))}
    </ol>
  );
}
export const WizardBar = ({ n, total }) => (<div className="mb-4 flex gap-1.5">{Array.from({ length: total }, (_, i) => <span key={i} className={'h-1.5 flex-1 rounded-full ' + (i < n ? 'bg-brand' : 'bg-line dark:bg-[#25352c]')} />)}</div>);
