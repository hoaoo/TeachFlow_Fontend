export type StudentRecord = {
  id: string
  name: string
  initials: string
  gender: 'Nam' | 'Nữ'
  dob: string
  guardian: string
  phone: string
  progress: number
  status: 'Tốt' | 'Khá' | 'Cần cố gắng'
  attendance: number
  note: string
  color: string
}

export type ClassRecord = {
  id: string
  name: string
  grade: string
  room: string
  schedule: string
  studentCount: number
  average: number
  attendance: number
  teacher: string
  accent: string
  students: StudentRecord[]
}

export const classroomClasses: ClassRecord[] = [
  {
    id: '4a', name: 'Lớp 4A', grade: 'Khối 4', room: 'Phòng 204', schedule: 'Sáng · Thứ 2 - Thứ 6', studentCount: 32, average: 8.4, attendance: 96, teacher: 'Cô Nguyễn Hà', accent: 'teal',
    students: [
      { id: 'an', name: 'Nguyễn Văn An', initials: 'NA', gender: 'Nam', dob: '12/04/2016', guardian: 'Nguyễn Thị Hoa', phone: '0901 234 567', progress: 92, status: 'Tốt', attendance: 98, note: 'Chủ động phát biểu, hoàn thành bài đúng hạn.', color: 'bg-teal-100 text-teal-700' },
      { id: 'mai', name: 'Trần Mai Anh', initials: 'MA', gender: 'Nữ', dob: '24/08/2016', guardian: 'Trần Văn Minh', phone: '0902 345 678', progress: 88, status: 'Tốt', attendance: 100, note: 'Có tiến bộ rõ trong kỹ năng trình bày.', color: 'bg-blue-100 text-blue-700' },
      { id: 'huy', name: 'Lê Gia Huy', initials: 'GH', gender: 'Nam', dob: '03/02/2016', guardian: 'Lê Thị Lan', phone: '0903 456 789', progress: 86, status: 'Tốt', attendance: 96, note: 'Tư duy tốt, cần rèn thêm tính cẩn thận.', color: 'bg-indigo-100 text-indigo-700' },
      { id: 'linh', name: 'Phạm Khánh Linh', initials: 'KL', gender: 'Nữ', dob: '19/11/2016', guardian: 'Phạm Quốc Dũng', phone: '0904 567 890', progress: 78, status: 'Khá', attendance: 94, note: 'Đọc hiểu tốt, cần mạnh dạn chia sẻ ý kiến.', color: 'bg-orange-100 text-orange-700' },
      { id: 'minh', name: 'Đỗ Đức Minh', initials: 'ĐM', gender: 'Nam', dob: '07/06/2016', guardian: 'Đỗ Thị Hương', phone: '0905 678 901', progress: 70, status: 'Cần cố gắng', attendance: 91, note: 'Cần hỗ trợ thêm khi giải bài toán có lời văn.', color: 'bg-rose-100 text-rose-700' },
      { id: 'ngoc', name: 'Vũ Ngọc Hà', initials: 'NH', gender: 'Nữ', dob: '28/01/2016', guardian: 'Vũ Văn Sơn', phone: '0906 789 012', progress: 82, status: 'Khá', attendance: 97, note: 'Hợp tác tốt trong hoạt động nhóm.', color: 'bg-purple-100 text-purple-700' },
    ],
  },
  {
    id: '4b', name: 'Lớp 4B', grade: 'Khối 4', room: 'Phòng 101', schedule: 'Chiều · Thứ 2 - Thứ 6', studentCount: 30, average: 8.1, attendance: 95, teacher: 'Cô Nguyễn Hà', accent: 'blue',
    students: [
      { id: 'thao', name: 'Nguyễn Minh Thảo', initials: 'MT', gender: 'Nữ', dob: '11/03/2016', guardian: 'Nguyễn Văn Hải', phone: '0911 234 567', progress: 90, status: 'Tốt', attendance: 100, note: 'Tích cực trong hoạt động trải nghiệm.', color: 'bg-blue-100 text-blue-700' },
      { id: 'khoa', name: 'Phan Minh Khoa', initials: 'MK', gender: 'Nam', dob: '16/09/2016', guardian: 'Phan Thị Mai', phone: '0912 345 678', progress: 84, status: 'Tốt', attendance: 97, note: 'Có khả năng hỗ trợ bạn trong nhóm.', color: 'bg-teal-100 text-teal-700' },
      { id: 'yen', name: 'Đặng Hải Yến', initials: 'HY', gender: 'Nữ', dob: '22/05/2016', guardian: 'Đặng Văn Lâm', phone: '0913 456 789', progress: 76, status: 'Khá', attendance: 93, note: 'Cần duy trì thói quen đọc sách mỗi ngày.', color: 'bg-orange-100 text-orange-700' },
    ],
  },
  {
    id: '3a', name: 'Lớp 3A', grade: 'Khối 3', room: 'Phòng 103', schedule: 'Sáng · Thứ 2 - Thứ 6', studentCount: 31, average: 8.6, attendance: 98, teacher: 'Cô Nguyễn Hà', accent: 'orange',
    students: [
      { id: 'quynh', name: 'Nguyễn Bảo Quỳnh', initials: 'BQ', gender: 'Nữ', dob: '02/10/2017', guardian: 'Nguyễn Văn Nam', phone: '0921 234 567', progress: 94, status: 'Tốt', attendance: 100, note: 'Nắm bài nhanh và trình bày sạch đẹp.', color: 'bg-orange-100 text-orange-700' },
      { id: 'long', name: 'Trần Hoàng Long', initials: 'HL', gender: 'Nam', dob: '13/07/2017', guardian: 'Trần Thị Hạnh', phone: '0922 345 678', progress: 81, status: 'Khá', attendance: 96, note: 'Cần chú ý nghe hướng dẫn trước khi làm bài.', color: 'bg-teal-100 text-teal-700' },
    ],
  },
]

export const commentSuggestions = ['Em có tiến bộ rõ rệt trong tuần này.', 'Em tích cực hợp tác cùng các bạn.', 'Em cần rèn thêm kỹ năng trình bày bài.', 'Cô ghi nhận sự cố gắng của em.']

export const attendanceEvents = [
  { date: '20/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
  { date: '19/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
  { date: '18/08/2026', type: 'Đi muộn', note: 'Muộn 10 phút' },
  { date: '17/08/2026', type: 'Có mặt', note: 'Đúng giờ' },
]

export const learningProgress = [
  { subject: 'Toán', score: 9.1, trend: '+0.6', color: 'bg-teal-500' },
  { subject: 'Tiếng Việt', score: 8.7, trend: '+0.4', color: 'bg-blue-500' },
  { subject: 'Khoa học', score: 8.9, trend: '+0.8', color: 'bg-orange-500' },
  { subject: 'Lịch sử & Địa lý', score: 8.2, trend: '+0.2', color: 'bg-purple-500' },
]
