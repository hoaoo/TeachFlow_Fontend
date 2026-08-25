'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  ArrowRight,
  School,
  Copy,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  History,
} from 'lucide-react';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface SchoolYearRolloverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchoolYear?: { id: string; name: string; startDate?: string; endDate?: string } | null;
  onRolloverSuccess?: () => void;
}

export function SchoolYearRolloverModal({
  open,
  onOpenChange,
  currentSchoolYear,
  onRolloverSuccess,
}: SchoolYearRolloverModalProps) {
  const currentName = currentSchoolYear?.name || '2026 - 2027';

  // Compute suggested next year name
  const nextYearSuggestion = (() => {
    const parts = currentName.match(/\d{4}/g);
    if (parts && parts.length >= 2) {
      const y1 = parseInt(parts[0], 10) + 1;
      const y2 = parseInt(parts[1], 10) + 1;
      return `${y1} - ${y2}`;
    }
    return '2027 - 2028';
  })();

  const [newName, setNewName] = useState(nextYearSuggestion);
  const [startDate, setStartDate] = useState('2027-09-01');
  const [endDate, setEndDate] = useState('2028-05-31');
  const [closeSourceYear, setCloseSourceYear] = useState(true);
  const [setAsCurrent, setSetAsCurrent] = useState(true);
  const [copyClassrooms, setCopyClassrooms] = useState(true);
  const [copyClassSubjects, setCopyClassSubjects] = useState(true);
  const [copyLessonPlanTemplates, setCopyLessonPlanTemplates] = useState(false);
  const [copyWorksheetTemplates, setCopyWorksheetTemplates] = useState(false);
  const [copyCommentTemplates, setCopyCommentTemplates] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRollover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchoolYear?.id) {
      toast.error('Không tìm thấy năm học nguồn hiện tại');
      return;
    }
    if (!newName.trim()) {
      toast.error('Vui lòng nhập tên năm học mới');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ summary: any }>('/school-years/rollover', {
        sourceSchoolYearId: currentSchoolYear.id,
        name: newName.trim(),
        startDate,
        endDate,
        closeSourceYear,
        setAsCurrent,
        copyClassrooms,
        copyClassSubjects,
        copyLessonPlanTemplates,
        copyWorksheetTemplates,
        copyCommentTemplates,
      });

      toast.success(
        `Chuyển sang năm học "${newName}" thành công! Đã sao chép ${res.summary?.copiedClassroomsCount || 0} lớp học.`,
      );
      onRolloverSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Lỗi chuyển năm học: ' + (err?.message || 'Thử lại sau'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <School className="size-5 text-teal-600" />
            Đóng & Chuyển sang năm học mới
          </DialogTitle>
          <DialogDescription>
            Nghiệp vụ chuyển giao năm học: Dữ liệu năm cũ được lưu trữ toàn vẹn, đồng thời tạo môi trường mới cho năm học kế tiếp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRollover} className="space-y-4 py-2">
          {/* Year transition display */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Năm học hiện tại</span>
              <p className="text-sm font-bold text-slate-800">{currentName}</p>
            </div>
            <ArrowRight className="size-5 text-teal-600" />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Năm học mới</span>
              <p className="text-sm font-bold text-teal-700">{newName || '...'}</p>
            </div>
          </div>

          {/* New Year Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-slate-700">Tên năm học mới</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ví dụ: 2027 - 2028"
                className="mt-1"
                required
              />
            </div>
            <div className="sm:col-span-1">
              <Label className="text-xs font-semibold text-slate-700">Ngày bắt đầu</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Ngày kết thúc</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>
          </div>

          {/* Copy Options */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Tùy chọn sao chép cấu hình sang năm mới:
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyClassrooms}
                  onChange={(e) => setCopyClassrooms(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>Cấu hình danh sách lớp</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyClassSubjects}
                  onChange={(e) => setCopyClassSubjects(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>Môn học phụ trách các lớp</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyLessonPlanTemplates}
                  onChange={(e) => setCopyLessonPlanTemplates(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>Mẫu giáo án của tôi</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyCommentTemplates}
                  onChange={(e) => setCopyCommentTemplates(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>Mẫu nhận xét học sinh</span>
              </label>
            </div>

            <div className="mt-2 space-y-1.5 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={closeSourceYear}
                  onChange={(e) => setCloseSourceYear(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>Đóng năm học cũ {currentName} (không nhận ghi điểm/điểm danh mới)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={setAsCurrent}
                  onChange={(e) => setSetAsCurrent(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>Đặt năm học mới {newName} làm năm học hiện tại</span>
              </label>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <b>Lưu ý bảo toàn dữ liệu:</b> Điểm danh, kết quả đánh giá, nề nếp và bài tập cũ của năm {currentName} sẽ không bị sao chép sang năm mới nhằm đảm bảo tính độc lập giữa các niên khóa.
            </span>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Xác nhận chuyển năm học
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
