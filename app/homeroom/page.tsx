import { HomeroomView } from '@/components/homeroom-view';

export const metadata = {
  title: 'Chủ nhiệm lớp | TeachFlow',
  description: 'Quản lý công tác chủ nhiệm lớp học tiểu học',
};

export default function HomeroomPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <HomeroomView initialTab="overview" />
    </div>
  );
}
