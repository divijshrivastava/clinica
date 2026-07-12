import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowRight, FiCheck, FiEye, FiEyeOff, FiLock, FiShield } from 'react-icons/fi'
import { LoginCredentials } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { login } from '../services/api'
import { BrandMark } from '../components/BrandMark'

export default function LoginPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (data: LoginCredentials) => {
    setLoading(true)

    try {
      const response = await login({ email: data.email, password: data.password })
      const store = useAuthStore.getState()
      store.login(response.token, response.user)
      store.setHasHydrated(true)
      toast.success('Welcome back')
      navigate('/dashboard', { replace: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to sign in. Please check your details.'
      const apiMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      toast.error(apiMessage || message)
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f8faf7] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute -right-40 -top-32 h-[460px] w-[460px] rounded-full bg-mint-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-28 h-[500px] w-[500px] rounded-full bg-emerald-300/10 blur-3xl" />

        <Link to="/" aria-label="MyMedic home" className="relative z-10 w-fit no-underline">
          <BrandMark inverse />
        </Link>

        <div className="relative z-10 max-w-xl py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-mint-300">
            <span className="h-2 w-2 rounded-full bg-mint-400" /> Your practice, in rhythm
          </span>
          <h1 className="mt-7 text-5xl font-bold leading-[1.03] tracking-[-0.05em] xl:text-6xl">
            Everything in place for a better day of care.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/60">
            Pick up exactly where you left off—with your schedule, patient context, and next actions ready.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <FiShield className="h-5 w-5 text-mint-300" />
              <p className="mt-4 text-sm font-semibold">Secure access</p>
              <p className="mt-1 text-xs leading-5 text-white/45">Protected practice data</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <FiCheck className="h-5 w-5 text-mint-300" />
              <p className="mt-4 text-sm font-semibold">One workspace</p>
              <p className="mt-1 text-xs leading-5 text-white/45">Your day, connected</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/35">Care, beautifully organized.</p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-24">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" aria-label="MyMedic home" className="lg:hidden"><BrandMark /></Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-900">
            <FiArrowLeft aria-hidden="true" /> Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-9">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-mint-700">Welcome back</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-brand-950 sm:text-[2.75rem]">Sign in to MyMedic</h2>
            <p className="mt-3 text-base leading-7 text-brand-600">Enter your practice account details to continue.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-brand-900">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                })}
                className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-brand-950 shadow-sm outline-none transition-all placeholder:text-brand-300 focus:border-brand-700 focus:ring-4 focus:ring-brand-900/5 ${errors.email ? 'border-red-400' : 'border-brand-200'}`}
                placeholder="you@yourpractice.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="mt-2 text-sm text-red-600" role="alert">{errors.email.message}</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-brand-900">Password</label>
                <span className="text-xs font-medium text-brand-500">Secure sign in</span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                  className={`h-14 w-full rounded-2xl border bg-white px-4 pr-12 text-base text-brand-950 shadow-sm outline-none transition-all placeholder:text-brand-300 focus:border-brand-700 focus:ring-4 focus:ring-brand-900/5 ${errors.password ? 'border-red-400' : 'border-brand-200'}`}
                  placeholder="Enter your password"
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600" role="alert">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-5 font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in…</>
              ) : (
                <>Sign in securely <FiArrowRight className="transition-transform group-hover:translate-x-0.5" /></>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4"><span className="h-px flex-1 bg-brand-100" /><span className="text-xs font-medium text-brand-400">New to MyMedic?</span><span className="h-px flex-1 bg-brand-100" /></div>

          <Link to="/signup" className="flex h-14 items-center justify-center rounded-2xl border border-brand-200 bg-white px-5 font-semibold text-brand-900 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50">
            Create a practice account
          </Link>

          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-brand-400"><FiLock aria-hidden="true" /> Your connection is encrypted and secure.</p>
        </div>
      </section>
    </main>
  )
}
