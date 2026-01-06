import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiCalendar, FiUser, FiClock, FiX } from 'react-icons/fi'
import { appointmentsApi, Appointment } from '../api/appointments'
import { format } from 'date-fns'

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchAppointment()
    }
  }, [id])

  const fetchAppointment = async () => {
    setLoading(true)
    try {
      const data = await appointmentsApi.get(id!)
      setAppointment(data)
    } catch (error: any) {
      toast.error('Failed to load appointment details')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Appointment not found</p>
        <button
          onClick={() => navigate('/appointments')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Appointments
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2 h-5 w-5" />
          Back to Appointments
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
        <p className="mt-1 text-sm text-gray-500">Appointment ID: {appointment.id}</p>
      </div>

      {/* Patient Information Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-semibold mr-4">
              {appointment.patient?.first_name?.[0] || appointment.patient_first_name?.[0]}
              {appointment.patient?.last_name?.[0] || appointment.patient_last_name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {appointment.patient?.first_name || appointment.patient_first_name} {appointment.patient?.last_name || appointment.patient_last_name}
              </h2>
              <p className="text-sm text-gray-500">
                MRN: {appointment.patient?.mrn || appointment.patient_mrn}
              </p>
              <button
                onClick={() => appointment.patient_id && navigate(`/patients/${appointment.patient_id}`)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                View Patient Profile →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Appointment Information</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FiCalendar className="mr-2 h-4 w-4" />
                  Scheduled Date & Time
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(appointment.scheduled_at), 'MMMM d, yyyy h:mm a')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FiClock className="mr-2 h-4 w-4" />
                  Duration
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {appointment.duration_minutes || 30} minutes
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Appointment Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {appointment.appointment_type || 'Consultation'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    appointment.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : appointment.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : appointment.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {appointment.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Additional Details</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              {appointment.reason && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reason</dt>
                  <dd className="mt-1 text-sm text-gray-900">{appointment.reason}</dd>
                </div>
              )}
              {appointment.notes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{appointment.notes}</dd>
                </div>
              )}
              {appointment.confirmed_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Confirmed At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(appointment.confirmed_at), 'MMM dd, yyyy h:mm a')}
                  </dd>
                  {appointment.confirmed_by && (
                    <dd className="mt-1 text-xs text-gray-500">by {appointment.confirmed_by}</dd>
                  )}
                </div>
              )}
              {appointment.cancelled_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cancelled At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(appointment.cancelled_at), 'MMM dd, yyyy h:mm a')}
                  </dd>
                  {appointment.cancellation_reason && (
                    <dd className="mt-1 text-sm text-gray-700">
                      <span className="font-medium">Reason:</span> {appointment.cancellation_reason}
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Timestamps</h3>
        </div>
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(appointment.created_at), 'MMM dd, yyyy h:mm a')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(appointment.updated_at), 'MMM dd, yyyy h:mm a')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

