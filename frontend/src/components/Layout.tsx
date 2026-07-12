import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  FiActivity,
  FiBell,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiClock,
  FiFile,
  FiFileText,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiSearch,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from './BrandMark'

const navigation = [
  {
    label: 'Workspace',
    items: [
      { name: 'Overview', href: '/dashboard', icon: FiHome },
      { name: 'Patients', href: '/patients', icon: FiUsers },
      { name: 'Appointments', href: '/appointments', icon: FiCalendar },
      { name: 'Visits', href: '/visits', icon: FiActivity },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { name: 'Doctors', href: '/doctor-profiles', icon: FiUserCheck },
      { name: 'Availability', href: '/slots', icon: FiClock },
      { name: 'Prescriptions', href: '/prescriptions', icon: FiFileText },
      { name: 'Medical notes', href: '/notes', icon: FiClipboard },
      { name: 'Documents', href: '/documents', icon: FiFile },
    ],
  },
]

const routeTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/visits': 'Visits',
  '/doctor-profiles': 'Doctors',
  '/slots': 'Availability',
  '/prescriptions': 'Prescriptions',
  '/notes': 'Medical notes',
  '/documents': 'Documents',
}

export default function Layout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const userName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
    : 'Practice user'
  const initials = userName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const pageTitle = Object.entries(routeTitles).find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[1] || 'MyMedic'

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const isActive = (href: string) => location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(`${href}/`))

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-20 items-center justify-between px-5">
        <Link to="/dashboard" aria-label="Go to overview" className="no-underline"><BrandMark /></Link>
        <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-xl p-2 text-brand-500 lg:hidden" aria-label="Close menu"><FiX className="h-5 w-5" /></button>
      </div>

      <div className="mx-4 mb-5 rounded-2xl border border-brand-100 bg-[#f6f8f5] p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-white"><FiActivity /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-950">Practice workspace</span><span className="block text-xs text-brand-500">Active account</span></span>
          <FiChevronDown className="text-brand-400" />
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Application navigation">
        {navigation.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-400">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ name, href, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive(href) ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-600 hover:bg-brand-50 hover:text-brand-950'}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive(href) ? 'text-mint-300' : 'text-brand-400 group-hover:text-brand-700'}`} />
                  {name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-brand-100 p-3">
        <div className="flex items-center gap-3 rounded-2xl p-2">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-mint-100 text-sm font-bold text-mint-800">{initials || 'U'}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-950">{userName}</span><span className="block truncate text-xs capitalize text-brand-500">{user?.role || 'Doctor'}</span></span>
          <button type="button" onClick={handleLogout} className="flex h-9 w-9 items-center justify-center rounded-xl text-brand-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Sign out"><FiLogOut /></button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f6f8f5] text-brand-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-brand-100 lg:block">{sidebar}</aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 h-full w-full bg-brand-950/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu overlay" />
          <aside className="relative h-full w-[290px] max-w-[85vw] border-r border-brand-100 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-brand-100 bg-[#f6f8f5]/90 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-700 lg:hidden" aria-label="Open navigation"><FiMenu className="h-5 w-5" /></button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-400">MyMedic workspace</p>
              <h1 className="truncate text-lg font-bold tracking-tight text-brand-950">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <label className="relative hidden md:block">
                <span className="sr-only">Search the workspace</span>
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                <input type="search" placeholder="Search patients, visits…" className="h-10 w-64 rounded-xl border border-brand-100 bg-white pl-10 pr-4 text-sm text-brand-950 outline-none transition-all placeholder:text-brand-400 focus:w-72 focus:border-brand-300 focus:ring-4 focus:ring-brand-900/5" />
              </label>
              <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-600 transition-colors hover:border-brand-200 hover:text-brand-950" aria-label="Notifications"><FiBell /><span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-orange-400 ring-2 ring-white" /></button>
              <Link to="/patients?action=register" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-900 px-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-800 sm:px-4"><FiPlus /><span className="hidden sm:inline">New patient</span></Link>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px]"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
