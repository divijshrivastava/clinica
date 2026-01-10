import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiPlus, FiSearch, FiUser, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'
import { doctorProfilesApi, DoctorProfile, DoctorProfileListResponse } from '../api/doctorProfiles'

export default function DoctorProfilesPage() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<DoctorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('')
  const [bookableFilter, setBookableFilter] = useState<string>('')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  })

  useEffect(() => {
    fetchDoctors()
  }, [pagination.offset, statusFilter, specialtyFilter, bookableFilter])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit: pagination.limit,
        offset: pagination.offset,
      }

      if (statusFilter) params.status = statusFilter
      if (specialtyFilter) params.specialty = specialtyFilter
      if (bookableFilter === 'true') params.is_bookable = true

      const data: DoctorProfileListResponse = await doctorProfilesApi.list(params)
      setDoctors(data.data)
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        has_more: data.pagination.has_more,
      }))
    } catch (error: any) {
      console.error('Failed to load doctors:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getBookabilityBadge = (doctor: DoctorProfile) => {
    if (doctor.is_bookable) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
          <FiCheckCircle className="mr-1" />
          Bookable
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
        <FiXCircle className="mr-1" />
          Not Bookable
      </span>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Profiles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage doctor profiles, schedules, and availability
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/doctor-profiles/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Doctor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialty
            </label>
            <input
              type="text"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              placeholder="e.g., Cardiology"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bookability
            </label>
            <select
              value={bookableFilter}
              onChange={(e) => {
                setBookableFilter(e.target.value)
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Bookable Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchDoctors}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiSearch className="mr-2" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Doctor List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <FiUser className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No doctors found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a new doctor profile.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/doctor-profiles/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FiPlus className="mr-2" />
              Add Doctor
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fees
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {doctor.profile_image_url ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={doctor.profile_image_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {doctor.salutation} {doctor.display_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doctor.registration_number || 'No reg. number'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {doctor.specialties.slice(0, 2).map((specialty, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {specialty}
                          </span>
                        ))}
                        {doctor.specialties.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            +{doctor.specialties.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doctor.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBookabilityBadge(doctor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {doctor.bookability_score}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              doctor.bookability_score >= 80
                                ? 'bg-green-500'
                                : doctor.bookability_score >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${doctor.bookability_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doctor.consultation_fee ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {doctor.currency} {doctor.consultation_fee}
                          </div>
                          <div className="text-xs">Consultation</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/doctor-profiles/${doctor.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </Link>
                      <Link
                        to={`/doctor-profiles/${doctor.id}/schedule`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Schedule
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                disabled={pagination.offset === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                disabled={!pagination.has_more}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pagination.offset + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.offset + pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                    disabled={pagination.offset === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={!pagination.has_more}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
