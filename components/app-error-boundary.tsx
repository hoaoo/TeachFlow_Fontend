'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clearAuthTokens } from '@/services/api-client'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught React render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleLogoutAndReset = async () => {
    try {
      await clearAuthTokens()
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="size-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra sự cố hiển thị</h1>
          <p className="text-sm text-slate-600 max-w-md mb-6">
            Giao diện TeachFlow gặp lỗi không mong muốn. Dữ liệu của thầy cô vẫn an toàn. Hãy thử tải lại ứng dụng hoặc đăng nhập lại.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.handleReset}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-2 cursor-pointer"
            >
              <RefreshCw className="size-3.5" /> Thử lại
            </Button>
            <Button
              variant="outline"
              onClick={this.handleReload}
              className="text-xs gap-2 cursor-pointer border-slate-300"
            >
              <Home className="size-3.5" /> Tải lại trang
            </Button>
            <Button
              variant="ghost"
              onClick={this.handleLogoutAndReset}
              className="text-xs gap-2 cursor-pointer text-slate-500 hover:text-rose-600"
            >
              <LogOut className="size-3.5" /> Về trang đăng nhập
            </Button>
          </div>
          {this.state.error && (
            <details className="mt-6 max-w-xl text-left">
              <summary className="text-xs text-slate-400 cursor-pointer hover:underline text-center">
                Chi tiết kỹ thuật
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 text-rose-300 text-xs rounded-lg overflow-x-auto whitespace-pre-wrap">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
