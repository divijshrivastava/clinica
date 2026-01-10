import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { FiSearch, FiCalendar, FiClock, FiMapPin, FiDollarSign } from 'react-icons/fi'
import { appointmentSlotsApi, AppointmentSlot } from '../api/appointmentSlots'
import { format, addDays } from 'date-fns'

export default function SlotAvailabilityPage() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    specialty: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    consultation_mode: '',
  })

  useEffect(() => {
    fetchSlots()
  }, [])

  const fetchSlots = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (searchParams.specialty) params.specialty = searchParams.specialty
      if (searchParams.start_date) params.start_date = searchParams.start_date
      if (searchParams.end_date) params.end_date = searchParams.end_date
      if (searchParams.consultation_mode) params.consultation_mode = searchParams.consultation_mode

      const data = await appointmentSlotsApi.searchAvailability(params)
      setSlots(data.data)
    } catch (error: any) {
      console.error('Failed to load slots:', error)
      toast.error('Failed to load available slots')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSlots()
  }

  const groupSlotsByDate = () => {
    const grouped: Record<string, AppointmentSlot[]> = {}
    slots.forEach((slot) => {
      if (!grouped[slot.slot_date]) {
        grouped[slot.slot_date] = []
      }
      grouped[slot.slot_date].push(slot)
    })
    return grouped
  }

  const groupedSlots = groupSlotsByDate()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Appointment Slots</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search and book available doctor appointments
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialty
              </label>
              <input
                type="text"
                value={searchParams.specialty}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, specialty: e.target.value })
                }
                placeholder="e.g., Cardiology"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={searchParams.start_date}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, start_date: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={searchParams.end_date}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, end_date: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode
              </label>
              <select
                value={searchParams.consultation_mode}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, consultation_mode: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Modes</option>
                <option value="in_person">In-Person</option>
                <option value="tele_consultation">Tele-Consultation</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSearch className="mr-2" />
              {loading ? 'Searching...' : 'Search Slots'}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading available slots...</p>
        </div>
      ) : Object.keys(groupedSlots).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No slots found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSlots).map(([date, dateSlots]) => (
            <div key={date} className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dateSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {slot.doctor_name}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {slot.specialties?.slice(0, 2).map((spec, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FiClock className="mr-2 flex-shrink-0" />
                          <span>
                            {slot.start_time} - {slot.end_time} ({slot.duration_minutes} min)
                          </span>
                        </div>

                        <div className="flex items-center">
                          <FiMapPin className="mr-2 flex-shrink-0" />
                          <span className="truncate">{slot.location_name}</span>
                        </div>

                        {slot.consultation_fee && (
                          <div className="flex items-center">
                            <FiDollarSign className="mr-2 flex-shrink-0" />
                            <span>INR {slot.consultation_fee}</span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              slot.consultation_mode === 'in_person'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {slot.consultation_mode === 'in_person'
                              ? 'In-Person'
                              : 'Tele-Consultation'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>Available</span>
                          <span>
                            {slot.max_capacity - slot.current_bookings} / {slot.max_capacity}
                          </span>
                        </div>
                        <button
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          onClick={() => toast.info('Booking flow coming soon!')}
                        >
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
