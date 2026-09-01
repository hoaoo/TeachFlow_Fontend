'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onClose?: () => void
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ResourceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ResourceErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 text-center">
          <div className="max-w-md flex flex-col items-center gap-4">
            <div className="size-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {this.props.fallbackTitle || 'Không thể hiển thị tài nguyên này.'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {this.state.error?.message || 'Đã xảy ra sự cố trong quá trình dựng nội dung xem trước.'}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleReset}
                className="gap-1.5 text-xs text-slate-200 border-slate-700 bg-slate-900 hover:bg-slate-800"
              >
                <RefreshCw className="size-3.5" /> Thử lại
              </Button>
              {this.props.onClose && (
                <Button
                  size="sm"
                  onClick={this.props.onClose}
                  className="gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <ArrowLeft className="size-3.5" /> Đóng
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
