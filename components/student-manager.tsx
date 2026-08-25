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
  exportStudentsXlsx,
  createQuickAssessment,
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
  getConfiguredClassSubjects,
  type SchoolYearOption,
  type GradeOption,
  type ConfiguredClassSubject,
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
  ArrowLeft, BarChart3, CalendarCheck2, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Copy, Edit2, Eye, FileSpreadsheet, FileText, Filter, GraduationCap, Heart,
  History, LayoutGrid, Loader2, MessageSquare, MoreVertical, Plus, RefreshCw,
  Search, Sparkles, Trash2, TrendingUp, UploadCloud, User, UserPlus, Users,
  X, AlertCircle, Award, Phone, Mail, School, ArrowRightLeft, BookOpen, Layers,
  Download, CheckSquare, Square, ClipboardCheck, SlidersHorizontal, ShieldAlert, CheckCheck
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

  // Filter States
  const [search, setSearch] = useState('')
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([])
  const [grades, setGrades] = useState<GradeOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL')
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedSupportStatus, setSelectedSupportStatus] = useState<string>('ALL')
  const [selectedSort, setSelectedSort] = useState<string>('nameAsc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Multi-select state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  // Export State
  const [exportingXlsx, setExportingXlsx] = useState(false)

  // Modals State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StudentRecord | null>(null)
  const [transferTarget, setTransferTarget] = useState<StudentRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)

  // Quick Assessment Dialog State
  const [quickAssessOpen, setQuickAssessOpen] = useState(false)
  const [quickAssessStudents, setQuickAssessStudents] = useState<StudentRecord[]>([])
  const [quickAssessClassId, setQuickAssessClassId] = useState('')
  const [quickAssessSubjects, setQuickAssessSubjects] = useState<ConfiguredClassSubject[]>([])
  const [quickAssessSubjectId, setQuickAssessSubjectId] = useState('')
  const [quickAssessTitle, setQuickAssessTitle] = useState('Đánh giá thường xuyên')
  const [quickAssessLevel, setQuickAssessLevel] = useState<'EXCELLENT' | 'COMPLETED' | 'NEEDS_SUPPORT'>('COMPLETED')
  const [quickAssessScore, setQuickAssessScore] = useState<string>('')
  const [quickAssessComment, setQuickAssessComment] = useState('')
  const [quickAssessDate, setQuickAssessDate] = useState(new Date().toISOString().slice(0, 10))
  const [savingQuickAssess, setSavingQuickAssess] = useState(false)

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
      id: string
      fullName: string
      studentCode?: string
      gender?: string
      dob?: string
      parentName?: string
      parentPhone?: string
      note?: string
      valid: boolean
      errors: string[]
      warnings?: string[]
      unmappedColumns?: Record<string, string>
      selected: boolean
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
      search?: string
      classroomId?: string
      gradeId?: string
      schoolYearId?: string
      status?: string
      supportStatus?: string
      sort?: string
      page?: number
      pageSize?: number
    }) => {
      setLoading(true)
      setError(null)
      try {
        const queryParams = {
          search: params?.search ?? (search || undefined),
          classroomId: params?.classroomId ?? (selectedClassId !== 'ALL' ? selectedClassId : undefined),
          gradeId: params?.gradeId ?? (selectedGradeId !== 'ALL' ? selectedGradeId : undefined),
          schoolYearId: params?.schoolYearId ?? (selectedSchoolYearId !== 'ALL' ? selectedSchoolYearId : undefined),
          status: params?.status ?? (selectedStatus !== 'ALL' ? selectedStatus : undefined),
          supportStatus: params?.supportStatus ?? (selectedSupportStatus !== 'ALL' ? selectedSupportStatus : undefined),
          sort: params?.sort ?? selectedSort,
          page: params?.page ?? currentPage,
          pageSize: params?.pageSize ?? pageSize,
        }

        const res = await getStudents(queryParams)
        setStudents(res.items || [])
        setSummary(res.summary)
        setTotalItems(res.totalItems || 0)
        setTotalPages(res.totalPages || 1)
        setCurrentPage(res.page || 1)
        setSelectedRowIds(new Set())
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách học sinh. Vui lòng kiểm tra lại kết nối.')
      } finally {
        setLoading(false)
      }
    },
    [search, selectedClassId, selectedGradeId, selectedSchoolYearId, selectedStatus, selectedSupportStatus, selectedSort, currentPage, pageSize],
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

  // Handlers for Filters - Reset to page 1 on filter changes
  const handleSearchChange = (kw: string) => {
    setSearch(kw)
    setCurrentPage(1)
    loadStudentsData({ search: kw, page: 1 })
  }

  const handleClassChange = (cId: string) => {
    setSelectedClassId(cId)
    setCurrentPage(1)
    loadStudentsData({ classroomId: cId, page: 1 })
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

  const handleSupportStatusChange = (supp: string) => {
    setSelectedSupportStatus(supp)
    setCurrentPage(1)
    loadStudentsData({ supportStatus: supp, page: 1 })
  }

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort)
    loadStudentsData({ sort })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    setCurrentPage(newPage)
    loadStudentsData({ page: newPage })
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
    loadStudentsData({ page: 1, pageSize: newSize })
  }

  // Export XLSX Handler
  const handleExportXlsx = async () => {
    setExportingXlsx(true)
    try {
      const blob = await exportStudentsXlsx({
        search: search || undefined,
        classroomId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        gradeId: selectedGradeId !== 'ALL' ? selectedGradeId : undefined,
        schoolYearId: selectedSchoolYearId !== 'ALL' ? selectedSchoolYearId : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        supportStatus: selectedSupportStatus !== 'ALL' ? selectedSupportStatus : undefined,
        sort: selectedSort,
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Danh_sach_hoc_sinh_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Đã xuất file Excel danh sách học sinh thành công!')
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xuất file Excel')
    } finally {
      setExportingXlsx(false)
    }
  }

  // Directory Multi-select Handlers
  const handleToggleSelectAllStudents = () => {
    if (selectedRowIds.size === students.length && students.length > 0) {
      setSelectedRowIds(new Set())
    } else {
      setSelectedRowIds(new Set(students.map((s) => s.id)))
    }
  }

  const handleToggleSelectStudent = (id: string) => {
    const next = new Set(selectedRowIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRowIds(next)
  }

  // Open Quick Assessment Dialog
  const openQuickAssessmentModal = async (targetStudents: StudentRecord[]) => {
    if (!targetStudents || targetStudents.length === 0) {
      toast.error('Vui lòng chọn học sinh để nhập đánh giá')
      return
    }

    setQuickAssessStudents(targetStudents)
    const effectiveClassId = targetStudents[0]?.classId || classes[0]?.id || ''
    setQuickAssessClassId(effectiveClassId)
    setQuickAssessTitle('Đánh giá thường xuyên')
    setQuickAssessLevel('COMPLETED')
    setQuickAssessScore('')
    setQuickAssessComment('')
    setQuickAssessDate(new Date().toISOString().slice(0, 10))

    if (effectiveClassId) {
      try {
        const subs = await getConfiguredClassSubjects(effectiveClassId)
        setQuickAssessSubjects(subs)
        if (subs.length > 0) setQuickAssessSubjectId(subs[0].id)
      } catch {
        setQuickAssessSubjects([])
      }
    }

    setQuickAssessOpen(true)
  }

  const handleSaveQuickAssessment = async () => {
    if (!quickAssessStudents.length || !quickAssessClassId) {
      toast.error('Vui lòng kiểm tra lại thông tin lớp học và học sinh')
      return
    }
    if (!quickAssessTitle.trim()) {
      toast.error('Vui lòng nhập tên/tiêu đề đánh giá')
      return
    }

    setSavingQuickAssess(true)
    try {
      const numScore = quickAssessScore.trim() !== '' ? Number(quickAssessScore) : undefined
      const res = await createQuickAssessment({
        studentIds: quickAssessStudents.map((s) => s.id),
        classroomId: quickAssessClassId,
        subjectId: quickAssessSubjectId || undefined,
        title: quickAssessTitle.trim(),
        level: quickAssessLevel,
        score: numScore,
        comment: quickAssessComment.trim() || undefined,
        assessmentDate: quickAssessDate,
      })

      setQuickAssessOpen(false)
      setSelectedRowIds(new Set())
      toast.success(res.message || `Đã lưu kết quả đánh giá cho ${quickAssessStudents.length} học sinh!`)
      loadStudentsData()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu đánh giá')
    } finally {
      setSavingQuickAssess(false)
    }
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
      const res = await deleteStudent(deleteTarget.id)
      setDeleteTarget(null)
      toast.success(res.message || 'Đã rút học sinh khỏi lớp')
      loadStudentsData()
      notifyStudentDataChanged()
      if (selectedStudentId === deleteTarget.id) {
        setSelectedStudentId(null)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi rút học sinh')
    }
  }

  // Validation helper on client
  const validateRowClient = (row: {
    fullName?: string
    studentCode?: string
    gender?: string
    dob?: string
    parentName?: string
    parentPhone?: string
    note?: string
  }): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    const fullName = (row.fullName || '').trim()
    if (!fullName) errors.push('Thiếu họ và tên')

    if (row.dob && row.dob.trim()) {
      const raw = row.dob.trim()
      const dmy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
      const ymd = raw.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
      if (!dmy && !ymd && isNaN(Date.parse(raw))) {
        errors.push('Ngày sinh không hợp lệ')
      }
    }

    if (row.gender && row.gender.trim()) {
      const g = row.gender.trim().toLowerCase()
      if (!['nam', 'nữ', 'nu', 'male', 'female', 'm', 'f'].includes(g)) {
        errors.push('Giới tính không hợp lệ')
      }
    }

    return { valid: errors.length === 0, errors }
  }

  // Analyze Import File
  const handleAnalyzeFile = async (file: File) => {
    if (!file) return
    setImportAnalyzing(true)
    try {
      const res = await analyzeStudentImportFile(file, importTargetClassId)
      const rawRows: any[] = res?.rows || (res as any)?.students || []
      if (rawRows.length > 0) {
        const rowsWithState = rawRows.map((r, index) => {
          const clientVal = validateRowClient(r)
          const isValid = r.valid !== undefined ? r.valid : clientVal.valid
          const errors = r.errors && r.errors.length > 0 ? r.errors : clientVal.errors
          return {
            id: `row-${Date.now()}-${index}`,
            fullName: r.fullName || '',
            studentCode: r.studentCode || undefined,
            gender: r.gender || 'Nam',
            dob: r.dob || undefined,
            parentName: r.parentName || undefined,
            parentPhone: r.parentPhone || undefined,
            note: r.note || undefined,
            valid: isValid,
            errors,
            warnings: r.warnings,
            unmappedColumns: r.unmappedColumns,
            selected: isValid,
          }
        })
        setImportRows(rowsWithState)
        const validCount = rowsWithState.filter((r) => r.valid).length
        toast.success(`Đã nhận diện ${rowsWithState.length} học sinh (${validCount} hợp lệ) từ tệp!`)
      } else {
        toast.info('Không tìm thấy dữ liệu học sinh trong tệp')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể phân tích file import')
    } finally {
      setImportAnalyzing(false)
    }
  }

  const handleParseImportText = () => {
    if (!importText.trim()) return
    const lines = importText.trim().split('\n')
    const rows = lines
      .map((line, index) => {
        const parts = line.split(/[\t,;|]/).map((p) => p.trim())
        if (parts.length === 0 || !parts.some((p) => p.length > 0)) return null
        const rowData = {
          fullName: parts[0] || '',
          studentCode: parts[1] || undefined,
          gender: parts[2] || 'Nam',
          dob: parts[3] || undefined,
          parentName: parts[4] || undefined,
          parentPhone: parts[5] || undefined,
          note: parts[6] || undefined,
        }
        const val = validateRowClient(rowData)
        return {
          id: `row-text-${Date.now()}-${index}`,
          ...rowData,
          valid: val.valid,
          errors: val.errors,
          selected: val.valid,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    setImportRows(rows)
    toast.success(`Đã phân tích ${rows.length} dòng dữ liệu`)
  }

  const handleUpdateImportCell = (rowId: string, field: string, value: string) => {
    setImportRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const updated = { ...r, [field]: value }
        const val = validateRowClient(updated)
        return {
          ...updated,
          valid: val.valid,
          errors: val.errors,
        }
      })
    )
  }

  const handleToggleSelectRow = (rowId: string) => {
    setImportRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, selected: !r.selected } : r))
    )
  }

  const handleToggleSelectAll = (select: boolean) => {
    setImportRows((prev) => prev.map((r) => ({ ...r, selected: select })))
  }

  const handleSelectOnlyValid = () => {
    setImportRows((prev) => prev.map((r) => ({ ...r, selected: r.valid })))
  }

  const handleDeleteImportRow = (rowId: string) => {
    setImportRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const handleConfirmImport = async () => {
    if (!importTargetClassId) {
      toast.error('Vui lòng chọn lớp học tiếp nhận')
      return
    }
    const selectedRows = importRows.filter((r) => r.selected)
    if (selectedRows.length === 0) {
      toast.error('Chưa chọn học sinh nào để import. Vui lòng chọn ít nhất một dòng.')
      return
    }

    setImporting(true)
    try {
      const payload = selectedRows.map((r) => ({
        fullName: r.fullName,
        studentCode: r.studentCode || undefined,
        gender: r.gender || 'Nam',
        dob: r.dob || undefined,
        parentName: r.parentName || undefined,
        parentPhone: r.parentPhone || undefined,
        note: r.note || undefined,
      }))

      const res = await importStudents(importTargetClassId, payload)
      if (res.success) {
        toast.success(res.message || `Đã import thành công ${res.importedCount} học sinh!`)
        setImportDialogOpen(false)
        setImportRows([])
        setImportText('')
        loadStudentsData()
        notifyStudentDataChanged()
      } else {
        toast.error(`Import thất bại: ${res.errorCount} lỗi`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi import học sinh')
    } finally {
      setImporting(false)
    }
  }

  // Active student for Detail View
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
          onOpenQuickAssess={() => openQuickAssessmentModal([activeStudent])}
        />
      ) : (
        /* DIRECTORY VIEW */
        <div className="w-full space-y-6">
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
                Quản lý hồ sơ, lớp chủ nhiệm & lớp bộ môn, theo dõi chuyên cần và đánh giá học lực toàn diện.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportXlsx}
                disabled={exportingXlsx || loading}
                className="text-xs h-9 gap-1.5 font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                {exportingXlsx ? <Loader2 className="size-4 animate-spin text-teal-600" /> : <Download className="size-4 text-teal-600" />} Tải danh sách (.xlsx)
              </Button>
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
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">Lớp chủ nhiệm & Bộ môn</p>
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
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Ghi danh chính thức</p>
                </div>
                <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">
                  <GraduationCap className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Cần hỗ trợ</p>
                  <p className="text-2xl font-bold text-rose-700 mt-0.5">{summary.needsSupportStudents}</p>
                  <p className="text-[11px] text-rose-700 font-medium mt-0.5">Học lực / Chuyên cần</p>
                </div>
                <div className="size-10 rounded-xl bg-rose-50 text-rose-700 grid place-items-center">
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
                      ? 'Tổng thể các lớp'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
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
                    <option value="ALL">Tất cả học lực</option>
                    <option value="Tốt">Tốt</option>
                    <option value="Khá">Khá</option>
                    <option value="Cần cố gắng">Cần cố gắng</option>
                  </select>
                </div>

                {/* Support Status Filter */}
                <div>
                  <select
                    aria-label="Lọc theo diện cần hỗ trợ"
                    value={selectedSupportStatus}
                    onChange={(e) => handleSupportStatusChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Tất cả diện</option>
                    <option value="NEED_SUPPORT">Cần hỗ trợ</option>
                    <option value="NORMAL">Bình thường</option>
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
                    <option value="codeAsc">Mã HS tăng dần</option>
                    <option value="attendanceLow">Chuyên cần thấp</option>
                    <option value="updatedAt">Mới cập nhật</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Action Header Banner if rows selected */}
          {selectedRowIds.size > 0 && (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-3 px-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <CheckCheck className="size-4 text-teal-600" />
                <span>Đã chọn <strong className="text-teal-700">{selectedRowIds.size}</strong> học sinh</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const selected = students.filter((s) => selectedRowIds.has(s.id))
                    openQuickAssessmentModal(selected)
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-8 gap-1.5 cursor-pointer"
                >
                  <ClipboardCheck className="size-3.5" /> Nhập đánh giá hàng loạt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRowIds(new Set())}
                  className="text-xs h-8 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          )}

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
                <div className="flex flex-col">
                  <div className="overflow-x-auto min-w-full">
                    <table className="w-full text-xs text-left min-w-[960px]">
                      <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] h-[46px]">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <button
                              type="button"
                              onClick={handleToggleSelectAllStudents}
                              className="text-slate-400 hover:text-teal-600 transition inline-flex items-center justify-center"
                              title="Chọn tất cả"
                            >
                              {selectedRowIds.size === students.length && students.length > 0 ? (
                                <CheckSquare className="size-4 text-teal-600" />
                              ) : (
                                <Square className="size-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-4 min-w-[220px] text-left">Học sinh</th>
                          <th className="py-2.5 px-3 w-28 text-center">Mã HS</th>
                          <th className="py-2.5 px-3 w-20 text-center">Lớp</th>
                          <th className="py-2.5 px-3 w-16 text-center">Khối</th>
                          <th className="py-2.5 px-3 w-28 text-center">Ngày sinh</th>
                          <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                          <th className="py-2.5 px-3 w-24 text-center">Chuyên cần</th>
                          <th className="py-2.5 px-3 min-w-[160px] text-left">Đánh giá gần nhất</th>
                          <th className="py-2.5 px-3 w-28 text-center">Hỗ trợ</th>
                          <th className="py-2.5 px-4 w-32 text-right pr-4">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((s, idx) => {
                          const isSelected = selectedRowIds.has(s.id)
                          const isSupportNeeded =
                            (s as any).isNeedSupport ||
                            (s as any).needsSupport ||
                            s.status === 'Cần cố gắng' ||
                            (s.attendance !== null && s.attendance !== undefined && s.attendance < 80)
                          return (
                            <tr
                              key={s.id}
                              tabIndex={0}
                              onDoubleClick={() => setSelectedStudentId(s.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setSelectedStudentId(s.id)
                                }
                              }}
                              className={`group hover:bg-teal-50/40 transition-colors select-none cursor-pointer focus:bg-teal-50/60 focus:outline-none ${
                                isSelected ? 'bg-teal-50/50' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectStudent(s.id)}
                                  className="text-slate-400 hover:text-teal-600 transition inline-flex items-center justify-center"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="size-4 text-teal-600" />
                                  ) : (
                                    <Square className="size-4" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs">
                                {(currentPage - 1) * pageSize + idx + 1}
                              </td>
                              <td className="py-3 px-4 text-left">
                                <div className="flex items-center gap-2.5 text-left">
                                  <Avatar className="size-8.5 border border-teal-100 shrink-0">
                                    <AvatarFallback className={s.color || 'bg-teal-100 text-teal-700 font-bold text-xs'}>
                                      {s.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight truncate">
                                      {s.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {s.guardian || s.parentName || 'Chưa cập nhật PH'} {s.phone || s.parentPhone ? `(${s.phone || s.parentPhone})` : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                                {s.studentCode || '—'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-slate-900">
                                  {(s as any).className || s.grade || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-600">
                                {(s as any).gradeName || '—'}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-600">{s.dob || '—'}</td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant={statusVariant(s.status)} className="text-[10px]">
                                  {s.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-teal-700">
                                {s.attendance !== null && s.attendance !== undefined ? `${s.attendance}%` : '—'}
                              </td>
                              <td className="py-3 px-3 text-left">
                                <span className="font-medium text-slate-700 text-[11px] line-clamp-2">
                                  {(s as any).latestAssessment || (s as any).latestAssessmentText || 'Chưa có'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {isSupportNeeded ? (
                                  <Badge variant="destructive" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                                    Cần hỗ trợ
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Bình thường
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openQuickAssessmentModal([s])}
                                    title="Nhập đánh giá nhanh"
                                    className="h-7 px-2.5 text-teal-700 border-teal-200 hover:bg-teal-50 hover:text-teal-800 text-xs font-semibold cursor-pointer shadow-2xs gap-1"
                                  >
                                    <ClipboardCheck className="size-3.5" /> Đánh giá
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon-sm" className="size-7 text-slate-400 hover:text-slate-700 cursor-pointer">
                                        <MoreVertical className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 text-xs">
                                      <DropdownMenuItem onClick={() => setSelectedStudentId(s.id)}>
                                        <Eye className="size-3.5 mr-2" /> Xem hồ sơ 360°
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openQuickAssessmentModal([s])}>
                                        <ClipboardCheck className="size-3.5 mr-2" /> Nhập đánh giá
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
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Real Pagination Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        Hiển thị <strong>{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)}</strong> / <strong>{totalItems}</strong> học sinh
                      </span>
                      <span className="text-slate-300 hidden sm:inline">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">Hiển thị:</span>
                        <select
                          aria-label="Số dòng mỗi trang"
                          value={pageSize}
                          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                          className="h-7 px-2 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:border-teal-500 outline-none cursor-pointer"
                        >
                          <option value={20}>20 học sinh / trang</option>
                          <option value={50}>50 học sinh / trang</option>
                          <option value={100}>100 học sinh / trang</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || loading}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="h-7 px-2.5 text-xs font-medium gap-1 text-slate-600 cursor-pointer disabled:opacity-40"
                      >
                        <ChevronLeft className="size-3.5" /> Trước
                      </Button>

                      {/* Page number buttons */}
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let p = i + 1
                        if (totalPages > 5) {
                          if (currentPage > 3 && currentPage < totalPages - 2) {
                            p = currentPage - 2 + i
                          } else if (currentPage >= totalPages - 2) {
                            p = totalPages - 4 + i
                          }
                        }
                        return (
                          <Button
                            key={p}
                            variant={currentPage === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(p)}
                            className={`h-7 w-7 p-0 text-xs font-bold cursor-pointer ${
                              currentPage === p
                                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </Button>
                        )
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || loading}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="h-7 px-2.5 text-xs font-medium gap-1 text-slate-600 cursor-pointer disabled:opacity-40"
                      >
                        Sau <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* QUICK ASSESSMENT DIALOG */}
      <Dialog open={quickAssessOpen} onOpenChange={setQuickAssessOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-teal-600" />
              Nhập đánh giá / Điểm số nhanh
            </DialogTitle>
            <DialogDescription>
              {quickAssessStudents.length === 1
                ? `Đánh giá kết quả cho học sinh ${quickAssessStudents[0].name}`
                : `Đánh giá theo lô cho ${quickAssessStudents.length} học sinh đã chọn`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Lớp học *</Label>
                <select
                  value={quickAssessClassId}
                  onChange={async (e) => {
                    const cId = e.target.value
                    setQuickAssessClassId(cId)
                    try {
                      const subs = await getConfiguredClassSubjects(cId)
                      setQuickAssessSubjects(subs)
                      if (subs.length > 0) setQuickAssessSubjectId(subs[0].id)
                    } catch {
                      setQuickAssessSubjects([])
                    }
                  }}
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
                <Label className="text-xs font-semibold">Môn học</Label>
                <select
                  value={quickAssessSubjectId}
                  onChange={(e) => setQuickAssessSubjectId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  {quickAssessSubjects.length === 0 ? (
                    <option value="">Chung / Toàn diện</option>
                  ) : (
                    quickAssessSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Tên bài / Loại đánh giá *</Label>
              <Input
                placeholder="Đánh giá thường xuyên, Kiểm tra 15 phút,..."
                value={quickAssessTitle}
                onChange={(e) => setQuickAssessTitle(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mức độ đạt chuẩn</Label>
                <select
                  value={quickAssessLevel}
                  onChange={(e) => setQuickAssessLevel(e.target.value as any)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="EXCELLENT">Hoàn thành tốt (Tốt)</option>
                  <option value="COMPLETED">Hoàn thành (Đạt)</option>
                  <option value="NEEDS_SUPPORT">Cần cố gắng (Chưa đạt)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Điểm số (0 - 10, tùy chọn)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="Ví dụ: 9.0"
                  value={quickAssessScore}
                  onChange={(e) => setQuickAssessScore(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ngày đánh giá</Label>
              <Input
                type="date"
                value={quickAssessDate}
                onChange={(e) => setQuickAssessDate(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Nhận xét của giáo viên (tùy chọn)</Label>
              <Textarea
                placeholder="Nhận xét sự tiến bộ, ưu điểm và điểm cần cố gắng..."
                value={quickAssessComment}
                onChange={(e) => setQuickAssessComment(e.target.value)}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickAssessOpen(false)} disabled={savingQuickAssess}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveQuickAssessment}
              disabled={savingQuickAssess || !quickAssessTitle.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
            >
              {savingQuickAssess ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Lưu đánh giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE STUDENT DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Thêm học sinh mới</DialogTitle>
            <DialogDescription>
              Tạo hồ sơ học sinh và tự động phân bổ vào lớp học trong năm học hiện tại.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Họ và tên học sinh *</Label>
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
        <DialogContent size="md">
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
                <Label className="text-xs font-semibold">Học lực / Trạng thái</Label>
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

              <div>
                <Label className="text-xs font-semibold">Số điện thoại phụ huynh</Label>
                <Input
                  value={editParentPhone}
                  onChange={(e) => setEditParentPhone(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Họ tên phụ huynh</Label>
              <Input
                value={editParentName}
                onChange={(e) => setEditParentName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Ghi chú</Label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="mt-1 text-xs h-9"
              />
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
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Chuyển lớp học sinh</DialogTitle>
            <DialogDescription>
              Chuyển học sinh <strong>{transferTarget?.name}</strong> sang lớp mới trong cùng năm học.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Lớp hiện tại</Label>
              <Input value={(transferTarget as any)?.className || transferTarget?.grade || ''} disabled className="mt-1 bg-slate-50 text-xs h-9" />
            </div>

            <div>
              <Label className="text-xs font-semibold">Lớp chuyển đến *</Label>
              <select
                value={transferTargetClassId}
                onChange={(e) => setTransferTargetClassId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {classes
                  .filter((c) => c.id !== transferTarget?.classId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lý do chuyển lớp (tùy chọn)</Label>
              <Input
                placeholder="Theo nguyện vọng phụ huynh, điều chỉnh sĩ số..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferTarget(null)} disabled={transferring}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleTransferStudent}
              disabled={transferring || !transferTargetClassId}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
            >
              {transferring ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRightLeft className="size-3.5" />} Xác nhận chuyển lớp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAW / DELETE DIALOG */}
      <Dialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="size-5" /> Rút học sinh khỏi lớp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bạn có chắc chắn muốn rút học sinh <strong>{deleteTarget?.name}</strong> khỏi lớp? Dữ liệu lịch sử học tập vẫn được bảo lưu an toàn.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleDeleteStudent} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">
              Xác nhận rút
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT EXCEL & WORD DIALOG */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent size="xl" className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              <FileText className="size-5 text-indigo-600" />
              Import danh sách học sinh từ file Word / Excel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hỗ trợ tệp Microsoft Word (.docx, .doc), Excel (.xlsx, .xls, .csv) hoặc dán trực tiếp danh sách học sinh.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 text-xs">
            {/* Target Classroom Selection */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-teal-600" /> Chọn lớp học tiếp nhận *
                </Label>
                <p className="text-[11px] text-slate-500">Học sinh sẽ được ghi danh vào lớp và năm học tương ứng</p>
              </div>
              <select
                value={importTargetClassId}
                onChange={(e) => setImportTargetClassId(e.target.value)}
                className="h-9 min-w-[220px] rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-teal-500"
              >
                <option value="">-- Chọn lớp học --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>

            {importRows.length === 0 ? (
              /* UPLOAD / PASTE SECTION */
              <div className="space-y-4">
                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-6 text-center bg-slate-50/60 hover:bg-teal-50/20 transition">
                  <div className="flex justify-center items-center gap-2 mb-2 text-slate-400">
                    <FileText className="size-8 text-indigo-500" />
                    <FileSpreadsheet className="size-8 text-emerald-500" />
                    <UploadCloud className="size-8 text-teal-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Tải lên tệp Word (.docx) hoặc Excel (.xlsx, .xls, .csv)</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Hệ thống tự động đọc bảng trong Word/Excel hoặc trích xuất AI có cấu trúc các trường họ tên, ngày sinh, giới tính, phụ huynh.
                  </p>
                  <input
                    type="file"
                    accept=".docx,.doc,.xlsx,.xls,.csv"
                    id="import-file-main"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleAnalyzeFile(f)
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('import-file-main')?.click()}
                    disabled={importAnalyzing}
                    className="mt-4 text-xs gap-1.5 font-bold text-teal-700 border-teal-300 hover:bg-teal-50 cursor-pointer h-9 px-4 shadow-2xs"
                  >
                    {importAnalyzing ? <Loader2 className="size-4 animate-spin text-teal-600" /> : <UploadCloud className="size-4" />}
                    {importAnalyzing ? 'Đang phân tích tệp...' : 'Chọn tệp từ máy tính'}
                  </Button>
                </div>

                {/* Or Paste Table */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-white">
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Hoặc dán văn bản danh sách:</span>
                    <span className="text-[11px] font-normal text-slate-400">Phân tách bằng Tab hoặc Dấu phẩy</span>
                  </Label>
                  <Textarea
                    placeholder="Nguyễn Văn An	HS001	Nam	12/05/2018	Nguyễn Văn Ba	0901234567	Ghi chú&#10;Trần Thị Bình	HS002	Nữ	20/08/2018	Trần Văn Cường	0987654321	"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={4}
                    className="text-xs font-mono"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={handleParseImportText} className="text-xs h-7 gap-1 font-semibold">
                      <Sparkles className="size-3 text-teal-600" /> Phân tích văn bản
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* PREVIEW & EDIT SECTION */
              <div className="space-y-3">
                {/* Stats & Quick Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-800">
                      Tổng: <span className="text-teal-700">{importRows.length}</span> học sinh
                    </span>
                    <span className="text-slate-300">|</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                      ✓ {importRows.filter((r) => r.valid).length} hợp lệ
                    </Badge>
                    {importRows.filter((r) => !r.valid).length > 0 && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-semibold">
                        ⚠ {importRows.filter((r) => !r.valid).length} cần sửa
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 text-[11px] font-semibold">
                      Đã chọn: {importRows.filter((r) => r.selected).length}/{importRows.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectOnlyValid()}
                      className="text-[11px] h-7 px-2 font-medium text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
                    >
                      Chỉ chọn dòng hợp lệ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleSelectAll(!importRows.every((r) => r.selected))}
                      className="text-[11px] h-7 px-2 font-medium text-slate-700 cursor-pointer"
                    >
                      {importRows.every((r) => r.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setImportRows([])}
                      className="text-[11px] h-7 px-2 font-medium text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer gap-1"
                    >
                      <RefreshCw className="size-3" /> Tải file khác
                    </Button>
                  </div>
                </div>

                {/* Editable Preview Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <div className="max-h-[50vh] overflow-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                      <thead className="bg-slate-100/80 sticky top-0 z-10 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={importRows.length > 0 && importRows.every((r) => r.selected)}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              className="rounded accent-teal-600 size-3.5"
                            />
                          </th>
                          <th className="p-2 w-10 text-center text-slate-400">STT</th>
                          <th className="p-2 min-w-[150px]">Họ và tên *</th>
                          <th className="p-2 w-28">Mã học sinh</th>
                          <th className="p-2 w-24">Giới tính</th>
                          <th className="p-2 w-28">Ngày sinh</th>
                          <th className="p-2 min-w-[130px]">Phụ huynh</th>
                          <th className="p-2 w-28">Số điện thoại</th>
                          <th className="p-2 min-w-[110px]">Trạng thái</th>
                          <th className="p-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map((r, i) => (
                          <tr
                            key={r.id}
                            className={`transition hover:bg-slate-50/80 ${
                              !r.valid ? 'bg-rose-50/40' : r.selected ? 'bg-teal-50/20' : ''
                            }`}
                          >
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={r.selected}
                                onChange={() => handleToggleSelectRow(r.id)}
                                className="rounded accent-teal-600 size-3.5"
                              />
                            </td>
                            <td className="p-2 text-center font-mono text-[11px] text-slate-400">{i + 1}</td>
                            <td className="p-1.5">
                              <Input
                                value={r.fullName}
                                onChange={(e) => handleUpdateImportCell(r.id, 'fullName', e.target.value)}
                                placeholder="Họ và tên..."
                                className={`h-7 text-xs font-semibold px-2 ${
                                  !r.fullName.trim() ? 'border-rose-400 bg-rose-50' : 'bg-transparent'
                                }`}
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={r.studentCode || ''}
                                onChange={(e) => handleUpdateImportCell(r.id, 'studentCode', e.target.value)}
                                placeholder="Tự sinh"
                                className="h-7 text-xs font-mono px-2 bg-transparent"
                              />
                            </td>
                            <td className="p-1.5">
                              <select
                                value={r.gender || 'Nam'}
                                onChange={(e) => handleUpdateImportCell(r.id, 'gender', e.target.value)}
                                className="h-7 w-full rounded-md border border-slate-200 bg-transparent px-1.5 text-xs"
                              >
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={r.dob || ''}
                                onChange={(e) => handleUpdateImportCell(r.id, 'dob', e.target.value)}
                                placeholder="DD/MM/YYYY"
                                className={`h-7 text-xs px-2 ${
                                  r.errors.some((err) => err.includes('Ngày sinh')) ? 'border-rose-400 bg-rose-50' : 'bg-transparent'
                                }`}
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={r.parentName || ''}
                                onChange={(e) => handleUpdateImportCell(r.id, 'parentName', e.target.value)}
                                placeholder="Tên phụ huynh"
                                className="h-7 text-xs px-2 bg-transparent"
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={r.parentPhone || ''}
                                onChange={(e) => handleUpdateImportCell(r.id, 'parentPhone', e.target.value)}
                                placeholder="SĐT"
                                className="h-7 text-xs px-2 bg-transparent font-mono"
                              />
                            </td>
                            <td className="p-2">
                              {r.valid ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold py-0.5">
                                  ✓ Hợp lệ
                                </Badge>
                              ) : (
                                <div className="space-y-0.5">
                                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold py-0.5">
                                    ⚠ Lỗi
                                  </Badge>
                                  <p className="text-[10px] text-rose-600 leading-tight">
                                    {r.errors.join(', ')}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleDeleteImportRow(r.id)}
                                title="Xóa dòng này"
                                className="text-slate-400 hover:text-rose-600 transition p-1"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Đóng
            </Button>
            {importRows.length > 0 && (
              <Button
                size="sm"
                onClick={handleConfirmImport}
                disabled={importing || importRows.filter((r) => r.selected).length === 0 || !importTargetClassId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
              >
                {importing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                {importing
                  ? 'Đang import vào hệ thống...'
                  : `Xác nhận Import (${importRows.filter((r) => r.selected).length} học sinh)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DETAIL 360 VIEW
// ═══════════════════════════════════════════════════════════════════════════

function StudentDetailView({
  student,
  classes,
  onBack,
  onStudentUpdated,
  onOpenEdit,
  onOpenTransfer,
  onOpenDelete,
  onOpenQuickAssess,
}: {
  student: StudentRecord
  classes: ClassRecord[]
  onBack: () => void
  onStudentUpdated: () => void
  onOpenEdit: () => void
  onOpenTransfer: () => void
  onOpenDelete: () => void
  onOpenQuickAssess: () => void
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
                {((student as any).isNeedSupport || (student as any).needsSupport || student.status === 'Cần cố gắng') && (
                  <Badge variant="destructive" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                    Cần hỗ trợ
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Lớp: <strong className="text-slate-800">{(student as any).className || student.grade}</strong> · Mã HS:{' '}
                <span className="font-mono font-bold text-teal-800">{student.studentCode || 'Chưa cấp'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={onOpenQuickAssess} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm cursor-pointer">
              <ClipboardCheck className="size-3.5" /> Nhập đánh giá
            </Button>
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

      {/* 6 Tabs for Student 360 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-slate-100 rounded-xl">
          <TabsTrigger value="overview" className="text-xs py-2 font-medium">Tổng quan</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs py-2 font-medium">Chuyên cần</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs py-2 font-medium">Đánh giá</TabsTrigger>
          <TabsTrigger value="comments" className="text-xs py-2 font-medium">Nhận xét</TabsTrigger>
          <TabsTrigger value="behaviors" className="text-xs py-2 font-medium">Nề nếp</TabsTrigger>
          <TabsTrigger value="worksheets" className="text-xs py-2 font-medium">Bài tập</TabsTrigger>
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

        {/* TAB 4: NHẬN XÉT */}
        <TabsContent value="comments" className="mt-5 space-y-5">
          <StudentTabComments student={student} />
        </TabsContent>

        {/* TAB 5: NỀ NẾP */}
        <TabsContent value="behaviors" className="mt-5 space-y-5">
          <StudentTabBehaviors student={student} />
        </TabsContent>

        {/* TAB 6: BÀI TẬP */}
        <TabsContent value="worksheets" className="mt-5 space-y-5">
          <StudentTabWorksheets student={student} />
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
              <span className="text-slate-500">Đánh giá gần nhất:</span>
              <span className="font-semibold text-slate-900">
                {(student as any).latestAssessment || (student as any).latestAssessmentText || 'Chưa có'}
              </span>
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
// TAB 4: NHẬN XÉT HỌC SINH
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: NỀ NẾP & HÀNH VI (STUDENT BEHAVIOR RECORDS)
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabBehaviors({ student }: { student: StudentRecord }) {
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentProfile(student.id)
      .then((res) => {
        if (isMounted) setProfileData(res)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [student.id])

  const behaviors = profileData?.recent?.behaviors || []

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-600" /> Nhật ký nề nếp & Tác phong ({behaviors.length} ghi nhận)
        </CardTitle>
        <CardDescription className="text-xs">
          Theo dõi ý thức kỷ luật, tinh thần tự giác và các hoạt động rèn luyện của học sinh.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="size-5 animate-spin mx-auto text-teal-600 mb-1" />
            <p className="text-xs">Đang tải nhật ký nề nếp...</p>
          </div>
        ) : behaviors.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">Học sinh có nề nếp tốt, chưa có ghi nhận cần lưu ý.</p>
        ) : (
          <div className="space-y-3">
            {behaviors.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        item.level === 'POSITIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.level === 'REMINDER'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.level === 'POSITIVE' ? 'Khen ngợi' : item.level === 'REMINDER' ? 'Nhắc nhở' : 'Cần lưu ý'}
                    </Badge>
                    <span className="font-bold text-xs text-slate-800">{item.category}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.recordDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{item.content}</p>
                {item.resolution && (
                  <p className="text-[11px] text-teal-700 bg-white p-2 rounded-lg border border-slate-100">
                    <strong>Biện pháp:</strong> {item.resolution}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: PHIẾU HỌC TẬP & BÀI TẬP (WORKSHEET ASSIGNMENTS)
// ═══════════════════════════════════════════════════════════════════════════

function StudentTabWorksheets({ student }: { student: StudentRecord }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentProfile(student.id)
      .then((res) => {
        if (isMounted) setData(res)
      })
      .catch(() => setData(null))
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [student.id])

  const assignments = data?.recent?.assignments || []

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="size-4 text-teal-600" /> Phiếu học tập & Bài tập giao lớp ({assignments.length} bài)
        </CardTitle>
        <CardDescription className="text-xs">
          Dữ liệu lấy từ các nhiệm vụ học tập của lớp {(student as any).className || student.grade}.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-teal-600" />
            <p className="text-xs text-slate-400 mt-1">Đang tải phiếu học tập...</p>
          </div>
        ) : assignments.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Chưa có phiếu học tập nào được giao cho lớp của học sinh.</p>
        ) : (
          <div className="space-y-2.5">
            {assignments.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 text-xs space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <b className="text-slate-900 font-bold text-sm">{item.worksheet?.title || 'Phiếu học tập'}</b>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-white">
                    {item.status === 'ASSIGNED' ? 'Đã giao' : item.status === 'COMPLETED' ? 'Đã thu' : item.status}
                  </Badge>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Lớp {item.classroom?.name} · Ngày giao: {new Date(item.assignedAt).toLocaleDateString('vi-VN')}
                </p>
                {item.dueAt && (
                  <p className="text-amber-700 font-medium text-[11px]">
                    Hạn nộp: {new Date(item.dueAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
