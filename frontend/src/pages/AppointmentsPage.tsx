import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiPlus, FiCalendar, FiX, FiTrash2, FiClock, FiUser, FiFileText, FiChevronRight } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import { appointmentsApi, ScheduleAppointmentPayload, Appointment, CancelAppointmentPayload } from '../api/appointments'
import { patientsApi, Patient } from '../api/patients'
import { useAuthStore } from '../store/authStore'
import { format, isToday, isPast, isFuture, differenceInMinutes } from 'date-fns'
import SearchablePatientSelect from '../components/SearchablePatientSelect'

export default function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const { user } = useAuthStore()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ScheduleAppointmentPayload>({
    defaultValues: {
      duration_minutes: 30,
      appointment_type: 'consultation',
    },
  })

  const { register: registerCancel, handleSubmit: handleSubmitCancel, reset: resetCancel, formState: { errors: cancelErrors } } = useForm<CancelAppointmentPayload>()

  // Check for action=schedule query param
  useEffect(() => {
    if (searchParams.get('action') === 'schedule') {
      setShowScheduleModal(true)
      searchParams.delete('action')
      setSearchParams(searchParams)
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    fetchAppointments()
  }, [])

  useEffect(() => {
    if (showScheduleModal) {
      fetchPatients()
    }
  }, [showScheduleModal])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const data = await appointmentsApi.list({ limit: 50 })
      setAppointments(data.data)
    } catch (error: any) {
      toast.error('Failed to load appointments')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const data = await patientsApi.list({ limit: 100 })
      setPatients(data.data)
    } catch (error: any) {
      toast.error('Failed to load patients')
      console.error(error)
    }
  }

  const onSubmitSchedule = async (data: ScheduleAppointmentPayload) => {
    if (!user?.user_id) {
      toast.error('User not authenticated')
      return
    }

    setSubmitting(true)
    try {
      // Convert date-time-local to ISO string
      const scheduledAt = new Date(data.scheduled_at).toISOString()

      const payload: ScheduleAppointmentPayload = {
        patient_id: data.patient_id,
        doctor_id: user.user_id, // Use current user as doctor
        scheduled_at: scheduledAt,
        duration_minutes: data.duration_minutes || 30,
        appointment_type: data.appointment_type,
        reason: data.reason,
        notes: data.notes,
      }

      const result = await appointmentsApi.schedule(payload)

      // Get selected patient info for optimistic update
      const selectedPatient = patients.find(p => p.id === data.patient_id)

      // Optimistically add the appointment to the list
      const optimisticAppointment: Appointment = {
        id: result.aggregate_id,
        hospital_id: user.hospital_id || '',
        patient_id: data.patient_id,
        doctor_id: user.user_id,
        scheduled_at: scheduledAt,
        duration_minutes: data.duration_minutes || 30,
        appointment_type: data.appointment_type,
        status: 'scheduled',
        reason: data.reason,
        notes: data.notes,
        current_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        patient: selectedPatient ? {
          mrn: selectedPatient.mrn,
          first_name: selectedPatient.first_name,
          last_name: selectedPatient.last_name,
        } : undefined,
      }

      setAppointments(prev => [optimisticAppointment, ...prev])
      toast.success('Appointment scheduled successfully!')
      reset()
      setShowScheduleModal(false)

      // Fetch in background to sync with projection (after a short delay)
      setTimeout(() => {
        fetchAppointments()
      }, 1000)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to schedule appointment')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setShowCancelModal(true)
  }

  const onSubmitCancel = async (data: CancelAppointmentPayload) => {
    if (!selectedAppointmentId) return

    setCancellingId(selectedAppointmentId)
    try {
      await appointmentsApi.cancel(selectedAppointmentId, data)

      // Optimistically update the appointment status
      setAppointments(prev => prev.map(apt => 
        apt.id === selectedAppointmentId
          ? { ...apt, status: 'cancelled', cancellation_reason: data.cancellation_reason, cancelled_at: new Date().toISOString() }
          : apt
      ))

      toast.success('Appointment cancelled successfully!')
      setShowCancelModal(false)
      setSelectedAppointmentId(null)
      resetCancel()

      // Fetch in background to sync with projection
      setTimeout(() => {
        fetchAppointments()
      }, 1000)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel appointment')
      console.error(error)
    } finally {
      setCancellingId(null)
    }
  }

  // Pre-fill patient_id from query params
  const patientIdFromQuery = searchParams.get('patient_id')

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage patient appointments
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <FiPlus className="mr-2 h-5 w-5" />
          Schedule Appointment
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Schedule an appointment to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {appointments.map((appointment) => {
            const appointmentDate = new Date(appointment.scheduled_at)
            const isAppointmentToday = isToday(appointmentDate)
            const isAppointmentPast = isPast(appointmentDate)
            const isAppointmentUpcoming = isFuture(appointmentDate)
            const minutesUntil = differenceInMinutes(appointmentDate, new Date())
            
            const getTimeIndicator = () => {
              if (isAppointmentPast && appointment.status !== 'completed' && appointment.status !== 'cancelled') {
                return { text: 'Overdue', color: 'text-red-600 bg-red-50' }
              }
              if (isAppointmentToday) {
                if (minutesUntil > 0 && minutesUntil <= 60) {
                  return { text: `In ${minutesUntil} min`, color: 'text-orange-600 bg-orange-50' }
                }
                return { text: 'Today', color: 'text-blue-600 bg-blue-50' }
              }
              if (isAppointmentUpcoming) {
                return { text: 'Upcoming', color: 'text-green-600 bg-green-50' }
              }
              return null
            }

            const timeIndicator = getTimeIndicator()
            const patientName = `${appointment.patient?.first_name || appointment.patient_first_name} ${appointment.patient?.last_name || appointment.patient_last_name}`
            const patientMRN = appointment.patient?.mrn || appointment.patient_mrn

            return (
              <div
                key={appointment.id}
                onClick={() => navigate(`/appointments/${appointment.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {patientName}
                          </h3>
                          {patientMRN && (
                            <p className="text-sm text-gray-500">MRN: {patientMRN}</p>
                          )}
                        </div>
                      </div>

                      <div className="ml-[52px] space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiClock className="h-4 w-4 text-gray-400" />
                          <span>{format(appointmentDate, 'h:mm a')}</span>
                          {appointment.duration_minutes && (
                            <span className="text-gray-400">• {appointment.duration_minutes} min</span>
                          )}
                        </div>
                        {appointment.appointment_type && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                              {appointment.appointment_type.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        {appointment.reason && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <FiFileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{appointment.reason}</span>
                          </div>
                        )}
                        {appointment.notes && (
                          <div className="flex items-start gap-2 text-sm text-gray-500">
                            <span className="italic line-clamp-1">{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      {timeIndicator && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${timeIndicator.color}`}>
                          {timeIndicator.text}
                        </span>
                      )}
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : appointment.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : appointment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                      {appointment.status === 'scheduled' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelClick(appointment.id)
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                          title="Cancel appointment"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                      <FiChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {showCancelModal && selectedAppointmentId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowCancelModal(false)
                setSelectedAppointmentId(null)
                resetCancel()
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmitCancel(onSubmitCancel)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Cancel Appointment</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelModal(false)
                        setSelectedAppointmentId(null)
                        resetCancel()
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cancellation Reason *
                      </label>
                      <textarea
                        {...registerCancel('cancellation_reason', { required: 'Cancellation reason is required' })}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="Enter reason for cancellation..."
                      />
                      {cancelErrors.cancellation_reason && (
                        <p className="mt-1 text-sm text-red-600">{cancelErrors.cancellation_reason.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={cancellingId === selectedAppointmentId}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {cancellingId === selectedAppointmentId ? 'Cancelling...' : 'Cancel Appointment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelModal(false)
                      setSelectedAppointmentId(null)
                      resetCancel()
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Keep Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Appointment Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowScheduleModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmitSchedule)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Schedule Appointment</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScheduleModal(false)
                        reset()
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Patient Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Patient *
                      </label>
                      <div className="mt-1">
                        <SearchablePatientSelect
                          patients={patients}
                          value={watch('patient_id') || patientIdFromQuery || ''}
                          onChange={(patientId) => setValue('patient_id', patientId, { shouldValidate: true })}
                          error={errors.patient_id?.message as string}
                          required
                          placeholder="Search by name or MRN..."
                        />
                      </div>
                    </div>

                    {/* Scheduled Date/Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        {...register('scheduled_at', { required: 'Date and time is required' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                      />
                      {errors.scheduled_at && (
                        <p className="mt-1 text-sm text-red-600">{errors.scheduled_at.message}</p>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        {...register('duration_minutes', { min: 15, max: 240, valueAsNumber: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="30"
                      />
                    </div>

                    {/* Appointment Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Appointment Type
                      </label>
                      <select
                        {...register('appointment_type')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="checkup">Checkup</option>
                        <option value="emergency">Emergency</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reason
                      </label>
                      <input
                        type="text"
                        {...register('reason')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="Reason for appointment..."
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowScheduleModal(false)
                      reset()
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
