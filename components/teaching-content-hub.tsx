'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Library,
  Files,
  Bookmark,
  Plus,
  Sparkles,
  LayoutGrid,
} from 'lucide-react'
import { LessonView } from '@/components/lesson-editor'
import { LibraryView } from '@/components/library-view'
import { WorksheetManager } from '@/components/worksheet-manager'
import { TemplatesView } from '@/components/templates-view'
import { getCapabilities } from '@/lib/capabilities'

export type TeachingContentTab = 'lessons' | 'activities' | 'worksheets' | 'templates'

interface TeachingContentHubProps {
  initialTab?: TeachingContentTab
  onNavigate?: (view: any, targetId?: string) => void
}

export function TeachingContentHub({
  initialTab = 'lessons',
  onNavigate,
}: TeachingContentHubProps) {
  const [activeTab, setActiveTab] = useState<TeachingContentTab>(initialTab)
  const capabilities = getCapabilities()

  const tabs: Array<{ id: TeachingContentTab; label: string; icon: React.ElementType; description: string }> = [
    {
      id: 'lessons',
      label: capabilities.lessonPlanLabel,
      icon: BookOpen,
      description: 'Soạn thảo, quản lý bài dạy, kế hoạch bài học và đề cương',
    },
    {
      id: 'activities',
      label: 'Thư viện hoạt động',
      icon: Library,
      description: 'Kho hoạt động học tập tương tác, khởi động, luyện tập',
    },
    {
      id: 'worksheets',
      label: 'Phiếu học tập',
      icon: Files,
      description: 'Bài tập in ấn, phiếu giao việc và câu hỏi ôn luyện',
    },
    {
      id: 'templates',
      label: 'Mẫu giảng dạy',
      icon: Bookmark,
      description: 'Mẫu khung kế hoạch bài dạy chuẩn theo chương trình đào tạo',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Nội dung giảng dạy
          </h1>
          <p className="text-xs text-slate-500">
            Quản lý {capabilities.lessonPlanLabel.toLowerCase()}, hoạt động tương tác, phiếu giao việc và mẫu bài giảng.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[600px]">
        {activeTab === 'lessons' && <LessonView onNavigate={onNavigate as any} />}
        {activeTab === 'activities' && <LibraryView onNavigate={onNavigate as any} />}
        {activeTab === 'worksheets' && <WorksheetManager />}
        {activeTab === 'templates' && <TemplatesView />}
      </div>
    </div>
  )
}
