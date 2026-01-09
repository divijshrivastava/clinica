import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiFileText,
  FiClipboard,
  FiFile,
  FiActivity,
  FiLogOut,
  FiMenu,
  FiX,
  FiSearch
} from 'react-icons/fi'
import { useState } from 'react'

const navigation = [
  { name: 'Overview', href: '/', icon: FiHome },
  { name: 'Patients', href: '/patients', icon: FiUsers },
  { name: 'Visits', href: '/visits', icon: FiCalendar },
  { name: 'Appointments', href: '/appointments', icon: FiActivity },
  { name: 'Prescriptions', href: '/prescriptions', icon: FiFileText },
  { name: 'Notes', href: '/notes', icon: FiClipboard },
  { name: 'Documents', href: '/documents', icon: FiFile },
]

export default function Layout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const getUserInitials = () => {
    if (user?.email) {
      const name = user.email.split('@')[0]
      return name.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserName = () => {
    if (user?.email) {
      const name = user.email.split('@')[0]
      return name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, ' ')
    }
    return 'User'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer no-underline">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FiActivity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white m-0">MyMedic</h1>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-gray-300 hover:bg-slate-800"
        >
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-slate-900 z-40">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto w-full">
            {/* Logo */}
            <div className="flex-shrink-0 px-6 mb-8">
              <Link to="/" className="flex items-center hover:opacity-80 transition-opacity cursor-pointer no-underline">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                  <FiActivity className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white m-0">MyMedic</h1>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="px-4 mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search here..."
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => {
                      console.log('Navigation clicked:', item.name, item.href)
                    }}
                    className={`
                      group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all no-underline cursor-pointer
                      ${isActive
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* User Section */}
            <div className="px-4 py-4 border-t border-slate-800">
              <div className="flex items-center mb-3 px-2">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-sm">
                      {getUserInitials()}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{getUserName()}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role || 'Doctor'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-400 rounded-lg hover:bg-slate-800 hover:text-white transition-all"
              >
                <FiLogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center justify-between px-4 mb-6">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer no-underline">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <FiActivity className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-white m-0">MyMedic</h1>
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-md text-gray-400"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                {/* Search Bar - Mobile */}
                <div className="px-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search here..."
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all no-underline
                          ${isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                          }
                        `}
                      >
                        <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>

                <div className="px-4 py-4 border-t border-slate-800">
                  <div className="flex items-center mb-3 px-2">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {getUserInitials()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">{getUserName()}</p>
                      <p className="text-xs text-gray-400 capitalize">{user?.role || 'Doctor'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-400 rounded-lg hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <FiLogOut className="mr-3 h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen bg-gray-50">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
