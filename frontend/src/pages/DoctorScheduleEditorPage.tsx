import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiPlus, FiTrash2, FiSave } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import {
  doctorSchedulesApi,
  DoctorSchedule,
  CreateBaseSchedulePayload,
} from '../api/doctorSchedules'
import { doctorProfilesApi } from '../api/doctorProfiles'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function DoctorScheduleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState<any>(null)
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateBaseSchedulePayload>()

  useEffect(() => {
    if (id) {
      fetchDoctorAndSchedules()
    }
  }, [id])

  const fetchDoctorAndSchedules = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [doctorData, schedulesData] = await Promise.all([
        doctorProfilesApi.get(id),
        doctorSchedulesApi.list({ doctor_profile_id: id }),
      ])
      setDoctor(doctorData)
      setSchedules(schedulesData.data)
    } catch (error: any) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitSchedule = async (data: CreateBaseSchedulePayload) => {
    if (!id) return
    setSubmitting(true)
    try {
      // Get primary location or first location
      const primaryLocation = doctor?.locations?.find((l: any) => l.is_primary)
      const locationId = primaryLocation?.location_id || doctor?.locations?.[0]?.location_id

      if (!locationId) {
        toast.error('Doctor must be assigned to at least one location')
        return
      }

      const payload: CreateBaseSchedulePayload = {
        ...data,
        doctor_profile_id: id,
        location_id: locationId,
      }

      await doctorSchedulesApi.create(payload)
      toast.success('Schedule created successfully')
      setShowAddForm(false)
      reset()
      fetchDoctorAndSchedules()
    } catch (error: any) {
      console.error('Failed to create schedule:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to create schedule')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/doctor-profiles/${id}`)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <FiArrowLeft className="mr-1" />
          Back to Doctor Profile
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Schedule Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {doctor?.display_name} - Weekly Schedule
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Schedule
          </button>
        </div>
      </div>

      {/* Add Schedule Form */}
      {showAddForm && (
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Schedule</h2>
          <form onSubmit={handleSubmit(onSubmitSchedule)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Day of Week *
                </label>
                <select
                  {...register('day_of_week', { required: true, valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select day</option>
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
                {errors.day_of_week && (
                  <p className="mt-1 text-sm text-red-600">Day is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Consultation Mode *
                </label>
                <select
                  {...register('consultation_mode')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="in_person">In-Person</option>
                  <option value="tele_consultation">Tele-Consultation</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time *
                </label>
                <input
                  type="time"
                  {...register('start_time', { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-600">Start time is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time *
                </label>
                <input
                  type="time"
                  {...register('end_time', { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">End time is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slot Duration (minutes) *
                </label>
                <input
                  type="number"
                  {...register('slot_duration_minutes', { required: true, valueAsNumber: true, min: 5 })}
                  defaultValue={30}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.slot_duration_minutes && (
                  <p className="mt-1 text-sm text-red-600">Duration is required (min 5 minutes)</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Buffer Time (minutes)
                </label>
                <input
                  type="number"
                  {...register('buffer_time_minutes', { valueAsNumber: true, min: 0 })}
                  defaultValue={5}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Appointments per Slot
                </label>
                <input
                  type="number"
                  {...register('max_appointments_per_slot', { valueAsNumber: true, min: 1 })}
                  defaultValue={1}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Effective From
                </label>
                <input
                  type="date"
                  {...register('effective_from')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  reset()
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <FiSave className="mr-2" />
                {submitting ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No schedules configured</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FiPlus className="mr-2" />
              Add First Schedule
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schedule.start_time} - {schedule.end_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schedule.slot_duration_minutes} min
                    {schedule.buffer_time_minutes > 0 && ` (+${schedule.buffer_time_minutes} buffer)`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {schedule.consultation_mode.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schedule.max_appointments_per_slot} per slot
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        schedule.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
