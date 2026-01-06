import { useState, useRef, useEffect } from 'react'
import { Patient } from '../api/patients'
import { FiChevronDown, FiX, FiSearch } from 'react-icons/fi'

interface SearchablePatientSelectProps {
  patients: Patient[]
  value?: string
  onChange: (patientId: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  placeholder?: string
  className?: string
}

export default function SearchablePatientSelect({
  patients,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder = 'Search and select a patient...',
  className = '',
}: SearchablePatientSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find selected patient when value changes
  useEffect(() => {
    if (value) {
      const patient = patients.find(p => p.id === value)
      setSelectedPatient(patient || null)
      if (patient) {
        setSearchTerm(`${patient.first_name} ${patient.last_name} - ${patient.mrn}`)
      }
    } else {
      setSelectedPatient(null)
      setSearchTerm('')
    }
  }, [value, patients])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter patients based on search term
  const filteredPatients = searchTerm.trim() === '' 
    ? patients 
    : patients.filter(patient => {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
        const mrn = patient.mrn?.toLowerCase() || ''
        const search = searchTerm.toLowerCase().trim()
        return fullName.includes(search) || mrn.includes(search)
      })

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    setSearchTerm(`${patient.first_name} ${patient.last_name} - ${patient.mrn}`)
    onChange(patient.id)
    setIsOpen(false)
    if (onBlur) onBlur()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPatient(null)
    setSearchTerm('')
    onChange('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setIsOpen(true)
    
    // If user is typing and there was a selected patient, clear the selection
    if (selectedPatient && newValue !== `${selectedPatient.first_name} ${selectedPatient.last_name} - ${selectedPatient.mrn}`) {
      setSelectedPatient(null)
      onChange('')
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    // If there's a selected patient, allow editing the search term
    if (selectedPatient) {
      setSearchTerm(`${selectedPatient.first_name} ${selectedPatient.last_name} - ${selectedPatient.mrn}`)
    }
  }

  const handleInputClick = () => {
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-20 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {selectedPatient && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <FiChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && patients.length > 0 && (
        <>
          {filteredPatients.length > 0 ? (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => handleSelect(patient)}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 ${
                    selectedPatient?.id === patient.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </span>
                    <span className="text-sm text-gray-500">MRN: {patient.mrn}</span>
                  </div>
                  {selectedPatient?.id === patient.id && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              <div className="px-4 py-2 text-sm text-gray-500">No patients found</div>
            </div>
          )}
        </>
      )}

      {isOpen && patients.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <div className="px-4 py-2 text-sm text-gray-500">Loading patients...</div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

