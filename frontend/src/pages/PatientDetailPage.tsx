import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiEdit, FiCalendar, FiFileText, FiClipboard, FiX, FiUser, FiClock, FiCheckCircle } from 'react-icons/fi'
import { patientsApi, Patient } from '../api/patients'
import { medicalNotesApi, MedicalNote } from '../api/medicalNotes'
import { prescriptionsApi, Prescription } from '../api/prescriptions'
import { format } from 'date-fns'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<MedicalNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<MedicalNote | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPatient()
      fetchNotes()
      fetchPrescriptions()
    }
  }, [id])

  const fetchPatient = async () => {
    setLoading(true)
    try {
      const data = await patientsApi.get(id!)
      setPatient(data)
    } catch (error: any) {
      toast.error('Failed to load patient')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async () => {
    setLoadingNotes(true)
    try {
      const data = await medicalNotesApi.list({ patient_id: id, limit: 50 })
      setNotes(data.data)
    } catch (error: any) {
      toast.error('Failed to load notes')
      console.error(error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchPrescriptions = async () => {
    setLoadingPrescriptions(true)
    try {
      const data = await prescriptionsApi.list({ patient_id: id, limit: 50 })
      setPrescriptions(data.data)
    } catch (error: any) {
      toast.error('Failed to load prescriptions')
      console.error(error)
    } finally {
      setLoadingPrescriptions(false)
    }
  }

  const handleNoteClick = async (note: MedicalNote) => {
    setSelectedNote(note)
    setShowDetailModal(true)
    setLoadingDetail(true)
    
    try {
      // Fetch full note details
      const fullNote = await medicalNotesApi.get(note.id)
      setSelectedNote(fullNote)
    } catch (error: any) {
      toast.error('Failed to load note details')
      console.error(error)
    } finally {
      setLoadingDetail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2 h-5 w-5" />
          Back to Patients
        </button>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <FiEdit className="mr-2 h-5 w-5" />
          Edit
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-2xl">
                {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(patient.date_of_birth), 'MMMM d, yyyy')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{patient.gender}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{patient.phone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{patient.email || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {patient.whatsapp_phone || 'N/A'}
                {patient.whatsapp_opted_in && <span className="ml-2 text-green-600">✓ Opted in</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Registered</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(patient.created_at), 'MMMM d, yyyy')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => navigate(`/visits?patient_id=${id}&action=schedule`)}
          className="flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiCalendar className="mr-3 h-5 w-5" />
          Schedule Visit
        </button>
        <button
          onClick={() => navigate(`/prescriptions?patient_id=${id}&action=new`)}
          className="flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiFileText className="mr-3 h-5 w-5" />
          New Prescription
        </button>
        <button
          onClick={() => navigate(`/notes?patient_id=${id}&action=new`)}
          className="flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiClipboard className="mr-3 h-5 w-5" />
          Add Note
        </button>
        <button
          onClick={() => navigate(`/appointments?patient_id=${id}&action=schedule`)}
          className="flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiCalendar className="mr-3 h-5 w-5" />
          Schedule Appointment
        </button>
      </div>

      {/* Medical Notes Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Medical Notes</h3>
          <button
            onClick={() => navigate(`/notes?patient_id=${id}&action=new`)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Add Note
          </button>
        </div>
        <div className="px-6 py-5">
          {loadingNotes ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <FiClipboard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notes</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new note.
              </p>
              <button
                onClick={() => navigate(`/notes?patient_id=${id}&action=new`)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <FiClipboard className="mr-2 h-4 w-4" />
                Create Note
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {notes.map((note) => (
                <li
                  key={note.id}
                  onClick={() => handleNoteClick(note)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {note.title || 'Untitled Note'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {note.content?.substring(0, 100) || 
                         (note.note_type === 'handwritten' && note.image_urls?.length 
                           ? `${note.image_urls.length} image(s)` 
                           : 'No content')}
                        {note.content && note.content.length > 100 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                          {note.note_type}
                        </span>
                        {note.created_at && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(note.created_at), 'MMM d, yyyy')}
                          </span>
                        )}
                        {note.is_signed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Signed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Prescriptions Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Prescriptions</h3>
          <button
            onClick={() => navigate(`/prescriptions?patient_id=${id}&action=new`)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            New Prescription
          </button>
        </div>
        <div className="px-6 py-5">
          {loadingPrescriptions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-8">
              <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No prescriptions</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new prescription.
              </p>
              <button
                onClick={() => navigate(`/prescriptions?patient_id=${id}&action=new`)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <FiFileText className="mr-2 h-4 w-4" />
                Create Prescription
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {prescriptions.map((prescription) => (
                <li
                  key={prescription.id}
                  onClick={() => navigate(`/prescriptions/${prescription.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {prescription.prescription_number}
                        </p>
                        {prescription.is_dispensed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <FiCheckCircle className="mr-1 h-3 w-3" />
                            Dispensed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {prescription.diagnosis || 'No diagnosis'}
                      </p>
                      {prescription.medications && prescription.medications.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {prescription.medications.length} medication{prescription.medications.length !== 1 ? 's' : ''}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {prescription.created_at && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(prescription.created_at), 'MMM d, yyyy')}
                          </span>
                        )}
                        {prescription.valid_until && (
                          <span className="text-xs text-gray-400">
                            Valid until {format(new Date(prescription.valid_until), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Note Detail Modal */}
      {showDetailModal && selectedNote && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowDetailModal(false)
                setSelectedNote(null)
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedNote.title || 'Untitled Note'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false)
                      setSelectedNote(null)
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Note Type and Status */}
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                        {selectedNote.note_type}
                      </span>
                      {selectedNote.is_signed && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Signed
                        </span>
                      )}
                    </div>

                    {/* Images (for handwritten notes) */}
                    {selectedNote.image_urls && selectedNote.image_urls.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Images ({selectedNote.image_urls.length})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedNote.image_urls.map((imageUrl, index) => (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Note image ${index + 1}`}
                                className="w-full h-auto rounded-lg border border-gray-300 object-contain max-h-96"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    {selectedNote.content && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content
                        </label>
                        <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {selectedNote.content}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* OCR Information (if available) */}
                    {selectedNote.ocr_confidence !== null && selectedNote.ocr_confidence !== undefined && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">OCR Confidence: </span>
                          <span className="text-gray-900">
                            {(selectedNote.ocr_confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {selectedNote.ocr_status && (
                          <div className="text-sm mt-1">
                            <span className="font-medium text-gray-700">OCR Status: </span>
                            <span className="text-gray-900 capitalize">{selectedNote.ocr_status}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="border-t border-gray-200 pt-4">
                      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {selectedNote.created_at && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                              <FiClock className="h-4 w-4" />
                              Created
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {format(new Date(selectedNote.created_at), 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                        )}
                        {selectedNote.updated_at && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                              <FiClock className="h-4 w-4" />
                              Updated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                        )}
                        {selectedNote.signed_at && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                              <FiCalendar className="h-4 w-4" />
                              Signed
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {format(new Date(selectedNote.signed_at), 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedNote(null)
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

