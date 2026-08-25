'use client'

import { useEffect, useState } from 'react'
import {
  Shield,
  Users,
  UserCheck,
  Lock,
  History,
  Activity,
  Server,
  Database,
  Sparkles,
  Loader2,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import {
  getAdminDashboardStats,
  getSystemHealth,
  type AdminDashboardStats,
  type HealthCheckResponse,
} from '@/services/admin-teacher-service'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function AdminDashboardView({
  onNavigate,
}: {
  onNavigate: (view: any) => void;
}) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, healthRes] = await Promise.allSettled([
        getAdminDashboardStats(),
        getSystemHealth(),
      ])

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value)
      } else {
        setStats(null)
      }

      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value)
      } else {
        setHealth(null)
      }
    } catch {
      toast.error('Lỗi khi tải dữ liệu tổng quan hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const dbStatus = health?.database === 'up' ? 'Hoạt động' : health?.database === 'down' ? 'Mất kết nối' : 'Đang kiểm tra'
  const backendStatus = health?.status === 'ok' ? 'Hoạt động' : 'Không khả dụng'

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
            <Shield className="size-4" /> Hệ thống quản trị TeachFlow
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Tổng quan hệ thống
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi trạng thái vận hành, tài khoản giáo viên và nhật ký bảo mật toàn nền tảng.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <p className="text-sm">Đang tải dữ liệu hệ thống...</p>
        </div>
      ) : (
        <>
          {/* Top Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tổng tài khoản giáo viên</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {stats?.totalTeachers ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Đã đăng ký trên hệ thống</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <Users className="size-5" />
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tài khoản hoạt động</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-teal-700">
                    {stats?.activeTeachers ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Có quyền truy cập bình thường</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="size-5" />
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tài khoản bị khóa</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-rose-600">
                    {stats?.lockedTeachers ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Tạm dừng đăng nhập</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <Lock className="size-5" />
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Nhật ký bảo mật & audit</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-blue-600">
                    {stats?.totalAuditLogs ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Sự kiện đã được ghi nhận</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <History className="size-5" />
                </span>
              </div>
            </div>
          </div>

          {/* System Health & Fast Navigation */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* System Health Overview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                    <Activity className="size-4 text-teal-600" /> Sức khỏe hệ thống
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      health?.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    {health?.status === 'ok' ? 'Bình thường' : 'Cần kiểm tra'}
                  </span>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Server className="size-4 text-slate-500" />
                      <span className="font-medium text-slate-700">API Backend NestJS</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">{backendStatus}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Database className="size-4 text-slate-500" />
                      <span className="font-medium text-slate-700">Neon PostgreSQL DB</span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        health?.database === 'up' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {dbStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="size-4 text-teal-600" />
                      <span className="font-medium text-slate-700">AI Pedagogical Engine</span>
                    </div>
                    <span className="text-xs font-semibold text-teal-600">Sẵn sàng</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('Sức khỏe hệ thống')}
                  className="w-full justify-between text-xs text-teal-700 font-medium"
                >
                  Xem báo cáo sức khỏe chi tiết <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Quick Actions & Recent Security Events */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                    <History className="size-4 text-blue-600" /> Sự kiện hệ thống gần đây
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('Nhật ký hệ thống')}
                    className="text-xs text-teal-700"
                  >
                    Xem tất cả
                  </Button>
                </div>

                <div className="mt-4 flex flex-col gap-2.5">
                  {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-400">
                      Chưa có nhật ký hoạt động nào được ghi nhận.
                    </div>
                  ) : (
                    stats.recentAuditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="font-medium text-slate-800 truncate">
                            {log.details || log.action}
                          </p>
                          <p className="mt-0.5 text-slate-400">
                            Bởi: {log.actorEmail || 'Hệ thống'} · {log.action}
                          </p>
                        </div>
                        <span className="text-slate-400 shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Fast links */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                <Button
                  onClick={() => onNavigate('Quản lý giáo viên')}
                  className="gap-2 text-xs"
                >
                  <Users className="size-3.5" /> Quản lý danh sách giáo viên
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate('Nhật ký hệ thống')}
                  className="gap-2 text-xs"
                >
                  <History className="size-3.5" /> Nhật ký chi tiết
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
