'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { type StudentRecord, type ClassRecord } from '@/lib/classroom-data'
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  transferStudent,
  importStudents,
  analyzeStudentImportFile,
  getStudentOverview,
  getStudentProfile,
  getStudentAttendance,
  getStudentAssessments,
  getStudentComments,
  addStudentComment,
  getStudentEnrollments,
  notifyStudentDataChanged,
  type StudentSummaryStats,
  type StudentAttendanceResponse,
  type StudentAssessmentsResponse,
  type StudentEnrollmentHistoryItem,
  type StudentCommentItem,
} from '@/services/student-service'
import {
  getClasses,
  getSchoolYears,
  getGrades,
  type SchoolYearOption,
  type GradeOption,
} from '@/services/classroom-service'
import { getStudentAcademicProfile, type StudentAcademicProfile } from '@/services/assessment-service'
import { generateStudentComment } from '@/services/ai-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ArrowLeft, BarChart3, CalendarCheck2, Check, CheckCircle2, ChevronRight, Clock,
  Copy, Edit2, Eye, FileSpreadsheet, FileText, Filter, GraduationCap, Heart,
  History, LayoutGrid, Loader2, MessageSquare, MoreVertical, Plus, RefreshCw,
  Search, Sparkles, Trash2, TrendingUp, UploadCloud, User, UserPlus, Users,
  X, AlertCircle, Award, Phone, Mail, School, ArrowRightLeft, BookOpen, Layers
} from 'lucide-react'

const statusVariant = (status: StudentRecord['status']) =>
  status === 'Tốt' ? 'default' : status === 'Khá' ? 'secondary' : 'destructive'

export function StudentManager({ initialStudentId }: { initialStudentId?: string }) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId || null)
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [summary, setSummary] = useState<StudentSummaryStats>({
    totalStudents: 0,
    activeStudents: 0,
    needsSupportStudents: 0,
    avgAttendanceRate: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination State
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([])
  const [grades, setGrades] = useState<GradeOption[]>([])

  const [search, setSearch] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL')
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedSort, setSelectedSort] = useState<string>('nameAsc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Modals State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StudentRecord | null>(null)
  const [transferTarget, setTransferTarget] = useState<StudentRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)

  // Create Form State
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formGender, setFormGender] = useState('Nam')
  const [formDob, setFormDob] = useState('')
  const [formParentName, setFormParentName] = useState('')
  const [formParentPhone, setFormParentPhone] = useState('')
  const [formClassId, setFormClassId] = useState('')
  const [formStatus, setFormStatus] = useState('Tốt')
  const [formNote, setFormNote] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit Form State
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editGender, setEditGender] = useState('Nam')
  const [editDob, setEditDob] = useState('')
  const [editParentName, setEditParentName] = useState('')
  const [editParentPhone, setEditParentPhone] = useState('')
  const [editStatus, setEditStatus] = useState('Tốt')
  const [editNote, setEditNote] = useState('')
  const [updating, setUpdating] = useState(false)

  // Transfer Form State
  const [transferTargetClassId, setTransferTargetClassId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Import Form State
  const [importTargetClassId, setImportTargetClassId] = useState('')
  const [importText, setImportText] = useState('')
  const [importRows, setImportRows] = useState<
    Array<{
      fullName: string
      studentCode?: string
      gender?: string
      dob?: string
      parentName?: string
      parentPhone?: string
      note?: string
      error?: string
    }>
  >([])
  const [importAnalyzing, setImportAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)

  // Load Dropdown Options
  const loadOptions = useCallback(async () => {
    try {
      const [cls, years, gs] = await Promise.all([
        getClasses(),
        getSchoolYears(),
        getGrades(),
      ])
      setClasses(cls)
      setSchoolYears(years)
      setGrades(gs)

      if (cls.length > 0) {
        setFormClassId(cls[0].id)
        setImportTargetClassId(cls[0].id)
        setTransferTargetClassId(cls.length > 1 ? cls[1].id : cls[0].id)
      }
    } catch {
      // keep fallback
    }
  }, [])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  // Load Students List
  const loadStudentsData = useCallback(
    async (params?: {
      keyword?: string
      classId?: string
      gradeId?: string
      schoolYearId?: string
      status?: string
      sort?: string
      page?: number
    }) => {
      setLoading(true)
      setError(null)
      try {
        const queryParams = {
          keyword: params?.keyword ?? (search || undefined),
          classId: params?.classId ?? (selectedClassId !== 'ALL' ? selectedClassId : undefined),
          gradeId: params?.gradeId ?? (selectedGradeId !== 'ALL' ? selectedGradeId : undefined),
          schoolYearId: params?.schoolYearId ?? (selectedSchoolYearId !== 'ALL' ? selectedSchoolYearId : undefined),
          status: params?.status ?? (selectedStatus !== 'ALL' ? selectedStatus : undefined),
          sort: params?.sort ?? selectedSort,
          page: params?.page ?? currentPage,
          pageSize: 20,
        }

        const res = await getStudents(queryParams)
        setStudents(res.items)
        setSummary(res.summary)
        setTotalItems(res.totalItems)
        setTotalPages(res.totalPages || 1)
        setCurrentPage(res.page || 1)
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách học sinh. Vui lòng kiểm tra lại kết nối.')
      } finally {
        setLoading(false)
      }
    },
    [search, selectedClassId, selectedGradeId, selectedSchoolYearId, selectedStatus, selectedSort, currentPage],
  )

  useEffect(() => {
    loadStudentsData()

    const handleSync = () => {
      loadStudentsData()
      loadOptions()
    }
    window.addEventListener('teachflow:students-changed', handleSync)
    window.addEventListener('teachflow:classes-changed', handleSync)
    return () => {
      window.removeEventListener('teachflow:students-changed', handleSync)
      window.removeEventListener('teachflow:classes-changed', handleSync)
    }
  }, [loadStudentsData, loadOptions])

  // Handlers for Filters
  const handleSearchChange = (kw: string) => {
    setSearch(kw)
    setCurrentPage(1)
    loadStudentsData({ keyword: kw, page: 1 })
  }

  const handleClassChange = (cId: string) => {
    setSelectedClassId(cId)
    setCurrentPage(1)
    loadStudentsData({ classId: cId, page: 1 })
  }

  const handleGradeChange = (gId: string) => {
    setSelectedGradeId(gId)
    setCurrentPage(1)
    loadStudentsData({ gradeId: gId, page: 1 })
  }

  const handleSchoolYearChange = (syId: string) => {
    setSelectedSchoolYearId(syId)
    setCurrentPage(1)
    loadStudentsData({ schoolYearId: syId, page: 1 })
  }

  const handleStatusChange = (st: string) => {
    setSelectedStatus(st)
    setCurrentPage(1)
    loadStudentsData({ status: st, page: 1 })
  }

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort)
    loadStudentsData({ sort })
  }

  // Create Student Handler
  const handleCreateStudent = async () => {
    if (!formName.trim()) {
      toast.error('Vui lòng nhập họ và tên học sinh')
      return
    }
    if (!formClassId) {
      toast.error('Vui lòng chọn lớp học để ghi danh')
      return
    }

    setCreating(true)
    try {
      const created = await createStudent({
        fullName: formName.trim(),
        studentCode: formCode.trim() || undefined,
        gender: formGender,
        dob: formDob || undefined,
        parentName: formParentName.trim() || undefined,
        parentPhone: formParentPhone.trim() || undefined,
        classroomId: formClassId,
        status: formStatus,
        note: formNote.trim() || undefined,
      })

      setCreateDialogOpen(false)
      setFormName('')
      setFormCode('')
      setFormDob('')
      setFormParentName('')
      setFormParentPhone('')
      setFormNote('')
      toast.success(`Đã thêm học sinh ${created.name} vào lớp thành công!`)
      loadStudentsData()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi tạo học sinh')
    } finally {
      setCreating(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (s: StudentRecord) => {
    setEditTarget(s)
    setEditName(s.name || '')
    setEditCode(s.studentCode || '')
    setEditGender(s.gender || 'Nam')
    setEditDob(s.dob || '')
    setEditParentName(s.guardian || s.parentName || '')
    setEditParentPhone(s.phone || s.parentPhone || '')
    setEditStatus(s.status || 'Tốt')
    setEditNote(s.note || '')
  }

  const handleUpdateStudent = async () => {
    if (!editTarget || !editName.trim()) {
      toast.error('Họ tên học sinh không được để trống')
      return
    }
    setUpdating(true)
    try {
      const updated = await updateStudent(editTarget.id, {
        fullName: editName.trim(),
        studentCode: editCode.trim() || undefined,
        gender: editGender,
        dob: editDob || undefined,
        parentName: editParentName.trim() || undefined,
        parentPhone: editParentPhone.trim() || undefined,
        status: editStatus,
        note: editNote.trim() || undefined,
      })

      setEditTarget(null)
      toast.success(`Đã cập nhật hồ sơ học sinh ${updated.name}`)
      loadStudentsData()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cập nhật học sinh')
    } finally {
      setUpdating(false)
    }
  }

  // Open Transfer Modal
  const openTransferModal = (s: StudentRecord) => {
    setTransferTarget(s)
    const otherClasses = classes.filter((c) => c.id !== s.classId && c.status !== 'COMPLETED')
    if (otherClasses.length > 0) {
      setTransferTargetClassId(otherClasses[0].id)
    }
    setTransferReason('')
  }

  const handleTransferStudent = async () => {
    if (!transferTarget || !transferTargetClassId) {
      toast.error('Vui lòng chọn lớp học chuyển đến')
      return
    }

    setTransferring(true)
    try {
      const res = await transferStudent(transferTarget.id, {
        targetClassroomId: transferTargetClassId,
        reason: transferReason.trim() || undefined,
      })

      setTransferTarget(null)
      toast.success(res.message || 'Đã chuyển lớp thành công!')
      loadStudentsData()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi chuyển lớp cho học sinh')
    } finally {
      setTransferring(false)
    }
  }

  // Delete / Withdraw Handler
  const handleDeleteStudent = async () => {
    if (!deleteTarget) return
    try {
      await deleteStudent(deleteTarget.id)
      setDeleteTarget(null)
      toast.success(`Đã rút học sinh ${deleteTarget.name} khỏi lớp (lịch sử vẫn được lưu trữ)`)
      loadStudentsData()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi rút học sinh')
    }
  }

  // Parse Import Text
  const handleParseImport = (text: string) => {
    setImportText(text)
    if (!text.trim()) {
      setImportRows([])
      return
    }
    const lines = text.trim().split('\n')
    const parsed: typeof importRows = []
    lines.forEach((line) => {
      const parts = line.split(/[,\t|]/).map((p) => p.trim())
      if (parts.length > 0 && parts[0]) {
        const fullName = parts[0]
        const studentCode = parts[1] || ''
        const gender = parts[2] || 'Nam'
        const dob = parts[3] || ''
        const parentName = parts[4] || ''
        const parentPhone = parts[5] || ''
        const note = parts[6] || ''
        const error = !fullName ? 'Thiếu họ và tên' : undefined
        parsed.push({ fullName, studentCode, gender, dob, parentName, parentPhone, note, error })
      }
    })
    setImportRows(parsed)
  }

  const handleExecuteImport = async () => {
    if (importRows.length === 0 || !importTargetClassId) {
      toast.error('Vui lòng chọn lớp và nhập dữ liệu import')
      return
    }
    setImporting(true)
    try {
      const res = await importStudents(importTargetClassId, importRows)
      if (res.success) {
        toast.success(res.message || `Đã import thành công ${res.importedCount} học sinh`)
        setImportDialogOpen(false)
        setImportText('')
        setImportRows([])
        loadStudentsData()
        notifyStudentDataChanged()
      } else {
        toast.error(`Import không thành công: ${res.errorCount} lỗi`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi import học sinh')
    } finally {
      setImporting(false)
    }
  }

  // If a student is selected for Detail View
  const activeStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="w-full">
      {selectedStudentId && activeStudent ? (
        /* DETAIL VIEW */
        <StudentDetailView
          student={activeStudent}
          classes={classes}
          onBack={() => setSelectedStudentId(null)}
          onStudentUpdated={() => loadStudentsData()}
          onOpenEdit={() => openEditModal(activeStudent)}
          onOpenTransfer={() => openTransferModal(activeStudent)}
          onOpenDelete={() => setDeleteTarget(activeStudent)}
        />
      ) : (
        /* DIRECTORY VIEW */
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                <Users className="size-4" /> Quản lý học sinh TeachFlow
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Danh sách học sinh
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Quản lý hồ sơ, lớp học, quá trình học tập và theo dõi chuyên cần của toàn bộ học sinh.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="text-xs h-9 gap-1.5 font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" /> Import Excel
              </Button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-9 px-4 cursor-pointer"
              >
                <Plus className="size-4" /> Thêm học sinh
              </Button>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tổng học sinh</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.totalStudents}</p>
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">Tất cả lớp phụ trách</p>
                </div>
                <div className="size-10 rounded-xl bg-teal-50 text-teal-700 grid place-items-center">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Đang theo học</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">{summary.activeStudents}</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Học lực Tốt & Khá</p>
                </div>
                <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">
                  <CheckCircle2 className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Cần hỗ trợ</p>
                  <p className="text-2xl font-bold text-rose-600 mt-0.5">{summary.needsSupportStudents}</p>
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">Cần chú ý bổ trợ</p>
                </div>
                <div className="size-10 rounded-xl bg-rose-50 text-rose-600 grid place-items-center">
                  <Heart className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Chuyên cần trung bình</p>
                  <p className="text-2xl font-bold text-blue-700 mt-0.5">
                    {summary.avgAttendanceRate !== null && summary.avgAttendanceRate !== undefined
                      ? `${summary.avgAttendanceRate}%`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                    {summary.avgAttendanceRate !== null && summary.avgAttendanceRate !== undefined
                      ? 'Tháng này'
                      : 'Chưa có dữ liệu'}
                  </p>
                </div>
                <div className="size-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
                  <CalendarCheck2 className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters Bar */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-3.5 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Search */}
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm tên, mã học sinh, phụ huynh..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
                  />
                </div>

                {/* Classroom Filter */}
                <div>
                  <select
                    aria-label="Lọc theo lớp học"
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Tất cả lớp</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <select
                    aria-label="Lọc theo khối lớp"
                    value={selectedGradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Tất cả khối</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    aria-label="Lọc theo trạng thái học lực"
                    value={selectedStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="Tốt">Tốt</option>
                    <option value="Khá">Khá</option>
                    <option value="Cần cố gắng">Cần cố gắng</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <select
                    aria-label="Sắp xếp danh sách học sinh"
                    value={selectedSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="nameAsc">Tên A-Z</option>
                    <option value="nameDesc">Tên Z-A</option>
                    <option value="attendanceLow">Chuyên cần thấp</option>
                    <option value="updatedAt">Mới cập nhật</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Table / Cards */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Danh sách học sinh ({totalItems} HS)
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="py-20 text-center text-slate-400">
                  <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
                  <p className="text-xs font-medium">Đang tải dữ liệu học sinh...</p>
                </div>
              ) : error ? (
                <div className="py-16 text-center bg-white p-6 space-y-3">
                  <AlertCircle className="size-8 mx-auto text-rose-500" />
                  <p className="text-sm font-semibold text-rose-700">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => loadStudentsData()} className="text-xs gap-1.5">
                    <RefreshCw className="size-3" /> Thử lại
                  </Button>
                </div>
              ) : students.length === 0 ? (
                <div className="py-16 text-center bg-white p-8 space-y-3">
                  <Users className="size-10 mx-auto text-slate-300" />
                  <h3 className="text-base font-bold text-slate-800">Chưa có học sinh nào</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Thêm học sinh mới hoặc Import danh sách từ file Excel để bắt đầu theo dõi quá trình học tập.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="sm" className="text-xs gap-1.5 font-semibold">
                      <FileSpreadsheet className="size-3.5 text-emerald-600" /> Import Excel
                    </Button>
                    <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="bg-teal-600 text-white text-xs font-semibold gap-1.5">
                      <Plus className="size-3.5" /> Thêm học sinh
                    </Button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">STT</th>
                      <th className="py-3 px-4">Học sinh</th>
                      <th className="py-3 px-3">Mã HS</th>
                      <th className="py-3 px-3">Lớp hiện tại</th>
                      <th className="py-3 px-3">Giới tính</th>
                      <th className="py-3 px-3">Ngày sinh</th>
                      <th className="py-3 px-3">Học lực</th>
                      <th className="py-3 px-3">Chuyên cần</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {(currentPage - 1) * 20 + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedStudentId(s.id)}
                            className="flex items-center gap-2.5 text-left group cursor-pointer"
                          >
                            <Avatar className="size-8.5 border border-teal-100">
                              <AvatarFallback className={s.color || 'bg-teal-100 text-teal-700 font-bold text-xs'}>
                                {s.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                                {s.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {s.guardian || s.parentName} ({s.phone || s.parentPhone})
                              </p>
                            </div>
                          </button>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {s.studentCode || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900">
                            {(s as any).className || s.grade || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{s.gender}</td>
                        <td className="py-3 px-3 text-slate-600">{s.dob}</td>
                        <td className="py-3 px-3">
                          <Badge variant={statusVariant(s.status)} className="text-[10px]">
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-bold text-teal-700">
                          {s.attendance !== null && s.attendance !== undefined ? `${s.attendance}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="size-8 text-slate-400 hover:text-slate-700 cursor-pointer">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem onClick={() => setSelectedStudentId(s.id)}>
                                <Eye className="size-3.5 mr-2" /> Xem hồ sơ chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditModal(s)}>
                                <Edit2 className="size-3.5 mr-2" /> Chỉnh sửa hồ sơ
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openTransferModal(s)}>
                                <ArrowRightLeft className="size-3.5 mr-2" /> Chuyển lớp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(s)} className="text-rose-600">
                                <Trash2 className="size-3.5 mr-2" /> Rút khỏi lớp
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* CREATE STUDENT DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm học sinh mới</DialogTitle>
            <DialogDescription>
              Tạo hồ sơ học sinh và tự động phân bổ vào lớp học trong năm học hiện tại.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Họ và tên *</Label>
                <Input
                  placeholder="Nguyễn Văn An"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Mã học sinh</Label>
                <Input
                  placeholder="HS001 (Tự động)"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Giới tính</Label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày sinh (DD/MM/YYYY)</Label>
                <Input
                  placeholder="12/04/2016"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Lớp học ghi danh *</Label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Đánh giá ban đầu</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Tốt">Tốt</option>
                  <option value="Khá">Khá</option>
                  <option value="Cần cố gắng">Cần cố gắng</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Họ tên phụ huynh</Label>
                <Input
                  placeholder="Nguyễn Thị Hoa"
                  value={formParentName}
                  onChange={(e) => setFormParentName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Số điện thoại phụ huynh</Label>
                <Input
                  placeholder="0901 234 567"
                  value={formParentPhone}
                  onChange={(e) => setFormParentPhone(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ghi chú ban đầu (tùy chọn)</Label>
              <Input
                placeholder="Hăng hái phát biểu, tích cực tham gia hoạt động nhóm..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCreateStudent}
              disabled={creating || !formName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
            >
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />} Tạo học sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT STUDENT DIALOG */}
      <Dialog open={!!editTarget} onOpenChange={(val) => !val && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hồ sơ học sinh</DialogTitle>
            <DialogDescription>Cập nhật thông tin cá nhân và liên lạc của học sinh.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Họ và tên *</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Mã học sinh</Label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Giới tính</Label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày sinh</Label>
                <Input
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Họ tên phụ huynh</Label>
                <Input
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Điện thoại phụ huynh</Label>
                <Input
                  value={editParentPhone}
                  onChange={(e) => setEditParentPhone(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Trạng thái học lực</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                <option value="Tốt">Tốt</option>
                <option value="Khá">Khá</option>
                <option value="Cần cố gắng">Cần cố gắng</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)} disabled={updating}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStudent}
              disabled={updating || !editName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
            >
              {updating ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRANSFER STUDENT DIALOG */}
      <Dialog open={!!transferTarget} onOpenChange={(val) => !val && setTransferTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Chuyển lớp cho học sinh</DialogTitle>
            <DialogDescription>
              Chuyển học sinh <strong>{transferTarget?.name}</strong> sang lớp mới. Toàn bộ lịch sử điểm danh và đánh giá sẽ được bảo toàn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Chọn lớp chuyển đến *</Label>
              <select
                value={transferTargetClassId}
                onChange={(e) => setTransferTargetClassId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {classes
                  .filter((c) => c.id !== transferTarget?.classId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade} · {c.room})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lý do chuyển lớp (tùy chọn)</Label>
              <Input
                placeholder="Chuyển phân ban / theo nguyện vọng phụ huynh..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferTarget(null)}>Hủy</Button>
            <Button
              size="sm"
              onClick={handleTransferStudent}
              disabled={transferring || !transferTargetClassId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer"
            >
              {transferring ? 'Đang chuyển...' : 'Xác nhận chuyển'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT EXCEL DIALOG */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import danh sách học sinh</DialogTitle>
            <DialogDescription>
              Tải file .xlsx/.xls/.docx/.pdf/.jpg hoặc dán bảng. Hệ thống chỉ đề xuất dữ liệu; bạn xem trước rồi mới xác nhận lưu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Tải tệp (xlsx, xls, docx, pdf, ảnh)</Label>
              <input
                type="file"
                accept=".xlsx,.xls,.docx,.pdf,.png,.jpg,.jpeg"
                className="mt-1 block w-full text-xs"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setImportAnalyzing(true)
                  try {
                    const result = await analyzeStudentImportFile(file, importTargetClassId || undefined)
                    const rows = (result.rows || []).map((r) => ({
                      fullName: r.fullName,
                      studentCode: r.studentCode,
                      gender: r.gender,
                      dob: r.dob,
                      parentName: r.parentName,
                      parentPhone: r.parentPhone,
                      note: r.note,
                      error: r.valid ? undefined : (r.errors || []).join(', '),
                    }))
                    setImportRows(rows)
                    toast.success(result.message || `Phát hiện ${result.totalRows || rows.length} dòng`)
                  } catch (err: any) {
                    toast.error(err?.message || 'Không phân tích được tệp')
                  } finally {
                    setImportAnalyzing(false)
                    e.target.value = ''
                  }
                }}
              />
              {importAnalyzing && <p className="mt-1 text-teal-700 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> AI đang đọc tệp...</p>}
            </div>
            <div>
              <Label className="text-xs font-semibold">Lớp học ghi danh đích *</Label>
              <select
                value={importTargetClassId}
                onChange={(e) => setImportTargetClassId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>

            <Textarea
              placeholder="Nguyễn Văn An	HS001	Nam	12/04/2016	Nguyễn Thị Hoa	0901234567	Chủ động phát biểu
Trần Thị Bình	HS002	Nữ	25/08/2016	Trần Văn Cường	0912345678	Tiếp thu nhanh"
              value={importText}
              onChange={(e) => handleParseImport(e.target.value)}
              rows={5}
              className="text-xs font-mono"
            />

            {importRows.length > 0 && (
              <div className="border rounded-xl p-3 bg-slate-50 max-h-56 overflow-y-auto space-y-1.5">
                <p className="font-bold text-slate-700">
                  Xem trước: {importRows.length} dòng phát hiện · {importRows.filter((r) => !r.error).length} hợp lệ · {importRows.filter((r) => r.error).length} lỗi
                </p>
                {importRows.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-2 text-[11px] p-2 rounded border ${
                      r.error ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <input
                      className="flex-1 min-w-0 rounded border px-2 py-1"
                      value={r.fullName}
                      onChange={(e) => {
                        const next = [...importRows]
                        next[i] = { ...r, fullName: e.target.value, error: e.target.value.trim() ? undefined : 'Thiếu họ và tên' }
                        setImportRows(next)
                      }}
                    />
                    <span className="text-slate-500 shrink-0">
                      {r.error ? <strong className="text-rose-600">⚠ {r.error}</strong> : `✓ ${r.dob || 'Chưa NS'} · ${r.gender || 'Nam'}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(false)}>Hủy</Button>
            <Button
              size="sm"
              onClick={handleExecuteImport}
              disabled={importing || importRows.length === 0 || !importTargetClassId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
            >
              {importing ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />} Xác nhận Import ({importRows.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAW / DELETE DIALOG */}
      <Dialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rút học sinh khỏi lớp</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn rút học sinh <strong>{deleteTarget?.name}</strong> khỏi lớp? Toàn bộ hồ sơ và dữ liệu chuyên cần, đánh giá lịch sử vẫn được lưu trữ an toàn trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteStudent} className="cursor-pointer">
              Xác nhận rút học sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DETAIL VIEW WITH 6 LAZY-LOADED TABS
// ═══════════════════════════════════════════════════════════════════════════

function StudentDetailView({
  student,
  classes,
  onBack,
  onStudentUpdated,
  onOpenEdit,
  onOpenTransfer,
  onOpenDelete,
}: {
  student: StudentRecord
  classes: ClassRecord[]
  onBack: () => void
  onStudentUpdated: () => void
  onOpenEdit: () => void
  onOpenTransfer: () => void
  onOpenDelete: () => void
}) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 mb-2 transition cursor-pointer"
      >
        <ArrowLeft className="size-3.5" /> Quay lại danh sách học sinh
      </button>

      {/* Student Identity Card */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-teal-200 shadow-2xs">
              <AvatarFallback className={student.color || 'bg-teal-100 text-teal-700 text-xl font-bold'}>
                {student.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{student.name}</h2>
                <Badge variant={statusVariant(student.status)} className="text-xs">{student.status}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Lớp: <strong className="text-slate-800">{(student as any).className || student.grade}</strong> · Mã HS:{' '}
                <span className="font-mono font-bold text-teal-800">{student.studentCode || 'Chưa cấp'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onOpenEdit} className="text-xs h-9 gap-1.5 cursor-pointer">
              <Edit2 className="size-3.5" /> Sửa hồ sơ
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenTransfer} className="text-xs h-9 gap-1.5 cursor-pointer">
              <ArrowRightLeft className="size-3.5" /> Chuyển lớp
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenDelete} className="text-xs h-9 gap-1.5 text-rose-600 hover:bg-rose-50 cursor-pointer">
              <Trash2 className="size-3.5" /> Rút lớp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-slate-100 rounded-xl">
          <TabsTrigger value="overview" className="text-xs py-2 font-medium">Tổng quan</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs py-2 font-medium">Chuyên cần</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs py-2 font-medium">Đánh giá</TabsTrigger>
          <TabsTrigger value="enrollments" className="text-xs py-2 font-medium">Lịch sử lớp</TabsTrigger>
          <TabsTrigger value="worksheets" className="text-xs py-2 font-medium">Phiếu học tập</TabsTrigger>
          <TabsTrigger value="comments" className="text-xs py-2 font-medium">Ghi chú & Nhận xét</TabsTrigger>
        </TabsList>

        {/* TAB 1: TỔNG QUAN */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          <StudentTabOverview student={student} />
        </TabsContent>

        {/* TAB 2: CHUYÊN CẦN */}
        <TabsContent value="attendance" className="mt-5 space-y-5">
          <StudentTabAttendance studentId={student.id} />
        </TabsContent>

        {/* TAB 3: ĐÁNH GIÁ */}
        <TabsContent value="assessments" className="mt-5 space-y-5">
          <StudentTabAssessments studentId={student.id} />
        </TabsContent>

        {/* TAB 4: LỊCH SỬ LỚP */}
        <TabsContent value="enrollments" className="mt-5 space-y-5">
          <StudentTabEnrollments studentId={student.id} />
        </TabsContent>

        {/* TAB 5: PHIẾU HỌC TẬP */}
        <TabsContent value="worksheets" className="mt-5 space-y-5">
          <StudentTabWorksheets student={student} />
        </TabsContent>

        {/* TAB 6: GHI CHÚ & NHẬN XÉT */}
        <TabsContent value="comments" className="mt-5 space-y-5">
          <StudentTabComments student={student} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: TỔNG QUAN HỌC SINH
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabOverview({ student }: { student: StudentRecord }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentOverview(student.id)
      .then((res) => {
        if (isMounted) setData(res)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [student.id])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Demographics */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="size-4 text-teal-600" /> Thông tin cá nhân & Gia đình
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Giới tính:</span>
              <span className="font-semibold text-slate-900">{student.gender}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Ngày sinh:</span>
              <span className="font-semibold text-slate-900">{student.dob}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Lớp hiện tại:</span>
              <span className="font-semibold text-slate-900">{(student as any).className || student.grade}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phụ huynh / Giám hộ:</span>
              <span className="font-semibold text-slate-900">{student.guardian || student.parentName || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Số điện thoại liên hệ:</span>
              <span className="font-mono font-bold text-teal-700">{student.phone || student.parentPhone || 'Chưa cập nhật'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-600" /> Chỉ số & Tiến độ học tập
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tỷ lệ chuyên cần:</span>
              <span className="font-bold text-teal-700">
                {student.attendance !== null && student.attendance !== undefined ? `${student.attendance}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Điểm trung bình đánh giá:</span>
              <span className="font-bold text-blue-700">
                {data?.stats?.avgScore !== null && data?.stats?.avgScore !== undefined ? `${data.stats.avgScore} đ` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Trạng thái học lực:</span>
              <Badge variant={statusVariant(student.status)} className="text-[10px]">{student.status}</Badge>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Số nhận xét ghi nhận:</span>
              <span className="font-bold text-slate-900">{data?.stats?.commentsCount || 0} nhận xét</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: CHUYÊN CẦN HỌC SINH
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabAttendance({ studentId }: { studentId: string }) {
  const [data, setData] = useState<StudentAttendanceResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentAttendance(studentId)
      .then((res) => {
        if (isMounted) setData(res)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [studentId])

  const summary = data?.summary || {
    attendanceRate: null,
    totalSessions: 0,
    presentCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    lateCount: 0,
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-teal-700">
              {summary.attendanceRate !== null && summary.attendanceRate !== undefined
                ? `${summary.attendanceRate}%`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ chuyên cần</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{summary.presentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Có mặt</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-blue-700">{summary.excusedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Nghỉ có phép</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{summary.unexcusedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Nghỉ không phép</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{summary.lateCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Đi muộn</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            Lịch sử điểm danh theo từng buổi ({summary.totalSessions} buổi)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs">Đang tải lịch sử chuyên cần...</p>
            </div>
          ) : (data?.sessions || []).length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CalendarCheck2 className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu điểm danh nào</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3">Tiết / Thời gian</th>
                  <th className="py-3 px-3">Giáo viên</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{sess.date}</td>
                    <td className="py-3 px-3 font-semibold text-teal-900">{sess.subjectName}</td>
                    <td className="py-3 px-3 text-slate-600">{sess.period}</td>
                    <td className="py-3 px-3 text-slate-600">{sess.teacherName}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          sess.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-800'
                            : sess.status === 'LATE'
                            ? 'bg-amber-50 text-amber-800'
                            : sess.status === 'EXCUSED_ABSENCE'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {sess.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{sess.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: ĐÁNH GIÁ HỌC SINH (HỒ SƠ HỌC LỰC & SỔ ĐIỂM CÁ NHÂN)
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabAssessments({ studentId }: { studentId: string }) {
  const [profile, setProfile] = useState<StudentAcademicProfile | null>(null)
  const [data, setData] = useState<StudentAssessmentsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    Promise.all([
      getStudentAcademicProfile(studentId).catch(() => null),
      getStudentAssessments(studentId).catch(() => null),
    ])
      .then(([profRes, dataRes]) => {
        if (isMounted) {
          setProfile(profRes)
          setData(dataRes)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [studentId])

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
        <p className="text-xs">Đang tải hồ sơ đánh giá học tập...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Overview Academic Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Điểm trung bình chung</p>
              <p className="text-2xl font-extrabold text-teal-700 mt-0.5">
                {profile?.overallAverageScore !== null && profile?.overallAverageScore !== undefined
                  ? `${profile.overallAverageScore} đ`
                  : '—'}
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
              <Award className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Xếp loại học lực</p>
              <div className="mt-1">
                {profile?.overallClassification ? (
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-2.5 py-0.5 ${
                      profile.overallClassification.code === 'EXCELLENT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : profile.overallClassification.code === 'GOOD'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : profile.overallClassification.code === 'COMPLETED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {profile.overallClassification.label}
                  </Badge>
                ) : (
                  <span className="text-slate-400 text-xs font-medium">Chưa đủ dữ liệu</span>
                )}
              </div>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tổng số bài kiểm tra</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-0.5">
                {data?.summary?.totalAssessments || 0} bài
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject-by-Subject Transcript Cards */}
      {profile?.subjects && profile.subjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="size-4 text-teal-600" /> Kết quả theo từng môn học
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {profile.subjects.map((sub) => (
              <Card key={sub.subjectId} className="border-slate-200 shadow-2xs overflow-hidden">
                <CardHeader className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">{sub.subjectName}</CardTitle>
                    <span className="text-[11px] text-slate-400">{sub.assessments.length} bài kiểm tra</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-teal-700">
                      {sub.averageScore !== null ? `${sub.averageScore} đ` : '—'}
                    </span>
                    {sub.classification && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          sub.classification.code === 'EXCELLENT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : sub.classification.code === 'GOOD'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : sub.classification.code === 'COMPLETED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {sub.classification.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/40 text-[10px] text-slate-400 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Lần đánh giá</th>
                        <th className="py-2 px-2 text-center">Hệ số</th>
                        <th className="py-2 px-2 text-center">Điểm</th>
                        <th className="py-2 px-3">Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sub.assessments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{a.title}</td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[10px] font-semibold text-slate-500 font-mono">x{a.weight}</span>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-teal-700">
                            {a.score !== null && a.score !== undefined ? `${a.score}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">{a.comment || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Assessment Timeline */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            Chi tiết toàn bộ bài đánh giá & Nhận xét định kỳ ({data?.items?.length || 0} bài)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Tổng hợp kết quả đánh giá theo tiêu chuẩn Thông tư 27 của Bộ GD&ĐT.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {(!data?.items || data.items.length === 0) ? (
            <div className="py-12 text-center text-slate-400">
              <BarChart3 className="size-7 mx-auto text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">Chưa có dữ liệu đánh giá chi tiết</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Bài đánh giá</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3">Lớp</th>
                  <th className="py-3 px-3">Ngày</th>
                  <th className="py-3 px-3">Điểm số / Mức độ</th>
                  <th className="py-3 px-4">Nhận xét của giáo viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 font-semibold text-teal-900">{item.subjectName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.className}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.date}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-extrabold text-teal-700">
                        {typeof item.score === 'number' && item.score !== null ? `${item.score} đ` : 'Đạt'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{item.comment || item.criterion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: LỊCH SỬ LỚP HỌC & ENROLLMENT
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabEnrollments({ studentId }: { studentId: string }) {
  const [enrollments, setEnrollments] = useState<StudentEnrollmentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentEnrollments(studentId)
      .then((res) => {
        if (isMounted) setEnrollments(res)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [studentId])

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-900">
          Lịch sử phân lớp & Ghi danh ({enrollments.length} lần)
        </CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Ghi nhận quá trình học tập và chuyển lớp qua từng năm học.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Đang tải lịch sử lớp...</p>
          </div>
        ) : enrollments.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">Chưa có lịch sử ghi danh</p>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {enrollments.map((e) => (
              <div key={e.id} className="relative flex items-start gap-4 pl-8">
                <div className="absolute left-1.5 top-1 size-4.5 rounded-full border-2 border-white bg-teal-600 shadow-xs" />
                <div className="flex-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      {e.classroom?.name || 'Lớp học'} ({e.classroom?.gradeName || 'Khối'})
                    </span>
                    <Badge
                      className={`text-[10px] ${
                        e.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : e.status === 'TRANSFERRED'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {e.status === 'ACTIVE' ? 'Đang học' : e.status === 'TRANSFERRED' ? 'Đã chuyển' : 'Đã rút'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Năm học: <strong>{e.schoolYear?.name || 'Năm học'}</strong> · Ngày ghi danh:{' '}
                    {new Date(e.enrolledAt).toLocaleDateString('vi-VN')}
                    {e.leftAt && ` → ${new Date(e.leftAt).toLocaleDateString('vi-VN')}`}
                  </p>
                  {e.transferReason && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100 mt-2">
                      Lý do: {e.transferReason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: PHIẾU HỌC TẬP HỌC SINH
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabWorksheets({ student }: { student: StudentRecord }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getStudentProfile(student.id).then(setData).catch(() => setData(null)).finally(() => setLoading(false)); }, [student.id]);
  const assignments = data?.recent?.assignments || [];
  const behaviors = data?.recent?.behaviors || [];
  return <div className="space-y-4">
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100"><CardTitle className="text-base font-bold">Phiếu đã giao</CardTitle><CardDescription className="text-xs">Dữ liệu lấy từ các WorksheetAssignment đang hoạt động của lớp.</CardDescription></CardHeader>
      <CardContent className="p-4 sm:p-5">{loading ? <div className="py-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-teal-600" /></div> : assignments.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">Chưa có phiếu nào được giao cho lớp của học sinh.</p> : <div className="space-y-2">{assignments.map((item:any) => <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-xs"><div className="flex justify-between gap-2"><b>{item.worksheet?.title || 'Phiếu học tập'}</b><Badge variant="outline">{item.status}</Badge></div><p className="mt-1 text-slate-500">Lớp {item.classroom?.name} · Giao {new Date(item.assignedAt).toLocaleDateString('vi-VN')}</p>{item.dueAt && <p className="mt-1 text-amber-700">Hạn: {new Date(item.dueAt).toLocaleDateString('vi-VN')}</p>}</div>)}</div>}</CardContent>
    </Card>
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 border-b border-slate-100"><CardTitle className="text-sm font-bold">Nề nếp gần đây</CardTitle></CardHeader>
      <CardContent className="p-4">{behaviors.length === 0 ? <p className="text-center text-xs text-slate-400">Chưa có ghi nhận nề nếp nào.</p> : <div className="space-y-2">{behaviors.map((item:any) => <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs"><b>{item.category}</b><span className="ml-2 text-slate-500">{new Date(item.recordDate).toLocaleDateString('vi-VN')}</span><p className="mt-1 text-slate-700">{item.content}</p></div>)}</div>}</CardContent>
    </Card>
  </div>
}

function StudentTabComments({ student }: { student: StudentRecord }) {
  const [comments, setComments] = useState<StudentCommentItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  const loadComments = useCallback(async () => {
    try {
      const data = await getStudentComments(student.id)
      setComments(data)
    } catch {
      setComments([])
    }
  }, [student.id])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setSaving(true)
    try {
      await addStudentComment(student.id, newComment.trim(), student.classId)
      setNewComment('')
      toast.success('Đã lưu nhận xét học sinh!')
      loadComments()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu nhận xét')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateAI = async () => {
    setGeneratingAI(true)
    try {
      const res = await generateStudentComment({
        studentId: student.id,
        subject: 'Tất cả môn học',
        notes: 'Chăm chỉ, tích cực phát biểu, hoàn thành bài tập đầy đủ',
      })
      const commentText = res?.comments?.[0] || res?.overallAssessment || ''
      if (commentText) {
        setNewComment(commentText)
        toast.success('Đã sinh gợi ý nhận xét từ AI!')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi sinh nhận xét AI')
    } finally {
      setGeneratingAI(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="size-4 text-teal-600" /> Nhật ký nhận xét giáo viên
          </CardTitle>
          <CardDescription className="text-xs">
            Lưu trữ nhật ký nhận xét thường xuyên cho học sinh {student.name}.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateAI}
          disabled={generatingAI}
          className="text-xs gap-1.5 text-teal-700 border-teal-200 cursor-pointer"
        >
          {generatingAI ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />} Gợi ý từ AI
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Nhập nhận xét cho học sinh (hoặc nhấn 'Gợi ý từ AI')..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="text-xs"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={saving || !newComment.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Đang lưu...' : 'Lưu nhận xét'}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 pt-2">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Chưa có nhận xét nào được ghi nhận</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="py-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-700">{c.teacherName || 'Giáo viên'}</span>
                  <span>{c.date}</span>
                </div>
                <p className="text-slate-800 leading-relaxed">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
