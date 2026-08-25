import { useEffect, useState } from 'react';
import { getTemplates, useTemplate, type TeacherTemplate } from '@/services/template-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BookmarkPlus, Loader2 } from 'lucide-react';
const labels: Record<string, string> = { LESSON_PLAN: 'Giáo án', WORKSHEET: 'Phiếu học tập', STUDENT_COMMENT: 'Nhận xét', TEACHING_ACTIVITY: 'Hoạt động' };
export function TemplatesView() {
  const [items, setItems] = useState<TeacherTemplate[]>([]), [loading, setLoading] = useState(true), [using, setUsing] = useState<string | null>(null);
  const load = () => { setLoading(true); getTemplates().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); };
  useEffect(load, []);
  const handleUse = async (item: TeacherTemplate) => { setUsing(item.id); try { const result = await useTemplate(item.id); toast.success(result?.draft ? 'Đã tạo bản nháp độc lập từ mẫu' : 'Đã mở nội dung mẫu'); } catch (e:any) { toast.error(e?.message || 'Không thể dùng mẫu'); } finally { setUsing(null); } };
  return <div className="mx-auto max-w-5xl space-y-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Thư viện cá nhân</p><h1 className="mt-1 text-2xl font-semibold">Mẫu của tôi</h1><p className="mt-1 text-sm text-slate-500">Mẫu chỉ thuộc tài khoản giáo viên hiện tại.</p></div>{loading ? <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-teal-600" /></div> : items.length === 0 ? <Card><CardContent className="py-16 text-center text-sm text-slate-400">Bạn chưa lưu mẫu nào. Hãy dùng “Lưu thành mẫu” từ giáo án hoặc phiếu học tập.</CardContent></Card> : <div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <Card key={item.id}><CardHeader className="pb-3"><CardTitle className="text-base">{item.name}</CardTitle><p className="text-xs text-teal-700">{labels[item.type] || item.type}</p></CardHeader><CardContent><p className="mb-3 text-xs text-slate-500">{item.description || 'Mẫu cá nhân có thể tái sử dụng.'}</p><Button size="sm" onClick={() => handleUse(item)} disabled={using === item.id}><BookmarkPlus className="mr-1.5 size-4" />{using === item.id ? 'Đang tạo...' : 'Dùng mẫu'}</Button></CardContent></Card>)}</div>}</div>;
}
