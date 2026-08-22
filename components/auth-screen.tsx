'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { getAuthErrorMessage, PASSWORD_REQUIREMENTS, validateEmail, validateRegistration } from '@/services/auth-contract.mjs'
import { toast } from 'sonner'
import { ArrowRight, Check, Eye, EyeOff, GraduationCap, Loader2, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'

type Mode = 'login' | 'register'

type AuthLayoutProps = {
  mode: Mode
  switchMode: (mode: Mode) => void
  submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  isSubmitting: boolean
  error: string
  fullName: string
  setFullName: (value: string) => void
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  confirmPassword: string
  setConfirmPassword: (value: string) => void
  showPassword: boolean
  togglePassword: () => void
  showConfirmPassword: boolean
  toggleConfirmPassword: () => void
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-label="Đang kiểm tra phiên đăng nhập">
      <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
    </div>
  )
}

function AuthBrand() {
  return (
    <aside className="relative hidden overflow-hidden bg-teal-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div>
        <div className="flex items-center gap-3 text-2xl font-bold"><GraduationCap />TeachFlow</div>
        <p className="mt-2 text-teal-100">Trợ lý số dành cho giáo viên</p>
      </div>
      <div>
        <Sparkles className="mb-5 h-9 w-9 text-teal-200" />
        <h2 className="text-4xl font-semibold leading-tight">Dạy học nhẹ nhàng hơn.<br />Quản lý lớp học thông minh hơn.</h2>
      </div>
      <p className="text-sm text-teal-100">Lớp học · Giáo án · Lịch dạy · Điểm danh · Học sinh</p>
    </aside>
  )
}

function AuthLayout(props: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8" data-mode={props.mode}>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[0.9fr_1.1fr]">
        <AuthBrand />
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            <AuthHeading mode={props.mode} />
            <AuthForm {...props} />
          </div>
        </section>
      </div>
    </main>
  )
}

function AuthHeading({ mode }: { mode: Mode }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-semibold text-teal-600">{mode === 'login' ? 'Chào mừng trở lại' : 'Bắt đầu với TeachFlow'}</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{mode === 'login' ? 'Đăng nhập TeachFlow' : 'Đăng ký TeachFlow'}</h1>
      <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Đăng nhập để tiếp tục với TeachFlow.' : 'Tạo không gian làm việc dành riêng cho bạn.'}</p>
    </div>
  )
}

type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  type?: string
  icon: React.ReactNode
}

function TextField({ id, label, value, onChange, autoComplete, type = 'text', icon }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <input id={id} name={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required className="auth-input pl-11" />
      </div>
    </div>
  )
}

function PasswordField(props: Omit<TextFieldProps, 'type' | 'icon'> & { visible: boolean; onToggle: () => void }) {
  return (
    <div>
      <label htmlFor={props.id} className="mb-2 block text-sm font-medium text-slate-700">{props.label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input id={props.id} name={props.id} type={props.visible ? 'text' : 'password'} value={props.value} onChange={(event) => props.onChange(event.target.value)} autoComplete={props.autoComplete} required className="auth-input px-11" />
        <button type="button" onClick={props.onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-teal-700" aria-label={props.visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{props.visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
      </div>
    </div>
  )
}

function AuthForm(props: AuthLayoutProps) {
  const isRegister = props.mode === 'register'
  return (
    <form className="space-y-5" onSubmit={props.submit} noValidate>
      {isRegister && <TextField id="fullName" label="Họ và tên" value={props.fullName} onChange={props.setFullName} autoComplete="name" icon={<UserRound />} />}
      <TextField id="email" label="Email" value={props.email} onChange={props.setEmail} autoComplete="email" type="email" icon={<Mail />} />
      <PasswordField id="password" label="Mật khẩu" value={props.password} onChange={props.setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} visible={props.showPassword} onToggle={props.togglePassword} />
      {isRegister && (
        <>
          <PasswordField id="confirmPassword" label="Xác nhận mật khẩu" value={props.confirmPassword} onChange={props.setConfirmPassword} autoComplete="new-password" visible={props.showConfirmPassword} onToggle={props.toggleConfirmPassword} />
          <PasswordRules password={props.password} />
        </>
      )}
      {!isRegister && <button type="button" onClick={() => toast.info('Vui lòng liên hệ quản trị viên để được đặt lại mật khẩu.')} className="text-sm font-medium text-teal-700 hover:text-teal-800">Quên mật khẩu?</button>}
      {props.error && <p role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{props.error}</p>}
      <button type="submit" disabled={props.isSubmitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
        {props.isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" />{isRegister ? 'Đang tạo tài khoản...' : 'Đang đăng nhập...'}</> : <>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}<ArrowRight className="h-5 w-5" /></>}
      </button>
      <p className="text-center text-sm text-slate-600">{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button type="button" onClick={() => props.switchMode(isRegister ? 'login' : 'register')} className="font-semibold text-teal-700 hover:text-teal-800">{isRegister ? 'Đăng nhập' : 'Đăng ký miễn phí'}</button></p>
    </form>
  )
}

export function AuthScreen({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter()
  const { user, isLoading, login, register } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLock = useRef(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (!isLoading && user) router.replace(user.role === 'ADMIN' ? '/admin' : '/')
  }, [isLoading, router, user])

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError('')
    router.push(nextMode === 'login' ? '/login' : '/register')
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current) return
    const registrationErrors = validateRegistration({ fullName, email, password, confirmPassword })
    const loginEmailError = validateEmail(email)
    const validationError = mode === 'login'
      ? (loginEmailError || (!password ? 'Vui lòng nhập mật khẩu.' : ''))
      : (Object.values(registrationErrors)[0] ?? '')
    if (validationError) {
      setError(validationError)
      return
    }
    submitLock.current = true
    setIsSubmitting(true)
    setError('')
    try {
      if (mode === 'register') {
        await register({ fullName, email, password })
        toast.success('Tài khoản đã được tạo thành công.')
        router.replace('/login?registered=1')
      } else {
        const profile = await login(email, password)
        router.replace(profile.role === 'ADMIN' ? '/admin' : '/')
      }
    } catch (caught) {
      setError(getAuthErrorMessage(caught, mode))
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  if (isLoading || user) return <AuthLoading />
  return (
    <AuthLayout
      mode={mode}
      switchMode={switchMode}
      submit={submit}
      isSubmitting={isSubmitting}
      error={error}
      fullName={fullName}
      setFullName={setFullName}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showPassword={showPassword}
      togglePassword={() => setShowPassword((value) => !value)}
      showConfirmPassword={showConfirmPassword}
      toggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
    />
  )
}

function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2" aria-label="Yêu cầu mật khẩu">
      {PASSWORD_REQUIREMENTS.map((rule) => {
        const valid = rule.test(password)
        return <li key={rule.key} className={valid ? 'flex items-center gap-1.5 text-teal-700' : 'flex items-center gap-1.5'}><Check className="h-3.5 w-3.5" aria-hidden="true" />{rule.label}</li>
      })}
    </ul>
  )
}
