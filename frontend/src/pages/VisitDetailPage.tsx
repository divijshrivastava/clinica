import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiCalendar, FiUser, FiFileText, FiClock, FiActivity } from 'react-icons/fi'
import { visitsApi, Visit } from '../api/visits'
import { format } from 'date-fns'

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchVisit()
    }
  }, [id])

  const fetchVisit = async () => {
    setLoading(true)
    try {
      const data = await visitsApi.get(id!)
      setVisit(data)
    } catch (error: any) {
      toast.error('Failed to load visit details')
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

  if (!visit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Visit not found</p>
        <button
          onClick={() => navigate('/visits')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Visits
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/visits')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2 h-5 w-5" />
          Back to Visits
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Visit Details</h1>
        <p className="mt-1 text-sm text-gray-500">Visit ID: {visit.id}</p>
      </div>

      {/* Patient Information Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-semibold mr-4">
              {visit.patient?.first_name?.[0]}{visit.patient?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {visit.patient?.first_name} {visit.patient?.last_name}
              </h2>
              <p className="text-sm text-gray-500">MRN: {visit.patient?.mrn}</p>
              <button
                onClick={() => visit.patient_id && navigate(`/patients/${visit.patient_id}`)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                View Patient Profile →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Visit Information</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FiCalendar className="mr-2 h-4 w-4" />
                  Visit Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(visit.visit_date), 'MMMM d, yyyy')}
                  {visit.visit_time && ` at ${visit.visit_time}`}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FiActivity className="mr-2 h-4 w-4" />
                  Visit Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{visit.visit_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FiClock className="mr-2 h-4 w-4" />
                  Status
                </dt>
                <dd className="mt-1">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    visit.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : visit.status === 'scheduled'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {visit.status}
                  </span>
                </dd>
              </div>
              {visit.visit_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Visit Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">#{String(visit.visit_number).padStart(4, '0')}</dd>
                </div>
              )}
              {visit.duration_minutes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="mt-1 text-sm text-gray-900">{visit.duration_minutes} minutes</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Clinical Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Clinical Information</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Chief Complaint</dt>
                <dd className="mt-1 text-sm text-gray-900">{visit.chief_complaint || 'N/A'}</dd>
              </div>
              {visit.diagnosis && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Diagnosis</dt>
                  <dd className="mt-1 text-sm text-gray-900">{visit.diagnosis}</dd>
                </div>
              )}
              {visit.examination_findings && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Examination Findings</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{visit.examination_findings}</dd>
                </div>
              )}
              {visit.treatment_plan && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Treatment Plan</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{visit.treatment_plan}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Notes and Follow-up */}
      {(visit.notes || visit.follow_up_instructions || visit.follow_up_date) && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              {visit.notes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{visit.notes}</dd>
                </div>
              )}
              {visit.follow_up_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Follow-up Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(visit.follow_up_date), 'MMMM d, yyyy')}
                  </dd>
                </div>
              )}
              {visit.follow_up_instructions && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Follow-up Instructions</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{visit.follow_up_instructions}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Timestamps</h3>
        </div>
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visit.started_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Started At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(visit.started_at), 'MMM dd, yyyy h:mm a')}
                </dd>
              </div>
            )}
            {visit.completed_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Completed At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(visit.completed_at), 'MMM dd, yyyy h:mm a')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(visit.created_at), 'MMM dd, yyyy h:mm a')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(visit.updated_at), 'MMM dd, yyyy h:mm a')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

