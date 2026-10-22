'use client';
import RequireAuth from '@/components/RequireAuth';
import SiteBuilder from '@/components/SiteBuilder';
export default function Page({ params }) { return <RequireAuth><SiteBuilder id={params.id} /></RequireAuth>; }
