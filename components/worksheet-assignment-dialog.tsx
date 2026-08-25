import { useEffect, useState } from 'react';
import { getClasses } from '@/services/classroom-service';
import { assignWorksheet, type WorksheetItem } from '@/services/worksheet-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

export function WorksheetAssignmentDialog({ worksheet, open, onClose, onAssigned }: { worksheet: WorksheetItem | null; open: boolean; onClose: () => void; onAssigned?: () => void }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    getClasses().then((items) => { setClasses(items as any[]); setClassroomId((items as any[])[0]?.id || ''); }).catch(() => setClasses([]));
  }, [open]);
  const submit = async () => {
    if (!worksheet || !classroomId) return;
    setLoading(true);
    try {
      await assignWorksheet(worksheet.id, { classroomId, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined, note: note.trim() || undefined });
      toast.success('Đã giao phiếu cho lớp');
      onAssigned?.(); onClose();
    } catch (error: any) { toast.error(error?.message || 'Không thể giao phiếu cho lớp'); }
    finally { setLoading(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Giao phiếu: {worksheet?.title}</DialogTitle><DialogDescription>Chọn lớp và thông tin giao bài. Phiếu gốc không bị thay đổi.</DialogDescription></DialogHeader>
      <div className="grid gap-3 py-2">
        <div><Label>Lớp</Label><select className="mt-1 h-9 w-full rounded-md border px-3 text-sm" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div><Label>Hạn hoàn thành (không bắt buộc)</Label><input className="mt-1 h-9 w-full rounded-md border px-3 text-sm" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
        <div><Label>Ghi chú</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dặn dò thêm cho lớp..." /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button><Button onClick={submit} disabled={loading || !classroomId}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}Giao bài</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
