import Link from 'next/link';
export default function NotFound() {
  return (<div className="card mx-auto mt-10 max-w-md text-center"><p className="text-5xl">🧭</p><h1 className="mt-2 text-2xl">ገጹ አልተገኘም</h1><p className="muted my-3">የፈለጉት ገጽ የለም ወይም ተወግዷል።</p><Link href="/" className="btn-primary w-full">ወደ መነሻ ገጽ</Link></div>);
}
