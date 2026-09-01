import { api } from './api-client'

export type HtmlGameStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED'

export type HtmlGameThumbnail = {
  url: string
  alt?: string
}

export type HtmlGame = {
  id: string
  title: string
  description?: string | null
  thumbnail?: HtmlGameThumbnail | null
  gradeId?: string | null
  grade?: { id: string; name: string } | null
  subjectId?: string | null
  subject?: { id: string; name: string } | null
  entryFile: string
  status: HtmlGameStatus
  supportsQuestionConfig: boolean
  configSchemaVersion?: number | null
  customizationId?: string | null
  createdBy?: { id: string; email: string } | null
  createdAt: string
  updatedAt: string
  package?: { fileCount: number; totalSize: number }
}

export type HtmlGamePlay = {
  id: string
  title: string
  playUrl: string
  sandbox: string
  referrerPolicy: 'no-referrer'
  supportsQuestionConfig: boolean
  configSchemaVersion?: number | null
  customizationId?: string
  questions?: HtmlGameQuestion[]
}

export type HtmlGamePayload = {
  title: string
  description?: string | null
  thumbnail?: HtmlGameThumbnail | null
  gradeId?: string | null
  subjectId?: string | null
  supportsQuestionConfig?: boolean
  configSchemaVersion?: number | null
}

export type HtmlGameQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'

export type HtmlGameQuestion = {
  id: string
  order: number
  question: string
  type: HtmlGameQuestionType
  options?: string[] | null
  correctAnswer: string | string[] | boolean
  explanation?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export type HtmlGameQuestionPayload = Omit<HtmlGameQuestion, 'id' | 'createdAt' | 'updatedAt'>

export type TeacherHtmlGame = {
  id: string
  htmlGameId: string
  teacherId: string
  title?: string | null
  htmlGame: HtmlGame
  questions: HtmlGameQuestion[]
  createdAt: string
  updatedAt: string
}

export async function getHtmlGames(params?: {
  search?: string
  gradeId?: string
  subjectId?: string
  status?: HtmlGameStatus
}): Promise<HtmlGame[]> {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.gradeId) query.set('gradeId', params.gradeId)
  if (params?.subjectId) query.set('subjectId', params.subjectId)
  if (params?.status) query.set('status', params.status)
  const suffix = query.size ? `?${query.toString()}` : ''
  const games = await api.get<HtmlGame[]>(`/html-games${suffix}`)
  return Array.isArray(games) ? games : []
}

export function getHtmlGame(id: string): Promise<HtmlGame> {
  return api.get<HtmlGame>(`/html-games/${id}`)
}

export function getHtmlGamePlay(id: string): Promise<HtmlGamePlay> {
  return api.get<HtmlGamePlay>(`/html-games/${id}/play`)
}

export function createHtmlGame(payload: HtmlGamePayload): Promise<HtmlGame> {
  return api.post<HtmlGame>('/admin/html-games', payload)
}

export function updateHtmlGame(id: string, payload: Partial<HtmlGamePayload>): Promise<HtmlGame> {
  return api.patch<HtmlGame>(`/admin/html-games/${id}`, payload)
}

export function updateHtmlGameStatus(id: string, status: HtmlGameStatus): Promise<HtmlGame> {
  return api.patch<HtmlGame>(`/admin/html-games/${id}/status`, { status })
}

export function uploadHtmlGamePackage(id: string, file: File): Promise<HtmlGame> {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<HtmlGame>(`/admin/html-games/${id}/package`, form)
}

export function uploadHtmlGameSource(id: string, html: string): Promise<HtmlGame> {
  return api.post<HtmlGame>(`/admin/html-games/${id}/source`, { html })
}

export function getAdminHtmlGameQuestions(id: string): Promise<HtmlGameQuestion[]> {
  return api.get(`/admin/html-games/${id}/questions`)
}

export function createAdminHtmlGameQuestion(id: string, payload: HtmlGameQuestionPayload): Promise<HtmlGameQuestion> {
  return api.post(`/admin/html-games/${id}/questions`, payload)
}

export function updateAdminHtmlGameQuestion(id: string, questionId: string, payload: Partial<HtmlGameQuestionPayload>): Promise<HtmlGameQuestion> {
  return api.patch(`/admin/html-games/${id}/questions/${questionId}`, payload)
}

export function deleteAdminHtmlGameQuestion(id: string, questionId: string) {
  return api.delete(`/admin/html-games/${id}/questions/${questionId}`)
}

export function reorderAdminHtmlGameQuestions(id: string, questionIds: string[]): Promise<HtmlGameQuestion[]> {
  return api.put(`/admin/html-games/${id}/questions/reorder`, { questionIds })
}

export function createOrGetHtmlGameCustomization(htmlGameId: string): Promise<TeacherHtmlGame> {
  return api.post(`/html-games/${htmlGameId}/customizations`)
}

export function getHtmlGameCustomization(id: string): Promise<TeacherHtmlGame> {
  return api.get(`/html-game-customizations/${id}`)
}

export function getHtmlGameCustomizationPlay(id: string): Promise<HtmlGamePlay> {
  return api.get(`/html-game-customizations/${id}/play`)
}

export function updateHtmlGameCustomization(id: string, title: string | null): Promise<TeacherHtmlGame> {
  return api.patch(`/html-game-customizations/${id}`, { title })
}

export function createCustomizationQuestion(id: string, payload: HtmlGameQuestionPayload): Promise<HtmlGameQuestion> {
  return api.post(`/html-game-customizations/${id}/questions`, payload)
}

export function updateCustomizationQuestion(id: string, questionId: string, payload: Partial<HtmlGameQuestionPayload>): Promise<HtmlGameQuestion> {
  return api.patch(`/html-game-customizations/${id}/questions/${questionId}`, payload)
}

export function deleteCustomizationQuestion(id: string, questionId: string) {
  return api.delete(`/html-game-customizations/${id}/questions/${questionId}`)
}

export function reorderCustomizationQuestions(id: string, questionIds: string[]): Promise<TeacherHtmlGame> {
  return api.put(`/html-game-customizations/${id}/questions/reorder`, { questionIds })
}

export function deleteHtmlGame(id: string): Promise<{ success: boolean; message: string }> {
  return api.delete(`/admin/html-games/${id}`)
}

export function attachHtmlGameToLessonPlan(lessonPlanId: string, htmlGameId: string): Promise<HtmlGame> {
  return api.post<HtmlGame>(`/lesson-plans/${lessonPlanId}/html-games/${htmlGameId}`)
}

export function attachHtmlGameCustomizationToLessonPlan(lessonPlanId: string, customizationId: string) {
  return api.post(`/lesson-plans/${lessonPlanId}/html-game-customizations/${customizationId}`)
}

export function detachHtmlGameFromLessonPlan(lessonPlanId: string, htmlGameId: string) {
  return api.delete(`/lesson-plans/${lessonPlanId}/html-games/${htmlGameId}`)
}

export function getLessonPlanHtmlGames(lessonPlanId: string): Promise<HtmlGame[]> {
  return api.get<HtmlGame[]>(`/lesson-plans/${lessonPlanId}/html-games`)
}

export function isValidHtmlGamePlayUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('blob:')) return true

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return false
    }
    if (parsed.protocol === 'https:') {
      return true
    }
    if (parsed.protocol === 'http:') {
      const isDev = process.env.NODE_ENV !== 'production'
      const isLocalhost =
        ['localhost', '127.0.0.1'].includes(parsed.hostname) ||
        parsed.hostname.endsWith('.localhost')
      return isDev && isLocalhost
    }
    return false
  } catch {
    return false
  }
}

export async function getHtmlGamePlayUrl(id: string, customizationId?: string): Promise<string> {
  if (customizationId) {
    const play = await getHtmlGameCustomizationPlay(customizationId)
    return play.playUrl
  }
  const play = await getHtmlGamePlay(id)
  return play.playUrl
}

