'use client';

import { useAuth } from '@/context/auth-context';
import { AdminTeachersView } from '@/components/admin-teachers-view';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminTeachersPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto size-12 text-rose-500 mb-3" />
          <h1 className="text-xl font-bold text-slate-900">403 - Truy cập bị từ chối</h1>
          <p className="mt-2 text-sm text-slate-600">
            Bạn không có quyền thực hiện chức năng này. Trang quản trị chỉ dành cho tài khoản ADMIN.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <ArrowLeft className="size-4" /> Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Quay về Workspace
        </Link>
      </div>
      <AdminTeachersView />
    </div>
  );
}
