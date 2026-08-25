'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  UserCheck,
  GraduationCap,
  BookOpen,
  Trash2,
  History,
  ScrollText,
} from 'lucide-react'
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  updateTeacherStatus,
  resetTeacherPassword,
  type TeacherAccount,
} from '@/services/admin-teacher-service'
import { getAuditLogs, type AuditLogRecord } from '@/services/audit-service'
import { toast } from 'sonner'

export function AdminTeachersView() {
  const [teachers, setTeachers] = useState<TeacherAccount[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherAccount | null>(null)

  // Form states - Create
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createPass, setCreatePass] = useState('')
  const [createPassConfirm, setCreatePassConfirm] = useState('')
  const [showCreatePass, setShowCreatePass] = useState(false)
  const [showCreatePassConfirm, setShowCreatePassConfirm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Form states - Edit
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Form states - Status
  const [statusLoading, setStatusLoading] = useState(false)

  // Form states - Reset Password
  const [resetPass, setResetPass] = useState('')
  const [resetPassConfirm, setResetPassConfirm] = useState('')
  const [showResetPass, setShowResetPass] = useState(false)
  const [showResetPassConfirm, setShowResetPassConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  // Audit Logs State
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditKeyword, setAuditKeyword] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const fetchAuditLogs = async (p = 1) => {
    try {
      setAuditLoading(true)
      const res = await getAuditLogs({
        page: p,
        pageSize: 20,
        keyword: auditKeyword.trim() || undefined,
        action: auditActionFilter || undefined,
      })
      setAuditLogs(res.items || [])
      setAuditTotal(res.totalItems || 0)
      setAuditTotalPages(res.totalPages || 1)
      setAuditPage(res.page || 1)
    } catch (err: any) {
      toast.error('Lỗi khi tải nhật ký hoạt động: ' + (err.message || 'Vui lòng thử lại'))
    } finally {
      setAuditLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const res = await getTeachers({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setTeachers(res.items || [])
      setTotalItems(res.totalItems || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err: any) {
      toast.error('Lỗi khi tải danh sách giáo viên: ' + (err.message || 'Vui lòng thử lại'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [page, pageSize, statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTeachers()
  }

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!createName.trim() || !createEmail.trim() || !createPass) {
      setCreateError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)')
      return
    }

    if (createPass !== createPassConfirm) {
      setCreateError('Xác nhận mật khẩu không khớp')
      return
    }

    if (createPass.length < 8) {
      setCreateError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }

    try {
      setCreateLoading(true)
      await createTeacher({
        fullName: createName.trim(),
        email: createEmail.trim(),
        phone: createPhone.trim() || undefined,
        password: createPass,
      })

      toast.success('Tạo tài khoản giáo viên thành công')
      setCreateDialogOpen(false)
      setCreateName('')
      setCreateEmail('')
      setCreatePhone('')
      setCreatePass('')
      setCreatePassConfirm('')
      setCreateError('')
      fetchTeachers()
    } catch (err: any) {
      setCreateError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
    } finally {
      setCreateLoading(false)
    }
  }

  // Edit Open & Submit
  const openEditDialog = (teacher: TeacherAccount) => {
    setSelectedTeacher(teacher)
    setEditName(teacher.fullName)
    setEditEmail(teacher.email)
    setEditPhone(teacher.phone || '')
    setEditError('')
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher) return
    setEditError('')

    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Họ tên và Email không được để trống')
      return
    }

    try {
      setEditLoading(true)
      await updateTeacher(selectedTeacher.id, {
        fullName: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
      })

      toast.success('Cập nhật thông tin giáo viên thành công')
      setEditDialogOpen(false)
      fetchTeachers()
    } catch (err: any) {
      setEditError(err.message || 'Không thể cập nhật. Vui lòng thử lại.')
    } finally {
      setEditLoading(false)
    }
  }

  // Status Toggle Open & Submit
  const openStatusDialog = (teacher: TeacherAccount) => {
    setSelectedTeacher(teacher)
    setStatusDialogOpen(true)
  }

  const handleStatusSubmit = async () => {
    if (!selectedTeacher) return
    try {
      setStatusLoading(true)
      const nextActive = !selectedTeacher.isActive
      const res = await updateTeacherStatus(selectedTeacher.id, nextActive)
      toast.success(res.message)
      setStatusDialogOpen(false)
      fetchTeachers()
    } catch (err: any) {
      toast.error(err.message || 'Không thể thay đổi trạng thái tài khoản.')
    } finally {
      setStatusLoading(false)
    }
  }

  // Reset Password Open & Submit
  const openResetDialog = (teacher: TeacherAccount) => {
    setSelectedTeacher(teacher)
    setResetPass('')
    setResetPassConfirm('')
    setResetError('')
    setResetDialogOpen(true)
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher) return
    setResetError('')

    if (!resetPass) {
      setResetError('Vui lòng nhập mật khẩu mới')
      return
    }

    if (resetPass !== resetPassConfirm) {
      setResetError('Xác nhận mật khẩu không khớp')
      return
    }

    if (resetPass.length < 8) {
      setResetError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }

    try {
      setResetLoading(true)
      await resetTeacherPassword(selectedTeacher.id, resetPass)
      toast.success('Mật khẩu đã được cập nhật. Giáo viên cần đăng nhập lại.')
      setResetDialogOpen(false)
      setResetPass('')
      setResetPassConfirm('')
    } catch (err: any) {
      setResetError(err.message || 'Không thể đặt lại mật khẩu.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
            <Shield className="size-4" /> Khu vực quản trị hệ thống
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Quản lý giáo viên
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý danh sách tài khoản, trạng thái hoạt động và bảo mật của toàn bộ giáo viên.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAuditDialogOpen(true)
              fetchAuditLogs(1)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <History className="size-4 text-slate-500" /> Nhật ký hệ thống
          </button>
          <button
            onClick={() => {
              setCreateError('')
              setCreateDialogOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <Plus className="size-4" /> Tạo tài khoản
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Tổng số giáo viên</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {totalItems}
              </p>
              <p className="mt-1 text-xs text-slate-400">Trên hệ thống TeachFlow</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
              <Users className="size-5" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Đang hoạt động</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-teal-700">
                {teachers.filter((t) => t.isActive).length}
              </p>
              <p className="mt-1 text-xs text-slate-400">Có quyền đăng nhập</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="size-5" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Đã khóa tài khoản</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-rose-600">
                {teachers.filter((t) => !t.isActive).length}
              </p>
              <p className="mt-1 text-xs text-slate-400">Tạm dừng truy cập</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <Lock className="size-5" />
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-teal-500"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="size-4 text-slate-400 shrink-0" />
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setStatusFilter(mode)
                setPage(1)
              }}
              className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition ${
                statusFilter === mode
                  ? 'border-teal-600 bg-teal-50 text-teal-700 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {mode === 'ALL' ? 'Tất cả' : mode === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
            </button>
          ))}

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            aria-label="Số dòng trên mỗi trang"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-teal-500 ml-2"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-2">
            <Loader2 className="size-6 animate-spin text-teal-600" />
            <span className="text-sm">Đang tải danh sách giáo viên...</span>
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="mx-auto size-10 text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-800">Không tìm thấy giáo viên nào</h3>
            <p className="text-xs text-slate-400 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Họ và tên</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Số điện thoại</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5">Ngày tạo</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 shrink-0">
                          {teacher.fullName
                            .split(' ')
                            .map((p) => p[0])
                            .slice(-2)
                            .join('')
                            .toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{teacher.fullName}</p>
                          <p className="text-xs text-slate-400">Mã: {teacher.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3.5 text-slate-400" />
                        <span>{teacher.email}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {teacher.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3.5 text-slate-400" />
                          <span>{teacher.phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">Chưa cập nhật</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {teacher.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="size-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                          <XCircle className="size-3" /> Đã khóa
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(teacher.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditDialog(teacher)}
                          title="Chỉnh sửa thông tin"
                          className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit2 className="size-3.5" />
                        </button>

                        <button
                          onClick={() => openResetDialog(teacher)}
                          title="Đặt lại mật khẩu"
                          className="grid size-8 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <KeyRound className="size-3.5" />
                        </button>

                        <button
                          onClick={() => openStatusDialog(teacher)}
                          title={teacher.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          className={`grid size-8 place-items-center rounded-lg border ${
                            teacher.isActive
                              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {teacher.isActive ? (
                            <Lock className="size-3.5" />
                          ) : (
                            <Unlock className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <div>
            Hiển thị <b>{teachers.length}</b> trên tổng số <b>{totalItems}</b> giáo viên (Trang{' '}
            <b>{page}</b> / <b>{totalPages}</b>)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" /> Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Sau <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE TEACHER DIALOG */}
      {createDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  Thêm mới
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Tạo tài khoản giáo viên
                </h2>
              </div>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Thị Lan"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="Ví dụ: lan@teachflow.vn"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="Ví dụ: 0988123456"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Mật khẩu tạm thời <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCreatePass ? 'text' : 'password'}
                    required
                    value={createPass}
                    onChange={(e) => setCreatePass(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, có chữ hoa, thường, số, ký tự đặc biệt"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCreatePass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassConfirm ? 'text' : 'password'}
                    required
                    value={createPassConfirm}
                    onChange={(e) => setCreatePassConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu tạm thời"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassConfirm(!showCreatePassConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCreatePassConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {createLoading && <Loader2 className="size-4 animate-spin" />}
                  <span>{createLoading ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER DIALOG */}
      {editDialogOpen && selectedTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  Chỉnh sửa
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Thông tin giáo viên
                </h2>
              </div>
              <button
                onClick={() => setEditDialogOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {editLoading && <Loader2 className="size-4 animate-spin" />}
                  <span>{editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE CONFIRMATION DIALOG */}
      {statusDialogOpen && selectedTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-11 place-items-center rounded-xl ${
                  selectedTeacher.isActive
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {selectedTeacher.isActive ? (
                  <Lock className="size-5" />
                ) : (
                  <Unlock className="size-5" />
                )}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedTeacher.isActive
                    ? 'Khóa tài khoản giáo viên'
                    : 'Kích hoạt lại tài khoản'}
                </h3>
                <p className="text-xs text-slate-400">{selectedTeacher.fullName}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-600">
              {selectedTeacher.isActive ? (
                <>
                  Bạn có chắc muốn khóa tài khoản <b>{selectedTeacher.fullName}</b>? Giáo viên sẽ
                  không thể đăng nhập nhưng toàn bộ dữ liệu (giáo án, học sinh, điểm danh...) vẫn
                  được bảo toàn.
                </>
              ) : (
                <>
                  Bạn có muốn kích hoạt lại tài khoản <b>{selectedTeacher.fullName}</b>? Giáo viên
                  sẽ có thể đăng nhập bình thường vào hệ thống.
                </>
              )}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusDialogOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={statusLoading}
                onClick={handleStatusSubmit}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition ${
                  selectedTeacher.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusLoading && <Loader2 className="size-3.5 animate-spin" />}
                <span>
                  {selectedTeacher.isActive ? 'Xác nhận khóa' : 'Xác nhận kích hoạt'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD DIALOG */}
      {resetDialogOpen && selectedTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                  Bảo mật
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Đặt lại mật khẩu cho {selectedTeacher.fullName}
                </h2>
              </div>
              <button
                onClick={() => setResetDialogOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {resetError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={resetPass}
                    onChange={(e) => setResetPass(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, chữ hoa, thường, số, ký tự đặc biệt"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassConfirm ? 'text' : 'password'}
                    required
                    value={resetPassConfirm}
                    onChange={(e) => setResetPassConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassConfirm(!showResetPassConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPassConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setResetDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {resetLoading && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{resetLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Logs Dialog */}
      {auditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <History className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Nhật ký hoạt động hệ thống (Audit Trail)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Theo dõi các thao tác quản trị, xác thực, phân công và dữ liệu học sinh ({auditTotal} bản ghi)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditDialogOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo email, nội dung, ID..."
                  value={auditKeyword}
                  onChange={(e) => setAuditKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchAuditLogs(1)
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value)
                  // auto refresh
                  setTimeout(() => fetchAuditLogs(1), 0)
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-teal-500 focus:outline-none"
              >
                <option value="">Tất cả hành động</option>
                <option value="AUTH_">Xác thực / Đăng nhập</option>
                <option value="TEACHER_">Quản lý giáo viên</option>
                <option value="STUDENT_">Học sinh & Ghi danh</option>
                <option value="TEACHING_ASSIGNMENT_">Ngữ cảnh giảng dạy</option>
                <option value="ATTENDANCE_">Điểm danh</option>
                <option value="ASSESSMENT_">Đánh giá</option>
              </select>

              <button
                onClick={() => fetchAuditLogs(1)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
              >
                Lọc
              </button>
            </div>

            {/* Log list table */}
            <div className="flex-1 overflow-y-auto p-6">
              {auditLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 className="size-8 animate-spin text-teal-600" />
                  <p className="mt-3 text-xs">Đang tải nhật ký...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ScrollText className="mx-auto size-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-600">Chưa có bản ghi nhật ký phù hợp</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id
                    const isSuccess = log.status === 'SUCCESS'
                    return (
                      <div key={log.id} className="p-3.5 hover:bg-slate-50/50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSuccess
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {log.status || 'SUCCESS'}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-slate-800">
                                  {log.action}
                                </span>
                                {log.resourceType && (
                                  <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[10px] font-medium text-teal-700">
                                    {log.resourceType}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Thực hiện bởi:{' '}
                                <strong className="text-slate-700">
                                  {log.actorEmail || log.actorUserId}
                                </strong>
                                {log.ipAddress && ` · IP: ${log.ipAddress}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                              {new Date(log.createdAt).toLocaleString('vi-VN')}
                            </span>
                            {log.details && (
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                              >
                                {isExpanded ? 'Ẩn chi tiết' : 'Chi tiết'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible details */}
                        {isExpanded && log.details && (
                          <div className="mt-3 rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-200 overflow-x-auto">
                            {(() => {
                              try {
                                const parsed = JSON.parse(log.details)
                                return <pre>{JSON.stringify(parsed, null, 2)}</pre>
                              } catch {
                                return <div>{log.details}</div>
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
              <span className="text-xs text-slate-500">
                Trang {auditPage} / {auditTotalPages} ({auditTotal} bản ghi)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAuditLogs(Math.max(1, auditPage - 1))}
                  disabled={auditPage <= 1 || auditLoading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                >
                  Trang trước
                </button>
                <button
                  onClick={() => fetchAuditLogs(Math.min(auditTotalPages, auditPage + 1))}
                  disabled={auditPage >= auditTotalPages || auditLoading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
