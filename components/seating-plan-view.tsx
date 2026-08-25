import { useEffect, useMemo, useState } from 'react';
import { getClasses } from '@/services/classroom-service';
import { createSeatingPlan, getSeatingPlans, updateSeatingPlan, type SeatingPlan, type SeatingPosition } from '@/services/seating-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Grid2X2, Loader2, Shuffle, RotateCcw, Save, Armchair } from 'lucide-react';

const keyOf = (p: { row: number; column: number; seatIndex?: number }) => `${p.row}:${p.column}:${p.seatIndex ?? 0}`;

export function SeatingPlanView() {
  const [classes, setClasses] = useState<any[]>([]), [classroomId, setClassroomId] = useState('');
  const [plan, setPlan] = useState<SeatingPlan | null>(null), [planId, setPlanId] = useState('');
  const [name, setName] = useState('Sơ đồ chính'), [rows, setRows] = useState(4), [columns, setColumns] = useState(3), [seatsPerDesk, setSeatsPerDesk] = useState(2);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);

  useEffect(() => { getClasses().then((items: any[]) => { setClasses(items); setClassroomId(items[0]?.id || ''); }).catch(() => setClasses([])).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!classroomId) return; getSeatingPlans(classroomId).then((items) => { const item = items[0]; setPlan(item || null); setPlanId(item?.id || ''); if (item) { setName(item.name); setRows(item.rows); setColumns(item.columns); setSeatsPerDesk(item.seatsPerDesk || 2); } else { setPlan({ id: '', classroomId, name, rows, columns, seatsPerDesk, layout: [], students: [] }); } }).catch(() => setPlan(null)); }, [classroomId]);

  const currentStudents = plan?.students?.length ? plan.students : classes.find((item) => item.id === classroomId)?.students || [];
  const layout = plan?.layout || [];
  const occupied = useMemo(() => new Map(layout.map((item) => [keyOf(item), item])), [layout]);
  const desks = Array.from({ length: Math.max(1, rows * columns) }, (_, index) => ({ row: Math.floor(index / columns), column: index % columns, number: index + 1 }));
  const updateLocal = (nextLayout: SeatingPosition[]) => setPlan((old) => old ? { ...old, name, rows, columns, seatsPerDesk, layout: nextLayout } : old);

  const save = async () => { if (!classroomId || !plan) return; setSaving(true); try { const payload = { classroomId, name: name.trim(), rows, columns, seatsPerDesk, layout: plan.layout.map(({ student, stale, ...p }: any) => p) }; const next = planId ? await updateSeatingPlan(planId, payload) : await createSeatingPlan(payload); setPlan(next); setPlanId(next.id); toast.success('Đã lưu sơ đồ chỗ ngồi'); } catch (error: any) { toast.error(error?.message || 'Không thể lưu sơ đồ'); } finally { setSaving(false); } };
  const place = (row: number, column: number, seatIndex: number) => { if (!selectedStudent || !plan) return; const target = { row, column, seatIndex }; const occupant = occupied.get(keyOf(target)); const next = layout.filter((item) => item.studentId !== selectedStudent && item.studentId !== occupant?.studentId && keyOf(item) !== keyOf(target)); updateLocal(next.concat([{ studentId: selectedStudent, ...target }])); setSelectedStudent(null); };
  const randomize = () => { const available = [...currentStudents].sort(() => Math.random() - 0.5); const seats = desks.flatMap((desk) => Array.from({ length: seatsPerDesk }, (_, seatIndex) => ({ ...desk, seatIndex }))); updateLocal(available.slice(0, seats.length).map((student: any, index) => ({ studentId: student.id, row: seats[index].row, column: seats[index].column, seatIndex: seats[index].seatIndex }))); };
  const reset = () => updateLocal([]);
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-teal-600" /></div>;
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Lớp học · Sơ đồ</p><h1 className="mt-1 text-2xl font-semibold">Sơ đồ chỗ ngồi</h1><p className="mt-1 text-sm text-slate-500">Chọn học sinh rồi chọn ghế để xếp chỗ. Thay đổi chỉ được lưu khi nhấn Lưu.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Grid2X2 className="size-5 text-teal-600" /> Thiết lập sơ đồ</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-5">
      <select className="h-9 rounded-md border px-3 text-sm" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên sơ đồ" /><label className="text-xs text-slate-600">Số dãy<Input type="number" min={1} max={12} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} /></label><label className="text-xs text-slate-600">Số bàn mỗi dãy<Input type="number" min={1} max={12} value={columns} onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))} /></label><label className="text-xs text-slate-600">Ghế mỗi bàn<select className="mt-1 h-9 w-full rounded-md border px-3 text-sm" value={seatsPerDesk} onChange={(e) => setSeatsPerDesk(Number(e.target.value))}><option value={2}>Bàn 2 ghế</option><option value={4}>Bàn 4 ghế</option></select></label>
      <div className="flex flex-wrap gap-2 sm:col-span-5"><Button onClick={save} disabled={saving || !classroomId}><Save className="mr-1.5 size-4" />Lưu</Button><Button variant="outline" onClick={randomize} disabled={!classroomId}><Shuffle className="mr-1.5 size-4" />Tự xếp</Button><Button variant="outline" onClick={reset} disabled={!classroomId}><RotateCcw className="mr-1.5 size-4" />Đặt lại</Button></div>
    </CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]"><Card><CardHeader><CardTitle className="text-sm">Học sinh</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-xs text-slate-500">{selectedStudent ? 'Đã chọn học sinh · chọn ghế bên phải' : 'Chọn một học sinh'}</p>{currentStudents.map((student: any) => <button key={student.id} onClick={() => setSelectedStudent(student.id)} className={'w-full rounded-lg border px-3 py-2 text-left text-sm ' + (selectedStudent === student.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200')}>{student.fullName || student.name}</button>)}{!currentStudents.length && <p className="text-xs text-slate-400">Lớp chưa có học sinh.</p>}</CardContent></Card>
      <Card><CardContent className="p-5"><div className="mb-5 rounded bg-slate-800 py-2 text-center text-xs font-semibold text-white">BẢNG</div><div className="space-y-4">{desks.map((desk) => <div key={`${desk.row}-${desk.column}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Armchair className="size-4" /> Bàn {desk.number}</div><div className={'grid gap-2 ' + (seatsPerDesk === 4 ? 'grid-cols-2' : 'grid-cols-2')}>{Array.from({ length: seatsPerDesk }, (_, seatIndex) => { const item: any = occupied.get(`${desk.row}:${desk.column}:${seatIndex}`); const student = item && currentStudents.find((s: any) => s.id === item.studentId); return <button key={seatIndex} onClick={() => place(desk.row, desk.column, seatIndex)} className="min-h-14 rounded-lg border border-dashed border-slate-300 bg-white p-2 text-xs hover:border-teal-400"><span className="block text-[10px] text-slate-400">Ghế {seatIndex + 1}</span>{student?.fullName || <span className="text-slate-400">Trống</span>}</button>; })}</div></div>)}</div></CardContent></Card>
    </div>
  </div>;
}