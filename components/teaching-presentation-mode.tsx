'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dice5,
  Eye,
  FileText,
  Gamepad2,
  Hourglass,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Presentation,
  RotateCcw,
  Sparkles,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLessonPlanById, type LessonPlan, type Activity } from '@/services/lesson-service'
import { getStudents, type StudentRecord } from '@/services/student-service'
import { ResourceViewer, type PlaylistItem } from '@/components/resources/resource-viewer'
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary'
import { detectResourceType } from '@/services/resource-service'
import { toast } from 'sonner'

export interface TeachingSessionContext {
  lessonPlanId: string
  scheduleId?: string
  classroomId?: string
  classroomName?: string
  subjectName?: string
  lessonTitle?: string
  date?: string
  startTime?: string
  endTime?: string
}

export function TeachingPresentationMode(props: {
  session: TeachingSessionContext
  onClose: () => void
  onFinish?: () => void
}) {
  return (
    <ResourceErrorBoundary
      fallbackTitle="Đã xảy ra sự cố trong chế độ tiết dạy."
      onClose={props.onClose}
    >
      <TeachingPresentationModeInner {...props} />
    </ResourceErrorBoundary>
  )
}

function TeachingPresentationModeInner({
  session,
  onClose,
  onFinish,
}: {
  session: TeachingSessionContext
  onClose: () => void
  onFinish?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  // Lesson Plan State
  const [lesson, setLesson] = useState<LessonPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({})

  // View mode inside teaching session
  const [stageMode, setStageMode] = useState<'ACTIVITY_SCRIPT' | 'RESOURCE_VIEWER' | 'FULL_LESSON_PLAN'>('ACTIVITY_SCRIPT')
  const [peekScriptOpen, setPeekScriptOpen] = useState(false)

  // Playlist & Active Resource
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [activeResourceIndex, setActiveResourceIndex] = useState(0)

  // Classroom Students
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ─── QUICK TOOLS STATE ─────────────────────────────────────────────────────
  // 1. Clock (isolated state)
  const [timeStr, setTimeStr] = useState('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Countdown Timer
  const [timerModalOpen, setTimerModalOpen] = useState(false)
  const [timerDuration, setTimerDuration] = useState(120) // 2 minutes default
  const [timeLeft, setTimeLeft] = useState(120)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!)
            setIsTimerRunning(false)
            toast.info('🔔 Hết thời gian đếm ngược!', { duration: 5000 })
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
              audio.play().catch(() => undefined)
            } catch {}
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [isTimerRunning, timeLeft])

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // 3. Random Student Picker
  const [randomPickerOpen, setRandomPickerOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)

  const pickRandomStudent = () => {
    if (students.length === 0) {
      toast.error('Không tìm thấy danh sách học sinh trong lớp')
      return
    }
    setIsSpinning(true)
    let rollCount = 0
    const maxRolls = 20
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * students.length)
      setSelectedStudent(students[randIdx])
      rollCount++
      if (rollCount >= maxRolls) {
        clearInterval(interval)
        setIsSpinning(false)
      }
    }, 100)
  }

  // ─── LOAD LESSON PLAN & STUDENTS (STABLE DEPENDENCY) ──────────────────────
  const { lessonPlanId, classroomId } = session
  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    setError(null)

    getLessonPlanById(lessonPlanId)
      .then((fullPlan) => {
        if (!mountedRef.current) return
        setLesson(fullPlan)

        // Build presentation playlist from attached resources & games
        const items: PlaylistItem[] = []

        if (Array.isArray(fullPlan.resources)) {
          for (const item of fullPlan.resources) {
            const res = (item as any).resource || item
            if (res && res.id) {
              items.push({
                id: res.id,
                title: res.name || res.title || 'Học liệu bài dạy',
                type: detectResourceType(res),
                resource: res,
              })
            }
          }
        }

        if (Array.isArray(fullPlan.htmlGames)) {
          for (const item of fullPlan.htmlGames) {
            const g = (item as any).htmlGame || item
            if (g && g.id) {
              items.push({
                id: g.id,
                title: g.title || 'Trò chơi học tập',
                type: 'HTML_GAME',
                game: g,
              })
            }
          }
        }

        const teacherGames = (fullPlan as any).teacherHtmlGames
        if (Array.isArray(teacherGames)) {
          for (const item of teacherGames) {
            const tg = (item as any).teacherHtmlGame || item
            if (tg && tg.id) {
              items.push({
                id: tg.id,
                title: tg.title || tg.htmlGame?.title || 'Trò chơi học tập tùy biến',
                type: 'HTML_GAME',
                game: tg.htmlGame || tg,
                customGameId: tg.id,
              })
            }
          }
        }

        setPlaylist(items)

        // Load students for target classroom
        const targetClassId = classroomId || fullPlan.classroomId
        if (targetClassId) {
          setLoadingStudents(true)
          getStudents({ classroomId: targetClassId })
            .then((res: any) => {
              if (!mountedRef.current) return
              const rawList = res?.items || res?.students || []
              const activeStudents = rawList.filter((s: any) => s.status !== 'TRANSFER_OUT')
              setStudents(activeStudents)
            })
            .catch(() => undefined)
            .finally(() => {
              if (mountedRef.current) setLoadingStudents(false)
            })
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return
        setError(err?.message || 'Không thể tải kế hoạch bài dạy')
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [lessonPlanId, classroomId])

  // Fullscreen toggle (Safe Browser & Desktop)
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current || typeof document === 'undefined') return
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
          setIsFullscreen(true)
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    } catch {
      setIsFullscreen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Handle Exit Confirmation
  const handleExit = () => {
    if (window.confirm('Bạn có chắc chắn muốn thoát chế độ trình chiếu tiết dạy?')) {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined)
      }
      onClose()
    }
  }

  // Handle Finish Lesson
  const handleFinishLesson = () => {
    if (window.confirm('Xác nhận hoàn thành tiết dạy và lưu tiến trình?')) {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined)
      }
      toast.success('🎉 Tiết dạy đã hoàn thành xuất sắc!')
      if (onFinish) {
        onFinish()
      } else {
        onClose()
      }
    }
  }

  const activities = lesson?.activities || []
  const currentActivity: Activity | undefined = activities[currentActivityIndex]

  // Activity Nav handlers
  const handleNextActivity = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1)
      setStageMode('ACTIVITY_SCRIPT')
    }
  }

  const handlePrevActivity = () => {
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex(currentActivityIndex - 1)
      setStageMode('ACTIVITY_SCRIPT')
    }
  }

  const toggleActivityDone = (actId: string) => {
    setCompletedActivities((prev) => ({ ...prev, [actId]: !prev[actId] }))
  }

  const handleLaunchResource = (index: number) => {
    setActiveResourceIndex(index)
    setStageMode('RESOURCE_VIEWER')
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans"
    >
      {/* 1. TOP HEADER (Distraction-Free Classroom Bar) */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExit}
            className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 h-8 font-semibold cursor-pointer"
            title="Thoát chế độ tiết dạy"
          >
            <ArrowLeft className="size-4" />
            <span className="text-xs">Thoát</span>
          </Button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-teal-400 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded-md shrink-0">
              {session.subjectName || lesson?.subject || 'Môn học'}
            </span>
            <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
              {session.classroomName || lesson?.grade || 'Lớp'}
            </span>
            <h1 className="text-sm font-bold text-white truncate max-w-[240px] sm:max-w-md" title={lesson?.title || session.lessonTitle}>
              {lesson?.title || session.lessonTitle || 'Tiết dạy'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-xs font-mono font-bold text-slate-200">
            <Clock className="size-3.5 text-teal-400" />
            <span>{timeStr}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimerModalOpen(true)}
            className={`text-xs h-8 gap-1.5 font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer ${
              isTimerRunning ? 'border-amber-500/80 text-amber-300 animate-pulse' : ''
            }`}
            title="Mở đồng hồ đếm ngược"
          >
            <Hourglass className="size-3.5 text-amber-400" />
            <span>{isTimerRunning ? formatTimer(timeLeft) : 'Đếm ngược'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRandomPickerOpen(true)
              if (!selectedStudent && students.length > 0) {
                pickRandomStudent()
              }
            }}
            className="text-xs h-8 gap-1.5 font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
            title="Chọn học sinh ngẫu nhiên"
          >
            <Dice5 className="size-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Gọi ngẫu nhiên</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 h-8 cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </header>

      {/* 2. ACTIVITY TABS & STAGE SWITCHER */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 overflow-x-auto gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {activities.map((act, idx) => {
            const isCurrent = idx === currentActivityIndex && stageMode !== 'FULL_LESSON_PLAN'
            const isDone = completedActivities[act.id]
            return (
              <button
                key={act.id}
                onClick={() => {
                  setCurrentActivityIndex(idx)
                  setStageMode('ACTIVITY_SCRIPT')
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isCurrent
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleActivityDone(act.id)
                  }}
                  className="hover:scale-110 transition"
                  title={isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-3.5 text-emerald-300" />
                  ) : (
                    <span className="size-3.5 rounded-full border border-slate-400 inline-block" />
                  )}
                </span>
                <span>
                  {idx + 1}. {act.phase || act.title}
                </span>
                <span className="text-[10px] opacity-75 font-mono">({act.minutes || 5}p)</span>
              </button>
            )
          })}

          <button
            onClick={() => setStageMode('FULL_LESSON_PLAN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              stageMode === 'FULL_LESSON_PLAN'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="size-3.5" /> Toàn bộ giáo án
          </button>
        </div>

        {playlist.length > 0 && (
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setStageMode('ACTIVITY_SCRIPT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                stageMode === 'ACTIVITY_SCRIPT' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kịch bản
            </button>
            <button
              onClick={() => setStageMode('RESOURCE_VIEWER')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                stageMode === 'RESOURCE_VIEWER' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Presentation className="size-3.5" /> Trình chiếu ({playlist.length})
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN PRESENTATION STAGE */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-slate-950 flex flex-col">
        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400">
            <Loader2 className="size-10 animate-spin text-teal-500" />
            <p className="text-sm">Đang tải giáo án và tài nguyên bài học...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center text-slate-300">
            <AlertCircle className="size-12 text-rose-500" />
            <p className="text-base font-bold text-white">{error}</p>
            <Button size="sm" onClick={onClose} className="mt-2 bg-slate-800 text-white hover:bg-slate-700 cursor-pointer">
              Quay lại danh sách
            </Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ─── MODE A: ACTIVITY SCRIPT ─────────────────────────────────── */}
            {stageMode === 'ACTIVITY_SCRIPT' && currentActivity && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
                <div className="w-full max-w-5xl flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold">
                          {currentActivity.phase}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ⏱ {currentActivity.minutes || 5} phút
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white">{currentActivity.title}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => toggleActivityDone(currentActivity.id)}
                        className={`gap-1.5 font-semibold text-xs cursor-pointer ${
                          completedActivities[currentActivity.id]
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <CheckCircle className="size-4" />
                        {completedActivities[currentActivity.id] ? 'Đã hoàn thành' : 'Đánh dấu xong'}
                      </Button>
                    </div>
                  </div>

                  {(currentActivity.objective || currentActivity.equipment) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentActivity.objective && (
                        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs leading-relaxed">
                          <p className="font-bold text-teal-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Sparkles className="size-3.5" /> Mục tiêu hoạt động
                          </p>
                          <p className="text-slate-300">{currentActivity.objective}</p>
                        </div>
                      )}
                      {currentActivity.equipment && (
                        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs leading-relaxed">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Layers className="size-3.5" /> Đồ dùng & Thiết bị
                          </p>
                          <p className="text-slate-300">{currentActivity.equipment}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {playlist.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Presentation className="size-4 text-teal-400" /> Tài nguyên trình chiếu bài học
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">{playlist.length} tài nguyên</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {playlist.map((item, pIdx) => (
                          <button
                            key={item.id}
                            onClick={() => handleLaunchResource(pIdx)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition text-left cursor-pointer group"
                          >
                            <div className="p-2.5 rounded-lg bg-slate-900 text-teal-400 group-hover:scale-110 transition shrink-0">
                              {item.type === 'POWERPOINT' && <Presentation className="size-5 text-orange-400" />}
                              {item.type === 'VIDEO' && <Video className="size-5 text-violet-400" />}
                              {item.type === 'HTML_GAME' && <Gamepad2 className="size-5 text-amber-400" />}
                              {item.type === 'IMAGE' && <ImageIcon className="size-5 text-teal-400" />}
                              {item.type === 'PDF' && <FileText className="size-5 text-rose-400" />}
                              {item.type === 'WORD' && <FileText className="size-5 text-blue-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate group-hover:text-teal-300">
                                {item.title}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">{item.type}</span>
                            </div>
                            <Play className="size-4 text-slate-500 group-hover:text-white shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                        <span className="size-2 rounded-full bg-teal-500" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400">
                          Hoạt động của Giáo viên
                        </h4>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line pt-2">
                        {currentActivity.teacher || 'Chưa có mô tả kịch bản GV.'}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                        <span className="size-2 rounded-full bg-blue-500" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-blue-400">
                          Hoạt động của Học sinh
                        </h4>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line pt-2">
                        {currentActivity.students || 'Chưa có mô tả hoạt động HS.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── MODE B: RESOURCE VIEWER (EMBEDDED FULL STAGE) ──────────── */}
            {stageMode === 'RESOURCE_VIEWER' && (
              <div className="relative flex-1 w-full h-full min-h-0 flex flex-col">
                <ResourceViewer
                  isEmbedded={true}
                  playlist={playlist}
                  currentIndex={activeResourceIndex}
                  onIndexChange={setActiveResourceIndex}
                  onClose={() => setStageMode('ACTIVITY_SCRIPT')}
                />

                <div className="absolute bottom-4 left-4 z-40">
                  <Button
                    size="sm"
                    onClick={() => setPeekScriptOpen(!peekScriptOpen)}
                    className="gap-1.5 text-xs font-semibold bg-slate-900/90 text-slate-200 hover:bg-slate-800 border border-slate-700 shadow-xl backdrop-blur-md cursor-pointer"
                  >
                    <BookOpen className="size-3.5 text-teal-400" />
                    {peekScriptOpen ? 'Ẩn kịch bản GV' : '📄 Xem kịch bản GV'}
                  </Button>
                </div>

                {peekScriptOpen && currentActivity && (
                  <div className="absolute bottom-14 left-4 z-40 w-96 max-h-[60vh] bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl overflow-y-auto text-xs space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-teal-400">{currentActivity.phase}: {currentActivity.title}</span>
                      <button onClick={() => setPeekScriptOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-teal-300">Hoạt động GV:</p>
                      <p className="text-slate-300 whitespace-pre-line mt-1">{currentActivity.teacher || ''}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-300">Hoạt động HS:</p>
                      <p className="text-slate-300 whitespace-pre-line mt-1">{currentActivity.students || ''}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── MODE C: FULL LESSON PLAN VIEW ─────────────────────────── */}
            {stageMode === 'FULL_LESSON_PLAN' && lesson && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-950">
                <div className="w-full max-w-4xl bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl space-y-6 text-xs">
                  <div className="text-center pb-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900">Kế hoạch bài dạy</h2>
                    <h3 className="text-base font-bold text-teal-800 mt-1">{lesson.title}</h3>
                    <p className="text-slate-500 mt-1 font-medium">{lesson.subject} · {lesson.grade} · {lesson.duration || 40} phút</p>
                  </div>

                  {lesson.objective && (
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 uppercase">I. Yêu cầu cần đạt</h4>
                      <p className="text-slate-700 leading-relaxed pl-3">{lesson.objective}</p>
                    </div>
                  )}

                  {lesson.teachingEquipment && (
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 uppercase">II. Đồ dùng dạy học</h4>
                      <p className="text-slate-700 leading-relaxed pl-3">{lesson.teachingEquipment}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase">III. Tiến trình dạy học</h4>
                    <div className="space-y-3">
                      {activities.map((act, i) => (
                        <div key={act.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                          <p className="font-bold text-teal-800 text-sm">
                            {i + 1}. {act.phase}: {act.title} ({act.minutes || 5} phút)
                          </p>
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <p className="font-semibold text-slate-700">GV:</p>
                              <p className="text-slate-600 whitespace-pre-line">{act.teacher || ''}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700">HS:</p>
                              <p className="text-slate-600 whitespace-pre-line">{act.students || ''}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 4. BOTTOM ACTION TOOLBAR */}
      <footer className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-t border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevActivity}
            disabled={currentActivityIndex <= 0}
            className="text-xs h-8 gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Hoạt động trước</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleNextActivity}
            disabled={currentActivityIndex >= activities.length - 1}
            className="text-xs h-8 gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
          >
            <span className="hidden sm:inline">Hoạt động tiếp</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {currentActivity && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span>Tiến trình:</span>
            <strong className="text-white">
              {currentActivityIndex + 1}/{activities.length}: {currentActivity.phase}
            </strong>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleFinishLesson}
            className="text-xs h-8 gap-1.5 bg-teal-600 hover:bg-teal-700 font-bold text-white shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="size-4" />
            <span>Kết thúc tiết dạy</span>
          </Button>
        </div>
      </footer>

      {/* MODAL 1: COUNTDOWN TIMER DIALOG */}
      {timerModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Hourglass className="size-4 text-amber-400" /> Đồng hồ đếm ngược
              </h3>
              <button onClick={() => setTimerModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="size-4" />
              </button>
            </div>

            <div className="text-5xl font-extrabold font-mono text-amber-400 tracking-wider py-4">
              {formatTimer(timeLeft)}
            </div>

            <div className="grid grid-cols-4 gap-2 w-full">
              {[60, 120, 180, 300].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setTimeLeft(sec)
                    setTimerDuration(sec)
                    setIsTimerRunning(false)
                  }}
                  className={`py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    timerDuration === sec
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {sec / 60} phút
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsTimerRunning(false)
                  setTimeLeft(timerDuration)
                }}
                className="flex-1 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="size-3.5" /> Đặt lại
              </Button>
              <Button
                size="sm"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-1 gap-1.5 text-xs font-bold text-white shadow-lg cursor-pointer ${
                  isTimerRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isTimerRunning ? 'Tạm dừng' : 'Bắt đầu đếm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RANDOM STUDENT PICKER DIALOG */}
      {randomPickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Dice5 className="size-4 text-indigo-400" /> Gọi học sinh ngẫu nhiên
              </h3>
              <button onClick={() => setRandomPickerOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="size-4" />
              </button>
            </div>

            <div className="py-6 flex flex-col items-center gap-3 w-full">
              {selectedStudent ? (
                <div className={`p-6 rounded-2xl border w-full transition-all ${
                  isSpinning
                    ? 'bg-slate-800 border-slate-700 scale-95 opacity-75'
                    : 'bg-indigo-950/60 border-indigo-500/60 scale-105 shadow-2xl ring-4 ring-indigo-500/20'
                }`}>
                  <div className="size-16 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-xl flex items-center justify-center mx-auto mb-2 border border-indigo-500/40">
                    {selectedStudent.fullName?.split(' ').pop()?.[0] || 'HS'}
                  </div>
                  <h4 className="text-xl font-extrabold text-white">{selectedStudent.fullName || 'Học sinh'}</h4>
                  <p className="text-xs text-indigo-300 font-mono mt-0.5">Mã HS: {selectedStudent.studentCode || '—'}</p>
                </div>
              ) : (
                <div className="p-8 text-slate-400 text-xs">
                  {loadingStudents ? 'Đang tải danh sách học sinh...' : 'Bấm nút bên dưới để chọn ngẫu nhiên học sinh'}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full">
              <Button
                size="sm"
                onClick={pickRandomStudent}
                disabled={isSpinning || students.length === 0}
                className="w-full gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg py-2 h-9 cursor-pointer"
              >
                <Dice5 className={`size-4 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning ? 'Đang chọn...' : 'Quay ngẫu nhiên'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
