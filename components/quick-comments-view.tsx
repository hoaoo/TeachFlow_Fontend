import { useEffect, useState } from 'react';
import { getClasses } from '@/services/classroom-service';
import { getStudents } from '@/services/student-service';
import { getTemplates, type TeacherTemplate } from '@/services/template-service';
import { createBatchComments } from '@/services/quick-comment-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, MessageSquarePlus } from 'lucide-react';

export function QuickCommentsView() {
  const [classes, setClasses] = useState<any[]>([]), [classroomId, setClassroomId] = useState('');
  const [students, setStudents] = useState<any[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TeacherTemplate[]>([]), [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getClasses().then((items:any[]) => { setClasses(items); setClassroomId(items[0]?.id || ''); }).catch(() => setClasses([])); getTemplates('STUDENT_COMMENT').then(setTemplates).catch(() => setTemplates([])); }, []);
  useEffect(() => { if (!classroomId) return; getStudents({ classId: classroomId, pageSize: 100 }).then((result) => setStudents(result.items)).catch(() => setStudents([])); setSelected([]); }, [classroomId]);
  const toggle = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : value.concat(id));
  const save = async () => { if (!classroomId || !selected.length || !content.trim()) return; setSaving(true); try { await createBatchComments(classroomId, selected, content.trim()); toast.success('Đã áp dụng nhận xét cho ' + selected.length + ' học sinh'); setContent(''); setSelected([]); } catch (e:any) { toast.error(e?.message || 'Không thể lưu nhận xét hàng loạt'); } finally { setSaving(false); } };
  return <div className="mx-auto max-w-5xl space-y-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Chủ nhiệm · Workflow</p><h1 className="mt-1 text-2xl font-semibold">Nhận xét nhanh</h1></div><Card><CardHeader><CardTitle className="text-base">Chọn lớp và học sinh</CardTitle></CardHeader><CardContent className="space-y-4"><select className="h-9 rounded-md border px-3 text-sm" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="grid gap-2 sm:grid-cols-2">{students.map((student:any) => <label key={student.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={selected.includes(student.id)} onChange={() => toggle(student.id)} />{student.fullName || student.name}</label>)}</div>{!students.length && <p className="text-xs text-slate-400">Lớp chưa có học sinh.</p>}<div><p className="mb-2 text-xs font-semibold">Mẫu nhận xét của tôi</p><div className="flex flex-wrap gap-2">{templates.map((item) => <Button key={item.id} size="sm" variant="outline" onClick={() => setContent(String(item.content?.text || item.content?.content || item.name))}>{item.name}</Button>)}</div></div><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Con tích cực tham gia hoạt động học tập..." rows={4} /><Button onClick={save} disabled={saving || !selected.length || !content.trim()}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquarePlus className="mr-2 size-4" />}Áp dụng cho {selected.length} học sinh</Button></CardContent></Card></div>;
}
