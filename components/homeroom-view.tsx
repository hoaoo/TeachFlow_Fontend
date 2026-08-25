'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  School,
  Users,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Cake,
  Award,
  Sparkles,
  ClipboardList,
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  ChevronRight,
  Clock,
  ThumbsUp,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Loader2,
  FileDown,
  Info,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getHomeroomDashboard,
  getMyHomeroomClasses,
  getBehaviorRecords,
  createBehaviorRecord,
  updateBehaviorRecord,
  deleteBehaviorRecord,
  getWeeklySummary,
  getWeeklyReview,
  saveWeeklyReview,
  getMonthlySummary,
  getMonthlyReview,
  saveMonthlyReview,
  exportWeeklyReviewFile,
  exportMonthlySummaryFile,
  type HomeroomDashboardData,
  type BehaviorRecord,
  type WeeklySummaryData,
  type WeeklyReviewData,
  type MonthlySummaryData,
  type MonthlyReviewData,
} from '@/services/homeroom-service';
import { generateHomeroomSummary } from '@/services/ai-service';
import { toggleTask as apiToggleTask } from '@/services/dashboard-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const QUICK_POSITIVE_SUGGESTIONS = [
  'Tích cực phát biểu',
  'Hoàn thành tốt nhiệm vụ',
  'Hợp tác tốt với bạn',
  'Có tinh thần giúp đỡ bạn',
  'Chuẩn bị bài đầy đủ',
  'Có tiến bộ rõ rệt',
];

const QUICK_REMINDER_SUGGESTIONS = [
  'Cần tập trung hơn trong giờ học',
  'Chưa chuẩn bị bài đầy đủ',
  'Cần giữ trật tự trong giờ',
  'Cần hoàn thành nhiệm vụ đúng thời gian',
  'Cần chủ động tham gia hoạt động nhóm',
];

const CATEGORY_MAP: Record<string, string> = {
  DISCIPLINE: 'Kỷ luật & Trật tự',
  LEARNING: 'Học tập',
  HYGIENE: 'Vệ sinh & Tác phong',
  TEAMWORK: 'Làm việc nhóm',
  RESPONSIBILITY: 'Trách nhiệm',
  OTHER: 'Khác',
};

export function HomeroomView({ initialTab = 'overview', onNavigate }: { initialTab?: 'overview' | 'behavior' | 'weekly' | 'monthly'; onNavigate?: (view: any) => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'weekly' | 'monthly'>(initialTab);
  const [classList, setClassList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<HomeroomDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [homeroomState, setHomeroomState] = useState<'loading' | 'empty' | 'error' | 'success'>('loading');
  const [homeroomError, setHomeroomError] = useState('');

  // Behavior Tab State
  const [behaviorList, setBehaviorList] = useState<BehaviorRecord[]>([]);
  const [behaviorTotal, setBehaviorTotal] = useState(0);
  const [behaviorPage, setBehaviorPage] = useState(1);
  const [behaviorPageSize, setBehaviorPageSize] = useState(10);
  const [behaviorCategory, setBehaviorCategory] = useState('ALL');
  const [behaviorLevel, setBehaviorLevel] = useState('ALL');
  const [behaviorSearch, setBehaviorSearch] = useState('');
  const [loadingBehavior, setLoadingBehavior] = useState(false);

  // Behavior Create/Edit Modal
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<BehaviorRecord | null>(null);
  const [behaviorFormStudentId, setBehaviorFormStudentId] = useState('');
  const [behaviorFormDate, setBehaviorFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [behaviorFormCategory, setBehaviorFormCategory] = useState('LEARNING');
  const [behaviorFormLevel, setBehaviorFormLevel] = useState('POSITIVE');
  const [behaviorFormContent, setBehaviorFormContent] = useState('');
  const [submittingBehavior, setSubmittingBehavior] = useState(false);

  // Delete Confirmation Modal
  const [recordToDelete, setRecordToDelete] = useState<BehaviorRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  // Weekly Tab State
  const [selectedWeek, setSelectedWeek] = useState<number>(3);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData | null>(null);
  const [weeklyStrengths, setWeeklyStrengths] = useState('');
  const [weeklyLimitations, setWeeklyLimitations] = useState('');
  const [weeklyNextPlan, setWeeklyNextPlan] = useState('');
  const [weeklyVersion, setWeeklyVersion] = useState(1);
  const [weeklyIsDirty, setWeeklyIsDirty] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [exportingWeeklyDocx, setExportingWeeklyDocx] = useState(false);
  const [exportingWeeklyPdf, setExportingWeeklyPdf] = useState(false);

  // Monthly Tab State
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryData | null>(null);
  const [monthlyHighlights, setMonthlyHighlights] = useState('');
  const [monthlyLimitations, setMonthlyLimitations] = useState('');
  const [monthlyNextPlan, setMonthlyNextPlan] = useState('');
  const [monthlyVersion, setMonthlyVersion] = useState(1);
  const [monthlyIsDirty, setMonthlyIsDirty] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [exportingMonthlyDocx, setExportingMonthlyDocx] = useState(false);
  const [exportingMonthlyPdf, setExportingMonthlyPdf] = useState(false);
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiStrengths, setAiStrengths] = useState('');
  const [aiConcerns, setAiConcerns] = useState('');
  const [aiNextSteps, setAiNextSteps] = useState('');

  const handleGenerateAiSummary = async () => {
    if (!selectedClassId) return;
    setGeneratingAiSummary(true);
    try {
      const result = await generateHomeroomSummary({
        classroomId: selectedClassId,
        period: activeTab === 'monthly' ? 'MONTH' : 'WEEK',
        weekNumber: selectedWeek,
      });
      setAiSummary(result?.summary || '');
      setAiStrengths(result?.strengths || '');
      setAiConcerns(result?.concerns || '');
      setAiNextSteps(result?.nextSteps || '');
      setAiModalOpen(true);
      toast.success('Đã tổng hợp phân tích AI thành công!');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo bản nháp AI');
    } finally {
      setGeneratingAiSummary(false);
    }
  };

  const handleCopyAiSummary = () => {
    const text = [
      `=== TỔNG HỢP SƯ PHẠM CHỦ NHIỆM (AI) ===`,
      `Đánh giá chung:\n${aiSummary}`,
      `Ưu điểm nổi bật:\n${aiStrengths}`,
      `Tồn tại / Cần lưu ý:\n${aiConcerns}`,
      `Phương hướng / Kế hoạch:\n${aiNextSteps}`,
    ].join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép toàn bộ nội dung gợi ý AI vào bộ nhớ tạm');
  };

  const handleApplyAiSummary = () => {
    if (activeTab === 'monthly') {
      if (aiStrengths) setMonthlyHighlights(aiStrengths);
      if (aiConcerns) setMonthlyLimitations(aiConcerns);
      if (aiNextSteps) setMonthlyNextPlan(aiNextSteps);
      setMonthlyIsDirty(true);
      toast.success('Đã áp dụng nội dung AI vào biểu mẫu tổng kết tháng!');
    } else {
      toast.success('Đã áp dụng gợi ý AI vào kế hoạch chủ nhiệm!');
    }
    setAiModalOpen(false);
  };

  // 1. Initial Load Classes
  useEffect(() => {
    getMyHomeroomClasses()
      .then((res) => {
        if (!res.hasHomeroomClass || res.classes.length === 0) {
          setClassList([]);
          setSelectedClassId('');
          setDashboardData(null);
          setHomeroomState('empty');
          setLoadingDashboard(false);
          return;
        }
        setClassList(res.classes.map((c) => ({ id: c.id, name: c.name })));
        setSelectedClassId(res.classes[0].id);
      })
      .catch((err) => {
        setHomeroomError(err?.message || 'Không thể tải danh sách lớp chủ nhiệm');
        setHomeroomState('error');
        setLoadingDashboard(false);
      });
  }, []);

  // 2. Load Dashboard when class changes
  const fetchDashboard = async (classId: string) => {
    if (!classId) return;
    setLoadingDashboard(true);
    setHomeroomState('loading');
    try {
      const data = await getHomeroomDashboard(classId);
      if (!data.hasHomeroomClass || !data.classroom) {
        setDashboardData(null);
        setHomeroomState('empty');
        return;
      }
      setDashboardData(data);
      setHomeroomState('success');
    } catch (err: any) {
      setHomeroomError(err.message || 'Lỗi tải dữ liệu bảng điều khiển chủ nhiệm');
      setHomeroomState('error');
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) fetchDashboard(selectedClassId);
  }, [selectedClassId]);

  // 3. Load Behavior Records
  const fetchBehavior = async () => {
    if (!selectedClassId) return;
    setLoadingBehavior(true);
    try {
      const res = await getBehaviorRecords({
        classId: selectedClassId,
        category: behaviorCategory,
        level: behaviorLevel,
        search: behaviorSearch,
        page: behaviorPage,
        pageSize: behaviorPageSize,
      });
      setBehaviorList(res.data);
      setBehaviorTotal(res.total);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải danh sách nề nếp');
    } finally {
      setLoadingBehavior(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'behavior') {
      fetchBehavior();
    }
  }, [activeTab, selectedClassId, behaviorCategory, behaviorLevel, behaviorPage, behaviorPageSize]);

  // 4. Load Weekly Review & Summary
  const fetchWeekly = async () => {
    if (!selectedClassId) return;
    setLoadingWeekly(true);
    try {
      const [sum, rev] = await Promise.all([
        getWeeklySummary(selectedClassId, selectedWeek),
        getWeeklyReview(selectedClassId, selectedWeek),
      ]);
      setWeeklySummary(sum);
      if (rev) {
        setWeeklyStrengths(rev.strengths || '');
        setWeeklyLimitations(rev.limitations || '');
        setWeeklyNextPlan(rev.nextWeekPlan || '');
        setWeeklyVersion(rev.version || 1);
      } else {
        setWeeklyStrengths('');
        setWeeklyLimitations('');
        setWeeklyNextPlan('');
        setWeeklyVersion(1);
      }
      setWeeklyIsDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải nhận xét tuần');
    } finally {
      setLoadingWeekly(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'weekly') {
      fetchWeekly();
    }
  }, [activeTab, selectedClassId, selectedWeek]);

  // 5. Load Monthly Summary & Review
  const fetchMonthly = async () => {
    if (!selectedClassId) return;
    setLoadingMonthly(true);
    try {
      const [sum, rev] = await Promise.all([
        getMonthlySummary(selectedClassId, selectedYear, selectedMonth),
        getMonthlyReview(selectedClassId, selectedYear, selectedMonth),
      ]);
      setMonthlySummary(sum);
      if (rev) {
        setMonthlyHighlights(rev.highlights || '');
        setMonthlyLimitations(rev.limitations || '');
        setMonthlyNextPlan(rev.nextMonthPlan || '');
        setMonthlyVersion(rev.version || 1);
      } else {
        setMonthlyHighlights('');
        setMonthlyLimitations('');
        setMonthlyNextPlan('');
        setMonthlyVersion(1);
      }
      setMonthlyIsDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải tổng kết tháng');
    } finally {
      setLoadingMonthly(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthly();
    }
  }, [activeTab, selectedClassId, selectedYear, selectedMonth]);

  // Behavior Actions
  const handleOpenAddBehavior = (presetStudentId = '') => {
    setEditingBehavior(null);
    setBehaviorFormStudentId(presetStudentId || dashboardData?.students[0]?.id || '');
    setBehaviorFormDate(new Date().toISOString().split('T')[0]);
    setBehaviorFormCategory('LEARNING');
    setBehaviorFormLevel('POSITIVE');
    setBehaviorFormContent('');
    setShowBehaviorModal(true);
  };

  const handleOpenEditBehavior = (rec: BehaviorRecord) => {
    setEditingBehavior(rec);
    setBehaviorFormStudentId(rec.studentId);
    setBehaviorFormDate(rec.recordDate);
    setBehaviorFormCategory(rec.category);
    setBehaviorFormLevel(rec.level);
    setBehaviorFormContent(rec.content);
    setShowBehaviorModal(true);
  };

  const handleSaveBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!behaviorFormStudentId) {
      toast.error('Vui lòng chọn học sinh');
      return;
    }
    if (!behaviorFormContent.trim()) {
      toast.error('Vui lòng nhập nội dung ghi nhận');
      return;
    }

    setSubmittingBehavior(true);
    try {
      if (editingBehavior) {
        await updateBehaviorRecord(editingBehavior.id, {
          recordDate: behaviorFormDate,
          category: behaviorFormCategory,
          level: behaviorFormLevel,
          content: behaviorFormContent.trim(),
        });
        toast.success('Cập nhật ghi nhận nề nếp thành công');
      } else {
        await createBehaviorRecord({
          classroomId: selectedClassId,
          studentId: behaviorFormStudentId,
          recordDate: behaviorFormDate,
          category: behaviorFormCategory,
          level: behaviorFormLevel,
          content: behaviorFormContent.trim(),
        });
        toast.success('Thêm ghi nhận nề nếp thành công');
      }
      setShowBehaviorModal(false);
      fetchBehavior();
      fetchDashboard(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu ghi nhận nề nếp');
    } finally {
      setSubmittingBehavior(false);
    }
  };

  const handleDeleteBehavior = async () => {
    if (!recordToDelete) return;
    setDeletingRecord(true);
    try {
      await deleteBehaviorRecord(recordToDelete.id);
      toast.success('Đã xóa ghi nhận nề nếp');
      setRecordToDelete(null);
      fetchBehavior();
      fetchDashboard(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa ghi nhận');
    } finally {
      setDeletingRecord(false);
    }
  };

  // Weekly Save & Exports
  const handleSaveWeekly = async () => {
    setSavingWeekly(true);
    try {
      const res = await saveWeeklyReview({
        classroomId: selectedClassId,
        weekNumber: selectedWeek,
        strengths: weeklyStrengths,
        limitations: weeklyLimitations,
        nextWeekPlan: weeklyNextPlan,
        version: weeklyVersion,
      });
      setWeeklyVersion(res.version);
      setWeeklyIsDirty(false);
      toast.success(`Đã lưu nhận xét tuần ${selectedWeek}`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu nhận xét tuần');
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleExportWeekly = async (format: 'docx' | 'pdf') => {
    if (format === 'docx') setExportingWeeklyDocx(true);
    else setExportingWeeklyPdf(true);
    try {
      await exportWeeklyReviewFile(selectedClassId, selectedWeek, format);
      toast.success(`Đã tải xuống báo cáo tuần (${format.toUpperCase()})`);
    } catch (err: any) {
      toast.error(err.message || `Lỗi xuất file ${format.toUpperCase()}`);
    } finally {
      if (format === 'docx') setExportingWeeklyDocx(false);
      else setExportingWeeklyPdf(false);
    }
  };

  // Monthly Save & Exports
  const handleSaveMonthly = async () => {
    setSavingMonthly(true);
    try {
      const res = await saveMonthlyReview({
        classroomId: selectedClassId,
        year: selectedYear,
        month: selectedMonth,
        highlights: monthlyHighlights,
        limitations: monthlyLimitations,
        nextMonthPlan: monthlyNextPlan,
        version: monthlyVersion,
      });
      setMonthlyVersion(res.version);
      setMonthlyIsDirty(false);
      toast.success(`Đã lưu tổng kết tháng ${selectedMonth}/${selectedYear}`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu tổng kết tháng');
    } finally {
      setSavingMonthly(false);
    }
  };

  const handleExportMonthly = async (format: 'docx' | 'pdf') => {
    if (format === 'docx') setExportingMonthlyDocx(true);
    else setExportingMonthlyPdf(true);
    try {
      await exportMonthlySummaryFile(selectedClassId, selectedYear, selectedMonth, format);
      toast.success(`Đã tải xuống báo cáo tháng (${format.toUpperCase()})`);
    } catch (err: any) {
      toast.error(err.message || `Lỗi xuất file ${format.toUpperCase()}`);
    } finally {
      if (format === 'docx') setExportingMonthlyDocx(false);
      else setExportingMonthlyPdf(false);
    }
  };

  // Toggle Task on Dashboard
  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    if (!dashboardData) return;
    const nextDone = !currentDone;
    setDashboardData({
      ...dashboardData,
      weeklyTasks: dashboardData.weeklyTasks.map((t) => (t.id === taskId ? { ...t, done: nextDone } : t)),
    });
    if (taskId && !taskId.startsWith('task-')) {
      await apiToggleTask(taskId, nextDone);
    }
  };

  if (homeroomState === 'loading') {
    return (
      <div className="space-y-5" aria-label="Đang tải dữ liệu chủ nhiệm">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (homeroomState === 'empty') {
    return (
      <div className="flex min-h-[460px] items-center justify-center">
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-teal-50 text-teal-700">
            <School className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {'Bạn chưa thiết lập lớp chủ nhiệm.'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {'Hãy chọn một lớp trong màn Lớp học để thiết lập.'}
          </p>
          <Button
            className="mt-6 bg-teal-600 text-white hover:bg-teal-700"
            onClick={() => onNavigate?.('Lớp học')}
          >
            {'Chọn lớp chủ nhiệm'}
          </Button>
        </div>
      </div>
    );
  }

  if (homeroomState === 'error') {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-7 text-center">
          <AlertCircle className="mx-auto size-8 text-rose-600" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">Không thể tải dữ liệu chủ nhiệm</h1>
          <p className="mt-2 text-sm text-slate-600">{homeroomError}</p>
          <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedClassId || !dashboardData?.classroom) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Classroom Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              {dashboardData.classroom.schoolYearName}
            </span>
            <span className="text-xs text-slate-400">· Công tác chủ nhiệm</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Chủ nhiệm lớp {dashboardData.classroom.name}
          </h1>
        </div>

        {/* Classroom dropdown switcher */}
        <div className="flex items-center gap-3">
          <label htmlFor="homeroom-class-select" className="text-xs font-medium text-slate-500">Lớp:</label>
          <select
            id="homeroom-class-select"
            aria-label="Chọn lớp chủ nhiệm"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-teal-500"
          >
            {classList.map((c) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={handleGenerateAiSummary} disabled={generatingAiSummary}>
            {generatingAiSummary ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Gợi ý AI
          </Button>
          <button
            onClick={() => fetchDashboard(selectedClassId)}
            title="Làm mới dữ liệu"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`size-4 ${loadingDashboard ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <School className="size-4" /> Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('behavior')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'behavior'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="size-4" /> Nề nếp học sinh
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'weekly'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="size-4" /> Nhận xét tuần
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'monthly'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="size-4" /> Báo cáo tháng
        </button>
      </div>

      {/* ========================================================
          TAB 1: TỔNG QUAN (OVERVIEW)
      ======================================================== */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Top Statistic Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Sĩ số lớp</span>
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <Users className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {dashboardData?.classroom?.studentCount || 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">{dashboardData?.classroom?.room || 'Phòng học chính'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Có mặt hôm nay</span>
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {dashboardData?.attendanceToday?.present ?? 0}
                <span className="text-sm font-normal text-slate-400">
                  /{dashboardData?.classroom?.studentCount || 0}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {dashboardData?.attendanceToday?.isRecorded ? 'Đã điểm danh hôm nay' : 'Chưa lưu điểm danh hôm nay'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Vắng / Đi muộn hôm nay</span>
                <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <Clock className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {(dashboardData?.attendanceToday?.excusedAbsence || 0) +
                  (dashboardData?.attendanceToday?.unexcusedAbsence || 0)}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({dashboardData?.attendanceToday?.late || 0} muộn)
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {dashboardData?.attendanceToday?.excusedAbsence || 0} có phép ·{' '}
                {dashboardData?.attendanceToday?.unexcusedAbsence || 0} không phép
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Học sinh cần quan tâm</span>
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-rose-600">
                {dashboardData?.studentsNeedAttention?.length || 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">Tín hiệu chuyên cần / học tập / nề nếp 30 ngày</p>
            </div>
          </div>

          {/* Main 2-column layout */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Left Column: Chuyên cần & Học sinh cần quan tâm & Nề nếp */}
            <div className="flex flex-col gap-6">
              {/* Quick Actions Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Hành động nhanh chủ nhiệm</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={() => onNavigate && onNavigate('Điểm danh')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-600">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Điểm danh</span>
                  </button>

                  <button
                    onClick={() => handleOpenAddBehavior()}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-orange-50 text-orange-600">
                      <Plus className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Ghi nhận nề nếp</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('weekly')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <ClipboardList className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Nhận xét tuần</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('monthly')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-purple-50 text-purple-600">
                      <FileText className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Báo cáo tháng</span>
                  </button>
                </div>
              </div>

              {/* Học sinh cần quan tâm (Rule-based) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Học sinh cần chú ý đặc biệt</h2>
                    <p className="text-xs text-slate-400">
                      Tự động phân tích từ dữ liệu chuyên cần, nề nếp và học tập 30 ngày qua
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                    {dashboardData?.studentsNeedAttention?.length || 0} học sinh
                  </span>
                </div>

                <div className="mt-4 flex flex-col divide-y divide-slate-100">
                  {dashboardData?.studentsNeedAttention && dashboardData.studentsNeedAttention.length > 0 ? (
                    dashboardData.studentsNeedAttention.map((s) => (
                      <div key={s.studentId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid size-9 place-items-center rounded-full text-xs font-bold ${
                              s.avatarColor || 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {s.initials || s.studentName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{s.studentName}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {s.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                    r.type === 'ATTENDANCE'
                                      ? 'bg-orange-50 text-orange-700'
                                      : r.type === 'ASSESSMENT'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-yellow-50 text-yellow-800'
                                  }`}
                                >
                                  {r.description}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenAddBehavior(s.studentId)}
                          className="self-end rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:self-center"
                        >
                          + Ghi nhận
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-400">
                      <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
                      Lớp học đang có nề nếp và học tập rất tốt, chưa có học sinh nào trong diện cần lưu ý.
                    </div>
                  )}
                </div>
              </div>

              {/* Nề nếp gần đây */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Ghi nhận nề nếp gần đây</h2>
                    <p className="text-xs text-slate-400">Các biểu dương và nhắc nhở mới nhất</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('behavior')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Xem tất cả &rarr;
                  </button>
                </div>

                <div className="mt-4 flex flex-col divide-y divide-slate-100">
                  {dashboardData?.recentBehavior && dashboardData.recentBehavior.length > 0 ? (
                    dashboardData.recentBehavior.map((b) => (
                      <div key={b.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 grid size-8 place-items-center rounded-full text-xs font-bold ${
                              b.studentColor || 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {b.studentInitials || b.studentName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">{b.studentName}</p>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  b.level === 'POSITIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.level === 'REMINDER'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {b.level === 'POSITIVE'
                                  ? 'Tích cực'
                                  : b.level === 'REMINDER'
                                  ? 'Nhắc nhở'
                                  : 'Cần quan tâm'}
                              </span>
                              <span className="text-[11px] text-slate-400">· {b.recordDate}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{b.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">
                      Chưa có ghi nhận nề nếp nào. Hãy bấm "Thêm ghi nhận" để tạo mới.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sinh nhật sắp tới & Việc cần làm */}
            <div className="flex flex-col gap-6">
              {/* Sinh nhật sắp tới */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Cake className="size-5 text-pink-500" />
                    <h2 className="text-base font-semibold text-slate-900">Sinh nhật 30 ngày tới</h2>
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    {dashboardData?.upcomingBirthdays?.length || 0} em
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {dashboardData?.upcomingBirthdays && dashboardData.upcomingBirthdays.length > 0 ? (
                    dashboardData.upcomingBirthdays.map((b) => (
                      <div
                        key={b.studentId}
                        className={`flex items-center justify-between rounded-xl p-2.5 transition ${
                          b.isToday ? 'bg-pink-50 border border-pink-200' : 'bg-slate-50 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                              b.avatarColor || 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {b.initials || b.fullName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{b.fullName}</p>
                            <p className="text-xs text-slate-400">
                              {b.dateOfBirth} ({b.turningAge} tuổi)
                            </p>
                          </div>
                        </div>

                        <div>
                          {b.isToday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pink-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                              🎉 Hôm nay!
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Còn {b.daysUntilBirthday} ngày
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">
                      Không có sinh nhật nào trong 30 ngày tới.
                    </div>
                  )}
                </div>
              </div>

              {/* Nhiệm vụ chủ nhiệm tuần này */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Việc chủ nhiệm tuần này</h2>
                    <p className="text-xs text-slate-400">
                      {dashboardData?.weeklyTasks?.filter((t) => t.done).length || 0}/
                      {dashboardData?.weeklyTasks?.length || 0} đã hoàn thành
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {dashboardData?.weeklyTasks && dashboardData.weeklyTasks.length > 0 ? (
                    dashboardData.weeklyTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id, task.done)}
                        className="flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition hover:bg-slate-50"
                      >
                        <button
                          type="button"
                          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                            task.done
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {task.done && <Check className="size-3.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${
                              task.done ? 'text-slate-400 line-through' : 'font-medium text-slate-700'
                            }`}
                          >
                            {task.title}
                          </p>
                          <span className="text-[11px] text-slate-400">{task.due}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">Không có công việc tồn đọng.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: NỀ NẾP (BEHAVIOR MANAGEMENT)
      ======================================================== */}
      {activeTab === 'behavior' && (
        <div className="flex flex-col gap-6">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm học sinh, nội dung..."
                  value={behaviorSearch}
                  onChange={(e) => setBehaviorSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchBehavior()}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={behaviorCategory}
                onChange={(e) => {
                  setBehaviorCategory(e.target.value);
                  setBehaviorPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Tất cả danh mục</option>
                <option value="DISCIPLINE">Kỷ luật & Trật tự</option>
                <option value="LEARNING">Học tập</option>
                <option value="HYGIENE">Vệ sinh & Tác phong</option>
                <option value="TEAMWORK">Làm việc nhóm</option>
                <option value="RESPONSIBILITY">Trách nhiệm</option>
                <option value="OTHER">Khác</option>
              </select>

              {/* Level Filter */}
              <select
                value={behaviorLevel}
                onChange={(e) => {
                  setBehaviorLevel(e.target.value);
                  setBehaviorPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Tất cả mức độ</option>
                <option value="POSITIVE">Tích cực / Biểu dương</option>
                <option value="REMINDER">Cần nhắc nhở</option>
                <option value="NEEDS_ATTENTION">Cần quan tâm đặc biệt</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenAddBehavior()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="size-4" /> Thêm ghi nhận nề nếp
            </button>
          </div>

          {/* Behavior Records Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Học sinh</th>
                  <th className="px-4 py-3.5">Ngày</th>
                  <th className="px-4 py-3.5">Danh mục</th>
                  <th className="px-4 py-3.5">Mức độ</th>
                  <th className="px-5 py-3.5">Nội dung ghi nhận</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {behaviorList.length > 0 ? (
                  behaviorList.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                              rec.studentColor || 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {rec.studentInitials || rec.studentName.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{rec.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{rec.recordDate}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {CATEGORY_MAP[rec.category] || rec.category}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                            rec.level === 'POSITIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.level === 'REMINDER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.level === 'POSITIVE'
                            ? 'Tích cực'
                            : rec.level === 'REMINDER'
                            ? 'Nhắc nhở'
                            : 'Cần quan tâm'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 max-w-md truncate">{rec.content}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditBehavior(rec)}
                            title="Chỉnh sửa"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(rec)}
                            title="Xóa"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                      Chưa có ghi nhận nề nếp nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <div>
                Hiển thị {behaviorList.length} trên tổng số {behaviorTotal} bản ghi
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={behaviorPage <= 1}
                  onClick={() => setBehaviorPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
                >
                  Trang trước
                </button>
                <span className="font-semibold">
                  Trang {behaviorPage} / {Math.ceil(behaviorTotal / behaviorPageSize) || 1}
                </span>
                <button
                  disabled={behaviorPage >= Math.ceil(behaviorTotal / behaviorPageSize)}
                  onClick={() => setBehaviorPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: NHẬN XÉT TUẦN (WEEKLY REVIEW)
      ======================================================== */}
      {activeTab === 'weekly' && (
        <div className="flex flex-col gap-6">
          {/* Week Selector Bar & Actions */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="homeroom-week-select" className="text-sm font-semibold text-slate-700">Tuần học:</label>
              <select
                id="homeroom-week-select"
                aria-label="Chọn tuần học"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-teal-700 outline-none"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w}
                  </option>
                ))}
              </select>
              {weeklySummary?.dateRange && (
                <span className="text-xs text-slate-400">({weeklySummary.dateRange})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportWeekly('docx')}
                disabled={exportingWeeklyDocx}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {exportingWeeklyDocx ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 text-blue-600" />}
                Xuất Word (.docx)
              </button>
              <button
                onClick={() => handleExportWeekly('pdf')}
                disabled={exportingWeeklyPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {exportingWeeklyPdf ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 text-rose-600" />}
                Xuất PDF
              </button>
              <button
                onClick={handleSaveWeekly}
                disabled={savingWeekly}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                {savingWeekly ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Lưu nhận xét tuần
              </button>
            </div>
          </div>

          {/* Auto Aggregated Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chuyên cần tuần</p>
              <p className="mt-2 text-2xl font-bold text-teal-600">
                {weeklySummary?.attendance.presentRate || 100}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weeklySummary?.attendance.excusedAbsence || 0} phép · {weeklySummary?.attendance.unexcusedAbsence || 0} không phép · {weeklySummary?.attendance.late || 0} muộn
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nề nếp tuần</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                +{weeklySummary?.behavior.positive || 0}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / -{weeklySummary?.behavior.reminder || 0} nhắc nhở
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weeklySummary?.behavior.needsAttention || 0} trường hợp cần lưu ý
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Học tập tuần</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {weeklySummary?.assessment.excellent || 0} Tốt
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weeklySummary?.assessment.completed || 0} Hoàn thành · {weeklySummary?.assessment.needsSupport || 0} Cần hỗ trợ
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {weeklyIsDirty && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <AlertCircle className="size-4 shrink-0 text-amber-600" />
                Bạn có thay đổi chưa được lưu. Vui lòng bấm nút "Lưu nhận xét tuần" để cập nhật.
              </div>
            )}

            <div>
              <label htmlFor="homeroom-weekly-strengths" className="text-sm font-semibold text-slate-800">
                1. Điểm nổi bật trong tuần (Ưu điểm, thành tích, tiến bộ)
              </label>
              <textarea
                id="homeroom-weekly-strengths"
                rows={3}
                placeholder="VD: Lớp duy trì nề nếp truy bài đầu giờ tốt, các bạn học sinh tích cực xây dựng bài..."
                value={weeklyStrengths}
                onChange={(e) => {
                  setWeeklyStrengths(e.target.value);
                  setWeeklyIsDirty(true);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label htmlFor="homeroom-weekly-limitations" className="text-sm font-semibold text-slate-800">
                2. Hạn chế còn tồn tại (Các vấn đề cần chấn chỉnh)
              </label>
              <textarea
                id="homeroom-weekly-limitations"
                rows={3}
                placeholder="VD: Một vài bạn còn quên mang sách bài tập, còn hiện tượng nói chuyện riêng trong giờ Khoa học..."
                value={weeklyLimitations}
                onChange={(e) => {
                  setWeeklyLimitations(e.target.value);
                  setWeeklyIsDirty(true);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label htmlFor="homeroom-weekly-plan" className="text-sm font-semibold text-slate-800">
                3. Kế hoạch trọng tâm tuần tới
              </label>
              <textarea
                id="homeroom-weekly-plan"
                rows={3}
                placeholder="VD: Kiểm tra đồ dùng học tập đầu tuần; Phối hợp phụ huynh nhắc nhở học sinh ôn tập chuẩn bị kiểm tra..."
                value={weeklyNextPlan}
                onChange={(e) => {
                  setWeeklyNextPlan(e.target.value);
                  setWeeklyIsDirty(true);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: BÁO CÁO THÁNG (MONTHLY REPORTS)
      ======================================================== */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col gap-6">
          {/* Month/Year Selector Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="homeroom-month-select" className="text-sm font-semibold text-slate-700">Tháng:</label>
              <select
                id="homeroom-month-select"
                aria-label="Chọn tháng tổng kết"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-teal-700 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>

              <label htmlFor="homeroom-year-select" className="text-sm font-semibold text-slate-700">Năm:</label>
              <select
                id="homeroom-year-select"
                aria-label="Chọn năm tổng kết"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportMonthly('docx')}
                disabled={exportingMonthlyDocx}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {exportingMonthlyDocx ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 text-blue-600" />}
                Xuất Word (.docx)
              </button>
              <button
                onClick={() => handleExportMonthly('pdf')}
                disabled={exportingMonthlyPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {exportingMonthlyPdf ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 text-rose-600" />}
                Xuất PDF
              </button>
              <button
                onClick={handleSaveMonthly}
                disabled={savingMonthly}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                {savingMonthly ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Lưu tổng kết tháng
              </button>
            </div>
          </div>

          {/* Monthly Aggregation Breakdown */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chuyên cần tháng</p>
              <p className="mt-2 text-2xl font-bold text-teal-600">
                {monthlySummary?.attendance.attendanceRate || 100}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {monthlySummary?.attendance.totalSchoolDays || 0} ngày học · {monthlySummary?.attendance.excusedAbsence || 0} phép · {monthlySummary?.attendance.unexcusedAbsence || 0} không phép
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nề nếp toàn tháng</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                +{monthlySummary?.behavior.positive || 0}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / -{monthlySummary?.behavior.reminder || 0} nhắc nhở
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {monthlySummary?.behavior.needsAttention || 0} trường hợp cần lưu ý
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đánh giá học tập</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {monthlySummary?.learning.excellent || 0} Hoàn thành tốt
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {monthlySummary?.learning.completed || 0} Hoàn thành · {monthlySummary?.learning.needsSupport || 0} Cần hỗ trợ
              </p>
            </div>
          </div>

          {/* Monthly Form */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {monthlyIsDirty && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <AlertCircle className="size-4 shrink-0 text-amber-600" />
                Bạn có thay đổi chưa được lưu. Vui lòng bấm "Lưu tổng kết tháng" để cập nhật.
              </div>
            )}

            <div>
              <label htmlFor="homeroom-monthly-highlights" className="text-sm font-semibold text-slate-800">
                1. Thành tích & Điểm nổi bật trong tháng
              </label>
              <textarea
                id="homeroom-monthly-highlights"
                rows={3}
                placeholder="VD: Lớp đạt danh hiệu xuất sắc trong tuần lễ thi đua; 100% học sinh hoàn thành bài tập..."
                value={monthlyHighlights}
                onChange={(e) => {
                  setMonthlyHighlights(e.target.value);
                  setMonthlyIsDirty(true);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label htmlFor="homeroom-monthly-limitations" className="text-sm font-semibold text-slate-800">
                2. Hạn chế cần khắc phục
              </label>
              <textarea
                id="homeroom-monthly-limitations"
                rows={3}
                placeholder="VD: Cần nâng cao ý thức tự giác giữ gìn vệ sinh lớp học; Nhắc nhở một số học sinh đi học đúng giờ..."
                value={monthlyLimitations}
                onChange={(e) => {
                  setMonthlyLimitations(e.target.value);
                  setMonthlyIsDirty(true);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label htmlFor="homeroom-monthly-plan" className="text-sm font-semibold text-slate-800">
                3. Kế hoạch trọng tâm tháng tiếp theo
              </label>
              <textarea
                id="homeroom-monthly-plan"
                rows={3}
                placeholder="VD: Tổ chức thi đua chào mừng ngày 20/11; Phụ đạo bổ trợ cho các học sinh chưa đạt chuẩn..."
                value={monthlyNextPlan}
                onChange={(e) => {
                  setMonthlyNextPlan(e.target.value);
                  setMonthlyIsDirty(true);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: THÊM / SỬA GHI NHẬN NỀ NẾP (WITH QUICK SUGGESTIONS)
      ======================================================== */}
      <Dialog open={showBehaviorModal} onOpenChange={setShowBehaviorModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBehavior ? 'Chỉnh sửa ghi nhận nề nếp' : 'Thêm ghi nhận nề nếp mới'}</DialogTitle>
            <DialogDescription>
              Ghi nhận các biểu hiện tích cực hoặc cần nhắc nhở của học sinh để theo dõi sự tiến bộ.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBehavior} className="flex flex-col gap-4">
            {/* Student selection */}
            <div>
              <label htmlFor="homeroom-modal-student-select" className="text-xs font-semibold text-slate-700">Học sinh *</label>
              <select
                id="homeroom-modal-student-select"
                aria-label="Chọn học sinh để ghi nhận nề nếp"
                disabled={!!editingBehavior}
                value={behaviorFormStudentId}
                onChange={(e) => setBehaviorFormStudentId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-teal-500"
              >
                <option value="">-- Chọn học sinh trong lớp --</option>
                {dashboardData?.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                    {dashboardData.studentsNeedAttention.some((item) => item.studentId === student.id)
                      ? ' (Cần quan tâm)'
                      : ''}
                  </option>
                ))}
                {/* Fallback option for editing or other students */}
                {editingBehavior && !dashboardData?.students.some((student) => student.id === editingBehavior.studentId) && (
                  <option value={editingBehavior.studentId}>{editingBehavior.studentName}</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="homeroom-modal-date" className="text-xs font-semibold text-slate-700">Ngày ghi nhận *</label>
                <input
                  id="homeroom-modal-date"
                  type="date"
                  value={behaviorFormDate}
                  onChange={(e) => setBehaviorFormDate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label htmlFor="homeroom-modal-category" className="text-xs font-semibold text-slate-700">Danh mục *</label>
                <select
                  id="homeroom-modal-category"
                  aria-label="Chọn danh mục nề nếp"
                  value={behaviorFormCategory}
                  onChange={(e) => setBehaviorFormCategory(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="LEARNING">Học tập</option>
                  <option value="DISCIPLINE">Kỷ luật & Trật tự</option>
                  <option value="HYGIENE">Vệ sinh & Tác phong</option>
                  <option value="TEAMWORK">Làm việc nhóm</option>
                  <option value="RESPONSIBILITY">Trách nhiệm</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="homeroom-modal-level" className="text-xs font-semibold text-slate-700">Mức độ *</label>
              <select
                id="homeroom-modal-level"
                aria-label="Chọn mức độ nề nếp"
                value={behaviorFormLevel}
                onChange={(e) => setBehaviorFormLevel(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="POSITIVE">Tích cực (Biểu dương, khen thưởng)</option>
                <option value="REMINDER">Cần nhắc nhở</option>
                <option value="NEEDS_ATTENTION">Cần quan tâm đặc biệt</option>
              </select>
            </div>

            {/* Quick Suggestions */}
            <div>
              <p className="text-xs font-semibold text-slate-600">Gợi ý nhanh (Bấm để điền):</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(behaviorFormLevel === 'POSITIVE'
                  ? QUICK_POSITIVE_SUGGESTIONS
                  : QUICK_REMINDER_SUGGESTIONS
                ).map((text, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBehaviorFormContent(text)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"
                  >
                    + {text}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label htmlFor="homeroom-modal-content" className="text-xs font-semibold text-slate-700">Nội dung chi tiết *</label>
              <textarea
                id="homeroom-modal-content"
                rows={3}
                placeholder="Nhập nội dung quan sát hoặc nhận xét về học sinh..."
                value={behaviorFormContent}
                onChange={(e) => setBehaviorFormContent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setShowBehaviorModal(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submittingBehavior} className="bg-teal-600 hover:bg-teal-700 text-white">
                {submittingBehavior ? <Loader2 className="size-4 animate-spin" /> : 'Lưu ghi nhận'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: DELETE CONFIRMATION (NO WINDOW.CONFIRM)
      ======================================================== */}
      <Dialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="size-5" /> Xác nhận xóa ghi nhận
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa ghi nhận nề nếp của học sinh{' '}
              <strong>{recordToDelete?.studentName}</strong> không? Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRecordToDelete(null)}>
              Hủy
            </Button>
            <Button
              type="button"
              disabled={deletingRecord}
              onClick={handleDeleteBehavior}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingRecord ? <Loader2 className="size-4 animate-spin" /> : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: AI HOMEROOM SUMMARY
      ======================================================== */}
      <Dialog open={aiModalOpen} onOpenChange={(open) => !open && setAiModalOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700">
              <Sparkles className="size-5" /> Gợi ý tổng kết sư phạm AI · TeachFlow
            </DialogTitle>
            <DialogDescription>
              Dữ liệu được tổng hợp tự động từ sĩ số, điểm danh chuyên cần, nề nếp thi đua và nhận xét môn học của lớp {dashboardData?.classroom?.name || ''} ({activeTab === 'monthly' ? `Tháng ${selectedMonth}` : `Tuần ${selectedWeek}`}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">1. Đánh giá chung</label>
              <textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed outline-none focus:border-teal-500"
                placeholder="Nội dung đánh giá chung..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">2. Ưu điểm nổi bật</label>
              <textarea
                value={aiStrengths}
                onChange={(e) => setAiStrengths(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 text-xs leading-relaxed outline-none focus:border-emerald-500"
                placeholder="Các ưu điểm nổi bật..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-700 mb-1">3. Tồn tại / Cần lưu ý</label>
              <textarea
                value={aiConcerns}
                onChange={(e) => setAiConcerns(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-amber-200 bg-amber-50/30 p-3 text-xs leading-relaxed outline-none focus:border-amber-500"
                placeholder="Các điểm tồn tại cần nhắc nhở..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">4. Phương hướng / Biện pháp tuần tới</label>
              <textarea
                value={aiNextSteps}
                onChange={(e) => setAiNextSteps(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-blue-200 bg-blue-50/30 p-3 text-xs leading-relaxed outline-none focus:border-blue-500"
                placeholder="Kế hoạch và phương hướng tới..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setAiModalOpen(false)}>
              Hủy
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCopyAiSummary}>
                <Copy className="size-3.5 mr-1.5" /> Sao chép
              </Button>
              <Button type="button" onClick={handleApplyAiSummary} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Check className="size-3.5 mr-1.5" /> Áp dụng vào biểu mẫu
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
