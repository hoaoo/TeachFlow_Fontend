import { useEffect, useMemo, useState } from 'react';
import { getClasses } from '@/services/classroom-service';
import { createSeatingPlan, getSeatingPlans, randomizeSeatingPlan, resetSeatingPlan, updateSeatingPlan, type SeatingPlan } from '@/services/seating-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Grid2X2, Loader2, Shuffle, RotateCcw, Save } from 'lucide-react';

export function SeatingPlanView() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('Sơ đồ chính');
  const [rows, setRows] = useState(4);
  const [columns, setColumns] = useState(4);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getClasses().then((items: any[]) => { setClasses(items); setClassroomId(items[0]?.id || ''); }).catch(() => setClasses([])).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!classroomId) return; getSeatingPlans(classroomId).then((items) => { const item = items[0]; setPlan(item || null); setPlanId(item?.id || ''); if (item) { setName(item.name); setRows(item.rows); setColumns(item.columns); } }).catch(() => setPlan(null)); }, [classroomId]);

  const layout = plan?.layout || [];
  const occupied = useMemo(() => new Map(layout.map((item) => [item.row + ':' + item.column, item])), [layout]);
  const seats = Array.from({ length: rows * columns }, (_, index) => ({ row: Math.floor(index / columns), column: index % columns }));
  const save = async () => {
    if (!classroomId) return;
    setSaving(true);
    try { const next = planId ? await updateSeatingPlan(planId, { name, rows, columns, layout }) : await createSeatingPlan({ classroomId, name, rows, columns, layout }); setPlan(next); setPlanId(next.id); toast.success('Đã lưu sơ đồ chỗ ngồi'); }
    catch (error: any) { toast.error(error?.message || 'Không thể lưu sơ đồ'); } finally { setSaving(false); }
  };
  const place = (seat: any) => {
    if (!selectedStudent || !plan) return;
    const next = layout.filter((item) => item.studentId !== selectedStudent && !(item.row === seat.row && item.column === seat.column));
    setPlan({ ...plan, layout: next.concat([{ studentId: selectedStudent, row: seat.row, column: seat.column }]) });
    setSelectedStudent(null);
  };
  const currentStudents = plan?.students || classes.find((item) => item.id === classroomId)?.students || [];
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-teal-600" /></div>;
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Lớp học · Sơ đồ</p><h1 className="mt-1 text-2xl font-semibold">Sơ đồ chỗ ngồi</h1><p className="mt-1 text-sm text-slate-500">Chọn học sinh rồi chọn vị trí để xếp chỗ.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Grid2X2 className="size-5 text-teal-600" /> Thiết lập</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4">
      <select className="h-9 rounded-md border px-3 text-sm" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên sơ đồ" /><Input type="number" min={1} max={30} value={rows} onChange={(e) => setRows(Number(e.target.value))} /><Input type="number" min={1} max={30} value={columns} onChange={(e) => setColumns(Number(e.target.value))} />
      <div className="flex gap-2 sm:col-span-4"><Button onClick={save} disabled={saving || !classroomId}><Save className="mr-1.5 size-4" />Lưu</Button><Button variant="outline" onClick={async () => planId && setPlan(await randomizeSeatingPlan(planId))} disabled={!planId}><Shuffle className="mr-1.5 size-4" />Tự xếp</Button><Button variant="outline" onClick={async () => planId && setPlan(await resetSeatingPlan(planId))} disabled={!planId}><RotateCcw className="mr-1.5 size-4" />Reset</Button></div>
    </CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]"><Card><CardHeader><CardTitle className="text-sm">Học sinh</CardTitle></CardHeader><CardContent className="space-y-2">{currentStudents.map((student: any) => <button key={student.id} onClick={() => setSelectedStudent(student.id)} className={'w-full rounded-lg border px-3 py-2 text-left text-sm ' + (selectedStudent === student.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200')}>{student.fullName || student.name}</button>)}{!currentStudents.length && <p className="text-xs text-slate-400">Lớp chưa có học sinh.</p>}</CardContent></Card>
      <Card><CardContent className="p-5"><div className="mb-5 rounded bg-slate-800 py-2 text-center text-xs font-semibold text-white">BẢNG</div><div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }}>{seats.map((seat) => { const item: any = occupied.get(seat.row + ':' + seat.column); const student = item && currentStudents.find((s: any) => s.id === item.studentId); return <button key={seat.row + '-' + seat.column} onClick={() => place(seat)} className="min-h-16 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-xs hover:border-teal-400">{student?.fullName || <span className="text-slate-400">Trống</span>}</button>; })}</div></CardContent></Card>
    </div>
  </div>;
}
