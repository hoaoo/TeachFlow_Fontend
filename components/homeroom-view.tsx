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
import { toggleTask as apiToggleTask } from '@/services/dashboard-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const QUICK_POSITIVE_SUGGESTIONS = [
  'TÃ­ch cá»±c phÃ¡t biá»ƒu',
  'HoÃ n thÃ nh tá»‘t nhiá»‡m vá»¥',
  'Há»£p tÃ¡c tá»‘t vá»›i báº¡n',
  'CÃ³ tinh tháº§n giÃºp Ä‘á»¡ báº¡n',
  'Chuáº©n bá»‹ bÃ i Ä‘áº§y Ä‘á»§',
  'CÃ³ tiáº¿n bá»™ rÃµ rá»‡t',
];

const QUICK_REMINDER_SUGGESTIONS = [
  'Cáº§n táº­p trung hÆ¡n trong giá» há»c',
  'ChÆ°a chuáº©n bá»‹ bÃ i Ä‘áº§y Ä‘á»§',
  'Cáº§n giá»¯ tráº­t tá»± trong giá»',
  'Cáº§n hoÃ n thÃ nh nhiá»‡m vá»¥ Ä‘Ãºng thá»i gian',
  'Cáº§n chá»§ Ä‘á»™ng tham gia hoáº¡t Ä‘á»™ng nhÃ³m',
];

const CATEGORY_MAP: Record<string, string> = {
  DISCIPLINE: 'Ká»· luáº­t & Tráº­t tá»±',
  LEARNING: 'Há»c táº­p',
  HYGIENE: 'Vá»‡ sinh & TÃ¡c phong',
  TEAMWORK: 'LÃ m viá»‡c nhÃ³m',
  RESPONSIBILITY: 'TrÃ¡ch nhiá»‡m',
  OTHER: 'KhÃ¡c',
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
        setHomeroomError(err?.message || 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch lá»›p chá»§ nhiá»‡m');
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
      setHomeroomError(err.message || 'Lá»—i táº£i dá»¯ liá»‡u báº£ng Ä‘iá»u khiá»ƒn chá»§ nhiá»‡m');
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
      toast.error(err.message || 'Lá»—i táº£i danh sÃ¡ch ná» náº¿p');
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
      toast.error(err.message || 'Lá»—i táº£i nháº­n xÃ©t tuáº§n');
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
      toast.error(err.message || 'Lá»—i táº£i tá»•ng káº¿t thÃ¡ng');
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
      toast.error('Vui lÃ²ng chá»n há»c sinh');
      return;
    }
    if (!behaviorFormContent.trim()) {
      toast.error('Vui lÃ²ng nháº­p ná»™i dung ghi nháº­n');
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
        toast.success('Cáº­p nháº­t ghi nháº­n ná» náº¿p thÃ nh cÃ´ng');
      } else {
        await createBehaviorRecord({
          classroomId: selectedClassId,
          studentId: behaviorFormStudentId,
          recordDate: behaviorFormDate,
          category: behaviorFormCategory,
          level: behaviorFormLevel,
          content: behaviorFormContent.trim(),
        });
        toast.success('ThÃªm ghi nháº­n ná» náº¿p thÃ nh cÃ´ng');
      }
      setShowBehaviorModal(false);
      fetchBehavior();
      fetchDashboard(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || 'KhÃ´ng thá»ƒ lÆ°u ghi nháº­n ná» náº¿p');
    } finally {
      setSubmittingBehavior(false);
    }
  };

  const handleDeleteBehavior = async () => {
    if (!recordToDelete) return;
    setDeletingRecord(true);
    try {
      await deleteBehaviorRecord(recordToDelete.id);
      toast.success('ÄÃ£ xÃ³a ghi nháº­n ná» náº¿p');
      setRecordToDelete(null);
      fetchBehavior();
      fetchDashboard(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || 'Lá»—i khi xÃ³a ghi nháº­n');
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
      toast.success(`ÄÃ£ lÆ°u nháº­n xÃ©t tuáº§n ${selectedWeek}`);
    } catch (err: any) {
      toast.error(err.message || 'KhÃ´ng thá»ƒ lÆ°u nháº­n xÃ©t tuáº§n');
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleExportWeekly = async (format: 'docx' | 'pdf') => {
    if (format === 'docx') setExportingWeeklyDocx(true);
    else setExportingWeeklyPdf(true);
    try {
      await exportWeeklyReviewFile(selectedClassId, selectedWeek, format);
      toast.success(`ÄÃ£ táº£i xuá»‘ng bÃ¡o cÃ¡o tuáº§n (${format.toUpperCase()})`);
    } catch (err: any) {
      toast.error(err.message || `Lá»—i xuáº¥t file ${format.toUpperCase()}`);
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
      toast.success(`ÄÃ£ lÆ°u tá»•ng káº¿t thÃ¡ng ${selectedMonth}/${selectedYear}`);
    } catch (err: any) {
      toast.error(err.message || 'KhÃ´ng thá»ƒ lÆ°u tá»•ng káº¿t thÃ¡ng');
    } finally {
      setSavingMonthly(false);
    }
  };

  const handleExportMonthly = async (format: 'docx' | 'pdf') => {
    if (format === 'docx') setExportingMonthlyDocx(true);
    else setExportingMonthlyPdf(true);
    try {
      await exportMonthlySummaryFile(selectedClassId, selectedYear, selectedMonth, format);
      toast.success(`ÄÃ£ táº£i xuá»‘ng bÃ¡o cÃ¡o thÃ¡ng (${format.toUpperCase()})`);
    } catch (err: any) {
      toast.error(err.message || `Lá»—i xuáº¥t file ${format.toUpperCase()}`);
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
      <div className="space-y-5" aria-label="Äang táº£i dá»¯ liá»‡u chá»§ nhiá»‡m">
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
            {'B\u1ea1n ch\u01b0a thi\u1ebft l\u1eadp l\u1edbp ch\u1ee7 nhi\u1ec7m.'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {'H\u00e3y ch\u1ecdn m\u1ed9t l\u1edbp trong m\u00e0n L\u1edbp h\u1ecdc \u0111\u1ec3 thi\u1ebft l\u1eadp.'}
          </p>
          <Button
            className="mt-6 bg-teal-600 text-white hover:bg-teal-700"
            onClick={() => onNavigate?.('L\u1edbp h\u1ecdc')}
          >
            {'Ch\u1ecdn l\u1edbp ch\u1ee7 nhi\u1ec7m'}
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
          <h1 className="mt-3 text-lg font-bold text-slate-900">KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u chá»§ nhiá»‡m</h1>
          <p className="mt-2 text-sm text-slate-600">{homeroomError}</p>
          <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>
            {'Ch\\u1ecdn l\\u1edbp ch\\u1ee7 nhi\\u1ec7m'}\r\n          </Button>
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
            <span className="text-xs text-slate-400">Â· CÃ´ng tÃ¡c chá»§ nhiá»‡m</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Chá»§ nhiá»‡m lá»›p {dashboardData.classroom.name}
          </h1>
        </div>

        {/* Classroom dropdown switcher */}
        <div className="flex items-center gap-3">
          <label htmlFor="homeroom-class-select" className="text-xs font-medium text-slate-500">Lá»›p:</label>
          <select
            id="homeroom-class-select"
            aria-label="Chá»n lá»›p chá»§ nhiá»‡m"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-teal-500"
          >
            {classList.map((c) => (
              <option key={c.id} value={c.id}>
                Lá»›p {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchDashboard(selectedClassId)}
            title="LÃ m má»›i dá»¯ liá»‡u"
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
          <School className="size-4" /> Tá»•ng quan
        </button>
        <button
          onClick={() => setActiveTab('behavior')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'behavior'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="size-4" /> Ná» náº¿p há»c sinh
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'weekly'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="size-4" /> Nháº­n xÃ©t tuáº§n
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'monthly'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="size-4" /> BÃ¡o cÃ¡o thÃ¡ng
        </button>
      </div>

      {/* ========================================================
          TAB 1: Tá»”NG QUAN (OVERVIEW)
      ======================================================== */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Top Statistic Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">SÄ© sá»‘ lá»›p</span>
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <Users className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {dashboardData?.classroom?.studentCount || 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">{dashboardData?.classroom?.room || 'PhÃ²ng há»c chÃ­nh'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">CÃ³ máº·t hÃ´m nay</span>
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
                {dashboardData?.attendanceToday?.isRecorded ? 'ÄÃ£ Ä‘iá»ƒm danh hÃ´m nay' : 'ChÆ°a lÆ°u Ä‘iá»ƒm danh hÃ´m nay'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Váº¯ng / Äi muá»™n hÃ´m nay</span>
                <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <Clock className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {(dashboardData?.attendanceToday?.excusedAbsence || 0) +
                  (dashboardData?.attendanceToday?.unexcusedAbsence || 0)}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({dashboardData?.attendanceToday?.late || 0} muá»™n)
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {dashboardData?.attendanceToday?.excusedAbsence || 0} cÃ³ phÃ©p Â·{' '}
                {dashboardData?.attendanceToday?.unexcusedAbsence || 0} khÃ´ng phÃ©p
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Há»c sinh cáº§n quan tÃ¢m</span>
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-rose-600">
                {dashboardData?.studentsNeedAttention?.length || 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">TÃ­n hiá»‡u chuyÃªn cáº§n / há»c táº­p / ná» náº¿p 30 ngÃ y</p>
            </div>
          </div>

          {/* Main 2-column layout */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Left Column: ChuyÃªn cáº§n & Há»c sinh cáº§n quan tÃ¢m & Ná» náº¿p */}
            <div className="flex flex-col gap-6">
              {/* Quick Actions Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">HÃ nh Ä‘á»™ng nhanh chá»§ nhiá»‡m</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={() => onNavigate && onNavigate('Äiá»ƒm danh')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-600">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Äiá»ƒm danh</span>
                  </button>

                  <button
                    onClick={() => handleOpenAddBehavior()}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-orange-50 text-orange-600">
                      <Plus className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Ghi nháº­n ná» náº¿p</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('weekly')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <ClipboardList className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Nháº­n xÃ©t tuáº§n</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('monthly')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-purple-50 text-purple-600">
                      <FileText className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">BÃ¡o cÃ¡o thÃ¡ng</span>
                  </button>
                </div>
              </div>

              {/* Há»c sinh cáº§n quan tÃ¢m (Rule-based) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Há»c sinh cáº§n chÃº Ã½ Ä‘áº·c biá»‡t</h2>
                    <p className="text-xs text-slate-400">
                      Tá»± Ä‘á»™ng phÃ¢n tÃ­ch tá»« dá»¯ liá»‡u chuyÃªn cáº§n, ná» náº¿p vÃ  há»c táº­p 30 ngÃ y qua
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                    {dashboardData?.studentsNeedAttention?.length || 0} há»c sinh
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
                          + Ghi nháº­n
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-400">
                      <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
                      Lá»›p há»c Ä‘ang cÃ³ ná» náº¿p vÃ  há»c táº­p ráº¥t tá»‘t, chÆ°a cÃ³ há»c sinh nÃ o trong diá»‡n cáº§n lÆ°u Ã½.
                    </div>
                  )}
                </div>
              </div>

              {/* Ná» náº¿p gáº§n Ä‘Ã¢y */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Ghi nháº­n ná» náº¿p gáº§n Ä‘Ã¢y</h2>
                    <p className="text-xs text-slate-400">CÃ¡c biá»ƒu dÆ°Æ¡ng vÃ  nháº¯c nhá»Ÿ má»›i nháº¥t</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('behavior')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Xem táº¥t cáº£ &rarr;
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
                                  ? 'TÃ­ch cá»±c'
                                  : b.level === 'REMINDER'
                                  ? 'Nháº¯c nhá»Ÿ'
                                  : 'Cáº§n quan tÃ¢m'}
                              </span>
                              <span className="text-[11px] text-slate-400">Â· {b.recordDate}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{b.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">
                      ChÆ°a cÃ³ ghi nháº­n ná» náº¿p nÃ o. HÃ£y báº¥m "ThÃªm ghi nháº­n" Ä‘á»ƒ táº¡o má»›i.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sinh nháº­t sáº¯p tá»›i & Viá»‡c cáº§n lÃ m */}
            <div className="flex flex-col gap-6">
              {/* Sinh nháº­t sáº¯p tá»›i */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Cake className="size-5 text-pink-500" />
                    <h2 className="text-base font-semibold text-slate-900">Sinh nháº­t 30 ngÃ y tá»›i</h2>
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
                              {b.dateOfBirth} ({b.turningAge} tuá»•i)
                            </p>
                          </div>
                        </div>

                        <div>
                          {b.isToday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pink-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                              ðŸŽ‰ HÃ´m nay!
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                              CÃ²n {b.daysUntilBirthday} ngÃ y
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">
                      KhÃ´ng cÃ³ sinh nháº­t nÃ o trong 30 ngÃ y tá»›i.
                    </div>
                  )}
                </div>
              </div>

              {/* Nhiá»‡m vá»¥ chá»§ nhiá»‡m tuáº§n nÃ y */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Viá»‡c chá»§ nhiá»‡m tuáº§n nÃ y</h2>
                    <p className="text-xs text-slate-400">
                      {dashboardData?.weeklyTasks?.filter((t) => t.done).length || 0}/
                      {dashboardData?.weeklyTasks?.length || 0} Ä‘Ã£ hoÃ n thÃ nh
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
                    <div className="py-6 text-center text-sm text-slate-400">KhÃ´ng cÃ³ cÃ´ng viá»‡c tá»“n Ä‘á»ng.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: Ná»€ Náº¾P (BEHAVIOR MANAGEMENT)
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
                  placeholder="TÃ¬m há»c sinh, ná»™i dung..."
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
                <option value="ALL">Táº¥t cáº£ danh má»¥c</option>
                <option value="DISCIPLINE">Ká»· luáº­t & Tráº­t tá»±</option>
                <option value="LEARNING">Há»c táº­p</option>
                <option value="HYGIENE">Vá»‡ sinh & TÃ¡c phong</option>
                <option value="TEAMWORK">LÃ m viá»‡c nhÃ³m</option>
                <option value="RESPONSIBILITY">TrÃ¡ch nhiá»‡m</option>
                <option value="OTHER">KhÃ¡c</option>
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
                <option value="ALL">Táº¥t cáº£ má»©c Ä‘á»™</option>
                <option value="POSITIVE">TÃ­ch cá»±c / Biá»ƒu dÆ°Æ¡ng</option>
                <option value="REMINDER">Cáº§n nháº¯c nhá»Ÿ</option>
                <option value="NEEDS_ATTENTION">Cáº§n quan tÃ¢m Ä‘áº·c biá»‡t</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenAddBehavior()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="size-4" /> ThÃªm ghi nháº­n ná» náº¿p
            </button>
          </div>

          {/* Behavior Records Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Há»c sinh</th>
                  <th className="px-4 py-3.5">NgÃ y</th>
                  <th className="px-4 py-3.5">Danh má»¥c</th>
                  <th className="px-4 py-3.5">Má»©c Ä‘á»™</th>
                  <th className="px-5 py-3.5">Ná»™i dung ghi nháº­n</th>
                  <th className="px-4 py-3.5 text-right">Thao tÃ¡c</th>
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
                            ? 'TÃ­ch cá»±c'
                            : rec.level === 'REMINDER'
                            ? 'Nháº¯c nhá»Ÿ'
                            : 'Cáº§n quan tÃ¢m'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 max-w-md truncate">{rec.content}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditBehavior(rec)}
                            title="Chá»‰nh sá»­a"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(rec)}
                            title="XÃ³a"
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
                      ChÆ°a cÃ³ ghi nháº­n ná» náº¿p nÃ o phÃ¹ há»£p vá»›i bá»™ lá»c.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <div>
                Hiá»ƒn thá»‹ {behaviorList.length} trÃªn tá»•ng sá»‘ {behaviorTotal} báº£n ghi
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={behaviorPage <= 1}
                  onClick={() => setBehaviorPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
                >
                  Trang trÆ°á»›c
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
          TAB 3: NHáº¬N XÃ‰T TUáº¦N (WEEKLY REVIEW)
      ======================================================== */}
      {activeTab === 'weekly' && (
        <div className="flex flex-col gap-6">
          {/* Week Selector Bar & Actions */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="homeroom-week-select" className="text-sm font-semibold text-slate-700">Tuáº§n há»c:</label>
              <select
                id="homeroom-week-select"
                aria-label="Chá»n tuáº§n há»c"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-teal-700 outline-none"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuáº§n {w}
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
                Xuáº¥t Word (.docx)
              </button>
              <button
                onClick={() => handleExportWeekly('pdf')}
                disabled={exportingWeeklyPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {exportingWeeklyPdf ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 text-rose-600" />}
                Xuáº¥t PDF
              </button>
              <button
                onClick={handleSaveWeekly}
                disabled={savingWeekly}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                {savingWeekly ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                LÆ°u nháº­n xÃ©t tuáº§n
              </button>
            </div>
          </div>

          {/* Auto Aggregated Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">ChuyÃªn cáº§n tuáº§n</p>
              <p className="mt-2 text-2xl font-bold text-teal-600">
                {weeklySummary?.attendance.presentRate || 100}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weeklySummary?.attendance.excusedAbsence || 0} phÃ©p Â· {weeklySummary?.attendance.unexcusedAbsence || 0} khÃ´ng phÃ©p Â· {weeklySummary?.attendance.late || 0} muá»™n
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ná» náº¿p tuáº§n</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                +{weeklySummary?.behavior.positive || 0}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / -{weeklySummary?.behavior.reminder || 0} nháº¯c nhá»Ÿ
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weeklySummary?.behavior.needsAttention || 0} trÆ°á»ng há»£p cáº§n lÆ°u Ã½
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Há»c táº­p tuáº§n</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {weeklySummary?.assessment.excellent || 0} Tá»‘t
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weeklySummary?.assessment.completed || 0} HoÃ n thÃ nh Â· {weeklySummary?.assessment.needsSupport || 0} Cáº§n há»— trá»£
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {weeklyIsDirty && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <AlertCircle className="size-4 shrink-0 text-amber-600" />
                Báº¡n cÃ³ thay Ä‘á»•i chÆ°a Ä‘Æ°á»£c lÆ°u. Vui lÃ²ng báº¥m nÃºt "LÆ°u nháº­n xÃ©t tuáº§n" Ä‘á»ƒ cáº­p nháº­t.
              </div>
            )}

            <div>
              <label htmlFor="homeroom-weekly-strengths" className="text-sm font-semibold text-slate-800">
                1. Äiá»ƒm ná»•i báº­t trong tuáº§n (Æ¯u Ä‘iá»ƒm, thÃ nh tÃ­ch, tiáº¿n bá»™)
              </label>
              <textarea
                id="homeroom-weekly-strengths"
                rows={3}
                placeholder="VD: Lá»›p duy trÃ¬ ná» náº¿p truy bÃ i Ä‘áº§u giá» tá»‘t, cÃ¡c báº¡n há»c sinh tÃ­ch cá»±c xÃ¢y dá»±ng bÃ i..."
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
                2. Háº¡n cháº¿ cÃ²n tá»“n táº¡i (CÃ¡c váº¥n Ä‘á» cáº§n cháº¥n chá»‰nh)
              </label>
              <textarea
                id="homeroom-weekly-limitations"
                rows={3}
                placeholder="VD: Má»™t vÃ i báº¡n cÃ²n quÃªn mang sÃ¡ch bÃ i táº­p, cÃ²n hiá»‡n tÆ°á»£ng nÃ³i chuyá»‡n riÃªng trong giá» Khoa há»c..."
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
                3. Káº¿ hoáº¡ch trá»ng tÃ¢m tuáº§n tá»›i
              </label>
              <textarea
                id="homeroom-weekly-plan"
                rows={3}
                placeholder="VD: Kiá»ƒm tra Ä‘á»“ dÃ¹ng há»c táº­p Ä‘áº§u tuáº§n; Phá»‘i há»£p phá»¥ huynh nháº¯c nhá»Ÿ há»c sinh Ã´n táº­p chuáº©n bá»‹ kiá»ƒm tra..."
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
          TAB 4: BÃO CÃO THÃNG (MONTHLY REPORTS)
      ======================================================== */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col gap-6">
          {/* Month/Year Selector Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="homeroom-month-select" className="text-sm font-semibold text-slate-700">ThÃ¡ng:</label>
              <select
                id="homeroom-month-select"
                aria-label="Chá»n thÃ¡ng tá»•ng káº¿t"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-teal-700 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    ThÃ¡ng {m}
                  </option>
                ))}
              </select>

              <label htmlFor="homeroom-year-select" className="text-sm font-semibold text-slate-700">NÄƒm:</label>
              <select
                id="homeroom-year-select"
                aria-label="Chá»n nÄƒm tá»•ng káº¿t"
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
                Xuáº¥t Word (.docx)
              </button>
              <button
                onClick={() => handleExportMonthly('pdf')}
                disabled={exportingMonthlyPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {exportingMonthlyPdf ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 text-rose-600" />}
                Xuáº¥t PDF
              </button>
              <button
                onClick={handleSaveMonthly}
                disabled={savingMonthly}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                {savingMonthly ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                LÆ°u tá»•ng káº¿t thÃ¡ng
              </button>
            </div>
          </div>

          {/* Monthly Aggregation Breakdown */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">ChuyÃªn cáº§n thÃ¡ng</p>
              <p className="mt-2 text-2xl font-bold text-teal-600">
                {monthlySummary?.attendance.attendanceRate || 100}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {monthlySummary?.attendance.totalSchoolDays || 0} ngÃ y há»c Â· {monthlySummary?.attendance.excusedAbsence || 0} phÃ©p Â· {monthlySummary?.attendance.unexcusedAbsence || 0} khÃ´ng phÃ©p
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ná» náº¿p toÃ n thÃ¡ng</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                +{monthlySummary?.behavior.positive || 0}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / -{monthlySummary?.behavior.reminder || 0} nháº¯c nhá»Ÿ
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {monthlySummary?.behavior.needsAttention || 0} trÆ°á»ng há»£p cáº§n lÆ°u Ã½
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">ÄÃ¡nh giÃ¡ há»c táº­p</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {monthlySummary?.learning.excellent || 0} HoÃ n thÃ nh tá»‘t
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {monthlySummary?.learning.completed || 0} HoÃ n thÃ nh Â· {monthlySummary?.learning.needsSupport || 0} Cáº§n há»— trá»£
              </p>
            </div>
          </div>

          {/* Monthly Form */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {monthlyIsDirty && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <AlertCircle className="size-4 shrink-0 text-amber-600" />
                Báº¡n cÃ³ thay Ä‘á»•i chÆ°a Ä‘Æ°á»£c lÆ°u. Vui lÃ²ng báº¥m "LÆ°u tá»•ng káº¿t thÃ¡ng" Ä‘á»ƒ cáº­p nháº­t.
              </div>
            )}

            <div>
              <label htmlFor="homeroom-monthly-highlights" className="text-sm font-semibold text-slate-800">
                1. ThÃ nh tÃ­ch & Äiá»ƒm ná»•i báº­t trong thÃ¡ng
              </label>
              <textarea
                id="homeroom-monthly-highlights"
                rows={3}
                placeholder="VD: Lá»›p Ä‘áº¡t danh hiá»‡u xuáº¥t sáº¯c trong tuáº§n lá»… thi Ä‘ua; 100% há»c sinh hoÃ n thÃ nh bÃ i táº­p..."
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
                2. Háº¡n cháº¿ cáº§n kháº¯c phá»¥c
              </label>
              <textarea
                id="homeroom-monthly-limitations"
                rows={3}
                placeholder="VD: Cáº§n nÃ¢ng cao Ã½ thá»©c tá»± giÃ¡c giá»¯ gÃ¬n vá»‡ sinh lá»›p há»c; Nháº¯c nhá»Ÿ má»™t sá»‘ há»c sinh Ä‘i há»c Ä‘Ãºng giá»..."
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
                3. Káº¿ hoáº¡ch trá»ng tÃ¢m thÃ¡ng tiáº¿p theo
              </label>
              <textarea
                id="homeroom-monthly-plan"
                rows={3}
                placeholder="VD: Tá»• chá»©c thi Ä‘ua chÃ o má»«ng ngÃ y 20/11; Phá»¥ Ä‘áº¡o bá»• trá»£ cho cÃ¡c há»c sinh chÆ°a Ä‘áº¡t chuáº©n..."
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
          MODAL: THÃŠM / Sá»¬A GHI NHáº¬N Ná»€ Náº¾P (WITH QUICK SUGGESTIONS)
      ======================================================== */}
      <Dialog open={showBehaviorModal} onOpenChange={setShowBehaviorModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBehavior ? 'Chá»‰nh sá»­a ghi nháº­n ná» náº¿p' : 'ThÃªm ghi nháº­n ná» náº¿p má»›i'}</DialogTitle>
            <DialogDescription>
              Ghi nháº­n cÃ¡c biá»ƒu hiá»‡n tÃ­ch cá»±c hoáº·c cáº§n nháº¯c nhá»Ÿ cá»§a há»c sinh Ä‘á»ƒ theo dÃµi sá»± tiáº¿n bá»™.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBehavior} className="flex flex-col gap-4">
            {/* Student selection */}
            <div>
              <label htmlFor="homeroom-modal-student-select" className="text-xs font-semibold text-slate-700">Há»c sinh *</label>
              <select
                id="homeroom-modal-student-select"
                aria-label="Chá»n há»c sinh Ä‘á»ƒ ghi nháº­n ná» náº¿p"
                disabled={!!editingBehavior}
                value={behaviorFormStudentId}
                onChange={(e) => setBehaviorFormStudentId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-teal-500"
              >
                <option value="">-- Chá»n há»c sinh trong lá»›p --</option>
                {dashboardData?.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                    {dashboardData.studentsNeedAttention.some((item) => item.studentId === student.id)
                      ? ' (Cáº§n quan tÃ¢m)'
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
                <label htmlFor="homeroom-modal-date" className="text-xs font-semibold text-slate-700">NgÃ y ghi nháº­n *</label>
                <input
                  id="homeroom-modal-date"
                  type="date"
                  value={behaviorFormDate}
                  onChange={(e) => setBehaviorFormDate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label htmlFor="homeroom-modal-category" className="text-xs font-semibold text-slate-700">Danh má»¥c *</label>
                <select
                  id="homeroom-modal-category"
                  aria-label="Chá»n danh má»¥c ná» náº¿p"
                  value={behaviorFormCategory}
                  onChange={(e) => setBehaviorFormCategory(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="LEARNING">Há»c táº­p</option>
                  <option value="DISCIPLINE">Ká»· luáº­t & Tráº­t tá»±</option>
                  <option value="HYGIENE">Vá»‡ sinh & TÃ¡c phong</option>
                  <option value="TEAMWORK">LÃ m viá»‡c nhÃ³m</option>
                  <option value="RESPONSIBILITY">TrÃ¡ch nhiá»‡m</option>
                  <option value="OTHER">KhÃ¡c</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="homeroom-modal-level" className="text-xs font-semibold text-slate-700">Má»©c Ä‘á»™ *</label>
              <select
                id="homeroom-modal-level"
                aria-label="Chá»n má»©c Ä‘á»™ ná» náº¿p"
                value={behaviorFormLevel}
                onChange={(e) => setBehaviorFormLevel(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="POSITIVE">TÃ­ch cá»±c (Biá»ƒu dÆ°Æ¡ng, khen thÆ°á»Ÿng)</option>
                <option value="REMINDER">Cáº§n nháº¯c nhá»Ÿ</option>
                <option value="NEEDS_ATTENTION">Cáº§n quan tÃ¢m Ä‘áº·c biá»‡t</option>
              </select>
            </div>

            {/* Quick Suggestions */}
            <div>
              <p className="text-xs font-semibold text-slate-600">Gá»£i Ã½ nhanh (Báº¥m Ä‘á»ƒ Ä‘iá»n):</p>
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
              <label htmlFor="homeroom-modal-content" className="text-xs font-semibold text-slate-700">Ná»™i dung chi tiáº¿t *</label>
              <textarea
                id="homeroom-modal-content"
                rows={3}
                placeholder="Nháº­p ná»™i dung quan sÃ¡t hoáº·c nháº­n xÃ©t vá» há»c sinh..."
                value={behaviorFormContent}
                onChange={(e) => setBehaviorFormContent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setShowBehaviorModal(false)}>
                Há»§y
              </Button>
              <Button type="submit" disabled={submittingBehavior} className="bg-teal-600 hover:bg-teal-700 text-white">
                {submittingBehavior ? <Loader2 className="size-4 animate-spin" /> : 'LÆ°u ghi nháº­n'}
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
              <AlertTriangle className="size-5" /> XÃ¡c nháº­n xÃ³a ghi nháº­n
            </DialogTitle>
            <DialogDescription>
              Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a ghi nháº­n ná» náº¿p cá»§a há»c sinh{' '}
              <strong>{recordToDelete?.studentName}</strong> khÃ´ng? Thao tÃ¡c nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRecordToDelete(null)}>
              Há»§y
            </Button>
            <Button
              type="button"
              disabled={deletingRecord}
              onClick={handleDeleteBehavior}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingRecord ? <Loader2 className="size-4 animate-spin" /> : 'XÃ¡c nháº­n xÃ³a'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
