'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getClasses } from '@/services/classroom-service'
import {
  getSeatingPlans,
  createSeatingPlan,
  updateSeatingPlan,
  randomizeSeatingPlan,
  resetSeatingPlan,
  type SeatingPlan,
  type CanvasGroup,
  type CanvasDesk,
  type CanvasDeskSeat,
} from '@/services/seating-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Grid2X2, Loader2, Shuffle, RotateCcw, Save, Armchair, Plus, Trash2, Edit2,
  MoreVertical, X, User, Search, Users, Check, CheckCircle2, ChevronDown, Sparkles
} from 'lucide-react'

const MAX_DESKS_PER_GROUP = 10

function createDefaultGroup(index: number, defaultSeats: number = 2, deskCount: number = 4): CanvasGroup {
  const groupId = `group-${Date.now()}-${index + 1}`
  const desks: CanvasDesk[] = Array.from({ length: deskCount }, (_, dIdx) => ({
    id: `desk-${groupId}-${dIdx + 1}`,
    name: `Bàn ${dIdx + 1}`,
    seatCapacity: defaultSeats,
    seats: Array.from({ length: defaultSeats }, (_, sIdx) => ({
      position: sIdx,
      studentId: null,
    })),
  }))

  return {
    id: groupId,
    name: `TỔ ${index + 1}`,
    desks,
  }
}

export function SeatingPlanView() {
  const [classes, setClasses] = useState<any[]>([])
  const [classroomId, setClassroomId] = useState('')
  const [plan, setPlan] = useState<SeatingPlan | null>(null)
  const [planId, setPlanId] = useState('')
  const [name, setName] = useState('Sơ đồ chính')
  const [defaultSeatsPerDesk, setDefaultSeatsPerDesk] = useState(2)
  const [groups, setGroups] = useState<CanvasGroup[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Rename Group Dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')

  // 1. Load Classes on Mount
  useEffect(() => {
    getClasses()
      .then((items: any[]) => {
        setClasses(items)
        if (items.length > 0) {
          setClassroomId(items[0].id)
        }
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false))
  }, [])

  // 2. Convert legacy / existing layout to Groups structure
  const parseLayoutToGroups = useCallback(
    (rawLayout: any, legacyCols: number = 4, legacyRows: number = 4, seatsPerDesk: number = 2): CanvasGroup[] => {
      if (rawLayout && typeof rawLayout === 'object' && Array.isArray(rawLayout.groups) && rawLayout.groups.length > 0) {
        return rawLayout.groups.map((g: any, gIdx: number) => ({
          id: g.id || `group-${gIdx + 1}`,
          name: g.name || `TỔ ${gIdx + 1}`,
          desks: (g.desks || []).slice(0, MAX_DESKS_PER_GROUP).map((d: any, dIdx: number) => {
            const cap = Math.max(1, Math.min(4, Number(d.seatCapacity) || 2))
            const rawSeats = Array.isArray(d.seats) ? d.seats : []
            const seats: CanvasDeskSeat[] = Array.from({ length: cap }, (_, pos) => {
              const s = rawSeats.find((seat: any) => seat && seat.position === pos)
              return {
                position: pos,
                studentId: s?.studentId || null,
              }
            })
            return {
              id: d.id || `desk-${g.id || gIdx + 1}-${dIdx + 1}`,
              name: d.name || `Bàn ${dIdx + 1}`,
              seatCapacity: cap,
              seats,
            }
          }),
        }))
      }

      // Legacy structured desks
      if (rawLayout && typeof rawLayout === 'object' && Array.isArray(rawLayout.desks) && rawLayout.desks.length > 0) {
        const desksPerGroup = 4
        const totalGroups = Math.max(1, Math.ceil(rawLayout.desks.length / desksPerGroup))
        const res: CanvasGroup[] = []
        for (let g = 0; g < totalGroups; g++) {
          const groupDesks = rawLayout.desks.slice(g * desksPerGroup, (g + 1) * desksPerGroup).map((d: any, dIdx: number) => {
            const cap = Math.max(1, Math.min(4, Number(d.seatCapacity) || 2))
            const rawSeats = Array.isArray(d.seats) ? d.seats : []
            return {
              id: d.id || `desk-g${g + 1}-${dIdx + 1}`,
              name: `Bàn ${dIdx + 1}`,
              seatCapacity: cap,
              seats: Array.from({ length: cap }, (_, pos) => {
                const s = rawSeats.find((seat: any) => seat && seat.position === pos)
                return { position: pos, studentId: s?.studentId || null }
              }),
            }
          })
          res.push({
            id: `group-${g + 1}`,
            name: `TỔ ${g + 1}`,
            desks: groupDesks,
          })
        }
        return res
      }

      // Legacy array [{ studentId, row, column, seatIndex }]
      if (Array.isArray(rawLayout)) {
        const numCols = Math.max(1, legacyCols)
        const numRows = Math.max(1, Math.min(MAX_DESKS_PER_GROUP, legacyRows))
        const res: CanvasGroup[] = []

        for (let c = 0; c < numCols; c++) {
          const groupDesks: CanvasDesk[] = []
          for (let r = 0; r < numRows; r++) {
            const seats: CanvasDeskSeat[] = Array.from({ length: seatsPerDesk }, (_, sIdx) => {
              const found = rawLayout.find(
                (item: any) => item && item.column === c && item.row === r && (item.seatIndex ?? 0) === sIdx
              )
              return {
                position: sIdx,
                studentId: found?.studentId || null,
              }
            })
            groupDesks.push({
              id: `desk-c${c + 1}-r${r + 1}`,
              name: `Bàn ${r + 1}`,
              seatCapacity: seatsPerDesk,
              seats,
            })
          }
          res.push({
            id: `group-${c + 1}`,
            name: `TỔ ${c + 1}`,
            desks: groupDesks,
          })
        }
        return res
      }

      // Fresh default: 4 Groups of 4 desks each
      return Array.from({ length: 4 }, (_, idx) => createDefaultGroup(idx, seatsPerDesk, 4))
    },
    []
  )

  // 3. Load Plan for Selected Classroom
  useEffect(() => {
    if (!classroomId) return
    getSeatingPlans(classroomId)
      .then((items) => {
        const item = items[0]
        if (item) {
          setPlan(item)
          setPlanId(item.id)
          setName(item.name || 'Sơ đồ chính')
          const defaultSeats = item.seatsPerDesk || 2
          setDefaultSeatsPerDesk(defaultSeats)
          const parsedGroups = parseLayoutToGroups(
            item.layout,
            item.columns || 4,
            item.rows || 4,
            defaultSeats
          )
          setGroups(parsedGroups)
        } else {
          setPlanId('')
          setName('Sơ đồ chính')
          setDefaultSeatsPerDesk(2)
          const defaultGrp = Array.from({ length: 4 }, (_, idx) => createDefaultGroup(idx, 2, 4))
          setGroups(defaultGrp)
          setPlan({
            id: '',
            classroomId,
            name: 'Sơ đồ chính',
            layout: { groups: defaultGrp },
            students: [],
          })
        }
      })
      .catch(() => {
        setPlan(null)
        setGroups(Array.from({ length: 4 }, (_, idx) => createDefaultGroup(idx, 2, 4)))
      })
  }, [classroomId, parseLayoutToGroups])

  // Current Classroom Students
  const currentStudents = useMemo(() => {
    if (plan?.students && plan.students.length > 0) {
      return plan.students
    }
    const currentClass = classes.find((c) => c.id === classroomId)
    return currentClass?.students || []
  }, [plan, classes, classroomId])

  // Seated Student IDs set
  const seatedStudentIds = useMemo(() => {
    const set = new Set<string>()
    for (const g of groups) {
      for (const d of g.desks) {
        for (const s of d.seats) {
          if (s.studentId) set.add(s.studentId)
        }
      }
    }
    return set
  }, [groups])

  // Unassigned Students
  const unassignedStudents = useMemo(() => {
    return currentStudents.filter((s: any) => !seatedStudentIds.has(s.id))
  }, [currentStudents, seatedStudentIds])

  // Filtered Students for Left Sidebar
  const filteredUnassignedStudents = useMemo(() => {
    if (!studentSearch.trim()) return unassignedStudents
    const q = studentSearch.toLowerCase().trim()
    return unassignedStudents.filter(
      (s: any) =>
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q))
    )
  }, [unassignedStudents, studentSearch])

  // Total Statistics
  const stats = useMemo(() => {
    let totalDesks = 0
    let totalSeats = 0
    let occupiedSeats = 0
    for (const g of groups) {
      totalDesks += g.desks.length
      for (const d of g.desks) {
        totalSeats += d.seatCapacity
        for (const s of d.seats) {
          if (s.studentId) occupiedSeats++
        }
      }
    }
    return {
      totalGroups: groups.length,
      totalDesks,
      totalSeats,
      occupiedSeats,
      unassignedCount: Math.max(0, currentStudents.length - occupiedSeats),
    }
  }, [groups, currentStudents])

  // ═════════════════════════════════════════════════════════════════════════
  // SEAT PLACEMENT & ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  const handleSeatClick = (groupId: string, deskId: string, seatPos: number) => {
    if (!selectedStudentId) {
      // If no student selected, check if seat is occupied to unseat or select
      const currentGroup = groups.find((g) => g.id === groupId)
      const currentDesk = currentGroup?.desks.find((d) => d.id === deskId)
      const seat = currentDesk?.seats.find((s) => s.position === seatPos)
      if (seat?.studentId) {
        setSelectedStudentId(seat.studentId)
      }
      return
    }

    const studentToPlace = selectedStudentId

    setGroups((prevGroups) => {
      // 1. Remove studentToPlace from any existing seat
      const cleanedGroups = prevGroups.map((g) => ({
        ...g,
        desks: g.desks.map((d) => ({
          ...d,
          seats: d.seats.map((s) => (s.studentId === studentToPlace ? { ...s, studentId: null } : s)),
        })),
      }))

      // 2. Place student at target seat
      return cleanedGroups.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          desks: g.desks.map((d) => {
            if (d.id !== deskId) return d
            return {
              ...d,
              seats: d.seats.map((s) => (s.position === seatPos ? { ...s, studentId: studentToPlace } : s)),
            }
          }),
        }
      })
    })

    setSelectedStudentId(null)
  }

  const handleClearSeat = (e: React.MouseEvent, groupId: string, deskId: string, seatPos: number) => {
    e.stopPropagation()
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          desks: g.desks.map((d) => {
            if (d.id !== deskId) return d
            return {
              ...d,
              seats: d.seats.map((s) => (s.position === seatPos ? { ...s, studentId: null } : s)),
            }
          }),
        }
      })
    )
  }

  // Add Group
  const handleAddGroup = () => {
    if (groups.length >= 8) {
      toast.info('Tối đa 8 tổ trong một lớp học')
      return
    }
    const newGroup = createDefaultGroup(groups.length, defaultSeatsPerDesk, 4)
    setGroups((prev) => [...prev, newGroup])
    toast.success(`Đã thêm ${newGroup.name}`)
  }

  // Remove Group
  const handleRemoveGroup = (groupId: string) => {
    if (groups.length <= 1) {
      toast.info('Lớp học cần tối thiểu 1 tổ')
      return
    }
    const targetGroup = groups.find((g) => g.id === groupId)
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    toast.success(`Đã xóa ${targetGroup?.name || 'tổ'}`)
  }

  // Add Desk to Group
  const handleAddDeskToGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        if (g.desks.length >= MAX_DESKS_PER_GROUP) {
          toast.info(`Mỗi tổ tối đa ${MAX_DESKS_PER_GROUP} bàn`)
          return g
        }
        const nextDeskNumber = g.desks.length + 1
        const newDesk: CanvasDesk = {
          id: `desk-${groupId}-${Date.now()}`,
          name: `Bàn ${nextDeskNumber}`,
          seatCapacity: defaultSeatsPerDesk,
          seats: Array.from({ length: defaultSeatsPerDesk }, (_, pos) => ({
            position: pos,
            studentId: null,
          })),
        }
        return {
          ...g,
          desks: [...g.desks, newDesk],
        }
      })
    )
  }

  // Remove Last Desk from Group
  const handleRemoveLastDeskFromGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        if (g.desks.length <= 1) {
          toast.info('Mỗi tổ cần tối thiểu 1 bàn')
          return g
        }
        return {
          ...g,
          desks: g.desks.slice(0, -1),
        }
      })
    )
  }

  // Toggle Desk Capacity (2 or 4 seats)
  const handleToggleDeskCapacity = (groupId: string, deskId: string, newCapacity: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          desks: g.desks.map((d) => {
            if (d.id !== deskId) return d
            const currentSeats = d.seats || []
            const updatedSeats: CanvasDeskSeat[] = Array.from({ length: newCapacity }, (_, pos) => {
              const existing = currentSeats.find((s) => s.position === pos)
              return {
                position: pos,
                studentId: existing?.studentId || null,
              }
            })
            return {
              ...d,
              seatCapacity: newCapacity,
              seats: updatedSeats,
            }
          }),
        }
      })
    )
  }

  // Open Rename Dialog
  const handleOpenRename = (group: CanvasGroup) => {
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
    setRenameDialogOpen(true)
  }

  // Save Rename
  const handleSaveRename = () => {
    if (!editingGroupId || !editingGroupName.trim()) return
    setGroups((prev) =>
      prev.map((g) => (g.id === editingGroupId ? { ...g, name: editingGroupName.trim() } : g))
    )
    setRenameDialogOpen(false)
    toast.success('Đã đổi tên tổ thành công')
  }

  // Randomize all seats
  const handleRandomize = () => {
    if (currentStudents.length === 0) {
      toast.info('Lớp chưa có học sinh để xếp chỗ')
      return
    }

    const shuffled = [...currentStudents].sort(() => Math.random() - 0.5)
    let sIdx = 0

    setGroups((prevGroups) =>
      prevGroups.map((g) => ({
        ...g,
        desks: g.desks.map((d) => ({
          ...d,
          seats: Array.from({ length: d.seatCapacity }, (_, pos) => ({
            position: pos,
            studentId: sIdx < shuffled.length ? shuffled[sIdx++].id : null,
          })),
        })),
      }))
    )

    toast.success('Đã tự động xếp chỗ ngẫu nhiên cho học sinh')
  }

  // Reset all seats
  const handleReset = () => {
    setGroups((prevGroups) =>
      prevGroups.map((g) => ({
        ...g,
        desks: g.desks.map((d) => ({
          ...d,
          seats: Array.from({ length: d.seatCapacity }, (_, pos) => ({
            position: pos,
            studentId: null,
          })),
        })),
      }))
    )
    setSelectedStudentId(null)
    toast.info('Đã đặt lại tất cả chỗ ngồi về trống')
  }

  // Save Plan to Backend
  const handleSavePlan = async () => {
    if (!classroomId) {
      toast.error('Vui lòng chọn lớp học trước khi lưu')
      return
    }

    setSaving(true)
    try {
      const allDesks: CanvasDesk[] = groups.flatMap((g) => g.desks)
      const payload = {
        classroomId,
        name: name.trim() || 'Sơ đồ chính',
        seatsPerDesk: defaultSeatsPerDesk,
        rows: Math.max(...groups.map((g) => g.desks.length), 1),
        columns: groups.length,
        layout: {
          canvas: { width: 1200, height: 800 },
          groups,
          desks: allDesks,
        },
      }

      let res: SeatingPlan
      if (planId) {
        res = await updateSeatingPlan(planId, payload)
      } else {
        res = await createSeatingPlan(payload)
      }

      setPlan(res)
      setPlanId(res.id)
      toast.success('Đã lưu sơ đồ chỗ ngồi thành công')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu sơ đồ chỗ ngồi. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <Loader2 className="size-8 animate-spin text-teal-600 mb-2" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 py-6">
      {/* 1. Header Màn hình */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            <Armchair className="size-4" /> Lớp học · Sơ đồ chỗ ngồi
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Sơ đồ chỗ ngồi theo Tổ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mỗi cột là 1 Tổ, bố trí các bàn dọc từ trên xuống dưới theo tầm nhìn hướng về Bảng.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomize}
            disabled={saving || !classroomId}
            className="h-9 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:border-teal-300 gap-1.5 shadow-2xs"
          >
            <Shuffle className="size-3.5 text-teal-600" /> Tự xếp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving || !classroomId}
            className="h-9 text-xs font-semibold text-slate-700 hover:text-rose-700 hover:border-rose-300 gap-1.5 shadow-2xs"
          >
            <RotateCcw className="size-3.5 text-slate-500" /> Đặt lại
          </Button>
          <Button
            onClick={handleSavePlan}
            disabled={saving || !classroomId}
            className="h-9 px-4 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-2xs"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Lưu sơ đồ
          </Button>
        </div>
      </div>

      {/* 2. Card Cấu hình Sơ đồ */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Class Selector */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Lớp học</Label>
              <select
                aria-label="Chọn lớp học"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                className="mt-1.5 w-full h-9.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 focus:outline-teal-500"
              >
                <option value="">-- Chọn lớp học --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.grade ? `(${c.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Name */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Tên sơ đồ</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Sơ đồ Học kỳ 1"
                className="mt-1.5 h-9.5 text-xs bg-slate-50 border-slate-200 font-medium"
              />
            </div>

            {/* Default Seats Per Desk */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Ghế mặc định mỗi bàn</Label>
              <select
                aria-label="Chọn số ghế mặc định mỗi bàn"
                value={defaultSeatsPerDesk}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setDefaultSeatsPerDesk(val)
                }}
                className="mt-1.5 w-full h-9.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 focus:outline-teal-500"
              >
                <option value={2}>Bàn 2 ghế (2 học sinh)</option>
                <option value={4}>Bàn 4 ghế (4 học sinh)</option>
              </select>
            </div>

            {/* Add Group Action */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleAddGroup}
                disabled={groups.length >= 8}
                className="w-full h-9.5 text-xs font-semibold border-teal-200 text-teal-700 hover:bg-teal-50 gap-1.5 shadow-2xs"
              >
                <Plus className="size-3.5" /> Thêm tổ (Hiện có {groups.length} tổ)
              </Button>
            </div>
          </div>

          {/* Quick KPI stats row */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-4 sm:gap-8 text-xs text-slate-600">
            <div>
              Tổng số tổ: <b className="text-slate-900 font-bold">{stats.totalGroups}</b>
            </div>
            <div>
              Tổng số bàn: <b className="text-slate-900 font-bold">{stats.totalDesks}</b>
            </div>
            <div>
              Tổng số chỗ ngồi: <b className="text-slate-900 font-bold">{stats.totalSeats}</b>
            </div>
            <div>
              Đã xếp: <b className="text-teal-700 font-bold">{stats.occupiedSeats} HS</b>
            </div>
            <div>
              Chưa xếp:{' '}
              <b className={stats.unassignedCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-500 font-semibold'}>
                {stats.unassignedCount} HS
              </b>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Main Workspace: Sidebar Học sinh (trái) + Sơ đồ các Tổ (phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* SIDEBAR TRÁI: DANH SÁCH HỌC SINH CHƯA XẾP */}
        <Card className="border border-slate-200/80 shadow-2xs rounded-xl sticky top-4">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Users className="size-4 text-teal-600" />
                Học sinh chưa xếp ({unassignedStudents.length})
              </CardTitle>
              {selectedStudentId && (
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Hủy chọn
                </button>
              )}
            </div>
            <CardDescription className="text-[11px] text-slate-500 mt-1">
              {selectedStudentId
                ? 'Đã chọn học sinh · Nhấp vào ghế trống bên phải để xếp chỗ'
                : 'Bấm chọn học sinh rồi bấm vào ghế trong tổ'}
            </CardDescription>

            {/* Student Search */}
            <div className="relative mt-2.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Tìm học sinh..."
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </CardHeader>

          <CardContent className="p-3 max-h-[560px] overflow-y-auto space-y-1.5">
            {filteredUnassignedStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {currentStudents.length === 0 ? (
                  <>
                    <User className="size-6 mx-auto text-slate-300 mb-1" />
                    Lớp chưa có học sinh nào.
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-6 mx-auto text-emerald-500 mb-1" />
                    Tất cả học sinh đã được xếp chỗ!
                  </>
                )}
              </div>
            ) : (
              filteredUnassignedStudents.map((s: any) => {
                const isSelected = selectedStudentId === s.id
                const initials = s.initials || s.fullName?.slice(0, 2)?.toUpperCase() || s.name?.slice(0, 2)?.toUpperCase() || 'HS'
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold shadow-2xs ring-1 ring-teal-400'
                        : 'border-slate-150 bg-white hover:border-teal-300 hover:bg-slate-50/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span
                        className={`size-6.5 rounded-full grid place-items-center text-[10px] font-extrabold shrink-0 ${
                          isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {initials}
                      </span>
                      <span className="truncate">{s.fullName || s.name}</span>
                    </div>
                    {isSelected && (
                      <span className="shrink-0 size-4 rounded-full bg-teal-600 text-white grid place-items-center">
                        <Check className="size-2.5" />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* VÙNG SƠ ĐỒ CHÍNH (CỘT TỔ NẰM NGANG, SCROLL RIÊNG) */}
        <div className="space-y-4 min-w-0">
          {/* BẢNG LỚP HỌC */}
          <div className="rounded-xl bg-slate-900 py-2.5 px-4 text-center text-xs font-bold tracking-widest text-slate-100 shadow-sm flex items-center justify-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            BẢNG LỚP HỌC (HƯỚNG NHÌN)
          </div>

          {/* CÁC TỔ NẰM NGANG CẠNH NHAU (SCROLL NGANG TÁCH BIỆT) */}
          <div className="overflow-x-auto pb-4 pt-1">
            <div className="flex items-start gap-4.5 min-w-max pb-2">
              {groups.map((group, groupIdx) => {
                const totalGroupSeats = group.desks.reduce((acc, d) => acc + d.seatCapacity, 0)
                const seatedInGroup = group.desks.reduce(
                  (acc, d) => acc + d.seats.filter((s) => s.studentId).length,
                  0
                )

                return (
                  <div
                    key={group.id}
                    className="w-72 shrink-0 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-2xs flex flex-col justify-between"
                  >
                    {/* Header Cột Tổ */}
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-3 bg-white px-3 py-2 rounded-xl shadow-2xs">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                          {group.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {group.desks.length} bàn · {seatedInGroup}/{totalGroupSeats} chỗ
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddDeskToGroup(group.id)}
                          disabled={group.desks.length >= MAX_DESKS_PER_GROUP}
                          className="h-7 px-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                          title="Thêm bàn vào tổ"
                        >
                          <Plus className="size-3 mr-0.5" /> Bàn
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                            <DropdownMenuItem onClick={() => handleOpenRename(group)} className="cursor-pointer">
                              <Edit2 className="size-3.5 mr-2 text-slate-600" /> Đổi tên tổ
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAddDeskToGroup(group.id)}
                              disabled={group.desks.length >= MAX_DESKS_PER_GROUP}
                              className="cursor-pointer"
                            >
                              <Plus className="size-3.5 mr-2 text-teal-600" /> Thêm bàn
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveLastDeskFromGroup(group.id)}
                              disabled={group.desks.length <= 1}
                              className="cursor-pointer text-slate-700"
                            >
                              <Trash2 className="size-3.5 mr-2 text-slate-500" /> Xóa bàn cuối
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveGroup(group.id)}
                              disabled={groups.length <= 1}
                              className="cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                            >
                              <Trash2 className="size-3.5 mr-2 text-rose-600" /> Xóa tổ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Danh sách Bàn trong Tổ (Xếp dọc từ trên xuống) */}
                    <div className="space-y-3">
                      {group.desks.map((desk, deskIdx) => {
                        const isFourSeats = desk.seatCapacity === 4

                        return (
                          <div
                            key={desk.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-slate-300 transition"
                          >
                            {/* Tiêu đề bàn + đổi số ghế */}
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Armchair className="size-3.5 text-teal-600" />
                                {desk.name || `Bàn ${deskIdx + 1}`}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDeskCapacity(group.id, desk.id, isFourSeats ? 2 : 4)}
                                  className="text-[10px] font-semibold text-slate-500 hover:text-teal-700 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-teal-50 transition cursor-pointer"
                                  title="Chuyển đổi giữa 2 ghế và 4 ghế"
                                >
                                  {isFourSeats ? 'Bàn 4 ghế' : 'Bàn 2 ghế'}
                                </button>
                              </div>
                            </div>

                            {/* Lưới ghế ngồi của bàn */}
                            <div className={`grid gap-1.5 ${isFourSeats ? 'grid-cols-2' : 'grid-cols-2'}`}>
                              {Array.from({ length: desk.seatCapacity }, (_, pos) => {
                                const seat = desk.seats.find((s) => s.position === pos)
                                const student = seat?.studentId
                                  ? currentStudents.find((s: any) => s.id === seat.studentId)
                                  : null
                                const isTargetHighlighted = Boolean(selectedStudentId && !seat?.studentId)
                                const isCurrentSelected = Boolean(selectedStudentId && seat?.studentId === selectedStudentId)

                                const initials = student?.initials || student?.fullName?.slice(0, 2)?.toUpperCase() || student?.name?.slice(0, 2)?.toUpperCase() || 'HS'

                                return (
                                  <div
                                    key={pos}
                                    onClick={() => handleSeatClick(group.id, desk.id, pos)}
                                    className={`relative min-h-[58px] p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                                      student
                                        ? isCurrentSelected
                                          ? 'border-teal-500 bg-teal-50/90 text-teal-900 font-bold ring-1 ring-teal-400'
                                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-800'
                                        : isTargetHighlighted
                                        ? 'border-dashed border-teal-400 bg-teal-50/50 hover:bg-teal-100/60 animate-pulse'
                                        : 'border-dashed border-slate-250 bg-white hover:border-teal-300 hover:bg-slate-50/60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                                      <span>G{pos + 1}</span>
                                      {student && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleClearSeat(e, group.id, desk.id, pos)}
                                          className="size-4 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 grid place-items-center transition"
                                          title="Bỏ xếp học sinh này"
                                        >
                                          <X className="size-2.5" />
                                        </button>
                                      )}
                                    </div>

                                    {student ? (
                                      <div className="flex items-center gap-1.5 min-w-0 mt-1">
                                        <span className="size-5 rounded-full bg-teal-100 text-teal-800 text-[9px] font-bold grid place-items-center shrink-0">
                                          {initials}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900 truncate" title={student.fullName || student.name}>
                                          {student.fullName || student.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] font-medium text-slate-400 italic">
                                        {isTargetHighlighted ? 'Chọn ghế này' : 'Trống'}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RENAME GROUP DIALOG */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Đổi tên tổ</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nhập tên mới cho tổ (Ví dụ: Tổ 1, Nhóm Sao Vàng, ...).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="text-xs font-semibold text-slate-700">Tên tổ</Label>
            <Input
              value={editingGroupName}
              onChange={(e) => setEditingGroupName(e.target.value)}
              placeholder="Ví dụ: TỔ 1"
              className="mt-1.5 h-9 text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenameDialogOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button size="sm" onClick={handleSaveRename} className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}