import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  FiArrowLeft,
  FiEdit,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiDollarSign,
  FiMapPin,
  FiAward,
  FiClock,
  FiRefreshCw,
} from 'react-icons/fi'
import { doctorProfilesApi, DoctorProfile, BookabilityCheck } from '../api/doctorProfiles'
import { format } from 'date-fns'

export default function DoctorProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [bookability, setBookability] = useState<BookabilityCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showBookabilityDetails, setShowBookabilityDetails] = useState(false)

  useEffect(() => {
    if (id) {
      fetchDoctorDetails()
      fetchBookability()
    }
  }, [id])

  const fetchDoctorDetails = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await doctorProfilesApi.get(id)
      setDoctor(data)
    } catch (error: any) {
      console.error('Failed to load doctor:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to load doctor details')
    } finally {
      setLoading(false)
    }
  }

  const fetchBookability = async () => {
    if (!id) return
    try {
      const data = await doctorProfilesApi.checkBookability(id)
      setBookability(data)
    } catch (error: any) {
      console.error('Failed to load bookability:', error)
    }
  }

  const handleActivate = async () => {
    if (!id) return
    setActivating(true)
    try {
      await doctorProfilesApi.activate(id, {
        is_bookable: true,
        accepts_online_bookings: true,
        public_profile_visible: true,
      })
      toast.success('Doctor profile activated successfully')
      fetchDoctorDetails()
      fetchBookability()
    } catch (error: any) {
      console.error('Failed to activate doctor:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to activate doctor')
    } finally {
      setActivating(false)
    }
  }

  const handleRegenerateSlots = async () => {
    if (!id) return
    setRegenerating(true)
    try {
      const result = await doctorProfilesApi.regenerateSlots(id)
      toast.success(`Successfully regenerated ${result.slots_generated} slots`)
      fetchBookability()
    } catch (error: any) {
      console.error('Failed to regenerate slots:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to regenerate slots')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading doctor details...</p>
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">Doctor not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/doctor-profiles')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <FiArrowLeft className="mr-1" />
          Back to Doctors
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16">
              {doctor.profile_image_url ? (
                <img
                  className="h-16 w-16 rounded-full"
                  src={doctor.profile_image_url}
                  alt=""
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <FiAward className="h-8 w-8 text-blue-600" />
                </div>
              )}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {doctor.salutation} {doctor.display_name}
              </h1>
              <p className="text-sm text-gray-500">
                {doctor.registration_number || 'No registration number'}
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Link
              to={`/doctor-profiles/${id}/schedule`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiCalendar className="mr-2" />
              Manage Schedule
            </Link>
            {doctor.status !== 'active' && (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {activating ? 'Activating...' : 'Activate Doctor'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Years of Experience</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {doctor.years_of_experience || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">License Number</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {doctor.license_number || 'Not specified'}
                  {doctor.license_verified && (
                    <FiCheckCircle className="inline ml-2 text-green-500" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">License Expiry</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {doctor.license_expiry_date || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      doctor.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : doctor.status === 'pending_verification'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {doctor.status.replace('_', ' ')}
                  </span>
                </dd>
              </div>
            </dl>

            {doctor.bio && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">Bio</dt>
                <dd className="mt-1 text-sm text-gray-900">{doctor.bio}</dd>
              </div>
            )}
          </div>

          {/* Specialties & Qualifications */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Specialties & Qualifications</h2>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.specialties.map((specialty, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Qualifications</h3>
              <ul className="space-y-2">
                {doctor.qualifications.map((qual, idx) => (
                  <li key={idx} className="text-sm text-gray-900">
                    <span className="font-medium">{qual.degree}</span>
                    {qual.specialization && ` (${qual.specialization})`}
                    <span className="text-gray-500"> - {qual.institution}, {qual.year}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((lang, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Consultation Fees */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Consultation Fees</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                <FiEdit className="inline mr-1" />
                Edit Fees
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">In-Person</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {doctor.consultation_fee ? `${doctor.currency} ${doctor.consultation_fee}` : 'Not set'}
                </dd>
              </div>
              <div className="border rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Follow-up</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {doctor.follow_up_fee ? `${doctor.currency} ${doctor.follow_up_fee}` : 'Not set'}
                </dd>
              </div>
              <div className="border rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Tele-Consultation</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {doctor.tele_consultation_fee ? `${doctor.currency} ${doctor.tele_consultation_fee}` : 'Not set'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Locations & Departments */}
          {(doctor.locations || doctor.departments) && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Locations & Departments</h2>
              
              {doctor.locations && doctor.locations.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Locations</h3>
                  <ul className="space-y-2">
                    {doctor.locations.map((loc, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-900">
                        <FiMapPin className="mr-2 text-gray-400" />
                        {loc.location_name}
                        {loc.is_primary && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            Primary
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {doctor.departments && doctor.departments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Departments</h3>
                  <ul className="space-y-2">
                    {doctor.departments.map((dept, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-900">
                        <FiAward className="mr-2 text-gray-400" />
                        {dept.department_name} ({dept.allocation_percentage}%)
                        {dept.is_primary && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            Primary
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bookability Status */}
          {bookability && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Bookability Status</h2>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Score</span>
                  <span className="text-2xl font-bold text-gray-900">{bookability.bookability_score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      bookability.bookability_score >= 80
                        ? 'bg-green-500'
                        : bookability.bookability_score >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${bookability.bookability_score}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Bookable</span>
                  {bookability.is_bookable ? (
                    <FiCheckCircle className="text-green-500" />
                  ) : (
                    <FiXCircle className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Show in Search</span>
                  {bookability.can_show_in_search ? (
                    <FiCheckCircle className="text-green-500" />
                  ) : (
                    <FiXCircle className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Patient Booking</span>
                  {bookability.can_patient_book ? (
                    <FiCheckCircle className="text-green-500" />
                  ) : (
                    <FiXCircle className="text-red-500" />
                  )}
                </div>
              </div>

              {bookability.blockers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-red-700 mb-2">Blockers</h3>
                  <ul className="space-y-1">
                    {bookability.blockers.map((blocker, idx) => (
                      <li key={idx} className="text-xs text-red-600 flex items-start">
                        <FiXCircle className="mr-1 mt-0.5 flex-shrink-0" />
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bookability.warnings.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-yellow-700 mb-2">Warnings</h3>
                  <ul className="space-y-1">
                    {bookability.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-yellow-600 flex items-start">
                        <FiClock className="mr-1 mt-0.5 flex-shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setShowBookabilityDetails(!showBookabilityDetails)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showBookabilityDetails ? 'Hide' : 'Show'} Preconditions
              </button>

              {showBookabilityDetails && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {Object.entries(bookability.preconditions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{key.replace(/_/g, ' ')}</span>
                      {value ? (
                        <FiCheckCircle className="text-green-500" />
                      ) : (
                        <FiXCircle className="text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleRegenerateSlots}
                disabled={regenerating}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <FiRefreshCw className={`mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? 'Regenerating...' : 'Regenerate Slots'}
              </button>
              <Link
                to={`/leave-requests?doctor_profile_id=${id}`}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FiCalendar className="mr-2" />
                View Leave Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
