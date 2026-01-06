import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiUsers,
  FiCalendar,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight,
  FiFileText,
  FiMoreVertical
} from 'react-icons/fi'
import { patientsApi } from '../api/patients'
import { visitsApi } from '../api/visits'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'

interface StatCardProps {
  title: string
  value: number
  change?: number
  icon: React.ElementType
  iconBgColor: string
  iconColor: string
  showMiniChart?: boolean
}

function StatCard({ title, value, change, icon: Icon, iconBgColor, iconColor, showMiniChart }: StatCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  // Generate simple bar chart data
  const generateBars = () => {
    const bars = []
    for (let i = 0; i < 8; i++) {
      const height = Math.random() * 60 + 20
      bars.push(height)
    }
    return bars
  }

  const bars = generateBars()

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow relative">
      <div className="absolute top-4 right-4">
        <button className="text-gray-400 hover:text-gray-600">
          <FiMoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className={`${iconBgColor} ${iconColor} p-3 rounded-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        {showMiniChart && (
          <div className="flex items-end space-x-1 h-12">
            {bars.map((height, idx) => (
              <div
                key={idx}
                className={`w-2 rounded-t ${idx === 3 ? 'bg-blue-500' : 'bg-gray-200'}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="flex items-baseline space-x-3">
          <h3 className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</h3>
          {change !== undefined && (
            <span className={`inline-flex items-center text-sm font-semibold ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
            }`}>
              {isPositive && <FiTrendingUp className="w-4 h-4 mr-1" />}
              {isNegative && <FiTrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        {change !== undefined && (
          <p className="text-xs text-gray-500">From last month</p>
        )}
      </div>
    </div>
  )
}

interface ChartCardProps {
  title: string
  subtitle: string
  mainValue: number
  secondaryValue: number
  change: number
  icon: React.ElementType
  chartType: 'line' | 'bar'
  color: string
}

function ChartCard({ title, subtitle, mainValue, secondaryValue, change, icon: Icon, chartType, color }: ChartCardProps) {
  const isPositive = change > 0

  // Generate chart data
  const generateLineData = () => {
    const points = []
    let value = 300
    for (let i = 0; i < 20; i++) {
      value += Math.random() * 40 - 15
      points.push(Math.max(100, Math.min(500, value)))
    }
    return points
  }

  const generateBarData = () => {
    const bars = []
    for (let i = 0; i < 12; i++) {
      bars.push({
        height: Math.random() * 70 + 30,
        isHighlighted: i === 5 || i === 6
      })
    }
    return bars
  }

  const linePoints = generateLineData()
  const barData = generateBarData()

  // Convert line data to SVG path
  const lineToPath = (points: number[]) => {
    const width = 280
    const height = 100
    const step = width / (points.length - 1)

    return points.map((point, i) => {
      const x = i * step
      const y = height - (point / 5)
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    }).join(' ')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`${color} p-2 rounded-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <select className="text-xs text-gray-900 bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400">
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Visitors</p>
          <div className="flex items-baseline space-x-2">
            <h4 className="text-2xl font-bold text-gray-900">{mainValue.toLocaleString()}</h4>
            <span className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive && <FiTrendingUp className="inline w-3 h-3 mr-0.5" />}
              {change}%
            </span>
          </div>
          <p className="text-xs text-gray-500">From last month</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Patients</p>
          <div className="flex items-baseline space-x-2">
            <h4 className="text-2xl font-bold text-gray-900">{secondaryValue.toLocaleString()}</h4>
            <span className="text-xs font-semibold text-red-600">
              <FiTrendingDown className="inline w-3 h-3 mr-0.5" />
              10%
            </span>
          </div>
          <p className="text-xs text-gray-500">From last month</p>
        </div>
      </div>

      {chartType === 'line' ? (
        <div className="relative h-28">
          <svg className="w-full h-full" viewBox="0 0 280 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="25" x2="280" y2="25" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="50" x2="280" y2="50" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="75" x2="280" y2="75" stroke="#f3f4f6" strokeWidth="1" />

            {/* Area under line */}
            <defs>
              <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${lineToPath(linePoints)} L 280 100 L 0 100 Z`}
              fill="url(#lineGradient)"
            />

            {/* Line */}
            <path
              d={lineToPath(linePoints)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            {['1 Feb', '5', '9', '13', '17', '23', '26', '31'].map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-28 flex items-end justify-between space-x-1">
          {barData.map((bar, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-t transition-all ${
                  bar.isHighlighted ? 'bg-red-500' : 'bg-gray-300'
                }`}
                style={{ height: `${bar.height}%` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalPatients: 0,
    scheduledVisits: 0,
    completedVisits: 0,
    totalVisits: 0,
  })
  const [recentVisits, setRecentVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch patient count
        const patientsData = await patientsApi.list({ limit: 1 })

        // Fetch visits counts
        const allVisitsData = await visitsApi.list({ limit: 1 })
        const scheduledVisitsData = await visitsApi.list({ limit: 1, status: 'scheduled' })
        const completedVisitsData = await visitsApi.list({ limit: 1, status: 'completed' })

        // Fetch recent visits
        const recentVisitsData = await visitsApi.list({ limit: 5 })

        setStats({
          totalPatients: patientsData.pagination.total,
          scheduledVisits: scheduledVisitsData.pagination.total,
          completedVisits: completedVisitsData.pagination.total,
          totalVisits: allVisitsData.pagination.total,
        })

        setRecentVisits(recentVisitsData.data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const getUserName = () => {
    if (user?.email) {
      const name = user.email.split('@')[0]
      return name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, ' ')
    }
    return 'there'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {getUserName()}
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Track, manage and forecast your patient reports and data.
        </p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          change={47}
          icon={FiUsers}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          showMiniChart={true}
        />

        <StatCard
          title="New Appointments"
          value={stats.scheduledVisits}
          change={10}
          icon={FiCalendar}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          showMiniChart={true}
        />

        <StatCard
          title="Pending Reports"
          value={stats.completedVisits}
          change={-5}
          icon={FiFileText}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          showMiniChart={true}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Visitors Statistics"
          subtitle="Track visitor flow"
          mainValue={42345}
          secondaryValue={2345}
          change={47}
          icon={FiUsers}
          chartType="line"
          color="bg-orange-500"
        />

        <ChartCard
          title="Patient Admissions"
          subtitle="Monthly admission trends"
          mainValue={1060}
          secondaryValue={345}
          change={10}
          icon={FiActivity}
          chartType="bar"
          color="bg-red-500"
        />
      </div>

      {/* Recent Patient Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <FiActivity className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Patient Appointment</h2>
                <p className="text-sm text-gray-500">Keep track of patient data and others information.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patient..."
                  className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FiCalendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <button className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <FiActivity className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assign To Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {recentVisits.map((visit, idx) => (
                <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{String(idx + 1).padStart(4, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {format(new Date(visit.visit_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => visit.patient?.id && navigate(`/patients/${visit.patient.id}`)}
                      className="flex items-center hover:opacity-80 transition-opacity cursor-pointer w-full text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold mr-3">
                        {visit.patient?.first_name?.[0]}{visit.patient?.last_name?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {visit.patient?.first_name} {visit.patient?.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{visit.patient?.mrn}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs mr-2">
                        Dr
                      </div>
                      <span className="text-sm text-gray-900">Dr. Savannah Nguyen</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    Room {Math.floor(Math.random() * 20) + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      visit.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : visit.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {visit.status === 'completed' ? 'Completed' : visit.status === 'scheduled' ? 'Appointed' : 'Waiting'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      onClick={() => navigate(`/visits/${visit.id}`)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="View visit details"
                    >
                      <FiMoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
