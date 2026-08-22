'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Clock,
  FileText, Files, GraduationCap, Grid2X2, LayoutDashboard, Library, Menu, MoreHorizontal,
  Plus, Search, Settings, Sparkles, Users, X, ArrowUpRight, CircleHelp, School, Send,
  SlidersHorizontal, Flame, UserRound, ChevronRight, ChevronLeft, Calendar, BookMarked, LogIn, LogOut, KeyRound,
  Loader2, Copy, BookmarkPlus, HelpCircle, Gamepad2, FileQuestion, MessageSquarePlus, Shield,
  Edit2, Trash2
} from 'lucide-react'
import { navItems } from '@/lib/mock-data'
import { LessonView } from '@/components/lesson-editor'
import { LibraryView } from '@/components/library-view'
import { ClassroomManager } from '@/components/classroom-manager'
import { WorkspaceModule } from '@/components/workspace-module'
import { AdminTeachersView } from '@/components/admin-teachers-view'
import { AdminDashboardView } from '@/components/admin-dashboard-view'
import { AdminAuditView } from '@/components/admin-audit-view'
import { AdminHealthView } from '@/components/admin-health-view'
import { HomeroomView } from '@/components/homeroom-view'
import { ReportsView } from '@/components/reports-view'
import { TeacherSettingsView } from '@/components/teacher-settings-view'
import { ScheduleView } from '@/components/schedule-view'
import { AssessmentManager } from '@/components/assessment-manager'
import { AttendanceView } from '@/components/attendance-view'
import { WorksheetManager } from '@/components/worksheet-manager'
import { NotificationDropdown } from '@/components/notification-dropdown'
import {
  getDashboardData,
  getDashboardSchedule as apiGetDashboardSchedule,
  toggleTask as apiToggleTask,
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  updateScheduleStatus as apiUpdateScheduleStatus,
  type DashboardData,
  type DashboardLesson,
  type DashboardTask,
} from '@/services/dashboard-service'
import { getClasses } from '@/services/classroom-service'
import {
  getLibraryActivities,
  createLibraryActivity,
  updateLibraryActivity,
  deleteLibraryActivity,
  type LibraryActivity,
} from '@/services/activity-service'
import {
  generateLessonPlan,
  generateActivity,
  generateWorksheet,
  generateQuestions,
  generateStudentComment,
  type GeneratedActivity,
  type GeneratedLessonPlan,
  type GeneratedWorksheet,
  type GeneratedQuestionsResult,
  type GeneratedStudentComment,
} from '@/services/ai-service'
import { saveLessonPlan } from '@/services/lesson-service'
import { saveWorkspaceRecord } from '@/services/teachflow-service'
import { useAuth } from '@/context/auth-context'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Activity, History } from 'lucide-react'

const iconMap = { LayoutDashboard, CalendarDays, BookOpen, Library, Users, GraduationCap, Files, ClipboardCheck, School, CheckCircle2, Settings, Sparkles, FileText }

type View =
  | 'Tổng quan'
  | 'Lịch dạy'
  | 'Giáo án'
  | 'Thư viện hoạt động'
  | 'Lớp học'
  | 'Học sinh'
  | 'Phiếu học tập'
  | 'Đánh giá'
  | 'Chủ nhiệm'
  | 'Điểm danh'
  | 'Báo cáo & Thống kê'
  | 'Tài nguyên'
  | 'Cài đặt'
  | 'Trợ lý AI'
  | 'Quản trị giáo viên'
  | 'Tổng quan hệ thống'
  | 'Quản lý giáo viên'
  | 'Nhật ký hệ thống'
  | 'Sức khỏe hệ thống'

function Sidebar({ active, onSelect, open, onClose }: { active: View; onSelect: (view: View) => void; open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const displayName = user?.teacher?.fullName || (isAdmin ? 'Quản trị viên' : 'Giáo viên')
  const initials = displayName.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase() || (isAdmin ? 'AD' : 'GV')

  const [sidebarClasses, setSidebarClasses] = useState<Array<{ id: string; name: string; grade: string; studentCount: number }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadSidebarClasses = async () => {
      if (!user || isAdmin) {
        setSidebarClasses([])
        setLoadingClasses(false)
        return
      }
      try {
        const cls = await getClasses()
        if (isMounted) {
          setSidebarClasses(
            cls.map((c) => ({
              id: c.id,
              name: c.name,
              grade: c.grade || 'Khối',
              studentCount: c.studentCount ?? c.students?.length ?? 0,
            }))
          )
        }
      } catch {
        if (isMounted) setSidebarClasses([])
      } finally {
        if (isMounted) setLoadingClasses(false)
      }
    }

    loadSidebarClasses()

    const handleClassesChange = () => {
      loadSidebarClasses()
    }

    window.addEventListener('teachflow:classes-changed', handleClassesChange)
    window.addEventListener('teachflow:auth-state-changed', handleClassesChange)
    return () => {
      isMounted = false
      window.removeEventListener('teachflow:classes-changed', handleClassesChange)
      window.removeEventListener('teachflow:auth-state-changed', handleClassesChange)
    }
  }, [user, isAdmin])

  return (
    <>
      {open && <button aria-label="Đóng menu" className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
            {isAdmin ? <Shield className="size-5" /> : <School />}
          </div>
          <div>
            <div className="font-semibold tracking-tight text-slate-900">TeachFlow</div>
            <div className="text-xs text-slate-400">{isAdmin ? 'Quản trị hệ thống' : 'Trợ lý giáo viên'}</div>
          </div>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={onClose}><X /></button>
        </div>

        {/* Sidebar Content */}
        {isAdmin ? (
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-widest text-teal-600 flex items-center gap-1.5">
              <Shield className="size-3.5" /> Quản trị hệ thống
            </p>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => { onSelect('Tổng quan hệ thống'); onClose() }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active === 'Tổng quan hệ thống' || active === 'Tổng quan' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <LayoutDashboard className="size-[18px]" />
                Tổng quan
              </button>
              <button
                onClick={() => { onSelect('Quản lý giáo viên'); onClose() }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active === 'Quản lý giáo viên' || active === 'Quản trị giáo viên' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Users className="size-[18px]" />
                Tài khoản giáo viên
              </button>
              <button
                onClick={() => { onSelect('Nhật ký hệ thống'); onClose() }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active === 'Nhật ký hệ thống' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <History className="size-[18px]" />
                Nhật ký hệ thống
              </button>
              <button
                onClick={() => { onSelect('Sức khỏe hệ thống'); onClose() }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active === 'Sức khỏe hệ thống' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Activity className="size-[18px]" />
                Sức khỏe hệ thống
              </button>
            </nav>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Workspace</p>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = iconMap[item.icon as keyof typeof iconMap]
                const selected = active === item.label
                return (
                  <button
                    key={item.label}
                    onClick={() => { onSelect(item.label as View); onClose() }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${selected ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <Icon className="size-[18px]" />
                    {item.label}
                    {item.label === 'Trợ lý AI' && <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-700">Mới</span>}
                  </button>
                )
              })}
            </nav>

            <div className="my-5 border-t border-slate-100" />
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Lớp của tôi</p>
            {loadingClasses ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                <Loader2 className="size-3.5 animate-spin text-teal-600" />
                <span>Đang tải danh sách lớp...</span>
              </div>
            ) : sidebarClasses.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">
                <p className="mb-2">Bạn chưa có lớp nào.</p>
                <button
                  onClick={() => {
                    onSelect('Lớp học')
                    onClose()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition"
                >
                  <Plus className="size-3.5" /> Tạo lớp đầu tiên
                </button>
              </div>
            ) : (
              sidebarClasses.map((cls, idx) => {
                const bgColors = ['bg-blue-50 text-blue-700', 'bg-orange-50 text-orange-700', 'bg-teal-50 text-teal-700', 'bg-purple-50 text-purple-700']
                const colorClass = bgColors[idx % bgColors.length]
                const shortCode = cls.name.replace(/^lớp\s+/i, '')
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      onSelect('Lớp học')
                      onClose()
                    }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    <span className={`grid size-8 place-items-center rounded-lg text-xs font-semibold ${colorClass}`}>
                      {shortCode}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-medium text-slate-800">{cls.name}</b>
                      <small className="text-xs text-slate-400">{cls.studentCount} học sinh</small>
                    </span>
                    <ChevronRight className="ml-auto size-4 text-slate-300" />
                  </button>
                )
              })
            )}
          </div>
        )}

        <div className="border-t border-slate-100 p-4">
          <div className="flex w-full items-center gap-3 rounded-xl p-2 text-left">
            <span className="grid size-9 place-items-center rounded-full bg-teal-100 font-semibold text-teal-700">{initials}</span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm font-medium text-slate-800">{displayName}</b>
              <small className="text-xs text-slate-400">{user?.email || (isAdmin ? 'Quản trị viên' : 'Giáo viên')}</small>
            </span>
            {user && (
              <button onClick={logout} title="Đăng xuất" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function Header({
  onMenu,
  onOpenLogin,
  onNavigate,
}: {
  onMenu: () => void;
  onOpenLogin: () => void;
  onNavigate?: (view: View) => void;
}) {
  const { user } = useAuth()
  const teacherName = user?.teacher?.fullName || (user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nguyễn Thị Mai')
  const initials = teacherName.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase() || 'NM'

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button className="text-slate-500 lg:hidden" onClick={onMenu}>
          <Menu />
        </button>
        <div className="relative hidden w-72 sm:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-teal-400"
            placeholder="Tìm kiếm nhanh..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50">
          <CircleHelp className="size-[18px]" />
        </button>
        <NotificationDropdown onNavigate={(v) => onNavigate?.(v as View)} />
        <div className="hidden h-7 w-px bg-slate-200 sm:block" />
        {user ? (
          <button onClick={onOpenLogin} className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
              {initials}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {teacherName}
            </span>
            <ChevronDown className="size-4 text-slate-400" />
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            <LogIn className="size-3.5" /> Đăng nhập
          </button>
        )}
      </div>
    </header>
  )
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-600">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}</div>{action}</div> }

function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseYYYYMMDD(str: string): Date {
  if (!str) return new Date()
  const parts = str.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return new Date()
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(date)
  mon.setDate(diff)
  return mon
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}

function formatVietnameseDate(d: Date): string {
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const dayName = weekdays[d.getDay()]
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return `${dayName}, ${day} tháng ${month}, ${year}`
}

function formatVietnameseWeek(monday: Date, sunday: Date): string {
  const monDay = monday.getDate()
  const monMonth = monday.getMonth() + 1
  const sunDay = sunday.getDate()
  const sunMonth = sunday.getMonth() + 1
  const year = sunday.getFullYear()

  if (monMonth === sunMonth) {
    return `${monDay} - ${sunDay} tháng ${monMonth}, ${year}`
  } else {
    return `${monDay}/${monMonth} - ${sunDay}/${sunMonth}, ${year}`
  }
}

function formatVietnameseDayShort(dateStr: string): string {
  const d = parseYYYYMMDD(dateStr)
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const dayName = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${dayName}, ${day}/${month}`
}

function computeScheduleStatus(
  lesson?: DashboardLesson | null,
  nowTime: Date = new Date(),
): { label: string; tone: 'teal' | 'blue' | 'slate' | 'red'; code: string } {
  if (!lesson) {
    return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  }

  if (lesson.isManualStatus) {
    if (lesson.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'red', code: 'CANCELLED' }
    if (lesson.status === 'TAUGHT' || lesson.status === 'COMPLETED') return { label: 'Đã hoàn thành', tone: 'blue', code: 'TAUGHT' }
    if (lesson.status === 'IN_PROGRESS') return { label: 'Đang diễn ra', tone: 'teal', code: 'IN_PROGRESS' }
    if (lesson.status === 'PLANNED' || lesson.status === 'NOT_STARTED') return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  }

  if (lesson.status === 'CANCELLED') {
    return { label: 'Đã hủy', tone: 'red', code: 'CANCELLED' }
  }

  const lessonDateStr = lesson.plannedDate || formatYYYYMMDD(nowTime)
  const startStr = lesson.startTime || '07:00'
  const endStr = lesson.endTime || '07:45'

  const [y, m, d] = (lessonDateStr || '').split('-').map(Number)
  const [sh, sm] = (startStr || '').split(':').map(Number)
  const [eh, em] = (endStr || '').split(':').map(Number)

  if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
    return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  }
  const slotStart = new Date(y, m - 1, d, sh, sm, 0)
  const slotEnd = new Date(y, m - 1, d, eh, em, 0)

  const nowMs = nowTime.getTime()
  if (nowMs < slotStart.getTime()) {
    return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  } else if (nowMs >= slotStart.getTime() && nowMs <= slotEnd.getTime()) {
    return { label: 'Đang diễn ra', tone: 'teal', code: 'IN_PROGRESS' }
  } else {
    return { label: 'Đã hoàn thành', tone: 'blue', code: 'TAUGHT' }
  }
}

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tasksList, setTasksList] = useState<DashboardTask[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<{
    type: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'SERVER_ERROR' | 'NETWORK_ERROR'
    message: string
  } | null>(null)

  // Real-time clock (HH:mm:ss in local time)
  const [nowDate, setNowDate] = useState<Date>(() => new Date())
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    return new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })

  // Schedule View State
  const [scheduleViewMode, setScheduleViewMode] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState<string>(() => formatYYYYMMDD(new Date()))
  const [scheduleLessons, setScheduleLessons] = useState<DashboardLesson[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleRetryKey, setScheduleRetryKey] = useState(0)
  const scheduleReqSeq = useRef(0)

  // Task creation modal
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('Hôm nay')
  const [creatingTask, setCreatingTask] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  // Schedule status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<DashboardLesson | null>(null)
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null)
  const [editStatus, setEditStatus] = useState('PLANNED')
  const [editStartTime, setEditStartTime] = useState('07:00')
  const [editEndTime, setEditEndTime] = useState('07:45')
  const [savingStatus, setSavingStatus] = useState(false)

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date()
      setNowDate(n)
      setCurrentTimeStr(n.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load dashboard overview data
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setDashboardError(null)
    try {
      const res = await getDashboardData()
      if (res) {
        setData(res)
        if (res.tasks) setTasksList(res.tasks)
      }
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.status === 401) {
        setDashboardError({
          type: 'UNAUTHENTICATED',
          message: 'Vui lòng đăng nhập để xem tổng quan dữ liệu giảng dạy.',
        })
      } else if (err?.statusCode === 403 || err?.status === 403) {
        setDashboardError({
          type: 'FORBIDDEN',
          message: 'Bạn không có quyền truy cập trang tổng quan này.',
        })
      } else {
        setDashboardError({
          type: 'SERVER_ERROR',
          message: err?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadDashboardData()

    // Only reload on successful login (teachflow:auth-state-changed), not on logout/token-cleared
    const handleAuthChange = () => {
      loadDashboardData()
    }
    window.addEventListener('teachflow:auth-state-changed', handleAuthChange)
    return () => window.removeEventListener('teachflow:auth-state-changed', handleAuthChange)
  }, [loadDashboardData])

  // Date calculations
  const todayStr = useMemo(() => formatYYYYMMDD(nowDate), [nowDate])
  const isCurrentDate = selectedDate === todayStr

  const selectedDateObj = useMemo(() => parseYYYYMMDD(selectedDate), [selectedDate])
  const mondayObj = useMemo(() => getMonday(selectedDateObj), [selectedDateObj])
  const sundayObj = useMemo(() => getSunday(mondayObj), [mondayObj])
  const mondayStr = useMemo(() => formatYYYYMMDD(mondayObj), [mondayObj])
  const sundayStr = useMemo(() => formatYYYYMMDD(sundayObj), [sundayObj])

  const isCurrentWeek = useMemo(() => {
    const curMonStr = formatYYYYMMDD(getMonday(new Date()))
    return mondayStr === curMonStr
  }, [mondayStr])

  // Fetch schedule whenever viewMode or selectedDate changes (only when user is authenticated)
  useEffect(() => {
    if (!user) {
      setScheduleLessons([])
      setLoadingSchedule(false)
      return
    }
    const reqId = ++scheduleReqSeq.current
    setLoadingSchedule(true)
    setScheduleError(null)

    if (scheduleViewMode === 'day') {
      apiGetDashboardSchedule({ date: selectedDate })
        .then((res) => {
          if (reqId === scheduleReqSeq.current) {
            setScheduleLessons(res || [])
            setLoadingSchedule(false)
          }
        })
        .catch((err: any) => {
          if (reqId === scheduleReqSeq.current) {
            if (err?.statusCode === 401 || err?.status === 401) {
              setScheduleError('Vui lòng đăng nhập để xem lịch dạy')
            } else if (err?.statusCode === 403 || err?.status === 403) {
              setScheduleError('Bạn không có quyền xem lịch dạy này')
            } else {
              setScheduleError(err?.message || 'Không thể tải lịch dạy lúc này')
            }
            setScheduleLessons([])
            setLoadingSchedule(false)
          }
        })
    } else {
      apiGetDashboardSchedule({ from: mondayStr, to: sundayStr })
        .then((res) => {
          if (reqId === scheduleReqSeq.current) {
            setScheduleLessons(res || [])
            setLoadingSchedule(false)
          }
        })
        .catch((err: any) => {
          if (reqId === scheduleReqSeq.current) {
            if (err?.statusCode === 401 || err?.status === 401) {
              setScheduleError('Vui lòng đăng nhập để xem lịch dạy')
            } else if (err?.statusCode === 403 || err?.status === 403) {
              setScheduleError('Bạn không có quyền xem lịch dạy này')
            } else {
              setScheduleError(err?.message || 'Không thể tải lịch dạy lúc này')
            }
            setScheduleLessons([])
            setLoadingSchedule(false)
          }
        })
    }
  }, [user, scheduleViewMode, selectedDate, mondayStr, sundayStr, scheduleRetryKey])

  const handlePrev = () => {
    if (scheduleViewMode === 'day') {
      const prev = new Date(selectedDateObj)
      prev.setDate(prev.getDate() - 1)
      setSelectedDate(formatYYYYMMDD(prev))
    } else {
      const prev = new Date(mondayObj)
      prev.setDate(prev.getDate() - 7)
      setSelectedDate(formatYYYYMMDD(prev))
    }
  }

  const handleNext = () => {
    if (scheduleViewMode === 'day') {
      const next = new Date(selectedDateObj)
      next.setDate(next.getDate() + 1)
      setSelectedDate(formatYYYYMMDD(next))
    } else {
      const next = new Date(mondayObj)
      next.setDate(next.getDate() + 7)
      setSelectedDate(formatYYYYMMDD(next))
    }
  }

  const handleToday = () => {
    setSelectedDate(formatYYYYMMDD(new Date()))
  }

  const toggle = async (index: number) => {
    const target = tasksList[index]
    if (!target) return
    const nextDone = !target.done
    setTasksList(prev => prev.map((t, j) => j === index ? { ...t, done: nextDone } : t))
    if (target.id && !target.id.startsWith('task-')) {
      try {
        await apiToggleTask(target.id, nextDone)
      } catch {
        setTasksList(prev => prev.map((t, j) => j === index ? { ...t, done: !nextDone } : t))
        toast.error('Lỗi khi cập nhật trạng thái việc cần làm')
      }
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) {
      toast.error('Vui lòng nhập nội dung công việc')
      return
    }
    setCreatingTask(true)
    try {
      const created = await apiCreateTask({
        title: newTaskTitle.trim(),
        due: newTaskDue.trim() || 'Hôm nay',
        done: false,
      })
      setTasksList(prev => [created, ...prev])
      setNewTaskTitle('')
      setNewTaskDue('Hôm nay')
      setTaskModalOpen(false)
      toast.success('Đã thêm việc cần làm mới')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi thêm việc cần làm')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string, index: number) => {
    setDeletingTaskId(taskId)
    try {
      await apiDeleteTask(taskId)
      setTasksList(prev => prev.filter((_, i) => i !== index))
      toast.success('Đã xóa việc cần làm')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa việc cần làm')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const openStatusModal = (lesson: DashboardLesson, index: number) => {
    setSelectedLesson(lesson)
    setSelectedLessonIndex(index)
    const statusInfo = computeScheduleStatus(lesson, nowDate)
    setEditStatus(lesson.isManualStatus && lesson.status ? lesson.status : statusInfo.code)
    setEditStartTime(lesson.startTime || '07:00')
    setEditEndTime(lesson.endTime || '07:45')
    setStatusModalOpen(true)
  }

  const handleSaveStatus = async () => {
    if (!selectedLesson) return
    if (editStartTime && editEndTime && editStartTime >= editEndTime) {
      toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc')
      return
    }
    setSavingStatus(true)
    try {
      if (selectedLesson.id) {
        await apiUpdateScheduleStatus(selectedLesson.id, {
          status: editStatus,
          startTime: editStartTime || undefined,
          endTime: editEndTime || undefined,
          isManualStatus: true,
        })
      }
      setScheduleLessons(prev => prev.map((item, idx) => {
        if (idx === selectedLessonIndex || (selectedLesson.id && item.id === selectedLesson.id)) {
          return {
            ...item,
            status: editStatus,
            startTime: editStartTime,
            endTime: editEndTime,
            time: `${editStartTime} - ${editEndTime}`,
            isManualStatus: true,
          }
        }
        return item
      }))
      toast.success('Đã cập nhật trạng thái lịch dạy thành công')
      setStatusModalOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái lúc này')
    } finally {
      setSavingStatus(false)
    }
  }

  // Group lessons by plannedDate for week view
  const groupedLessons = useMemo(() => {
    if (scheduleViewMode !== 'week' || !Array.isArray(scheduleLessons)) return []
    const map = new Map<string, DashboardLesson[]>()
    for (const lesson of scheduleLessons) {
      if (!lesson) continue
      const d = lesson.plannedDate || 'Chưa định ngày'
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(lesson)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [scheduleViewMode, scheduleLessons])

  const completedTasksCount = tasksList.filter((t) => t.done).length
  const totalTasksCount = tasksList.length
  const taskPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0
  const overallPercent = data?.classProgress?.overallPercent ?? 0

  const stats = (data?.stats || []).map((s) => {
    if (s.label === 'Nhiệm vụ tuần này' || s.label === 'Nhiệm vụ hôm nay') {
      return {
        ...s,
        value: `${completedTasksCount}/${totalTasksCount}`,
        note: `${taskPercent}% hoàn thành`,
      }
    }
    return s
  })

  const students = data?.featuredStudents || []

  if (loading && !data && !dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-teal-600" />
        <span className="text-sm font-medium">Đang tải dữ liệu tổng quan...</span>
      </div>
    )
  }

  const renderLessonItem = (lesson: DashboardLesson, i: number, globalIdx?: number) => {
    if (!lesson) return null;
    const statusInfo = computeScheduleStatus(lesson, nowDate);
    const idx = globalIdx !== undefined ? globalIdx : i;
    return (
      <div
        key={lesson.id || `${lesson.title || 'lesson'}-${idx}`}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50/60 transition"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-24 shrink-0 text-center bg-slate-50 py-1.5 px-2 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-800 tracking-tight">
              {lesson.startTime || '07:00'} - {lesson.endTime || '07:45'}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">Tiết {i + 1}</p>
          </div>

          <div
            className={`h-10 w-1 rounded-full shrink-0 ${
              statusInfo.tone === 'teal'
                ? 'bg-teal-500'
                : statusInfo.tone === 'blue'
                  ? 'bg-blue-500'
                  : statusInfo.tone === 'red'
                    ? 'bg-red-400'
                    : 'bg-slate-300'
            }`}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-900 truncate">{lesson.title || 'Tiết dạy'}</h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {lesson.subject || 'Chung'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {lesson.className || 'Lớp'}{lesson.gradeName ? ` (${lesson.gradeName})` : ''} · {lesson.room || 'Phòng học'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
              statusInfo.tone === 'teal'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : statusInfo.tone === 'blue'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : statusInfo.tone === 'red'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {statusInfo.tone === 'teal' && <span className="size-1.5 rounded-full bg-teal-500 animate-ping" />}
            {statusInfo.label}
          </span>

          <button
            onClick={() => openStatusModal(lesson, idx)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition shadow-2xs"
            title="Cập nhật trạng thái hoặc thời gian"
          >
            <Edit2 className="size-3" /> Cập nhật trạng thái
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        eyebrow={data?.greeting?.date || "Hôm nay"}
        title={data?.greeting?.title || (user ? `Chào mừng ${user.teacher?.fullName || user.email}` : "Chào mừng thầy/cô")}
        description={data?.greeting?.description || "Tổng quan công việc và dữ liệu học tập hôm nay."}
        action={
          <button
            onClick={() => onNavigate('Giáo án')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-200 hover:bg-teal-700"
          >
            <Plus className="size-4" /> Tạo giáo án mới
          </button>
        }
      />

      {/* Unauthenticated Alert Card */}
      {dashboardError?.type === 'UNAUTHENTICATED' && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-6 text-center shadow-xs">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-100 text-teal-700 mb-3 shadow-2xs">
            <LogIn className="size-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Vui lòng đăng nhập</h3>
          <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
            Đăng nhập tài khoản giáo viên để xem đầy đủ kế hoạch lịch dạy, việc cần làm và phân tích lớp học.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('teachflow:open-login'))}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <LogIn className="size-3.5" /> Đăng nhập ngay
            </button>
          </div>
        </div>
      )}

      {/* Server / Network Error Alert Card */}
      {dashboardError && dashboardError.type !== 'UNAUTHENTICATED' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center shadow-xs">
          <p className="text-sm font-semibold text-rose-800">{dashboardError.message}</p>
          <button
            onClick={loadDashboardData}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-xs"
          >
            Thử lại
          </button>
        </div>
      )}

      {stats.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, note, tone, icon }) => {
            const Icon =
              icon === 'CalendarDays'
                ? CalendarDays
                : icon === 'BookOpen'
                  ? BookOpen
                  : icon === 'GraduationCap'
                    ? GraduationCap
                    : CheckCircle2;
            return (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-1 text-xs text-slate-400">{note}</p>
                  </div>
                  <span
                    className={`grid size-11 place-items-center rounded-xl ${
                      tone === 'teal'
                        ? 'bg-teal-50 text-teal-600'
                        : tone === 'blue'
                          ? 'bg-blue-50 text-blue-600'
                          : tone === 'orange'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-violet-50 text-violet-600'
                    }`}
                  >
                    <Icon className="size-5" />
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Kế hoạch & Lịch dạy Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-slate-900 text-base">Kế hoạch & Lịch dạy</h2>
                {/* Live Digital Clock */}
                <div className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-mono font-semibold text-teal-700 border border-teal-200 shadow-sm">
                  <Clock className="size-3.5 animate-pulse text-teal-600" />
                  <span>{currentTimeStr}</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('Lịch dạy')}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 inline-flex items-center"
              >
                Xem lịch <ArrowUpRight className="ml-1 inline size-4" />
              </button>
            </div>

            {/* Control bar: [Ngày] [Tuần] ‹ Date Navigation › */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('day')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    scheduleViewMode === 'day'
                      ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('week')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    scheduleViewMode === 'week'
                      ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Tuần
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                  title={scheduleViewMode === 'day' ? 'Ngày trước' : 'Tuần trước'}
                >
                  <ChevronLeft className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToday}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition shadow-2xs ${
                    (scheduleViewMode === 'day' ? isCurrentDate : isCurrentWeek)
                      ? 'border-teal-200 bg-teal-50 text-teal-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {scheduleViewMode === 'day' ? 'Hôm nay' : 'Tuần này'}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                  title={scheduleViewMode === 'day' ? 'Ngày sau' : 'Tuần sau'}
                >
                  <ChevronRight className="size-4" />
                </button>

                <div className="relative flex items-center">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-2xs">
                    <Calendar className="size-3.5 text-teal-600" />
                    <span>
                      {scheduleViewMode === 'day'
                        ? formatVietnameseDate(selectedDateObj)
                        : formatVietnameseWeek(mondayObj, sundayObj)}
                    </span>
                    <input
                      type="date"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value)
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            {loadingSchedule ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="size-5 animate-spin text-teal-600" />
                <span className="text-xs font-medium">Đang tải lịch dạy...</span>
              </div>
            ) : scheduleError ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-500">{scheduleError}</p>
                <button
                  type="button"
                  onClick={() => setScheduleRetryKey(k => k + 1)}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  Tải lại lịch
                </button>
              </div>
            ) : scheduleViewMode === 'day' ? (
              scheduleLessons.length > 0 ? (
                scheduleLessons.map((lesson, i) => renderLessonItem(lesson, i))
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  Không có lịch dạy nào vào {formatVietnameseDate(selectedDateObj)}. Nhấn "Xem lịch" để lên lịch giảng dạy.
                </div>
              )
            ) : (
              groupedLessons.length > 0 ? (
                groupedLessons.map(([dateStr, dayLessons]) => (
                  <div key={dateStr} className="border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between bg-slate-50/80 px-5 py-2 border-y border-slate-100">
                      <span className="text-xs font-semibold text-slate-800">
                        {formatVietnameseDayShort(dateStr)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {dayLessons.length} tiết dạy
                      </span>
                    </div>
                    <div>
                      {dayLessons.map((lesson, i) => renderLessonItem(lesson, i))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  Không có lịch dạy nào trong tuần {formatVietnameseWeek(mondayObj, sundayObj)}. Nhấn "Xem lịch" để lên lịch giảng dạy.
                </div>
              )
            )}
          </div>
        </div>

        {/* Việc cần làm Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Việc cần làm</h2>
              <p className="mt-1 text-xs text-slate-400">
                {completedTasksCount} trên {totalTasksCount} đã hoàn thành ({taskPercent}%)
              </p>
            </div>
            <button
              onClick={() => {
                setNewTaskTitle('')
                setNewTaskDue('Hôm nay')
                setTaskModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition shadow-2xs"
            >
              <Plus className="size-3.5" /> Thêm việc
            </button>
          </div>
          <div className="flex flex-col gap-1 p-4">
            {tasksList.length > 0 ? (
              tasksList.map((task, i) => (
                <div
                  key={task.id || task.title + i}
                  className="group flex items-start justify-between gap-3 rounded-xl p-3 hover:bg-slate-50 transition"
                >
                  <label className="flex cursor-pointer items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      aria-label={task.done ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                      onClick={() => toggle(i)}
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${
                        task.done ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white hover:border-teal-500'
                      }`}
                    >
                      {task.done && <Check className="size-3.5" />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium transition ${
                          task.done ? 'text-slate-400 line-through opacity-60' : 'text-slate-800'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{task.due}</span>
                    </span>
                  </label>

                  {task.id && !task.id.startsWith('task-') && (
                    <button
                      onClick={() => handleDeleteTask(task.id, i)}
                      disabled={deletingTaskId === task.id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-600 transition"
                      title="Xóa công việc"
                    >
                      {deletingTaskId === task.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                Chưa có việc cần làm nào hôm nay. Nhấn "+ Thêm việc" để ghi chú.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Add Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Thêm việc cần làm hôm nay</DialogTitle>
            <DialogDescription>
              Ghi chú công việc cần hoàn thành. Nhiệm vụ sẽ tự động được làm mới mỗi ngày.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="grid gap-3 py-2">
            <div>
              <Label htmlFor="new-task-title" className="text-xs font-semibold">Nội dung công việc *</Label>
              <Input
                id="new-task-title"
                className="mt-1"
                placeholder="VD: Soạn giáo án Toán, Nhắc nhở HS chuẩn bị bài..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <Label htmlFor="new-task-due" className="text-xs font-semibold">Thời hạn / Thời gian</Label>
              <Input
                id="new-task-due"
                className="mt-1"
                placeholder="Hôm nay, Trước 15:00..."
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
              />
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)} disabled={creatingTask}>Hủy</Button>
              <Button type="submit" disabled={creatingTask || !newTaskTitle.trim()} className="bg-teal-600 hover:bg-teal-700">
                {creatingTask ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Thêm công việc
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Schedule Status & Time Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái tiết dạy</DialogTitle>
            <DialogDescription>
              {selectedLesson?.title} ({selectedLesson?.subject} · {selectedLesson?.className})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3.5 py-2">
            <div>
              <Label htmlFor="sch-status-select" className="text-xs font-semibold">Trạng thái tiết dạy *</Label>
              <select
                id="sch-status-select"
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="PLANNED">Chưa bắt đầu (PLANNED)</option>
                <option value="IN_PROGRESS">Đang diễn ra (IN_PROGRESS)</option>
                <option value="TAUGHT">Đã hoàn thành (TAUGHT)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sch-start-time" className="text-xs font-semibold">Giờ bắt đầu</Label>
                <Input
                  id="sch-start-time"
                  type="time"
                  className="mt-1"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sch-end-time" className="text-xs font-semibold">Giờ kết thúc</Label>
                <Input
                  id="sch-end-time"
                  type="time"
                  className="mt-1"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)} disabled={savingStatus}>Hủy</Button>
            <Button onClick={handleSaveStatus} disabled={savingStatus} className="bg-teal-600 hover:bg-teal-700">
              {savingStatus ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">{data?.classProgress?.className || "Tiến độ học tập"}</h2>
              <p className="mt-1 text-xs text-slate-400">Theo dõi phân loại học lực học sinh</p>
            </div>
            <button onClick={() => onNavigate('Lớp học')} className="text-sm font-medium text-teal-600">
              Chi tiết <ChevronRight className="inline size-4" />
            </button>
          </div>
          <div className="mt-6 flex items-center gap-6">
            <div
              className="relative grid size-32 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#0d9488 0 ${overallPercent}%, #e2e8f0 ${overallPercent}% 100%)`,
              }}
            >
              <div className="grid size-24 place-items-center rounded-full bg-white">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-900">{overallPercent}%</p>
                  <p className="text-[10px] text-slate-400">Tỷ lệ tốt / khá</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-teal-500" /> Hoàn thành tốt{' '}
                <b className="ml-auto pl-4">{data?.classProgress?.excellent ?? 0}</b>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" /> Đang tiến bộ{' '}
                <b className="ml-auto pl-4">{data?.classProgress?.improving ?? 0}</b>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-orange-400" /> Cần hỗ trợ{' '}
                <b className="ml-auto pl-4">{data?.classProgress?.needsSupport ?? 0}</b>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Học sinh cần lưu ý / Tiêu biểu</h2>
              <p className="mt-1 text-xs text-slate-400">Danh sách học sinh lớp phụ trách</p>
            </div>
            <Flame className="size-5 text-orange-500" />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {students.length > 0 ? (
              students.slice(0, 4).map((s) => (
                <div key={s.id || s.name} className="flex items-center gap-3">
                  <span className={`grid size-9 place-items-center rounded-full text-xs font-semibold ${s.color}`}>
                    {s.initials}
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className="block text-sm font-medium text-slate-800 truncate">{s.name}</b>
                    <span className="text-xs text-slate-400">{s.className ? `Lớp ${s.className} · ` : ''}{s.status}</span>
                  </span>
                  <div className="w-24">
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-600">{s.progress}%</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">Chưa có học sinh trong danh sách phụ trách.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function GenericView({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // If ADMIN user is accessing views
  if (isAdmin) {
    if (view === 'Tổng quan hệ thống' || view === 'Tổng quan') {
      return <AdminDashboardView onNavigate={onNavigate} />
    }
    if (view === 'Quản lý giáo viên' || view === 'Quản trị giáo viên') {
      return <AdminTeachersView />
    }
    if (view === 'Nhật ký hệ thống') {
      return <AdminAuditView />
    }
    if (view === 'Sức khỏe hệ thống') {
      return <AdminHealthView />
    }

    // Direct access to teacher views by admin is restricted
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <Shield className="mx-auto size-12 text-amber-600 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Khu vực dành cho giáo viên</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Tài khoản Quản trị viên (ADMIN) chỉ quản lý hạ tầng, tài khoản và an ninh hệ thống. Để sử dụng tính năng giảng dạy, vui lòng đăng nhập bằng tài khoản giáo viên.
        </p>
        <button
          onClick={() => onNavigate('Tổng quan hệ thống')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Quay lại Bảng điều khiển Quản trị
        </button>
      </div>
    )
  }

  // If TEACHER user tries to access Admin views
  if (['Quản lý giáo viên', 'Quản trị giáo viên', 'Nhật ký hệ thống', 'Sức khỏe hệ thống', 'Tổng quan hệ thống'].includes(view)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <Shield className="mx-auto size-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">403 - Quyền truy cập bị từ chối</h2>
        <p className="mt-2 text-sm text-slate-600">
          Chức năng quản trị chỉ dành riêng cho tài khoản Quản trị viên (ADMIN).
        </p>
        <button
          onClick={() => onNavigate('Tổng quan')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Quay lại Bảng điều khiển Giáo viên
        </button>
      </div>
    )
  }

  // Teacher Workspace Views
  if (view === 'Trợ lý AI') return <AIView onNavigate={onNavigate} />
  if (view === 'Giáo án') return <LessonView onNavigate={onNavigate} />
  if (view === 'Lớp học') return <ClassroomManager initialSection="classes" />
  if (view === 'Học sinh') return <ClassroomManager initialSection="students" />
  if (view === 'Thư viện hoạt động') return <LibraryView onNavigate={onNavigate} />
  if (view === 'Chủ nhiệm') return <HomeroomView onNavigate={onNavigate} />
  if (view === 'Báo cáo & Thống kê') return <ReportsView />
  if (view === 'Cài đặt') return <TeacherSettingsView />
  if (view === 'Lịch dạy') return <ScheduleView onNavigate={onNavigate} />
  if (view === 'Đánh giá') return <AssessmentManager />
  if (view === 'Điểm danh') return <AttendanceView />
  if (view === 'Phiếu học tập') return <WorksheetManager />
  if (view === 'Tài nguyên') return <WorkspaceModule view="Tài nguyên" />
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        eyebrow="TeachFlow workspace"
        title={view}
        description="Quản lý và theo dõi công việc giảng dạy của bạn."
        action={
          <button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="size-4" /> Tạo mới
          </button>
        }
      />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          <FileText />
        </div>
        <h2 className="mt-4 font-semibold text-slate-900">Không gian {view.toLowerCase()}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Các dữ liệu và công cụ dành cho {view.toLowerCase()} sẽ hiển thị tại đây. Bắt đầu bằng cách tạo nội dung mới.
        </p>
      </div>
    </div>
  )
}

type AIMessage = {
  from: 'ai' | 'user';
  text: string;
  payload?: {
    type: 'lesson-plan' | 'activity' | 'worksheet' | 'questions' | 'student-comment';
    data: any;
  };
};

function AIView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { user } = useAuth()
  const teacherName = user?.teacher?.fullName || 'thầy cô'
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      from: 'ai',
      text: `Chào ${teacherName}! Tôi là Trợ lý AI sư phạm TeachFlow. Tôi có thể hỗ trợ thầy/cô soạn giáo án, thiết kế hoạt động, tạo phiếu học tập, biên soạn câu hỏi hoặc gợi ý nhận xét học sinh. Thầy/cô muốn bắt đầu với nội dung gì?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép nội dung vào bộ nhớ tạm');
  };

  const handleCreateLessonPlan = async (subject = 'Tiếng Việt', lessonTitle = 'Trong lời mẹ hát') => {
    setLoading(true);
    setMessages((m) => [...m, { from: 'user', text: `Soạn giáo án bài "${lessonTitle}" môn ${subject} Lớp 4` }]);
    try {
      const result = await generateLessonPlan({ grade: 4, subject, lessonTitle, durationMinutes: 35 });
      setMessages((m) => [
        ...m,
        {
          from: 'ai',
          text: `Tôi đã hoàn thành Kế hoạch bài dạy "${result.title}". Kế hoạch bao gồm ${result.activities.length} hoạt động với đầy đủ mục tiêu, thiết bị dạy học và chi tiết hoạt động của giáo viên - học sinh:`,
          payload: { type: 'lesson-plan', data: result },
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
      setMessages((m) => [...m, { from: 'ai', text: 'Không thể tạo nội dung lúc này. Vui lòng kiểm tra lại cấu hình GEMINI_API_KEY hoặc thử lại sau giây lát.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async (actionTitle: string, activityType = 'WARM_UP', requirement = 'Thiết kế trò chơi khởi động 5 phút phát triển năng lực giao tiếp') => {
    setLoading(true);
    setMessages((m) => [...m, { from: 'user', text: actionTitle }]);
    try {
      const result = await generateActivity({
        grade: 4,
        subject: 'Toán',
        lessonTitle: 'Phân số bằng nhau',
        activityType,
        durationMinutes: 5,
        requirement,
      });
      setMessages((m) => [
        ...m,
        {
          from: 'ai',
          text: `Tôi đã thiết kế hoạt động "${result.title}" (${result.durationMinutes} phút). Chi tiết phương pháp, kỹ thuật và hoạt động như sau:`,
          payload: { type: 'activity', data: result },
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
      setMessages((m) => [...m, { from: 'ai', text: 'Không thể tạo nội dung lúc này. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorksheet = async () => {
    setLoading(true);
    setMessages((m) => [...m, { from: 'user', text: 'Tạo phiếu học tập Toán 4 - Phân số bằng nhau' }]);
    try {
      const result = await generateWorksheet({
        grade: 4,
        subject: 'Toán',
        lesson: 'Phân số bằng nhau',
        numberOfQuestions: 4,
        difficulty: 'Trung bình',
      });
      setMessages((m) => [
        ...m,
        {
          from: 'ai',
          text: `Tôi đã biên soạn "${result.title}" gồm ${result.questions.length} câu hỏi có đáp án và lời giải chi tiết:`,
          payload: { type: 'worksheet', data: result },
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
      setMessages((m) => [...m, { from: 'ai', text: 'Không thể tạo nội dung lúc này. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestions = async () => {
    setLoading(true);
    setMessages((m) => [...m, { from: 'user', text: 'Tạo bộ câu hỏi theo thang Bloom bài Phân số bằng nhau' }]);
    try {
      const result = await generateQuestions({
        grade: 4,
        subject: 'Toán',
        topic: 'Phân số bằng nhau',
        numberOfQuestions: 4,
        levels: ['Nhận biết', 'Thông hiểu', 'Vận dụng'],
      });
      setMessages((m) => [
        ...m,
        {
          from: 'ai',
          text: `Tôi đã tạo bộ câu hỏi chủ đề "${result.topic}" theo các mức độ nhận thức:`,
          payload: { type: 'questions', data: result },
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
      setMessages((m) => [...m, { from: 'ai', text: 'Không thể tạo nội dung lúc này. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComments = async () => {
    setLoading(true);
    setMessages((m) => [...m, { from: 'user', text: 'Gợi ý nhận xét học sinh tháng này' }]);
    try {
      const result = await generateStudentComment({
        subject: 'Tiếng Việt',
        criteria: { 'Đọc hiểu': 'Tốt', 'Viết đoạn văn': 'Cần rèn luyện thêm tính liên kết câu', 'Giao tiếp': 'Tích cực' },
        assessmentLevel: 'Hoàn thành tốt',
        notes: 'Chủ động phát biểu trong giờ học',
      });
      setMessages((m) => [
        ...m,
        {
          from: 'ai',
          text: `Dưới đây là các gợi ý nhận xét sư phạm dành cho học sinh (đã ẩn danh thông tin):`,
          payload: { type: 'student-comment', data: result },
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nội dung lúc này. Vui lòng thử lại.');
      setMessages((m) => [...m, { from: 'ai', text: 'Không thể tạo nội dung lúc này. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSend = async (text = input) => {
    if (!text.trim() || loading) return;
    const query = text.trim();
    setInput('');
    const lower = query.toLowerCase();

    if (lower.includes('giáo án') || lower.includes('bài dạy')) {
      await handleCreateLessonPlan('Tiếng Việt', query.replace(/soạn giáo án|giáo án|bài/gi, '').trim() || 'Trong lời mẹ hát');
    } else if (lower.includes('phiếu') || lower.includes('bài tập')) {
      await handleCreateWorksheet();
    } else if (lower.includes('câu hỏi')) {
      await handleCreateQuestions();
    } else if (lower.includes('nhận xét') || lower.includes('học bạ')) {
      await handleCreateComments();
    } else {
      await handleCreateActivity(query, 'WARM_UP', query);
    }
  };

  const saveLessonPlanFromAI = async (plan: GeneratedLessonPlan) => {
    try {
      await saveLessonPlan({
        title: plan.title,
        subject: 'Tiếng Việt',
        grade: 'Lớp 4A',
        date: new Date().toISOString().split('T')[0],
        duration: 35,
        objective: plan.objectives,
        version: 1,
        activities: plan.activities.map((a, i) => ({
          id: `act-${Date.now()}-${i}`,
          phase: a.activityType || 'Hoạt động',
          title: a.title,
          minutes: a.durationMinutes || 5,
          method: (a.methods || []).join(', ') || 'Thảo luận nhóm',
          technique: (a.techniques || []).join(', ') || 'Động não',
          competencies: (a.competencies || []).join(', ') || 'Giao tiếp và hợp tác',
          qualities: (a.qualities || []).join(', ') || 'Chăm chỉ',
          objective: a.objective || '',
          teacher: a.teacherActivity || '',
          students: a.studentActivity || '',
        })),
      });
      toast.success('Đã lưu giáo án AI vào cơ sở dữ liệu!');
      if (onNavigate) onNavigate('Giáo án');
    } catch {
      toast.error('Không thể lưu giáo án. Vui lòng thử lại.');
    }
  };

  const saveWorksheetFromAI = async (sheet: GeneratedWorksheet) => {
    try {
      await saveWorkspaceRecord('Phiếu học tập', {
        id: '',
        title: sheet.title,
        subtitle: `Toán · Khối 4 · ${sheet.questions.length} câu hỏi`,
        status: 'Bản nháp',
        meta: 'Tạo bởi AI',
        tone: 'teal',
      });
      toast.success('Đã lưu phiếu học tập vào workspace!');
      if (onNavigate) onNavigate('Phiếu học tập');
    } catch {
      toast.error('Không thể lưu phiếu học tập.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
      <PageTitle eyebrow="TeachFlow AI · Google Gemini" title="Trợ lý AI của cô Mai" description="Trợ lý sư phạm tiểu học thông minh giúp soạn bài, tạo trò chơi và đánh giá học sinh." />
      <div className="grid min-h-[580px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100 lg:grid-cols-[260px_1fr]">
        <div className="hidden border-r border-slate-100 bg-slate-50/70 p-4 lg:block">
          <button onClick={() => setMessages([{ from: 'ai', text: 'Chào cô Mai! Tôi có thể giúp cô việc gì tiếp theo?' }])} className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700">
            <Plus className="size-4" /> Cuộc trò chuyện mới
          </button>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tác vụ nhanh</p>
          <div className="mt-2 flex flex-col gap-1.5 text-left">
            <button onClick={() => handleCreateLessonPlan('Tiếng Việt', 'Trong lời mẹ hát')} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:text-teal-700">
              <BookOpen className="size-3.5 text-teal-600" /> Soạn giáo án bài mới
            </button>
            <button onClick={() => handleCreateActivity('Tạo hoạt động khởi động', 'WARM_UP', 'Thiết kế trò chơi khởi động 5 phút môn Toán')} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:text-teal-700">
              <Gamepad2 className="size-3.5 text-orange-600" /> Tạo trò chơi khởi động
            </button>
            <button onClick={() => handleCreateWorksheet()} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:text-teal-700">
              <FileQuestion className="size-3.5 text-blue-600" /> Tạo phiếu học tập
            </button>
            <button onClick={() => handleCreateComments()} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:text-teal-700">
              <MessageSquarePlus className="size-3.5 text-violet-600" /> Viết nhận xét học sinh
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700">
                <Sparkles className="size-4" />
              </span>
              <div>
                <b className="block text-sm text-slate-800">TeachFlow AI · Google Gemini</b>
                <span className="flex items-center gap-1.5 text-xs text-teal-600">
                  <span className="size-1.5 rounded-full bg-teal-500" /> Đang trực tuyến (Gemini Flash)
                </span>
              </div>
            </div>
            <Settings className="size-4 text-slate-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.from === 'user' ? 'justify-end' : ''}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${m.from === 'ai' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
                    {m.from === 'ai' ? <Sparkles className="size-4" /> : <UserRound className="size-4" />}
                  </span>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.from === 'ai' ? 'rounded-tl-sm bg-slate-50 text-slate-700' : 'rounded-tr-sm bg-teal-600 text-white'}`}>
                    <p className="whitespace-pre-line">{m.text}</p>

                    {/* Lesson Plan Card */}
                    {m.payload?.type === 'lesson-plan' && m.payload.data && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                        <div className="border-b pb-2">
                          <h4 className="font-bold text-teal-700">{m.payload.data.title}</h4>
                          <p className="mt-1 text-xs text-slate-500"><b>Mục tiêu:</b> {m.payload.data.objectives}</p>
                          <p className="mt-1 text-xs text-slate-500"><b>Đồ dùng:</b> {m.payload.data.teachingEquipment}</p>
                        </div>
                        <div className="mt-3 space-y-3">
                          {m.payload.data.activities?.map((act: any, idx: number) => (
                            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                              <div className="flex items-center justify-between font-semibold text-slate-900">
                                <span>{idx + 1}. {act.title}</span>
                                <span className="text-teal-700">{act.durationMinutes} phút</span>
                              </div>
                              <p className="mt-1 text-slate-600"><b>Mục tiêu:</b> {act.objective}</p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <div className="rounded bg-blue-50/70 p-2">
                                  <b className="text-blue-800">Hoạt động GV:</b>
                                  <p className="mt-1 text-slate-700">{act.teacherActivity}</p>
                                </div>
                                <div className="rounded bg-orange-50/70 p-2">
                                  <b className="text-orange-800">Hoạt động HS:</b>
                                  <p className="mt-1 text-slate-700">{act.studentActivity}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 pt-2">
                          <Button size="sm" onClick={() => saveLessonPlanFromAI(m.payload!.data)} className="bg-teal-600 hover:bg-teal-700">
                            <BookmarkPlus className="mr-1.5 size-3.5" /> Thêm vào giáo án
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(m.payload!.data, null, 2))}>
                            <Copy className="mr-1.5 size-3.5" /> Sao chép
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Activity Card */}
                    {m.payload?.type === 'activity' && m.payload.data && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-bold text-teal-700">{m.payload.data.title}</h4>
                          <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">{m.payload.data.durationMinutes} phút</span>
                        </div>
                        <p className="mt-2 text-xs"><b>Mục tiêu:</b> {m.payload.data.objective}</p>
                        <p className="mt-1 text-xs text-slate-500"><b>Phương pháp:</b> {(m.payload.data.methods || []).join(', ')} · <b>Kỹ thuật:</b> {(m.payload.data.techniques || []).join(', ')}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                          <div className="rounded bg-blue-50/70 p-2.5">
                            <b className="text-blue-800">Hoạt động giáo viên:</b>
                            <p className="mt-1 leading-5 text-slate-700">{m.payload.data.teacherActivity}</p>
                          </div>
                          <div className="rounded bg-orange-50/70 p-2.5">
                            <b className="text-orange-800">Hoạt động học sinh:</b>
                            <p className="mt-1 leading-5 text-slate-700">{m.payload.data.studentActivity}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(`${m.payload!.data.title}\nGV: ${m.payload!.data.teacherActivity}\nHS: ${m.payload!.data.studentActivity}`)}>
                            <Copy className="mr-1.5 size-3.5" /> Sao chép
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Worksheet Card */}
                    {m.payload?.type === 'worksheet' && m.payload.data && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                        <h4 className="border-b pb-2 font-bold text-teal-700">{m.payload.data.title}</h4>
                        <div className="mt-3 space-y-3">
                          {m.payload.data.questions?.map((q: any, idx: number) => (
                            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                              <p className="font-semibold text-slate-900">Câu {idx + 1}: {q.content}</p>
                              {q.options && q.options.length > 0 && (
                                <div className="mt-1.5 grid grid-cols-2 gap-1 text-slate-600">
                                  {q.options.map((opt: string, oi: number) => <span key={oi}>{opt}</span>)}
                                </div>
                              )}
                              <div className="mt-2 rounded bg-teal-50/60 p-1.5 text-[11px] text-teal-900">
                                <b>Đáp án:</b> {q.correctAnswer} · <i>{q.explanation}</i>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => saveWorksheetFromAI(m.payload!.data)} className="bg-teal-600 hover:bg-teal-700">
                            <BookmarkPlus className="mr-1.5 size-3.5" /> Tạo phiếu học tập
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(m.payload!.data, null, 2))}>
                            <Copy className="mr-1.5 size-3.5" /> Sao chép
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Questions Card */}
                    {m.payload?.type === 'questions' && m.payload.data && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                        <h4 className="border-b pb-2 font-bold text-teal-700">Bộ câu hỏi: {m.payload.data.topic}</h4>
                        <div className="mt-3 space-y-2.5">
                          {m.payload.data.questions?.map((q: any, idx: number) => (
                            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                              <div className="flex items-center justify-between font-semibold">
                                <span>Câu {idx + 1} ({q.level})</span>
                                <span className="text-slate-400">{q.questionType}</span>
                              </div>
                              <p className="mt-1 text-slate-800">{q.content}</p>
                              <p className="mt-1.5 text-teal-800"><b>Đáp án:</b> {q.answer}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(m.payload!.data, null, 2))}>
                            <Copy className="mr-1.5 size-3.5" /> Sao chép câu hỏi
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Student Comment Card */}
                    {m.payload?.type === 'student-comment' && m.payload.data && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                        <h4 className="border-b pb-2 font-bold text-teal-700">Gợi ý nhận xét học sinh</h4>
                        <div className="mt-3 space-y-2">
                          {m.payload.data.comments?.map((c: string, idx: number) => (
                            <div key={idx} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-800">
                              <span>• {c}</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-teal-700 hover:bg-teal-50" onClick={() => copyToClipboard(c)}>
                                <Copy className="size-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 rounded-lg bg-teal-50/60 p-2.5 text-xs text-teal-900">
                          <p><b>Đánh giá chung:</b> {m.payload.data.overallAssessment}</p>
                          <p className="mt-1"><b>Khuyến nghị:</b> {m.payload.data.recommendations}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 animate-pulse">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                    <Loader2 className="size-4 animate-spin text-teal-600" />
                    TeachFlow AI đang phân tích và tạo nội dung với Google Gemini...
                  </div>
                </div>
              )}

              {/* 8 Quick Actions Grid */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <button disabled={loading} onClick={() => handleCreateLessonPlan('Tiếng Việt', 'Trong lời mẹ hát')} className="flex flex-col items-start rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50">
                  <BookOpen className="mb-2 size-4 text-teal-600" />
                  <b className="text-xs font-semibold text-slate-800">Soạn giáo án</b>
                  <span className="mt-0.5 text-[11px] text-slate-400">Tiếng Việt 4 · Chuẩn GDPT</span>
                </button>
                <button disabled={loading} onClick={() => handleCreateActivity('Tạo hoạt động khởi động 5 phút', 'WARM_UP', 'Trò chơi nhận diện nhanh phân số')} className="flex flex-col items-start rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50">
                  <Gamepad2 className="mb-2 size-4 text-orange-600" />
                  <b className="text-xs font-semibold text-slate-800">Hoạt động khởi động</b>
                  <span className="mt-0.5 text-[11px] text-slate-400">Trò chơi 5 phút đầu giờ</span>
                </button>
                <button disabled={loading} onClick={() => handleCreateWorksheet()} className="flex flex-col items-start rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50">
                  <FileQuestion className="mb-2 size-4 text-blue-600" />
                  <b className="text-xs font-semibold text-slate-800">Tạo phiếu học tập</b>
                  <span className="mt-0.5 text-[11px] text-slate-400">4 câu hỏi có lời giải</span>
                </button>
                <button disabled={loading} onClick={() => handleCreateComments()} className="flex flex-col items-start rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50">
                  <MessageSquarePlus className="mb-2 size-4 text-violet-600" />
                  <b className="text-xs font-semibold text-slate-800">Nhận xét học sinh</b>
                  <span className="mt-0.5 text-[11px] text-slate-400">Ẩn danh & nhân văn</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4 sm:p-5">
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-teal-400">
              <textarea
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault();
                    handleCustomSend();
                  }
                }}
                placeholder="Nhắn tin cho trợ lý AI (Ví dụ: Soạn giáo án Toán 4, tạo trò chơi khởi động, tạo câu hỏi...)"
                rows={1}
                className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
              />
              <button
                disabled={loading || !input.trim()}
                onClick={() => handleCustomSend()}
                aria-label="Gửi tin nhắn"
                className="grid size-10 place-items-center rounded-lg bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">TeachFlow AI sử dụng Google Gemini. Giáo viên kiểm tra và xác nhận trước khi lưu vào giáo án.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('teacher@teachflow.vn')
  const [password, setPassword] = useState('Password123@')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Đăng nhập thành công!')
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4 py-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">Email giáo viên</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@teachflow.vn" required />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">Mật khẩu</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Tài khoản mẫu seed:</p>
        <p>Email: <code className="text-teal-700">teacher@teachflow.vn</code></p>
        <p>Mật khẩu: <code className="text-teal-700">Password123@</code></p>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 font-semibold">
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang xác thực...
          </>
        ) : (
          <>
            <LogIn className="mr-2 size-4" />
            Đăng nhập
          </>
        )}
      </Button>
    </form>
  )
}

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-teal-600" />
            {user ? 'Thông tin tài khoản' : 'Đăng nhập TeachFlow'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Bạn đang đăng nhập với tài khoản ${user.email}`
              : 'Đăng nhập để đồng bộ dữ liệu giáo án, lớp học và học sinh trực tiếp với backend.'}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="flex flex-col gap-4 py-3">
            <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
              <p className="font-semibold">{user.teacher?.fullName || 'Giáo viên'}</p>
              <p className="text-xs text-teal-700">{user.email}</p>
              <p className="mt-2 text-xs text-slate-600">Vai trò: {user.role}</p>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={onClose}>Đóng</Button>
              <Button variant="destructive" onClick={() => { logout(); onClose(); toast.info('Đã đăng xuất'); }}>Đăng xuất</Button>
            </DialogFooter>
          </div>
        ) : (
          <LoginForm onSuccess={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TeacherApp() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [active, setActive] = useState<View>(isAdmin ? 'Tổng quan hệ thống' : 'Tổng quan')
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Switch default active view when user login state changes
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setActive('Tổng quan hệ thống')
    } else {
      setActive('Tổng quan')
    }
  }, [user?.role])

  // Listen for login modal open requests
  useEffect(() => {
    const handleOpenLogin = () => setAuthModalOpen(true)
    window.addEventListener('teachflow:open-login', handleOpenLogin)
    return () => window.removeEventListener('teachflow:open-login', handleOpenLogin)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-teal-600 text-white shadow-md">
          <School className="size-6" />
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="size-4 animate-spin text-teal-600" />
          <span className="text-sm font-medium">Đang khởi tạo TeachFlow...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-5">
            <div className="grid size-11 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
              <School className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">TeachFlow</h1>
              <p className="text-xs text-slate-500">Không gian làm việc dành cho giáo viên</p>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Đăng nhập tài khoản</h2>
            <p className="mt-1 text-xs text-slate-500">
              Đăng nhập để đồng bộ dữ liệu giáo án, lớp học và học sinh trực tiếp với backend.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar active={active} onSelect={setActive} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMenuOpen(true)} onOpenLogin={() => setAuthModalOpen(true)} onNavigate={setActive} />
        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            {isAdmin ? (
              <GenericView view={active} onNavigate={setActive} />
            ) : active === 'Tổng quan' ? (
              <Dashboard onNavigate={setActive} />
            ) : (
              <GenericView view={active} onNavigate={setActive} />
            )}
          </div>
        </main>
      </div>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}

export default TeacherApp
