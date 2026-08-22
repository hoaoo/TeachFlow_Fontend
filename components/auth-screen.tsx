'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
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

type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
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
    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/20">
      <GraduationCap
        className="h-6 w-6"
        strokeWidth={1.9}
        aria-hidden="true"
      />
    </div>
  )
}

function MobileBrand() {
  return (
    <div className="mb-9 flex items-center gap-3 lg:hidden">
      <BrandMark />

      <div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">
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
      className="flex min-h-screen items-center justify-center bg-slate-50"
      aria-label="Đang kiểm tra phiên đăng nhập"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>

        <p className="text-sm text-slate-500">
          Đang tải TeachFlow...
        </p>
      </div>
    </main>
  )
}

/* =========================================================
   Left branding panel
========================================================= */

function AuthBrand() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#123c3a] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
      {/* Brand */}
      <div className="relative z-10 flex items-center gap-3">
        <BrandMark />

        <div>
          <p className="text-lg font-semibold tracking-tight">
            TeachFlow
          </p>

          <p className="mt-0.5 text-xs text-teal-100/70">
            Trợ lý số dành cho giáo viên
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-xl pb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
          Không gian dành cho giáo viên
        </p>

        <h1 className="max-w-lg text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.04em] xl:text-6xl">
          Dạy học nhẹ nhàng hơn, mỗi ngày.
        </h1>

        <p className="mt-6 max-w-md text-pretty text-base leading-7 text-teal-50/70">
          Quản lý lớp học, giáo án và tiến độ học sinh trong một
          không gian rõ ràng, tập trung.
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center gap-3 text-xs text-teal-50/60">
        <span className="size-2 rounded-full bg-teal-300" />
        <span>Nền tảng dành riêng cho giáo viên</span>
      </div>

      {/* Decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-1/4 size-80 rounded-full border border-teal-300/15"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full border border-teal-300/10"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-16 top-24 size-3 rounded-full bg-teal-300"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-32 top-40 size-1.5 rounded-full bg-white/30"
      />
    </aside>
  )
}

/* =========================================================
   Layout
========================================================= */

function AuthLayout(props: AuthLayoutProps) {
  return (
    <main
      className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900"
      data-mode={props.mode}
    >
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <AuthBrand />

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <MobileBrand />

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
              <AuthHeading mode={props.mode} />

              <AuthForm {...props} />
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              © 2026 TeachFlow · Hỗ trợ giáo viên tốt hơn
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

/* =========================================================
   Heading
========================================================= */

function AuthHeading({ mode }: { mode: Mode }) {
  const isRegister = mode === 'register'

  return (
    <header className="mb-9">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
        {isRegister
          ? 'Bắt đầu với TeachFlow'
          : 'Chào mừng trở lại'}
      </p>

      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">
        {isRegister
          ? 'Tạo tài khoản giáo viên'
          : 'Đăng nhập tài khoản'}
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {isRegister
          ? 'Tạo không gian làm việc dành riêng cho bạn.'
          : 'Tiếp tục hành trình tạo nên những lớp học tuyệt vời.'}
      </p>
    </header>
  )
}

/* =========================================================
   Inputs
========================================================= */

function TextField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  type = 'text',
  placeholder,
}: TextFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
      />
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
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-3 flex items-center justify-center rounded-lg px-1.5 text-slate-400 transition hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  )
}

/* =========================================================
   Password rules
========================================================= */

function PasswordRules({ password }: { password: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-slate-600">
        Mật khẩu cần đáp ứng:
      </p>

      <ul
        className="grid gap-1.5 text-xs sm:grid-cols-2"
        aria-label="Yêu cầu mật khẩu"
      >
        {PASSWORD_REQUIREMENTS.map((rule) => {
          const valid = rule.test(password)

          return (
            <li
              key={rule.key}
              className={
                valid
                  ? 'flex items-start gap-1.5 text-teal-700'
                  : 'flex items-start gap-1.5 text-slate-400'
              }
            >
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />

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

  // UI preference only.
  // Không lưu password/token vào localStorage.
  const [rememberMe, setRememberMe] = useState(false)

  return (
    <form
      className="space-y-5"
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
          placeholder="Nhập họ và tên"
        />
      )}

      <TextField
        id="email"
        label="Email giáo viên"
        value={props.email}
        onChange={props.setEmail}
        autoComplete="email"
        type="email"
        placeholder="name@example.com"
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
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-500">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) =>
                setRememberMe(event.target.checked)
              }
              className="size-4 rounded border-slate-300 accent-teal-600"
            />

            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button
            type="button"
            onClick={() =>
              toast.info(
                'Vui lòng liên hệ quản trị viên để được đặt lại mật khẩu.',
              )
            }
            className="shrink-0 font-medium text-teal-700 transition hover:text-teal-800 hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>
      )}

      {props.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {props.error}
        </div>
      )}

      <button
        type="submit"
        disabled={props.isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white shadow-lg shadow-teal-600/15 transition hover:-translate-y-0.5 hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      >
        {props.isSubmitting ? (
          <>
            <Loader2
              className="h-5 w-5 animate-spin"
              aria-hidden="true"
            />

            <span>
              {isRegister
                ? 'Đang tạo tài khoản...'
                : 'Đang đăng nhập...'}
            </span>
          </>
        ) : (
          <>
            <span>
              {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
            </span>

            <ArrowRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500">
        {isRegister
          ? 'Đã có tài khoản?'
          : 'Chưa có tài khoản?'}{' '}
        <button
          type="button"
          onClick={() =>
            props.switchMode(
              isRegister ? 'login' : 'register',
            )
          }
          className="font-semibold text-teal-700 transition hover:text-teal-800 hover:underline"
        >
          {isRegister ? 'Đăng nhập' : 'Đăng ký'}
        </button>
      </p>

      <div className="border-t border-slate-100 pt-5">
        <p className="text-center text-xs leading-5 text-slate-400">
          Bằng việc {isRegister ? 'tạo tài khoản' : 'đăng nhập'},
          bạn đồng ý với{' '}
          <button
            type="button"
            onClick={() =>
              toast.info(
                'Điều khoản sử dụng đang được cập nhật.',
              )
            }
            className="font-medium text-teal-700 hover:underline"
          >
            Điều khoản sử dụng
          </button>
        </p>
      </div>
    </form>
  )
}

/* =========================================================
   Auth screen
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

  const [showPassword, setShowPassword] =
    useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] =
    useState(false)

  /*
   * Chặn double-submit ở mức synchronous.
   * State isSubmitting không đủ vì React update state async.
   */
  const submitLock = useRef(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  /*
   * Nếu người dùng đã đăng nhập thì không cho quay lại
   * màn login/register.
   */
  useEffect(() => {
    if (!isLoading && user) {
      router.replace(
        user.role === 'ADMIN' ? '/admin' : '/',
      )
    }
  }, [isLoading, router, user])

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError('')

    // Không giữ password khi chuyển Login <-> Register.
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)

    router.push(
      nextMode === 'login'
        ? '/login'
        : '/register',
    )
  }

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (submitLock.current) {
      return
    }

    const registrationErrors =
      validateRegistration({
        fullName,
        email,
        password,
        confirmPassword,
      })

    const loginEmailError = validateEmail(email)

    const validationError =
      mode === 'login'
        ? loginEmailError ||
          (!password
            ? 'Vui lòng nhập mật khẩu.'
            : '')
        : (Object.values(
            registrationErrors,
          )[0] ?? '')

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

        toast.success(
          'Tài khoản đã được tạo thành công.',
        )

        router.replace('/login?registered=1')

        return
      }

      const profile = await login(
        email,
        password,
      )

      router.replace(
        profile.role === 'ADMIN'
          ? '/admin'
          : '/',
      )
    } catch (caught) {
      setError(
        getAuthErrorMessage(caught, mode),
      )
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
        setShowPassword(
          (current) => !current,
        )
      }
      showConfirmPassword={
        showConfirmPassword
      }
      toggleConfirmPassword={() =>
        setShowConfirmPassword(
          (current) => !current,
        )
      }
    />
  )
}