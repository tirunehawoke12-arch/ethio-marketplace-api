'use client';
import RequireAuth from '@/components/RequireAuth';
import SiteBuilder from '@/components/SiteBuilder';
export default function Page() { return <RequireAuth><SiteBuilder /></RequireAuth>; }
