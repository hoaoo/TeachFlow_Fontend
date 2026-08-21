export const navItems = [
  { label: 'Tổng quan', icon: 'LayoutDashboard' },
  { label: 'Lịch dạy', icon: 'CalendarDays' },
  { label: 'Giáo án', icon: 'BookOpen' },
  { label: 'Thư viện hoạt động', icon: 'Library' },
  { label: 'Lớp học', icon: 'Users' },
  { label: 'Học sinh', icon: 'GraduationCap' },
  { label: 'Phiếu học tập', icon: 'Files' },
  { label: 'Đánh giá', icon: 'ClipboardCheck' },
  { label: 'Chủ nhiệm', icon: 'School' },
  { label: 'Điểm danh', icon: 'CheckCircle2' },
  { label: 'Báo cáo & Thống kê', icon: 'FileText' },
  { label: 'Tài nguyên', icon: 'Files' },
  { label: 'Cài đặt', icon: 'Settings' },
  { label: 'Trợ lý AI', icon: 'Sparkles' },
]

export const lessons = [
  { time: '07:30', subject: 'Toán', title: 'Phân số bằng nhau', className: '4A', room: 'Phòng 204', color: 'teal' },
  { time: '09:15', subject: 'Tiếng Việt', title: 'Luyện tập miêu tả cây cối', className: '4A', room: 'Phòng 204', color: 'orange' },
  { time: '14:00', subject: 'Khoa học', title: 'Âm thanh trong cuộc sống', className: '4B', room: 'Phòng 101', color: 'blue' },
]

export const tasks = [
  { id: 'task-1', title: 'Hoàn thiện giáo án Toán - Tuần 3', due: 'Hôm nay', done: true },
  { id: 'task-2', title: 'Nhận xét học sinh tháng 8', due: 'Còn 2 ngày', done: false },
  { id: 'task-3', title: 'Chuẩn bị phiếu học tập Tiếng Việt', due: 'Thứ Sáu', done: false },
  { id: 'task-4', title: 'Cập nhật sổ chủ nhiệm', due: 'Thứ Sáu', done: false },
]

export const students = [
  { name: 'Minh Anh', initials: 'MA', progress: 92, status: 'Tốt', color: 'bg-teal-100 text-teal-700' },
  { name: 'Gia Huy', initials: 'GH', progress: 86, status: 'Tốt', color: 'bg-blue-100 text-blue-700' },
  { name: 'Khánh Linh', initials: 'KL', progress: 78, status: 'Khá', color: 'bg-orange-100 text-orange-700' },
  { name: 'Đức Minh', initials: 'ĐM', progress: 70, status: 'Cần cố gắng', color: 'bg-rose-100 text-rose-700' },
]

export const activities = [
  { title: 'Bingo phân số', subject: 'Toán', grade: 'Lớp 4', type: 'Trò chơi', uses: 128, icon: 'Grid2X2' },
  { title: 'Chiếc hộp bí mật', subject: 'Tiếng Việt', grade: 'Lớp 3-5', type: 'Khởi động', uses: 96, icon: 'Gift' },
  { title: 'Nhà khoa học nhí', subject: 'Khoa học', grade: 'Lớp 4', type: 'Khám phá', uses: 74, icon: 'FlaskConical' },
]
