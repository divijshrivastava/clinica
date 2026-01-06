import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiPlus, FiFileText, FiX } from 'react-icons/fi'
import { useForm, useFieldArray } from 'react-hook-form'
import { prescriptionsApi, CreatePrescriptionPayload } from '../api/prescriptions'
import { patientsApi, Patient } from '../api/patients'
import { useAuthStore } from '../store/authStore'
import SearchablePatientSelect from '../components/SearchablePatientSelect'

interface MedicationForm {
  drug_name: string
  dosage: string
  frequency: string
  duration_days?: number
  instructions?: string
  quantity?: number
}

interface PrescriptionForm extends Omit<CreatePrescriptionPayload, 'medications'> {
  medications: MedicationForm[]
}

export default function PrescriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuthStore()

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<PrescriptionForm>({
    defaultValues: {
      medications: [{ drug_name: '', dosage: '', frequency: '', duration_days: 7 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications',
  })

  // Check for action=new query param
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowCreateModal(true)
      searchParams.delete('action')
      setSearchParams(searchParams)
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  useEffect(() => {
    if (showCreateModal) {
      fetchPatients()
    }
  }, [showCreateModal])

  const fetchPrescriptions = async () => {
    setLoading(true)
    try {
      const data = await prescriptionsApi.list({ limit: 50 })
      setPrescriptions(data.data)
    } catch (error: any) {
      toast.error('Failed to load prescriptions')
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

  const onSubmitCreate = async (data: PrescriptionForm) => {
    if (!data.patient_id) {
      toast.error('Patient is required')
      return
    }

    setSubmitting(true)
    try {
      // Convert form data to API format
      const payload: CreatePrescriptionPayload = {
        patient_id: data.patient_id,
        visit_id: data.visit_id || undefined,
        diagnosis: data.diagnosis || undefined,
        notes: data.notes || undefined,
        valid_until: data.valid_until || undefined,
        medications: data.medications.map(med => ({
          drug_name: med.drug_name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration_days: med.duration_days,
          instructions: med.instructions,
          quantity: med.quantity,
        })),
      }

      const result = await prescriptionsApi.create(payload)

      // Get selected patient info for optimistic update
      const selectedPatient = patients.find(p => p.id === data.patient_id)

      // Generate prescription number (format: RX-YYYY-XXXXXX)
      const prescriptionNumber = `RX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

      // Optimistically add the prescription to the list
      const optimisticPrescription: any = {
        id: result.aggregate_id,
        hospital_id: selectedPatient?.hospital_id || '',
        patient_id: data.patient_id,
        doctor_id: '', // Will be filled by projection
        prescription_number: prescriptionNumber,
        medications: payload.medications,
        diagnosis: data.diagnosis || '',
        notes: data.notes,
        is_digital_signature: false,
        valid_until: data.valid_until,
        is_dispensed: false,
        current_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setPrescriptions(prev => [optimisticPrescription, ...prev])
      toast.success('Prescription created successfully!')
      setShowCreateModal(false)
      reset()

      // Fetch in background to sync with projection (after a short delay)
      setTimeout(() => {
        fetchPrescriptions()
      }, 1000)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create prescription')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  // Pre-fill patient_id from query params
  const patientIdFromQuery = searchParams.get('patient_id')

  if (loading && prescriptions.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage patient prescriptions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <FiPlus className="mr-2 h-5 w-5" />
          New Prescription
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No prescriptions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a prescription to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {prescriptions.map((prescription) => (
              <li key={prescription.id}>
                <button
                  onClick={() => navigate(`/prescriptions/${prescription.id}`)}
                  className="w-full px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {prescription.prescription_number}
                      </p>
                      <p className="text-sm text-gray-500">{prescription.diagnosis || 'No diagnosis'}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmitCreate)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Create Prescription</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
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

                    {/* Diagnosis */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Diagnosis
                      </label>
                      <input
                        type="text"
                        {...register('diagnosis')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="Enter diagnosis..."
                      />
                    </div>

                    {/* Medications */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Medications *
                        </label>
                        <button
                          type="button"
                          onClick={() => append({ drug_name: '', dosage: '', frequency: '', duration_days: 7 })}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          + Add Medication
                        </button>
                      </div>

                      {fields.map((field, index) => (
                        <div key={field.id} className="mb-4 p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Medication {index + 1}</span>
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600">Drug Name *</label>
                              <input
                                type="text"
                                {...register(`medications.${index}.drug_name`, { required: 'Required' })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                                placeholder="e.g., Paracetamol"
                              />
                              {errors.medications?.[index]?.drug_name && (
                                <p className="mt-1 text-xs text-red-600">{errors.medications[index]?.drug_name?.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600">Dosage *</label>
                              <input
                                type="text"
                                {...register(`medications.${index}.dosage`, { required: 'Required' })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                                placeholder="e.g., 500mg"
                              />
                              {errors.medications?.[index]?.dosage && (
                                <p className="mt-1 text-xs text-red-600">{errors.medications[index]?.dosage?.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600">Frequency *</label>
                              <input
                                type="text"
                                {...register(`medications.${index}.frequency`, { required: 'Required' })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                                placeholder="e.g., twice daily"
                              />
                              {errors.medications?.[index]?.frequency && (
                                <p className="mt-1 text-xs text-red-600">{errors.medications[index]?.frequency?.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600">Duration (days)</label>
                              <input
                                type="number"
                                {...register(`medications.${index}.duration_days`, { min: 1, valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                                placeholder="7"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600">Instructions</label>
                              <textarea
                                {...register(`medications.${index}.instructions`)}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                                placeholder="Additional instructions..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {errors.medications && typeof errors.medications === 'object' && 'message' in errors.medications && (
                        <p className="mt-1 text-sm text-red-600">{errors.medications.message}</p>
                      )}
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

                    {/* Valid Until */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Valid Until
                      </label>
                      <input
                        type="date"
                        {...register('valid_until')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
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
                    {submitting ? 'Creating...' : 'Create Prescription'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
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
