export type EducationProfile =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'HIGH_SCHOOL'
  | 'COLLEGE'
  | 'UNIVERSITY'
  | 'CUSTOM'

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
