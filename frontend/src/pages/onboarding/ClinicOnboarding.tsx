import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiUser, FiCreditCard, FiUsers, FiSettings, FiCheck, FiArrowLeft, FiX, FiPlus } from 'react-icons/fi'
import { BsBuilding } from 'react-icons/bs'
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

// Step 2: Clinic Details
interface Step2Data {
  clinicName: string
  address: string
  city: string
  state: string
  zipCode: string
  license: string
  specializations: string[]
  workingHoursStart: string
  workingHoursEnd: string
}

// Step 3: Subscription
interface Step3Data {
  planType: 'trial' | 'professional'
  paymentMethod?: 'credit_card' | 'bank_transfer'
}

// Step 4: Team Members
interface TeamMember {
  email: string
  role: 'doctor' | 'nurse' | 'receptionist'
  name?: string
}

interface Step4Data {
  teamMembers: TeamMember[]
}

// Step 5: Settings
interface Step5Data {
  enableWhatsApp: boolean
  whatsappNumber?: string
  defaultAppointmentDuration: number
  visitTypes: string[]
  enableOnlineBooking: boolean
}

const SPECIALIZATIONS = [
  'General Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Gynecology',
  'Dentistry',
  'Ophthalmology',
  'ENT',
  'Psychiatry',
  'Physiotherapy',
]

const VISIT_TYPES = [
  'Consultation',
  'Follow-up',
  'Emergency',
  'Check-up',
  'Vaccination',
  'Lab Test',
  'Procedure',
]

function ProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: 'Admin', icon: FiUser },
    { number: 2, label: 'Clinic', icon: BsBuilding },
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
            className="h-full bg-blue-600 transition-all duration-500"
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <FiCheck className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`text-xs mt-2 ${
                  isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-500'
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

export default function ClinicOnboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data & Step4Data & Step5Data>>({
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    defaultAppointmentDuration: 30,
    planType: 'trial',
    teamMembers: [],
    specializations: [],
    visitTypes: ['Consultation', 'Follow-up'],
    enableOnlineBooking: true,
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
    setValue: setValueStep2,
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
    setValue: setValueStep5,
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

  // Step 2: Clinic Details
  const selectedSpecializations = watchStep2('specializations') || formData.specializations || []

  const toggleSpecialization = (spec: string) => {
    const current = selectedSpecializations as string[]
    const updated = current.includes(spec)
      ? current.filter((s) => s !== spec)
      : [...current, spec]
    setFormData((prev) => ({ ...prev, specializations: updated }))
    setValueStep2('specializations', updated)
  }

  const onSubmitStep2 = (data: Step2Data) => {
    if (selectedSpecializations.length === 0) {
      toast.error('Please select at least one specialization')
      return
    }
    setFormData((prev) => ({ ...prev, ...data, specializations: selectedSpecializations }))
    setCurrentStep(3)
  }

  // Step 3: Subscription
  const selectedPlan = watchStep3('planType') || formData.planType

  const onSubmitStep3 = (data: Step3Data) => {
    setFormData((prev) => ({ ...prev, ...data }))
    setCurrentStep(4)
  }

  // Step 4: Team Invitation
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(formData.teamMembers || [])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'doctor' | 'nurse' | 'receptionist'>('doctor')

  const addTeamMember = () => {
    if (!newMemberEmail) {
      toast.error('Please enter an email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMemberEmail)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (teamMembers.some((m) => m.email === newMemberEmail)) {
      toast.error('This email is already added')
      return
    }

    setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }])
    setNewMemberEmail('')
  }

  const removeTeamMember = (email: string) => {
    setTeamMembers(teamMembers.filter((m) => m.email !== email))
  }

  const onSubmitStep4 = () => {
    setFormData((prev) => ({ ...prev, teamMembers }))
    setCurrentStep(5)
  }

  // Step 5: Settings
  const enableWhatsApp = watchStep5('enableWhatsApp') ?? formData.enableWhatsApp ?? false
  const selectedVisitTypes = formData.visitTypes || []

  const toggleVisitType = (type: string) => {
    const updated = selectedVisitTypes.includes(type)
      ? selectedVisitTypes.filter((t) => t !== type)
      : [...selectedVisitTypes, type]
    setFormData((prev) => ({ ...prev, visitTypes: updated }))
    setValueStep5('visitTypes', updated)
  }

  const onSubmitStep5 = async (data: Step5Data) => {
    const finalData = {
      ...formData,
      ...data,
      visitTypes: selectedVisitTypes,
    }

    console.log('Final clinic onboarding data:', finalData)

    setIsSubmitting(true)

    try {
      // Register clinic and admin user
      const response = await registerHospital({
        name: finalData.clinicName!,
        provider_type: 'small_clinic',
        license_number: finalData.license,
        address: {
          line1: finalData.address!,
          city: finalData.city!,
          state: finalData.state!,
          postal_code: finalData.zipCode!,
          country: 'USA',
        },
        phone: finalData.enableWhatsApp ? finalData.whatsappNumber : undefined,
        email: finalData.email!,
        admin_user: {
          full_name: finalData.fullName!,
          email: finalData.email!,
          password: finalData.password!,
          phone: finalData.phone!,
          role: 'admin',
        },
        subscription_tier: finalData.planType === 'trial' ? 'professional' : 'professional',
        onboarding_data: {
          specializations: finalData.specializations,
          working_hours: {
            start: finalData.workingHoursStart,
            end: finalData.workingHoursEnd,
          },
          whatsapp_enabled: finalData.enableWhatsApp,
          whatsapp_number: finalData.whatsappNumber,
          default_appointment_duration: finalData.defaultAppointmentDuration,
          visit_types: selectedVisitTypes,
          online_booking_enabled: finalData.enableOnlineBooking,
        },
      })

      console.log('Clinic registered:', response)

      // Create team member invitations
      if (teamMembers.length > 0) {
        await Promise.all(
          teamMembers.map(async (member) => {
            try {
              // For now, we'll just log - in production this would send email invitations
              console.log(`Invitation would be sent to ${member.email} (${member.role})`)
            } catch (error) {
              console.error(`Failed to invite ${member.email}:`, error)
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

      toast.success('Clinic created successfully! Welcome to Clinica!')

      // Mark as new user for onboarding
      localStorage.setItem('onboarding_dismissed', 'false')
      localStorage.setItem('is_new_user', 'true')

      // Redirect to dashboard
      navigate('/')
    } catch (error: any) {
      console.error('Registration error:', error)
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2))
      
      // Extract detailed error message
      let errorMessage = 'Failed to create clinic'
      if (error.response?.data?.error) {
        const errorData = error.response.data.error
        if (errorData.validation_errors && Array.isArray(errorData.validation_errors)) {
          // Show validation errors
          errorMessage = errorData.validation_errors.map((d: any) => `${d.field}: ${d.error}`).join(', ')
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
              <BsBuilding className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Clinic Setup</h1>
          </div>
          <p className="text-gray-600">Let's get your clinic up and running</p>
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
                <p className="text-gray-600 mb-6">You'll be the primary administrator for this clinic</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  {...registerStep1('fullName', { required: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="admin@clinic.com"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Clinic Details */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmitStep2(onSubmitStep2)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Clinic Information</h2>
                <p className="text-gray-600 mb-6">Tell us about your clinic</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Name *
                </label>
                <input
                  {...registerStep2('clinicName', { required: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Smith Medical Clinic"
                />
                {errorsStep2.clinicName && (
                  <p className="text-red-500 text-sm mt-1">Clinic name is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  {...registerStep2('address', { required: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    {...registerStep2('state', { required: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    {...registerStep2('zipCode', { required: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="10001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number (Optional)
                </label>
                <input
                  {...registerStep2('license')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="CL-123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Specializations * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SPECIALIZATIONS.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                        selectedSpecializations.includes(spec)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...registerStep2('specializations')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Working Hours *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                    <input
                      {...registerStep2('workingHoursStart', { required: true })}
                      type="time"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                    <input
                      {...registerStep2('workingHoursEnd', { required: true })}
                      type="time"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
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
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Subscription */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmitStep3(onSubmitStep3)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
                <p className="text-gray-600 mb-6">Start with a 14-day free trial</p>
              </div>

              <div className="space-y-4">
                {/* Trial Plan */}
                <div
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    selectedPlan === 'trial'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, planType: 'trial' }))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-xl font-bold text-gray-900">14-Day Free Trial</h3>
                        <span className="ml-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Recommended
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">Try all Professional features free for 14 days</p>
                      <ul className="mt-4 space-y-2">
                        <li className="flex items-center text-sm text-gray-700">
                          <FiCheck className="w-4 h-4 mr-2 text-purple-600" />
                          Unlimited patients & visits
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <FiCheck className="w-4 h-4 mr-2 text-purple-600" />
                          Team collaboration (up to 10 users)
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <FiCheck className="w-4 h-4 mr-2 text-purple-600" />
                          Advanced analytics & reporting
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <FiCheck className="w-4 h-4 mr-2 text-purple-600" />
                          Priority support
                        </li>
                      </ul>
                    </div>
                    <input
                      {...registerStep3('planType')}
                      type="radio"
                      value="trial"
                      checked={selectedPlan === 'trial'}
                      className="mt-1 w-5 h-5 text-purple-600"
                      readOnly
                    />
                  </div>
                </div>

                {/* Professional Plan */}
                <div
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    selectedPlan === 'professional'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, planType: 'professional' }))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">Professional Plan</h3>
                      <p className="text-gray-600 mt-2">
                        <span className="text-3xl font-bold text-gray-900">$99</span>
                        <span className="text-gray-500">/month</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Billed monthly, cancel anytime</p>
                    </div>
                    <input
                      {...registerStep3('planType')}
                      type="radio"
                      value="professional"
                      checked={selectedPlan === 'professional'}
                      className="mt-1 w-5 h-5 text-purple-600"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💳 <strong>No credit card required</strong> for the trial. You can upgrade or downgrade at any time.
                </p>
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
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Team Invitation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Your Team</h2>
                <p className="text-gray-600 mb-6">Add doctors, nurses, and staff members</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  ℹ️ Team members will receive an email invitation to create their accounts and join your clinic.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTeamMember())}
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                  <button
                    type="button"
                    onClick={addTeamMember}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <FiPlus className="w-5 h-5 mr-2" />
                    Add
                  </button>
                </div>

                {teamMembers.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y">
                    {teamMembers.map((member) => (
                      <div key={member.email} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-gray-900">{member.email}</p>
                          <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(member.email)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No team members added yet</p>
                    <p className="text-sm mt-1">You can add them later from settings</p>
                  </div>
                )}
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
                  type="button"
                  onClick={onSubmitStep4}
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {teamMembers.length > 0 ? 'Continue' : 'Skip for Now'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Settings */}
          {currentStep === 5 && (
            <form onSubmit={handleSubmitStep5(onSubmitStep5)} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Settings</h2>
                <p className="text-gray-600 mb-6">Customize your clinic preferences</p>
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              {/* Visit Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available Visit Types (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {VISIT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleVisitType(type)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                        selectedVisitTypes.includes(type)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...registerStep5('visitTypes')} />
              </div>

              {/* Online Booking */}
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Online Booking</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Allow patients to book appointments online
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      {...registerStep5('enableOnlineBooking')}
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
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
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating clinic...</span>
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
          <a href="mailto:support@clinica.com" className="text-purple-600 hover:text-purple-700">
            support@clinica.com
          </a>
        </p>
      </div>
    </div>
  )
}
