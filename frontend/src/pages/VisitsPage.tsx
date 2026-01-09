import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiPlus, FiCalendar, FiX } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import { visitsApi, Visit, VisitListResponse, ScheduleVisitPayload } from '../api/visits'
import { patientsApi, Patient } from '../api/patients'
import { format } from 'date-fns'
import SearchablePatientSelect from '../components/SearchablePatientSelect'

export default function VisitsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [visits, setVisits] = useState<Visit[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ScheduleVisitPayload>()

  // Check for action=schedule query param
  useEffect(() => {
    if (searchParams.get('action') === 'schedule') {
      setShowScheduleModal(true)
      searchParams.delete('action')
      setSearchParams(searchParams)
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    fetchVisits()
  }, [pagination.offset])

  useEffect(() => {
    if (showScheduleModal) {
      fetchPatients()
    }
  }, [showScheduleModal])

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const data: VisitListResponse = await visitsApi.list({
        limit: pagination.limit,
        offset: pagination.offset,
      })
      setVisits(data.data)
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        has_more: data.pagination.has_more,
      }))
    } catch (error: any) {
      toast.error('Failed to load visits')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const data = await patientsApi.list({ limit: 100 })
      setPatients(data.data)
    } catch (error) {
      console.error('Failed to load patients:', error)
    }
  }

  const onSubmitSchedule = async (data: ScheduleVisitPayload) => {
    setSubmitting(true)
    try {
      // Set scheduled_at to current time if not provided
      if (!data.scheduled_at) {
        data.scheduled_at = new Date().toISOString()
      } else {
        // Convert date-time-local to ISO string
        data.scheduled_at = new Date(data.scheduled_at).toISOString()
      }

      const result = await visitsApi.schedule(data)

      // Get selected patient info for optimistic update
      const selectedPatient = patients.find(p => p.id === data.patient_id)

      // Optimistically add the visit to the list
      const optimisticVisit: Visit = {
        id: result.aggregate_id,
        hospital_id: '',
        patient_id: data.patient_id,
        doctor_id: '',
        visit_date: data.scheduled_at.split('T')[0],
        visit_time: data.scheduled_at.split('T')[1].split('.')[0],
        visit_type: data.visit_type,
        chief_complaint: data.chief_complaint,
        status: 'scheduled',
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_version: 1,
      }

      setVisits(prev => [optimisticVisit, ...prev])
      setPagination(prev => ({ ...prev, total: prev.total + 1 }))

      toast.success('Visit scheduled successfully!')
      reset()
      setShowScheduleModal(false)

      // Fetch in background to sync with projection
      setTimeout(() => {
        fetchVisits()
      }, 1000)
    } catch (error: any) {
      console.error('Schedule visit error:', error)
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.validation_errors?.[0]?.error || 'Failed to schedule visit'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage patient visits and consultations
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <FiPlus className="mr-2 h-5 w-5" />
          Schedule Visit
        </button>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No visits</h3>
          <p className="mt-1 text-sm text-gray-500">
            Schedule a visit to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {visits.map((visit) => (
                <li key={visit.id}>
                  <Link to={`/visits/${visit.id}`} className="block hover:bg-gray-50 transition-colors">
                    <div className="px-4 py-5 sm:px-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                              visit.status === 'scheduled' ? 'bg-blue-100' :
                              visit.status === 'completed' ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              <FiCalendar className={`h-6 w-6 ${
                                visit.status === 'scheduled' ? 'text-blue-600' :
                                visit.status === 'completed' ? 'text-green-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {visit.visit_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {visit.patient?.first_name && visit.patient?.last_name
                                ? `${visit.patient.first_name} ${visit.patient.last_name}`
                                : 'Patient Information'}
                              {visit.patient?.mrn && (
                                <span className="ml-2 text-gray-400">• MRN: {visit.patient.mrn}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            visit.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                            visit.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {visit.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="ml-15">
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Chief Complaint:</p>
                          <p className="text-sm text-gray-900 mt-1">{visit.chief_complaint}</p>
                        </div>

                        {visit.notes && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 italic">{visit.notes}</p>
                          </div>
                        )}

                        {visit.status === 'completed' && visit.diagnosis && (
                          <div className="mt-3 p-3 bg-green-50 rounded-md">
                            <p className="text-sm font-medium text-green-900">Diagnosis:</p>
                            <p className="text-sm text-green-800 mt-1">{visit.diagnosis}</p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <FiCalendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>
                                {format(new Date(visit.visit_date), 'EEEE, MMMM d, yyyy')}
                              </span>
                            </div>
                            {visit.visit_time && (
                              <div className="flex items-center">
                                <span className="text-gray-400">at</span>
                                <span className="ml-1 font-medium text-gray-700">{visit.visit_time.slice(0, 5)}</span>
                              </div>
                            )}
                          </div>
                          {visit.completed_at && (
                            <div className="text-xs text-gray-400">
                              Completed {format(new Date(visit.completed_at), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} visits
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!pagination.has_more}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Schedule Visit Modal */}
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
                    <h3 className="text-lg font-medium text-gray-900">Schedule Visit</h3>
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
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
                          value={watch('patient_id')}
                          onChange={(patientId) => {
                            setValue('patient_id', patientId, { shouldValidate: true })
                            // Update selectedPatient for display
                            const patient = patients.find(p => p.id === patientId)
                            setSelectedPatient(patient || null)
                          }}
                          onBlur={() => {
                            const field = register('patient_id', { required: 'Patient is required' })
                            field.onBlur()
                          }}
                          error={errors.patient_id?.message as string}
                          required
                          placeholder="Search by name or MRN..."
                        />
                      </div>
                    </div>

                    {/* Selected Patient Info */}
                    {selectedPatient && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Phone:</strong> {selectedPatient.phone}
                        </p>
                        {selectedPatient.email && (
                          <p className="text-sm text-gray-700">
                            <strong>Email:</strong> {selectedPatient.email}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Visit Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Visit Type *
                        </label>
                        <select
                          {...register('visit_type', { required: 'Visit type is required' })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        >
                          <option value="">Select...</option>
                          <option value="consultation">Consultation</option>
                          <option value="follow_up">Follow-up</option>
                          <option value="procedure">Procedure</option>
                          <option value="emergency">Emergency</option>
                        </select>
                        {errors.visit_type && (
                          <p className="mt-1 text-sm text-red-600">{errors.visit_type.message}</p>
                        )}
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Priority
                        </label>
                        <select
                          {...register('priority')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>

                    {/* Scheduled Date/Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Scheduled Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        {...register('scheduled_at')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">Leave empty to use current time</p>
                    </div>

                    {/* Chief Complaint */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Chief Complaint *
                      </label>
                      <textarea
                        {...register('chief_complaint', { required: 'Chief complaint is required' })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="Patient's main concern or reason for visit..."
                      />
                      {errors.chief_complaint && (
                        <p className="mt-1 text-sm text-red-600">{errors.chief_complaint.message}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={2}
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
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Scheduling...' : 'Schedule Visit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
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
