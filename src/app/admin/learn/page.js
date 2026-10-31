'use client';
import AdminLearn from '@/components/AdminLearn';
import RequireAuth from '@/components/RequireAuth';
import { PageTitle } from '@/components/ui';
export default function Page() { return <RequireAuth admin><div className="mx-auto max-w-2xl"><PageTitle sub="ፋይሎችን ይጫኑ፤ የተማሪ ክፍያዎችን ያጽድቁ">📖 የተማሪዎች መማሪያ</PageTitle><AdminLearn /></div></RequireAuth>; }
