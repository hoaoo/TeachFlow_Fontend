export type EducationProfile =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'HIGH_SCHOOL'
  | 'COLLEGE'
  | 'UNIVERSITY'
  | 'CUSTOM'

export interface EducationTerminology {
  teacher: string // 'Giáo viên' | 'Giảng viên' | 'Người dạy'
  teachers: string
  learner: string // 'Học sinh' | 'Sinh viên' | 'Học viên' | 'Người học'
  learners: string
  section: string // 'Lớp' | 'Lớp học phần' | 'Nhóm lớp' | 'Khóa học' | 'Nhóm học'
  sections: string
  course: string // 'Môn học' | 'Học phần' | 'Chương trình' | 'Khóa học'
  courses: string
  session: string // 'Tiết học' | 'Buổi học' | 'Ca học'
  sessions: string
  gradeLevel: string // 'Khối' | 'Khóa' | 'Cấp độ'
  homeroom: string // 'Chủ nhiệm' | 'Cố vấn học tập'
  homeroomTeacher: string // 'Giáo viên chủ nhiệm' | 'Cố vấn học tập'
  parent: string // 'Phụ huynh' | 'Người liên hệ'
  lessonPlan: string // 'Kế hoạch bài dạy (Giáo án)' | 'Kế hoạch bài dạy' | 'Đề cương & Kế hoạch bài giảng' | 'Kế hoạch đào tạo'
  learnerAbbr: string // 'HS' | 'SV' | 'HV' | 'NH'
  teacherAbbr: string // 'GV' | 'GV' | 'ND'
}

export interface EducationCapabilities {
  // Navigation & terminology
  levelLabel: string
  learnerLabel: string // 'Học sinh' | 'Sinh viên' | 'Học viên'
  sectionLabel: string // 'Lớp học' | 'Học phần' | 'Lớp tín chỉ' | 'Khóa học'
  courseLabel: string // 'Môn học' | 'Học phần' | 'Khóa học'
  lessonPlanLabel: string // 'Giáo án' | 'Kế hoạch bài dạy' | 'Đề cương chi tiết'
  sessionLabel: string // 'Tiết dạy' | 'Buổi học' | 'Ca học'

  // Features
  hasHomeroom: boolean // Sổ chủ nhiệm, liên lạc phụ huynh
  hasSeatingPlan: boolean // Sơ đồ chỗ ngồi
  hasPeriods: boolean // Tiết 1..5 cố định (K-12) vs Giờ tự do (Đại học/TT)
  hasCreditSystem: boolean // Hệ thống tín chỉ
  hasAssignments: boolean // Bài tập & nộp bài
  hasQuestionBank: boolean // Ngân hàng câu hỏi & Đề thi trắc nghiệm
  hasRubricGrading: boolean // Đánh giá theo mức/năng lực (HT Tốt, Đạt, CHT)
  hasNumericalGrading: boolean // Thang điểm 10
  hasGpaScale: boolean // Thang điểm 4 & Điểm chữ (A, B, C, D, F)
  hasParentContact: boolean // Sổ liên lạc phụ huynh
  hasSyllabus: boolean // Đề cương môn học
  hasLearningOutcomes: boolean // Chuẩn đầu ra
  hasGradeLevel: boolean // Bắt buộc khối/lớp (Primary/Secondary/High)
}

export const EDUCATION_TERMINOLOGY: Record<EducationProfile, EducationTerminology> = {
  PRIMARY: {
    teacher: 'Giáo viên',
    teachers: 'Giáo viên',
    learner: 'Học sinh',
    learners: 'Học sinh',
    section: 'Lớp',
    sections: 'Lớp học',
    course: 'Môn học',
    courses: 'Môn học',
    session: 'Tiết học',
    sessions: 'Tiết học',
    gradeLevel: 'Khối',
    homeroom: 'Chủ nhiệm',
    homeroomTeacher: 'Giáo viên chủ nhiệm',
    parent: 'Phụ huynh',
    lessonPlan: 'Kế hoạch bài dạy (Giáo án)',
    learnerAbbr: 'HS',
    teacherAbbr: 'GV',
  },
  SECONDARY: {
    teacher: 'Giáo viên',
    teachers: 'Giáo viên',
    learner: 'Học sinh',
    learners: 'Học sinh',
    section: 'Lớp',
    sections: 'Lớp học',
    course: 'Môn học',
    courses: 'Môn học',
    session: 'Tiết học',
    sessions: 'Tiết học',
    gradeLevel: 'Khối',
    homeroom: 'Chủ nhiệm',
    homeroomTeacher: 'Giáo viên chủ nhiệm',
    parent: 'Phụ huynh',
    lessonPlan: 'Kế hoạch bài dạy',
    learnerAbbr: 'HS',
    teacherAbbr: 'GV',
  },
  HIGH_SCHOOL: {
    teacher: 'Giáo viên',
    teachers: 'Giáo viên',
    learner: 'Học sinh',
    learners: 'Học sinh',
    section: 'Lớp',
    sections: 'Lớp học',
    course: 'Môn học',
    courses: 'Môn học',
    session: 'Tiết học',
    sessions: 'Tiết học',
    gradeLevel: 'Khối',
    homeroom: 'Chủ nhiệm',
    homeroomTeacher: 'Giáo viên chủ nhiệm',
    parent: 'Phụ huynh',
    lessonPlan: 'Kế hoạch bài dạy',
    learnerAbbr: 'HS',
    teacherAbbr: 'GV',
  },
  COLLEGE: {
    teacher: 'Giảng viên',
    teachers: 'Giảng viên',
    learner: 'Sinh viên',
    learners: 'Sinh viên',
    section: 'Lớp học phần',
    sections: 'Lớp học phần',
    course: 'Học phần',
    courses: 'Học phần',
    session: 'Buổi học',
    sessions: 'Buổi học',
    gradeLevel: 'Khóa',
    homeroom: 'Cố vấn học tập',
    homeroomTeacher: 'Cố vấn học tập',
    parent: 'Người liên hệ',
    lessonPlan: 'Đề cương & Kế hoạch bài giảng',
    learnerAbbr: 'SV',
    teacherAbbr: 'GV',
  },
  UNIVERSITY: {
    teacher: 'Giảng viên',
    teachers: 'Giảng viên',
    learner: 'Sinh viên',
    learners: 'Sinh viên',
    section: 'Lớp học phần',
    sections: 'Lớp học phần / Nhóm lớp',
    course: 'Học phần',
    courses: 'Học phần',
    session: 'Buổi học',
    sessions: 'Buổi học',
    gradeLevel: 'Khóa',
    homeroom: 'Cố vấn học tập',
    homeroomTeacher: 'Cố vấn học tập',
    parent: 'Người liên hệ',
    lessonPlan: 'Đề cương học phần & Bài giảng',
    learnerAbbr: 'SV',
    teacherAbbr: 'GV',
  },
  CUSTOM: {
    teacher: 'Người dạy',
    teachers: 'Người dạy',
    learner: 'Người học',
    learners: 'Người học',
    section: 'Nhóm học',
    sections: 'Khóa học / Nhóm học',
    course: 'Chương trình',
    courses: 'Chương trình',
    session: 'Buổi học',
    sessions: 'Buổi học',
    gradeLevel: 'Cấp độ',
    homeroom: 'Phụ trách',
    homeroomTeacher: 'Người phụ trách',
    parent: 'Người liên hệ',
    lessonPlan: 'Kế hoạch đào tạo',
    learnerAbbr: 'NH',
    teacherAbbr: 'ND',
  },
}

export const EDUCATION_PROFILES: Record<EducationProfile, EducationCapabilities> = {
  PRIMARY: {
    levelLabel: 'Tiểu học',
    learnerLabel: 'Học sinh',
    sectionLabel: 'Lớp học',
    courseLabel: 'Môn học',
    lessonPlanLabel: 'Kế hoạch bài dạy (Giáo án)',
    sessionLabel: 'Tiết học',
    hasHomeroom: true,
    hasSeatingPlan: true,
    hasPeriods: true,
    hasCreditSystem: false,
    hasAssignments: true,
    hasQuestionBank: true,
    hasRubricGrading: true,
    hasNumericalGrading: true,
    hasGpaScale: false,
    hasParentContact: true,
    hasSyllabus: false,
    hasLearningOutcomes: false,
    hasGradeLevel: true,
  },
  SECONDARY: {
    levelLabel: 'Trung học cơ sở',
    learnerLabel: 'Học sinh',
    sectionLabel: 'Lớp học',
    courseLabel: 'Môn học',
    lessonPlanLabel: 'Kế hoạch bài dạy',
    sessionLabel: 'Tiết học',
    hasHomeroom: true,
    hasSeatingPlan: true,
    hasPeriods: true,
    hasCreditSystem: false,
    hasAssignments: true,
    hasQuestionBank: true,
    hasRubricGrading: true,
    hasNumericalGrading: true,
    hasGpaScale: false,
    hasParentContact: true,
    hasSyllabus: false,
    hasLearningOutcomes: false,
    hasGradeLevel: true,
  },
  HIGH_SCHOOL: {
    levelLabel: 'Trung học phổ thông',
    learnerLabel: 'Học sinh',
    sectionLabel: 'Lớp học',
    courseLabel: 'Môn học',
    lessonPlanLabel: 'Kế hoạch bài dạy',
    sessionLabel: 'Tiết học',
    hasHomeroom: true,
    hasSeatingPlan: true,
    hasPeriods: true,
    hasCreditSystem: false,
    hasAssignments: true,
    hasQuestionBank: true,
    hasRubricGrading: true,
    hasNumericalGrading: true,
    hasGpaScale: false,
    hasParentContact: true,
    hasSyllabus: false,
    hasLearningOutcomes: false,
    hasGradeLevel: true,
  },
  COLLEGE: {
    levelLabel: 'Cao đẳng / Nghề',
    learnerLabel: 'Sinh viên',
    sectionLabel: 'Lớp học phần',
    courseLabel: 'Học phần',
    lessonPlanLabel: 'Đề cương & Kế hoạch bài giảng',
    sessionLabel: 'Buổi học',
    hasHomeroom: false,
    hasSeatingPlan: false,
    hasPeriods: false,
    hasCreditSystem: true,
    hasAssignments: true,
    hasQuestionBank: true,
    hasRubricGrading: true,
    hasNumericalGrading: true,
    hasGpaScale: true,
    hasParentContact: false,
    hasSyllabus: true,
    hasLearningOutcomes: true,
    hasGradeLevel: false,
  },
  UNIVERSITY: {
    levelLabel: 'Đại học',
    learnerLabel: 'Sinh viên',
    sectionLabel: 'Lớp học phần / Tín chỉ',
    courseLabel: 'Học phần',
    lessonPlanLabel: 'Đề cương học phần & Bài giảng',
    sessionLabel: 'Buổi học / Ca',
    hasHomeroom: false,
    hasSeatingPlan: false,
    hasPeriods: false,
    hasCreditSystem: true,
    hasAssignments: true,
    hasQuestionBank: true,
    hasRubricGrading: true,
    hasNumericalGrading: true,
    hasGpaScale: true,
    hasParentContact: false,
    hasSyllabus: true,
    hasLearningOutcomes: true,
    hasGradeLevel: false,
  },
  CUSTOM: {
    levelLabel: 'Trung tâm / Đào tạo tùy biến',
    learnerLabel: 'Học viên',
    sectionLabel: 'Lớp / Khóa học',
    courseLabel: 'Chương trình',
    lessonPlanLabel: 'Kế hoạch đào tạo',
    sessionLabel: 'Buổi học',
    hasHomeroom: false,
    hasSeatingPlan: false,
    hasPeriods: false,
    hasCreditSystem: false,
    hasAssignments: true,
    hasQuestionBank: true,
    hasRubricGrading: true,
    hasNumericalGrading: true,
    hasGpaScale: false,
    hasParentContact: false,
    hasSyllabus: false,
    hasLearningOutcomes: false,
    hasGradeLevel: false,
  },
}

const STORAGE_KEY = 'teachflow_education_profile'

export function getCurrentEducationProfile(): EducationProfile {
  if (typeof window === 'undefined') return 'PRIMARY'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in EDUCATION_PROFILES) {
      return stored as EducationProfile
    }
  } catch {
    // Ignore storage errors
  }
  return 'PRIMARY'
}

export function setEducationProfile(profile: EducationProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, profile)
    window.dispatchEvent(new CustomEvent('teachflow:education-profile-changed', { detail: profile }))
  } catch {
    // Ignore storage errors
  }
}

export function getCapabilities(profile?: EducationProfile): EducationCapabilities {
  const current = profile || getCurrentEducationProfile()
  return EDUCATION_PROFILES[current] || EDUCATION_PROFILES.PRIMARY
}

export function getTerminology(profile?: EducationProfile): EducationTerminology {
  const current = profile || getCurrentEducationProfile()
  return EDUCATION_TERMINOLOGY[current] || EDUCATION_TERMINOLOGY.PRIMARY
}

