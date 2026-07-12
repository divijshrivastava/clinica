import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiHeart,
  FiMenu,
  FiShield,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi'
import { BrandMark } from '../components/BrandMark'

const features = [
  {
    icon: FiCalendar,
    title: 'A schedule that stays clear',
    description: 'See appointments, availability, and patient context together—without jumping between tools.',
  },
  {
    icon: FiUsers,
    title: 'Every patient, in one place',
    description: 'Keep visits, documents, prescriptions, and notes organized in a record your team can trust.',
  },
  {
    icon: FiFileText,
    title: 'Care flows, minus the friction',
    description: 'Move naturally from check-in to consultation to follow-up with workflows built around the day.',
  },
]

const today = [
  { time: '09:00', name: 'Aarav Mehta', detail: 'Follow-up · Room 2', tone: 'bg-emerald-100 text-emerald-700' },
  { time: '10:30', name: 'Meera Joshi', detail: 'Consultation · Room 1', tone: 'bg-amber-100 text-amber-700' },
  { time: '11:45', name: 'Kabir Shah', detail: 'Review · Virtual', tone: 'bg-violet-100 text-violet-700' },
]

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8faf7] text-brand-950">
      <header className="relative z-30 border-b border-brand-950/5 bg-[#f8faf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link to="/" aria-label="MyMedic home" className="no-underline">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a href="#platform" className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-500">Platform</a>
            <a href="#workflow" className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-500">How it works</a>
            <a href="#security" className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-500">Security</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="rounded-full px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-100">
              Sign in
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-800">
              Start for free <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-brand-950 md:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-brand-950/5 bg-[#f8faf7] px-5 py-5 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              <a href="#platform" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 font-medium text-brand-900">Platform</a>
              <a href="#workflow" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 font-medium text-brand-900">How it works</a>
              <a href="#security" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 font-medium text-brand-900">Security</a>
              <Link to="/login" className="mt-3 rounded-full border border-brand-200 px-5 py-3 text-center font-semibold text-brand-900">Sign in</Link>
              <Link to="/signup" className="rounded-full bg-brand-900 px-5 py-3 text-center font-semibold text-white">Start for free</Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        <section className="relative px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:px-10 lg:pb-32">
          <div className="pointer-events-none absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full bg-mint-200/60 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 top-80 h-80 w-80 rounded-full bg-amber-100/70 blur-3xl" />
          <div className="relative mx-auto grid min-w-0 max-w-7xl items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="min-w-0">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-mint-500" />
                Practice management, reimagined
              </div>
              <h1 className="max-w-2xl text-5xl font-bold leading-[0.98] tracking-[-0.055em] text-brand-950 sm:text-6xl lg:text-[4.75rem]">
                A calmer way to run your practice.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-brand-700 sm:text-xl">
                MyMedic brings patients, appointments, clinical notes, and daily operations into one beautifully simple workspace.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-900 px-7 py-4 text-base font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-800">
                  Start your practice <FiArrowRight aria-hidden="true" />
                </Link>
                <a href="#platform" className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-7 py-4 text-base font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50">
                  Explore the platform <FiChevronRight aria-hidden="true" />
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-brand-700">
                {['Fast setup', 'No credit card', 'Built for care teams'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-100 text-mint-700"><FiCheck className="h-3 w-3" /></span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto min-w-0 w-full max-w-2xl lg:max-w-none" aria-hidden="true">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-brand-900/5 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-3 shadow-[0_30px_90px_rgba(16,49,43,0.16)] sm:p-4">
                <div className="overflow-hidden rounded-[1.4rem] border border-brand-100 bg-[#f6f8f5]">
                  <div className="flex h-12 items-center justify-between border-b border-brand-100 bg-white px-4 sm:px-6">
                    <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold text-brand-700">Today · 12 August</span>
                  </div>
                  <div className="grid min-h-[440px] grid-cols-[62px_1fr] sm:grid-cols-[155px_1fr]">
                    <aside className="border-r border-brand-100 bg-brand-950 p-3 text-white sm:p-4">
                      <div className="mb-7 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-900 sm:mb-10"><FiHeart className="h-4 w-4" /></div>
                      <div className="space-y-2">
                        {['Overview', 'Patients', 'Schedule', 'Records'].map((item, index) => (
                          <div key={item} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] ${index === 0 ? 'bg-white/12 text-white' : 'text-white/50'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-mint-400' : 'bg-white/25'}`} />
                            <span className="hidden sm:inline">{item}</span>
                          </div>
                        ))}
                      </div>
                    </aside>
                    <div className="min-w-0 overflow-hidden p-4 sm:p-6">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-500">Good morning</p><h2 className="mt-1 text-xl font-bold tracking-tight text-brand-950 sm:text-2xl">Your day, at a glance</h2></div>
                        <span className="hidden rounded-full bg-brand-900 px-3.5 py-2 text-[10px] font-semibold text-white sm:block">+ New patient</span>
                      </div>
                      <div className="mb-5 grid grid-cols-3 gap-2.5">
                        {[['08', 'Appointments'], ['03', 'Waiting'], ['05', 'Completed']].map(([value, label], index) => (
                          <div key={label} className={`rounded-xl border p-3 ${index === 0 ? 'border-brand-900 bg-brand-900 text-white' : 'border-brand-100 bg-white text-brand-950'}`}>
                            <p className="text-lg font-bold sm:text-2xl">{value}</p><p className={`mt-1 truncate text-[9px] sm:text-[10px] ${index === 0 ? 'text-white/60' : 'text-brand-500'}`}>{label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-brand-100 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold text-brand-950">Today's schedule</p><span className="text-[10px] font-semibold text-mint-700">View all</span></div>
                        <div className="space-y-1.5">
                          {today.map((item) => (
                            <div key={item.time} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-brand-50">
                              <span className="w-10 text-[10px] font-semibold text-brand-500">{item.time}</span>
                              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${item.tone}`}>{item.name.split(' ').map((part) => part[0]).join('')}</span>
                              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-brand-950">{item.name}</span><span className="block truncate text-[9px] text-brand-500">{item.detail}</span></span>
                              <FiChevronRight className="h-3.5 w-3.5 text-brand-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-mint-50 px-4 py-3">
                        <span className="flex items-center gap-2 text-[10px] font-semibold text-mint-800"><FiClock /> Next appointment in 18 minutes</span>
                        <span className="h-2 w-2 rounded-full bg-mint-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-y border-brand-950/5 bg-white px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-mint-700">Made for the way care works</p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-brand-950 sm:text-5xl">Less admin. More attention where it matters.</h2>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className="group rounded-[1.75rem] border border-brand-100 bg-[#fbfcfa] p-7 transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft sm:p-8">
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-white"><Icon className="h-5 w-5" /></span>
                    <span className="text-xs font-bold text-brand-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-8 text-xl font-bold tracking-tight text-brand-950">{title}</h3>
                  <p className="mt-3 leading-7 text-brand-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <div className="rounded-[2rem] bg-brand-950 p-6 text-white shadow-soft sm:p-9">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-mint-400">Patient timeline</p><h3 className="mt-2 text-2xl font-bold">Meera Joshi</h3></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70">MRN 02418</span></div>
              <div className="mt-7 space-y-6">
                {[['Today, 10:30', 'Consultation completed', 'Clinical note and vitals recorded'], ['06 Aug', 'Prescription renewed', '2 medications · 30 days'], ['18 Jul', 'Follow-up scheduled', 'Review in four weeks']].map(([date, title, detail], index) => (
                  <div key={title} className="grid grid-cols-[82px_20px_1fr] gap-3">
                    <span className="pt-0.5 text-xs text-white/45">{date}</span>
                    <span className="relative flex justify-center"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-mint-400' : 'bg-white/30'}`} />{index < 2 && <span className="absolute bottom-[-24px] top-4 w-px bg-white/10" />}</span>
                    <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-white/45">{detail}</span></span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-mint-700">One connected workflow</p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-brand-950 sm:text-5xl">The full story of care, always within reach.</h2>
              <p className="mt-6 text-lg leading-8 text-brand-600">From the first appointment to the latest prescription, your team sees the context they need and the next action to take.</p>
              <div className="mt-8 space-y-4">
                {['Give every role a clear view of the day', 'Keep records consistent across every visit', 'Find the right detail without digging'].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-brand-800"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint-100 text-mint-700"><FiCheck /></span>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32">
          <div className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] bg-[#e8f4ef] p-7 sm:p-10 md:grid-cols-3 lg:p-12">
            {[{ icon: FiShield, title: 'Privacy by design', text: 'Access controls and secure authentication help keep sensitive information protected.' }, { icon: FiZap, title: 'Ready when you are', text: 'A responsive, focused workspace that helps your team move through busy days.' }, { icon: FiHeart, title: 'Built around care', text: 'Thoughtful workflows that support the people behind every patient interaction.' }].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl p-4 sm:p-5"><Icon className="h-6 w-6 text-brand-800" /><h3 className="mt-5 text-lg font-bold text-brand-950">{title}</h3><p className="mt-2 text-sm leading-6 text-brand-700">{text}</p></div>
            ))}
          </div>
        </section>

        <section className="bg-brand-950 px-5 py-24 text-white sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-400 text-brand-950"><FiHeart className="h-6 w-6" /></span>
            <h2 className="mt-7 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Give your practice room to breathe.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">Start with a simpler way to manage the work around care.</p>
            <Link to="/signup" className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-brand-950 transition-transform hover:-translate-y-0.5">Get started with MyMedic <FiArrowRight /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-brand-950 px-5 py-8 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <BrandMark inverse />
          <p className="text-xs text-white/40">© {new Date().getFullYear()} MyMedic. Care, beautifully organized.</p>
        </div>
      </footer>
    </div>
  )
}
