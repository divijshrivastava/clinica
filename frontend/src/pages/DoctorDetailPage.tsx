import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiCalendar, FiUsers, FiCheckCircle, FiClock, FiMail, FiPhone, FiActivity } from 'react-icons/fi'
import { doctorsApi, Doctor } from '../api/doctors'
import { visitsApi, Visit } from '../api/visits'
import { format } from 'date-fns'

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loadingVisits, setLoadingVisits] = useState(true)

  useEffect(() => {
    if (id) {
      fetchDoctor()
      fetchVisits()
    }
  }, [id])

  const fetchDoctor = async () => {
    setLoading(true)
    try {
      const data = await doctorsApi.get(id!)
      setDoctor(data)
    } catch (error: any) {
      toast.error('Failed to load doctor details')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVisits = async () => {
    setLoadingVisits(true)
    try {
      // Note: We'd need to add a doctor_id filter to the visits API
      // For now, we'll fetch all visits and filter client-side
      const data = await visitsApi.list({ limit: 100 })
      const doctorVisits = data.data.filter(visit => visit.doctor_id === id)
      setVisits(doctorVisits)
    } catch (error: any) {
      toast.error('Failed to load visits')
      console.error(error)
    } finally {
      setLoadingVisits(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Doctor not found</p>
      </div>
    )
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    }
    return name.charAt(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2 h-5 w-5" />
          Back
        </button>
      </div>

      {/* Doctor Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-2xl">
                {getInitials(doctor.full_name)}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Dr. {doctor.full_name}
              </h1>
              {doctor.specialization && (
                <p className="text-sm text-gray-500">{doctor.specialization}</p>
              )}
            </div>
            {doctor.is_active && (
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <FiCheckCircle className="mr-1 h-4 w-4" />
                  Active
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <FiMail className="mr-2 h-4 w-4" />
                Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{doctor.email}</dd>
            </div>
            {doctor.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FiPhone className="mr-2 h-4 w-4" />
                  Phone
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{doctor.phone}</dd>
              </div>
            )}
            {doctor.department && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Department</dt>
                <dd className="mt-1 text-sm text-gray-900">{doctor.department}</dd>
              </div>
            )}
            {doctor.registration_number && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{doctor.registration_number}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{doctor.role}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Joined</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(doctor.created_at), 'MMMM d, yyyy')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Statistics Cards */}
      {doctor.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                <FiActivity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{doctor.stats.total_visits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                <FiClock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Scheduled Visits</p>
                <p className="text-2xl font-bold text-gray-900">{doctor.stats.scheduled_visits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                <FiUsers className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{doctor.stats.total_patients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                <FiCalendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{doctor.stats.upcoming_appointments}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Visits */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Visits</h2>
        </div>
        <div className="overflow-x-auto">
          {loadingVisits ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No visits yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                This doctor hasn't conducted any visits yet.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chief Complaint
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visits.slice(0, 10).map((visit) => (
                  <tr
                    key={visit.id}
                    onClick={() => navigate(`/visits/${visit.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(visit.visit_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {visit.patient?.first_name} {visit.patient?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{visit.patient?.mrn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {visit.visit_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        visit.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : visit.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {visit.chief_complaint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
