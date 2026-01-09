import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiUser, FiActivity, FiCreditCard, FiUsers, FiSettings, FiCheck, FiArrowLeft, FiX, FiPlus, FiMail } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { registerHospital, createUser, login, waitForProjection } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

// Step 1: Admin Account
interface Step1Data {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

// Step 2: Hospital Details
interface Step2Data {
  hospitalName: string
  address: string
  city: string
  state: string
  zipCode: string
  license: string
  departments: string[]
  bedCapacity: number
  emergencyServices: boolean
}

// Step 3: Enterprise Plan
interface Step3Data {
  estimatedDoctors: number
  estimatedPatients: number
  requestDemo: boolean
  salesContact: boolean
}

// Step 4: Department Heads
interface DepartmentHead {
  department: string
  name: string
  email: string
}

interface Step4Data {
  departmentHeads: DepartmentHead[]
}

// Step 5: Settings
interface Step5Data {
  enableWhatsApp: boolean
  whatsappNumber?: string
  defaultAppointmentDuration: number
  enableEmergencyModule: boolean
  enableIPDManagement: boolean
  enableLabIntegration: boolean
  enablePharmacyIntegration: boolean
}

const DEPARTMENTS = [
  'Emergency',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology',
  'General Surgery',
  'Internal Medicine',
  'Radiology',
  'Pathology',
  'Anesthesiology',
  'ICU',
]

function ProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: 'Admin', icon: FiUser },
    { number: 2, label: 'Hospital', icon: FiActivity },
    { number: 3, label: 'Plan', icon: FiCreditCard },
    { number: 4, label: 'Team', icon: FiUsers },
    { number: 5, label: 'Settings', icon: FiSettings },
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10">
          <div
            className="h-full bg-green-600 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
          />
        </div>

        {steps.map((step) => {
          const Icon = step.icon
          const isCompleted = step.number < currentStep
          const isCurrent = step.number === currentStep
          const isPending = step.number > currentStep

          return (
            <div key={step.number} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <FiCheck className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`text-xs mt-2 ${
                  isCurrent ? 'text-green-600 font-semibold' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function HospitalOnboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data & Step4Data & Step5Data>>({
    defaultAppointmentDuration: 30,
    estimatedDoctors: 50,
    estimatedPatients: 1000,
    requestDemo: false,
    salesContact: false,
    departmentHeads: [],
    departments: [],
    bedCapacity: 100,
    emergencyServices: true,
    enableEmergencyModule: true,
    enableIPDManagement: true,
    enableLabIntegration: false,
    enablePharmacyIntegration: false,
  })

  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
  } = useForm<Step1Data>({ defaultValues: formData })

  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    formState: { errors: errorsStep2 },
    watch: watchStep2,
  } = useForm<Step2Data>({ defaultValues: formData })

  const {
    register: registerStep3,
    handleSubmit: handleSubmitStep3,
    watch: watchStep3,
  } = useForm<Step3Data>({ defaultValues: formData })

  const {
    register: registerStep5,
    handleSubmit: handleSubmitStep5,
    watch: watchStep5,
  } = useForm<Step5Data>({ defaultValues: formData })

  // Step 1: Admin Account
  const onSubmitStep1 = (data: Step1Data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (data.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setFormData((prev) => ({ ...prev, ...data }))
    setCurrentStep(2)
  }

  // Step 2: Hospital Details
  const selectedDepartments = watchStep2('departments') || formData.departments || []

  const toggleDepartment = (dept: string) => {
    const current = selectedDepartments as string[]
    const updated = current.includes(dept)
      ? current.filter((d) => d !== dept)
      : [...current, dept]
    setFormData((prev) => ({ ...prev, departments: updated }))
  }

  const onSubmitStep2 = (data: Step2Data) => {
    if (selectedDepartments.length === 0) {
      toast.error('Please select at least one department')
      return
    }
    setFormData((prev) => ({ ...prev, ...data, departments: selectedDepartments }))
    setCurrentStep(3)
  }

  // Step 3: Enterprise Plan
  const requestDemo = watchStep3('requestDemo') ?? formData.requestDemo
  const salesContact = watchStep3('salesContact') ?? formData.salesContact

  const onSubmitStep3 = (data: Step3Data) => {
    setFormData((prev) => ({ ...prev, ...data }))

    // If requesting demo or sales contact, show message
    if (data.requestDemo || data.salesContact) {
      toast.success('Thank you! Our sales team will contact you within 24 hours.')
    }

    setCurrentStep(4)
  }

  // Step 4: Department Heads
  const [departmentHeads, setDepartmentHeads] = useState<DepartmentHead[]>(formData.departmentHeads || [])
  const [newHead, setNewHead] = useState({ department: '', name: '', email: '' })

  const addDepartmentHead = () => {
    if (!newHead.department || !newHead.name || !newHead.email) {
      toast.error('Please fill all fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newHead.email)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (departmentHeads.some((h) => h.department === newHead.department)) {
      toast.error('Department head already added')
      return
    }

    setDepartmentHeads([...departmentHeads, newHead])
    setNewHead({ department: '', name: '', email: '' })
  }

  const removeDepartmentHead = (department: string) => {
    setDepartmentHeads(departmentHeads.filter((h) => h.department !== department))
  }

  const onSubmitStep4 = () => {
    setFormData((prev) => ({ ...prev, departmentHeads }))
    setCurrentStep(5)
  }

  // Step 5: Settings
  const enableWhatsApp = watchStep5('enableWhatsApp') ?? formData.enableWhatsApp ?? false
  const enableEmergencyModule = watchStep5('enableEmergencyModule') ?? formData.enableEmergencyModule
  const enableIPDManagement = watchStep5('enableIPDManagement') ?? formData.enableIPDManagement
  const enableLabIntegration = watchStep5('enableLabIntegration') ?? formData.enableLabIntegration
  const enablePharmacyIntegration = watchStep5('enablePharmacyIntegration') ?? formData.enablePharmacyIntegration

  const onSubmitStep5 = async (data: Step5Data) => {
    const finalData = {
      ...formData,
      ...data,
    }

    console.log('Final hospital onboarding data:', finalData)

    setIsSubmitting(true)

    try {
      // Register hospital and admin user
      const response = await registerHospital({
        name: finalData.hospitalName!,
        provider_type: finalData.bedCapacity! > 200 ? 'large_hospital' : 'medium_hospital',
        license_number: finalData.license!,
        address: finalData.address,
        city: finalData.city,
        state: finalData.state,
        zip_code: finalData.zipCode,
        phone: finalData.enableWhatsApp ? finalData.whatsappNumber : undefined,
        admin_user: {
          full_name: finalData.fullName!,
          email: finalData.email!,
          password: finalData.password!,
          phone: finalData.phone!,
          role: 'admin',
        },
        subscription_tier: 'enterprise',
        onboarding_data: {
          departments: finalData.departments,
          bed_capacity: finalData.bedCapacity,
          emergency_services: finalData.emergencyServices,
          estimated_doctors: finalData.estimatedDoctors,
          estimated_patients: finalData.estimatedPatients,
          request_demo: finalData.requestDemo,
          sales_contact: finalData.salesContact,
          whatsapp_enabled: finalData.enableWhatsApp,
          whatsapp_number: finalData.whatsappNumber,
          default_appointment_duration: finalData.defaultAppointmentDuration,
          modules: {
            emergency: finalData.enableEmergencyModule,
            ipd_management: finalData.enableIPDManagement,
            lab_integration: finalData.enableLabIntegration,
            pharmacy_integration: finalData.enablePharmacyIntegration,
          },
        },
      })

      console.log('Hospital registered:', response)

      // Create department head invitations
      if (departmentHeads.length > 0) {
        await Promise.all(
          departmentHeads.map(async (head) => {
            try {
              // For now, we'll just log - in production this would send email invitations
              console.log(`Invitation would be sent to ${head.email} for ${head.department} (${head.name})`)
            } catch (error) {
              console.error(`Failed to invite ${head.email}:`, error)
            }
          })
        )
      }

      // Wait for projection to update
      await waitForProjection(1000)

      // Auto-login the admin user
      const loginResponse = await login({
        email: finalData.email!,
        password: finalData.password!,
      })

      // Set auth state
      setAuth(
        loginResponse.token,
        loginResponse.user.user_id,
        loginResponse.user.hospital_id,
        loginResponse.user.role
      )

      toast.success('Hospital setup complete! Welcome to Clinica!')

      // Mark as new user for onboarding
      localStorage.setItem('onboarding_dismissed', 'false')
      localStorage.setItem('is_new_user', 'true')

      // Redirect to dashboard
      navigate('/')
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to setup hospital'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-3">
              <FiActivity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Setup</h1>
          </div>
          <p className="text-gray-600">Enterprise-grade patient management system</p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} />

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Step 1: Admin Account */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmitStep1(onSubmitStep1)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Admin Account</h2>
                <p className="text-gray-600 mb-6">You'll be the primary administrator for this hospital</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  {...registerStep1('fullName', { required: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dr. John Smith"
                />
                {errorsStep1.fullName && (
                  <p className="text-red-500 text-sm mt-1">Full name is required</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    {...registerStep1('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="admin@hospital.com"
                  />
                  {errorsStep1.email && (
                    <p className="text-red-500 text-sm mt-1">Valid email is required</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    {...registerStep1('phone', { required: true })}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                  {errorsStep1.phone && (
                    <p className="text-red-500 text-sm mt-1">Phone is required</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    {...registerStep1('password', { required: true, minLength: 8 })}
                    type="password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  {errorsStep1.password && (
                    <p className="text-red-500 text-sm mt-1">Password must be at least 8 characters</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    {...registerStep1('confirmPassword', { required: true })}
                    type="password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <FiArrowLeft className="inline mr-2" />
                  Back
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Hospital Details */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmitStep2(onSubmitStep2)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Hospital Information</h2>
                <p className="text-gray-600 mb-6">Tell us about your hospital</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Name *
                </label>
                <input
                  {...registerStep2('hospitalName', { required: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="City General Hospital"
                />
                {errorsStep2.hospitalName && (
                  <p className="text-red-500 text-sm mt-1">Hospital name is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  {...registerStep2('address', { required: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    {...registerStep2('city', { required: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    {...registerStep2('state', { required: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    {...registerStep2('zipCode', { required: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number *
                  </label>
                  <input
                    {...registerStep2('license', { required: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="HL-123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bed Capacity *
                  </label>
                  <input
                    {...registerStep2('bedCapacity', { required: true, valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    {...registerStep2('emergencyServices')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    We provide 24/7 emergency services
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Departments * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                        selectedDepartments.includes(dept)
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <FiArrowLeft className="inline mr-2" />
                  Back
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Enterprise Plan */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmitStep3(onSubmitStep3)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enterprise Plan</h2>
                <p className="text-gray-600 mb-6">Custom pricing for your hospital</p>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">Enterprise Solution</h3>
                <p className="text-green-50 mb-4">
                  Comprehensive hospital management with unlimited users and customization
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    Unlimited doctors, staff, and patients
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    Multi-department management
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    IPD/OPD management
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    Lab & Pharmacy integration
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    Custom workflows & reports
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-5 h-5 mr-2" />
                    Priority support & training
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Number of Doctors
                  </label>
                  <input
                    {...registerStep3('estimatedDoctors', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Patients per Month
                  </label>
                  <input
                    {...registerStep3('estimatedPatients', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    {...registerStep3('requestDemo')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Request a Demo</span>
                    <p className="text-xs text-gray-500">See how Clinica can transform your hospital</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    {...registerStep3('salesContact')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Talk to Sales</span>
                    <p className="text-xs text-gray-500">Get custom pricing and implementation plan</p>
                  </div>
                </label>
              </div>

              {(requestDemo || salesContact) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 flex items-center">
                    <FiMail className="w-4 h-4 mr-2" />
                    Our team will reach out to you within 24 hours at <strong className="ml-1">{formData.email}</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <FiArrowLeft className="inline mr-2" />
                  Back
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Department Heads */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Department Heads</h2>
                <p className="text-gray-600 mb-6">Add heads of departments who will manage their teams</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ℹ️ Department heads will receive invitations to set up their departments and invite their team members.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={newHead.department}
                  onChange={(e) => setNewHead({ ...newHead, department: e.target.value })}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {selectedDepartments.filter(dept => !departmentHeads.some(h => h.department === dept)).map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newHead.name}
                  onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
                  placeholder="Dr. John Smith"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newHead.email}
                    onChange={(e) => setNewHead({ ...newHead, email: e.target.value })}
                    placeholder="head@hospital.com"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDepartmentHead())}
                  />
                  <button
                    type="button"
                    onClick={addDepartmentHead}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {departmentHeads.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y">
                  {departmentHeads.map((head) => (
                    <div key={head.department} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{head.department}</p>
                        <p className="text-sm text-gray-600">{head.name}</p>
                        <p className="text-sm text-gray-500">{head.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDepartmentHead(head.department)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {departmentHeads.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No department heads added yet</p>
                  <p className="text-sm mt-1">You can add them later from settings</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <FiArrowLeft className="inline mr-2" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={onSubmitStep4}
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  {departmentHeads.length > 0 ? 'Continue' : 'Skip for Now'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Settings */}
          {currentStep === 5 && (
            <form onSubmit={handleSubmitStep5(onSubmitStep5)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Settings</h2>
                <p className="text-gray-600 mb-6">Customize hospital preferences</p>
              </div>

              {/* WhatsApp Integration */}
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">WhatsApp Notifications</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Send appointment reminders and updates via WhatsApp
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      {...registerStep5('enableWhatsApp')}
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {enableWhatsApp && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp Business Number
                    </label>
                    <input
                      {...registerStep5('whatsappNumber')}
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                )}
              </div>

              {/* Appointment Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Appointment Duration (minutes)
                </label>
                <select
                  {...registerStep5('defaultAppointmentDuration')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              {/* Module Toggles */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Enable Modules</h3>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Emergency Module</span>
                    <p className="text-xs text-gray-500">Manage emergency admissions and triage</p>
                  </div>
                  <input
                    {...registerStep5('enableEmergencyModule')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-900">IPD Management</span>
                    <p className="text-xs text-gray-500">In-patient department bed and ward management</p>
                  </div>
                  <input
                    {...registerStep5('enableIPDManagement')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Lab Integration</span>
                    <p className="text-xs text-gray-500">Connect with lab systems for test results</p>
                  </div>
                  <input
                    {...registerStep5('enableLabIntegration')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Pharmacy Integration</span>
                    <p className="text-xs text-gray-500">Link prescriptions with pharmacy system</p>
                  </div>
                  <input
                    {...registerStep5('enablePharmacyIntegration')}
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <FiArrowLeft className="inline mr-2" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating hospital...</span>
                    </>
                  ) : (
                    <span>Complete Setup</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact us at{' '}
          <a href="mailto:enterprise@clinica.com" className="text-green-600 hover:text-green-700">
            enterprise@clinica.com
          </a>
        </p>
      </div>
    </div>
  )
}
