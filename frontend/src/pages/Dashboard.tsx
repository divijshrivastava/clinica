import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { ElementType } from 'react'
import {
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiPlus,
  FiUserPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { patientsApi } from '../api/patients'
import { visitsApi, type Visit } from '../api/visits'
import { useAuthStore } from '../store/authStore'

interface DashboardStats {
  totalPatients: number
  scheduledVisits: number
  completedVisits: number
  totalVisits: number
}

interface StatCardProps {
  label: string
  value: number
  helper: string
  icon: ElementType
  tone: string
}

function StatCard({ label, value, helper, icon: Icon, tone }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-500">Live</span>
      </div>
      <p className="mt-6 text-sm font-semibold text-brand-600">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-brand-950">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs text-brand-400">{helper}</p>
    </article>
  )
}

function statusStyles(status: string) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10'
  if (status === 'scheduled') return 'bg-sky-50 text-sky-700 ring-sky-600/10'
  if (status === 'cancelled') return 'bg-red-50 text-red-700 ring-red-600/10'
  return 'bg-amber-50 text-amber-700 ring-amber-600/10'
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({ totalPatients: 0, scheduledVisits: 0, completedVisits: 0, totalVisits: 0 })
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [patients, visits, scheduled, completed, recent] = await Promise.all([
          patientsApi.list({ limit: 1 }),
          visitsApi.list({ limit: 1 }),
          visitsApi.list({ limit: 1, status: 'scheduled' }),
          visitsApi.list({ limit: 1, status: 'completed' }),
          visitsApi.list({ limit: 6 }),
        ])

        const nextStats = {
          totalPatients: patients.pagination.total,
          scheduledVisits: scheduled.pagination.total,
          completedVisits: completed.pagination.total,
          totalVisits: visits.pagination.total,
        }

        setStats(nextStats)
        setRecentVisits(recent.data)
        const onboardingDismissed = localStorage.getItem('onboarding_dismissed') === 'true'
        setShowOnboarding(!onboardingDismissed && !(nextStats.totalPatients > 0 && nextStats.completedVisits > 0))
      } catch (error) {
        console.error('Unable to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const dismissOnboarding = () => {
    localStorage.setItem('onboarding_dismissed', 'true')
    setShowOnboarding(false)
  }

  const userName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
    : 'there'
  const firstName = userName.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const completionRate = stats.totalVisits > 0 ? Math.round((stats.completedVisits / stats.totalVisits) * 100) : 0

  const statCards = [
    { label: 'Total patients', value: stats.totalPatients, helper: 'Across your practice', icon: FiUsers, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Scheduled visits', value: stats.scheduledVisits, helper: 'Ready for care', icon: FiCalendar, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Completed visits', value: stats.completedVisits, helper: 'Records completed', icon: FiCheckCircle, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'All visits', value: stats.totalVisits, helper: 'Full visit history', icon: FiActivity, tone: 'bg-amber-50 text-amber-700' },
  ]

  if (loading) {
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <div className="text-center"><span className="mx-auto block h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-800" /><p className="mt-4 text-sm font-medium text-brand-500">Preparing your workspace…</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-mint-700">{greeting}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-brand-950 sm:text-4xl">Welcome back, {firstName}.</h2>
          <p className="mt-2 text-brand-600">Here’s what’s happening across your practice today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/appointments" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"><FiCalendar /> View schedule</Link>
          <Link to="/visits?action=schedule" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-800"><FiPlus /> Schedule visit</Link>
        </div>
      </section>

      {showOnboarding && (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 p-6 text-white shadow-soft sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-mint-400/20 blur-3xl" />
          <button type="button" onClick={dismissOnboarding} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white" aria-label="Dismiss getting started"><FiX /></button>
          <div className="relative grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-mint-300"><FiActivity /> Getting started</span>
              <h3 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Set up your care workflow</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">Complete these essentials so your team can start each day with the right context.</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                { title: 'Register a patient', done: stats.totalPatients > 0, href: '/patients?action=register', icon: FiUserPlus },
                { title: 'Schedule a visit', done: stats.scheduledVisits > 0, href: '/visits?action=schedule', icon: FiCalendar },
                { title: 'Complete a visit', done: stats.completedVisits > 0, href: '/visits', icon: FiFileText },
              ].map(({ title, done, href, icon: Icon }) => (
                <Link key={title} to={href} className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition-colors hover:bg-white/10">
                  <div className="flex items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${done ? 'bg-mint-400 text-brand-950' : 'bg-white/10 text-white'}`}>{done ? <FiCheck /> : <Icon />}</span><FiArrowRight className="text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white" /></div>
                  <p className="mt-4 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-white/40">{done ? 'Completed' : 'Ready when you are'}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="overflow-hidden rounded-[1.5rem] border border-brand-100 bg-white shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-brand-100 px-5 py-5 sm:px-6">
            <div><h3 className="text-lg font-bold tracking-tight text-brand-950">Recent visits</h3><p className="mt-1 text-sm text-brand-500">Latest activity across your practice</p></div>
            <Link to="/visits" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-950">View all <FiArrowRight /></Link>
          </div>

          {recentVisits.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500"><FiCalendar className="h-6 w-6" /></span>
              <h4 className="mt-5 text-base font-bold text-brand-950">Your schedule is wide open</h4>
              <p className="mt-2 max-w-sm text-sm leading-6 text-brand-500">Schedule the first visit and it will appear here with the patient context your team needs.</p>
              <button type="button" onClick={() => navigate('/visits?action=schedule')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white"><FiPlus /> Schedule a visit</button>
            </div>
          ) : (
            <div className="divide-y divide-brand-50">
              {recentVisits.map((visit) => {
                const patientName = [visit.patient?.first_name, visit.patient?.last_name].filter(Boolean).join(' ') || 'Patient record'
                const initials = patientName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
                return (
                  <button key={visit.id} type="button" onClick={() => navigate(`/visits/${visit.id}`)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-brand-50/70 sm:grid-cols-[auto_1fr_130px_110px_auto] sm:gap-4 sm:px-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-100 text-xs font-bold text-mint-800">{initials || 'PT'}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-brand-950">{patientName}</span><span className="mt-0.5 block truncate text-xs text-brand-400">{visit.chief_complaint || visit.visit_type || 'General visit'}</span></span>
                    <span className="hidden text-sm text-brand-600 sm:block">{format(new Date(visit.visit_date), 'dd MMM yyyy')}</span>
                    <span className={`hidden w-fit rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset sm:inline-flex ${statusStyles(visit.status)}`}>{visit.status}</span>
                    <FiArrowRight className="text-brand-300" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.5rem] border border-brand-100 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-brand-950">Visit completion</p><p className="mt-1 text-xs text-brand-400">Across all recorded visits</p></div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><FiCheckCircle /></span></div>
            <div className="mt-8 flex items-end justify-between"><p className="text-4xl font-bold tracking-[-0.05em] text-brand-950">{completionRate}%</p><p className="mb-1 text-xs font-medium text-brand-400">{stats.completedVisits} completed</p></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-mint-500 transition-all duration-700" style={{ width: `${Math.min(completionRate, 100)}%` }} /></div>
          </div>

          <div className="rounded-[1.5rem] bg-[#e8f4ef] p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-800"><FiClock /></span>
            <h3 className="mt-5 text-lg font-bold text-brand-950">Keep the day moving</h3>
            <p className="mt-2 text-sm leading-6 text-brand-600">Review availability and make space for the next patient without leaving the workspace.</p>
            <Link to="/slots" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-800 hover:text-brand-950">Check availability <FiArrowRight /></Link>
          </div>
        </aside>
      </section>
    </div>
  )
}
