import { HomeroomView } from '@/components/homeroom-view';

export const metadata = {
  title: 'Báo cáo tổng kết chủ nhiệm | TeachFlow',
  description: 'Tổng hợp và xuất báo cáo công tác chủ nhiệm theo tháng',
};

export default function HomeroomReportsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <HomeroomView initialTab="monthly" />
    </div>
  );
}
