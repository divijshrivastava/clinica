import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiFileText, FiCalendar, FiUser, FiCheckCircle } from 'react-icons/fi'
import { prescriptionsApi, Prescription } from '../api/prescriptions'
import { patientsApi, Patient } from '../api/patients'
import { format } from 'date-fns'

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchPrescription()
    }
  }, [id])

  const fetchPrescription = async () => {
    setLoading(true)
    try {
      const data = await prescriptionsApi.get(id!)
      setPrescription(data)
      
      // Fetch patient details if patient_id is available
      if (data.patient_id) {
        try {
          const patientData = await patientsApi.get(data.patient_id)
          setPatient(patientData)
        } catch (error) {
          console.error('Failed to load patient details:', error)
        }
      }
    } catch (error: any) {
      toast.error('Failed to load prescription details')
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

  if (!prescription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Prescription not found</p>
        <button
          onClick={() => navigate('/prescriptions')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Prescriptions
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/prescriptions')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2 h-5 w-5" />
          Back to Prescriptions
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Prescription Details</h1>
        <p className="mt-1 text-sm text-gray-500">Prescription Number: {prescription.prescription_number}</p>
      </div>

      {/* Patient Information Card */}
      {patient && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-semibold mr-4">
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h2>
                <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
                <button
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  View Patient Profile →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prescription Details */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Prescription Information</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Prescription Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{prescription.prescription_number}</dd>
              </div>
              {prescription.diagnosis && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Diagnosis</dt>
                  <dd className="mt-1 text-sm text-gray-900">{prescription.diagnosis}</dd>
                </div>
              )}
              {prescription.valid_until && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <FiCalendar className="mr-2 h-4 w-4" />
                    Valid Until
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(prescription.valid_until), 'MMMM d, yyyy')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      prescription.is_dispensed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {prescription.is_dispensed ? 'Dispensed' : 'Pending'}
                    </span>
                    {prescription.is_digital_signature && (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        <FiCheckCircle className="mr-1 h-3 w-3" />
                        Digitally Signed
                      </span>
                    )}
                  </div>
                </dd>
              </div>
              {prescription.is_dispensed && prescription.dispensed_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Dispensed At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(prescription.dispensed_at), 'MMM dd, yyyy h:mm a')}
                  </dd>
                  {prescription.dispensed_by && (
                    <dd className="mt-1 text-xs text-gray-500">by {prescription.dispensed_by}</dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">
              {prescription.notes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{prescription.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(prescription.created_at), 'MMM dd, yyyy h:mm a')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(prescription.updated_at), 'MMM dd, yyyy h:mm a')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Medications */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Medications</h3>
        </div>
        <div className="px-6 py-5">
          {prescription.medications && prescription.medications.length > 0 ? (
            <div className="space-y-4">
              {prescription.medications.map((medication, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{medication.drug_name}</h4>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Dosage:</span>
                          <span className="ml-2 text-gray-900">{medication.dosage}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Frequency:</span>
                          <span className="ml-2 text-gray-900">{medication.frequency}</span>
                        </div>
                        {medication.duration_days && (
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2 text-gray-900">{medication.duration_days} days</span>
                          </div>
                        )}
                        {medication.quantity && (
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <span className="ml-2 text-gray-900">{medication.quantity}</span>
                          </div>
                        )}
                      </div>
                      {medication.instructions && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">Instructions:</span>
                          <p className="mt-1 text-sm text-gray-900">{medication.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No medications listed</p>
          )}
        </div>
      </div>
    </div>
  )
}

