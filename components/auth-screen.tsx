'use client'

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type HTMLInputTypeAttribute,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/context/auth-context'
import {
  getAuthErrorMessage,
  PASSWORD_REQUIREMENTS,
  validateEmail,
  validateRegistration,
} from '@/services/auth-contract.mjs'

type Mode = 'login' | 'register'

type AuthLayoutProps = {
  mode: Mode
  switchMode: (mode: Mode) => void
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>
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

type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  type?: HTMLInputTypeAttribute
  placeholder?: string
  icon: ReactNode
}

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  visible: boolean
  onToggle: () => void
  placeholder?: string
}

/* =========================================================
   Brand
========================================================= */

function BrandMark() {
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[#5ee0bd] text-[#103c36] shadow-[0_12px_30px_rgba(94,224,189,0.22)]">
      <GraduationCap
        className="h-6 w-6"
        strokeWidth={2}
        aria-hidden="true"
      />

      <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#103c36] bg-white" />
    </div>
  )
}

function MobileBrand() {
  return (
    <div className="mb-7 flex items-center gap-3 lg:hidden">
      <BrandMark />

      <div>
        <p className="text-lg font-bold tracking-[-0.02em] text-slate-950">
          TeachFlow
        </p>
        <p className="text-xs text-slate-500">
          Không gian dành cho giáo viên
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   Loading
========================================================= */

function AuthLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f5f8f7]"
      aria-label="Đang kiểm tra phiên đăng nhập"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#157e70] text-white shadow-xl shadow-[#157e70]/20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Đang mở TeachFlow
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Vui lòng chờ trong giây lát...
          </p>
        </div>
      </div>
    </main>
  )
}

/* =========================================================
   Left panel
========================================================= */

function AuthBrand() {
  const features = [
    {
      icon: <BookOpenCheck className="h-4 w-4" />,
      title: 'Giáo án & lớp học',
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: 'Dữ liệu tập trung',
    },
  ]

  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#103c36] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-12">
      {/* decorative light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 size-[30rem] rounded-full bg-[#46c9a7]/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-44 size-[34rem] rounded-full bg-[#78e5c8]/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-[20%] size-72 rounded-full border border-white/[0.06]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[4%] top-[16%] size-96 rounded-full border border-white/[0.04]"
      />

      {/* top brand */}
      <div className="relative z-10 flex items-center gap-3">
        <BrandMark />

        <div>
          <p className="text-xl font-bold tracking-[-0.03em]">
            TeachFlow
          </p>
          <p className="mt-0.5 text-xs text-[#b2d7d0]">
            Trợ lý số dành cho giáo viên
          </p>
        </div>
      </div>

      {/* content */}
      <div className="relative z-10 max-w-xl py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#78e5c8]/20 bg-[#78e5c8]/10 px-3 py-1.5">
          <Sparkles
            className="h-3.5 w-3.5 text-[#78e5c8]"
            aria-hidden="true"
          />

          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9eedda]">
            Không gian dành cho giáo viên
          </span>
        </div>

        <h1 className="max-w-[600px] text-balance text-[3.4rem] font-semibold leading-[1.06] tracking-[-0.055em] xl:text-[4.35rem]">
          Dạy học nhẹ nhàng hơn,
          <span className="block text-[#74ddc1]">
            mỗi ngày.
          </span>
        </h1>

        <p className="mt-7 max-w-md text-[15px] leading-7 text-[#b9d3ce]">
          Quản lý lớp học, giáo án, lịch dạy và tiến độ học sinh
          trong một không gian rõ ràng, tập trung và dễ sử dụng.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-xs text-[#d8ebe7] backdrop-blur-sm"
            >
              <span className="text-[#72ddc0]">
                {feature.icon}
              </span>

              {feature.title}
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.07] pt-6">
        <div className="flex items-center gap-2.5 text-xs text-[#a9cbc5]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#70ddbf] opacity-40" />
            <span className="relative inline-flex size-2 rounded-full bg-[#70ddbf]" />
          </span>

          Hệ thống đang hoạt động
        </div>

        <span className="text-[11px] text-white/30">
          TeachFlow 2026
        </span>
      </div>
    </aside>
  )
}

/* =========================================================
   Auth Layout
========================================================= */

function AuthLayout(props: AuthLayoutProps) {
  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#f5f8f7] text-slate-900"
      data-mode={props.mode}
    >
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <AuthBrand />

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-10 xl:px-16">
          {/* background decoration */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 size-72 rounded-full bg-[#47bea0]/[0.06] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 -left-24 size-80 rounded-full bg-[#47bea0]/[0.06] blur-3xl"
          />

          <div className="relative z-10 w-full max-w-[460px]">
            <MobileBrand />

            <div className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_25px_70px_rgba(15,50,45,0.08)] backdrop-blur-xl sm:p-9">
              <ModeSwitcher
                mode={props.mode}
                switchMode={props.switchMode}
              />

              <AuthHeading mode={props.mode} />

              <AuthForm {...props} />
            </div>

            <p className="mt-5 text-center text-[11px] text-slate-400">
              © 2026 TeachFlow · Hỗ trợ giáo viên tốt hơn mỗi ngày
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

/* =========================================================
   Login / Register tabs
========================================================= */

function ModeSwitcher({
  mode,
  switchMode,
}: {
  mode: Mode
  switchMode: (mode: Mode) => void
}) {
  return (
    <div className="mb-8 grid grid-cols-2 rounded-xl bg-[#f3f6f5] p-1">
      <button
        type="button"
        onClick={() => switchMode('login')}
        className={`h-9 rounded-[10px] text-xs font-semibold transition-all ${
          mode === 'login'
            ? 'bg-white text-[#126f63] shadow-sm ring-1 ring-black/[0.04]'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        Đăng nhập
      </button>

      <button
        type="button"
        onClick={() => switchMode('register')}
        className={`h-9 rounded-[10px] text-xs font-semibold transition-all ${
          mode === 'register'
            ? 'bg-white text-[#126f63] shadow-sm ring-1 ring-black/[0.04]'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        Đăng ký
      </button>
    </div>
  )
}

/* =========================================================
   Heading
========================================================= */

function AuthHeading({ mode }: { mode: Mode }) {
  const isRegister = mode === 'register'

  return (
    <header className="mb-7">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#168978]">
        {isRegister
          ? 'Bắt đầu hành trình'
          : 'Chào mừng trở lại'}
      </p>

      <h2 className="text-[28px] font-bold tracking-[-0.035em] text-slate-950 sm:text-[30px]">
        {isRegister
          ? 'Tạo tài khoản giáo viên'
          : 'Đăng nhập TeachFlow'}
      </h2>

      <p className="mt-2.5 text-sm leading-6 text-slate-500">
        {isRegister
          ? 'Tạo không gian làm việc riêng để bắt đầu quản lý lớp học.'
          : 'Đăng nhập để tiếp tục công việc của bạn hôm nay.'}
      </p>
    </header>
  )
}

/* =========================================================
   Fields
========================================================= */

function TextField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  type = 'text',
  placeholder,
  icon,
}: TextFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[13px] font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="group relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400 transition-colors group-focus-within:text-[#168978]">
          {icon}
        </span>

        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className="h-[50px] w-full rounded-xl border border-slate-200 bg-[#fbfcfc] pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#36aa98] focus:bg-white focus:ring-4 focus:ring-[#36aa98]/10"
        />
      </div>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  visible,
  onToggle,
  placeholder,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[13px] font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="group relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400 transition-colors group-focus-within:text-[#168978]">
          <LockKeyhole className="h-[18px] w-[18px]" />
        </span>

        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className="h-[50px] w-full rounded-xl border border-slate-200 bg-[#fbfcfc] pl-11 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#36aa98] focus:bg-white focus:ring-4 focus:ring-[#36aa98]/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-2 flex w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#168978] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#36aa98]"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" />
          ) : (
            <Eye className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </div>
  )
}

/* =========================================================
   Password Rules
========================================================= */

function PasswordRules({ password }: { password: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-[#f8faf9] px-4 py-3.5">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Yêu cầu mật khẩu
      </p>

      <ul
        className="grid gap-2 text-xs sm:grid-cols-2"
        aria-label="Yêu cầu mật khẩu"
      >
        {PASSWORD_REQUIREMENTS.map((rule) => {
          const valid = rule.test(password)

          return (
            <li
              key={rule.key}
              className={`flex items-start gap-2 transition-colors ${
                valid
                  ? 'text-[#137a6c]'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`mt-px flex size-4 shrink-0 items-center justify-center rounded-full ${
                  valid
                    ? 'bg-[#def5ee] text-[#137a6c]'
                    : 'bg-slate-100'
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </span>

              <span>{rule.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* =========================================================
   Form
========================================================= */

function AuthForm(props: AuthLayoutProps) {
  const isRegister = props.mode === 'register'

  return (
    <form
      className="space-y-[18px]"
      onSubmit={props.submit}
      noValidate
    >
      {isRegister && (
        <TextField
          id="fullName"
          label="Họ và tên"
          value={props.fullName}
          onChange={props.setFullName}
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          icon={<UserRound className="h-[18px] w-[18px]" />}
        />
      )}

      <TextField
        id="email"
        label="Email giáo viên"
        value={props.email}
        onChange={props.setEmail}
        autoComplete="email"
        type="email"
        placeholder="giaovien@example.com"
        icon={<Mail className="h-[18px] w-[18px]" />}
      />

      <PasswordField
        id="password"
        label="Mật khẩu"
        value={props.password}
        onChange={props.setPassword}
        autoComplete={
          isRegister ? 'new-password' : 'current-password'
        }
        visible={props.showPassword}
        onToggle={props.togglePassword}
        placeholder="Nhập mật khẩu"
      />

      {isRegister && (
        <>
          <PasswordField
            id="confirmPassword"
            label="Xác nhận mật khẩu"
            value={props.confirmPassword}
            onChange={props.setConfirmPassword}
            autoComplete="new-password"
            visible={props.showConfirmPassword}
            onToggle={props.toggleConfirmPassword}
            placeholder="Nhập lại mật khẩu"
          />

          <PasswordRules password={props.password} />
        </>
      )}

      {!isRegister && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              toast.info(
                'Vui lòng liên hệ quản trị viên để được đặt lại mật khẩu.',
              )
            }
            className="text-xs font-semibold text-[#147c6e] transition hover:text-[#0e6157] hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>
      )}

      {props.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
        >
          {props.error}
        </div>
      )}

      <button
        type="submit"
        disabled={props.isSubmitting}
        className="group flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#147f70] text-sm font-bold text-white shadow-[0_10px_25px_rgba(20,127,112,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#106d61] hover:shadow-[0_14px_30px_rgba(20,127,112,0.24)] focus:outline-none focus:ring-4 focus:ring-[#147f70]/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      >
        {props.isSubmitting ? (
          <>
            <Loader2
              className="h-[18px] w-[18px] animate-spin"
              aria-hidden="true"
            />

            {isRegister
              ? 'Đang tạo tài khoản...'
              : 'Đang đăng nhập...'}
          </>
        ) : (
          <>
            {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}

            <ArrowRight
              className="h-[17px] w-[17px] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      <p className="text-center text-[13px] text-slate-500">
        {isRegister
          ? 'Bạn đã có tài khoản?'
          : 'Bạn chưa có tài khoản?'}{' '}
        <button
          type="button"
          onClick={() =>
            props.switchMode(
              isRegister ? 'login' : 'register',
            )
          }
          className="font-bold text-[#147c6e] hover:text-[#0e6157] hover:underline"
        >
          {isRegister ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
        </button>
      </p>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-center text-[11px] leading-5 text-slate-400">
          Bằng việc {isRegister ? 'đăng ký' : 'đăng nhập'}, bạn
          đồng ý với{' '}
          <button
            type="button"
            onClick={() =>
              toast.info(
                'Điều khoản sử dụng đang được cập nhật.',
              )
            }
            className="font-medium text-slate-500 hover:text-[#147c6e] hover:underline"
          >
            Điều khoản sử dụng
          </button>
        </p>
      </div>
    </form>
  )
}

/* =========================================================
   Auth Screen
========================================================= */

export function AuthScreen({
  initialMode = 'login',
}: {
  initialMode?: Mode
}) {
  const router = useRouter()
  const { user, isLoading, login, register } = useAuth()

  const [mode, setMode] = useState<Mode>(initialMode)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Chặn double-submit trước khi React kịp cập nhật state.
  const submitLock = useRef(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/')
    }
  }, [isLoading, router, user])

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return
    }

    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)

    router.push(nextMode === 'login' ? '/login' : '/register')
  }

  const submit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (submitLock.current) {
      return
    }

    const registrationErrors = validateRegistration({
      fullName,
      email,
      password,
      confirmPassword,
    })

    const loginEmailError = validateEmail(email)

    const validationError =
      mode === 'login'
        ? loginEmailError ||
          (!password ? 'Vui lòng nhập mật khẩu.' : '')
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
        await register({
          fullName,
          email,
          password,
        })

        toast.success('Tài khoản đã được tạo thành công.')

        router.replace('/login?registered=1')
        return
      }

      const profile = await login(email, password)

      router.replace(
        profile.role === 'ADMIN'
          ? '/admin'
          : '/',
      )
    } catch (caught) {
      setError(getAuthErrorMessage(caught, mode))
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  if (isLoading || user) {
    return <AuthLoading />
  }

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
      togglePassword={() =>
        setShowPassword((current) => !current)
      }
      showConfirmPassword={showConfirmPassword}
      toggleConfirmPassword={() =>
        setShowConfirmPassword((current) => !current)
      }
    />
  )
}