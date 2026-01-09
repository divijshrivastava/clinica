import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiUser, FiActivity, FiCheck, FiMessageCircle, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { registerHospital, login, waitForProjection } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

interface Step1Data {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

interface Step2Data {
  practiceName: string
  specialization: string
  licenseNumber?: string
  timezone: string
}

interface Step3Data {
  enableWhatsApp: boolean
  whatsappPhone?: string
}

type StepData = Step1Data | Step2Data | Step3Data

export default function DoctorOnboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data>>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  const { register: registerStep1, handleSubmit: handleSubmitStep1, formState: { errors: errorsStep1 }, watch: watchStep1 } = useForm<Step1Data>({
    defaultValues: formData
  })
  const { register: registerStep2, handleSubmit: handleSubmitStep2, formState: { errors: errorsStep2 } } = useForm<Step2Data>({
    defaultValues: formData
  })
  const { register: registerStep3, handleSubmit: handleSubmitStep3, watch: watchStep3 } = useForm<Step3Data>({
    defaultValues: formData
  })

  const onSubmitStep1 = (data: Step1Data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setFormData(prev => ({ ...prev, ...data }))
    setCurrentStep(2)
  }

  const onSubmitStep2 = (data: Step2Data) => {
    setFormData(prev => ({ ...prev, ...data }))
    setCurrentStep(3)
  }

  const onSubmitStep3 = async (data: Step3Data) => {
    const finalData = { ...formData, ...data }
    console.log('Submitting doctor signup:', finalData)

    setIsSubmitting(true)

    try {
      // Register hospital and admin user
      const response = await registerHospital({
        name: finalData.practiceName || `${finalData.fullName}'s Practice`,
        provider_type: 'independent_doctor',
        license_number: finalData.licenseNumber,
        phone: finalData.enableWhatsApp ? finalData.whatsappPhone : finalData.phone,
        email: finalData.email!,
        timezone: finalData.timezone,
        admin_user: {
          full_name: finalData.fullName!,
          email: finalData.email!,
          password: finalData.password!,
          phone: finalData.phone!,
          role: 'doctor',
          specialization: finalData.specialization,
        },
        subscription_tier: 'starter',
        onboarding_data: {
          timezone: finalData.timezone,
          whatsapp_enabled: finalData.enableWhatsApp,
          whatsapp_phone: finalData.whatsappPhone,
        },
      })

      console.log('Hospital registered:', response)

      // Wait for projection to update
      await waitForProjection(1000)

      // Auto-login the user
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

      toast.success('Account created successfully! Welcome to Clinica!')

      // Mark as new user for onboarding
      localStorage.setItem('onboarding_dismissed', 'false')
      localStorage.setItem('is_new_user', 'true')

      // Redirect to dashboard
      navigate('/')
    } catch (error: any) {
      console.error('Registration error:', error)
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2))
      
      // Extract detailed error message
      let errorMessage = 'Failed to create account'
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
    } else {
      navigate('/signup')
    }
  }

  const specializations = [
    'General Practice',
    'Internal Medicine',
    'Pediatrics',
    'Cardiology',
    'Dermatology',
    'Orthopedics',
    'Psychiatry',
    'Obstetrics & Gynecology',
    'Ophthalmology',
    'ENT',
    'Other'
  ]

  const enableWhatsApp = watchStep3('enableWhatsApp')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <FiActivity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">MyMedic</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Doctor Registration
          </h2>
          <p className="text-gray-600">
            Step {currentStep} of 3 • Quick setup in minutes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < currentStep ? <FiCheck className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Basic Info</span>
            <span>Practice Details</span>
            <span>WhatsApp</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmitStep1(onSubmitStep1)} className="space-y-4">
              <div className="flex items-center space-x-2 mb-6">
                <FiUser className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  {...registerStep1('fullName', { required: 'Full name is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dr. John Doe"
                />
                {errorsStep1.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep1.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  {...registerStep1('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="doctor@example.com"
                />
                {errorsStep1.email && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep1.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  {...registerStep1('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+91\d{10}$/,
                      message: 'Phone must be in format +91XXXXXXXXXX'
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+919876543210"
                />
                {errorsStep1.phone && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep1.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  {...registerStep1('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errorsStep1.password && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep1.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  {...registerStep1('confirmPassword', { required: 'Please confirm your password' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errorsStep1.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep1.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Practice Details */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmitStep2(onSubmitStep2)} className="space-y-4">
              <div className="flex items-center space-x-2 mb-6">
                <FiActivity className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Practice Details</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Practice Name *
                </label>
                <input
                  type="text"
                  {...registerStep2('practiceName', { required: 'Practice name is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dr. John's Clinic"
                />
                {errorsStep2.practiceName && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep2.practiceName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization *
                </label>
                <select
                  {...registerStep2('specialization', { required: 'Specialization is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select specialization...</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
                {errorsStep2.specialization && (
                  <p className="mt-1 text-sm text-red-600">{errorsStep2.specialization.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  {...registerStep2('licenseNumber')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MCI-123456"
                />
                <p className="mt-1 text-xs text-gray-500">You can add this later</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone *
                </label>
                <input
                  type="text"
                  {...registerStep2('timezone', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
                <p className="mt-1 text-xs text-gray-500">Auto-detected from your browser</p>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: WhatsApp Setup */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmitStep3(onSubmitStep3)} className="space-y-4">
              <div className="flex items-center space-x-2 mb-6">
                <FiMessageCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">WhatsApp Setup</h3>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Enable WhatsApp notifications?</strong>
                </p>
                <p className="text-sm text-blue-700">
                  Get automatic appointment reminders, patient updates, and important alerts via WhatsApp.
                </p>
              </div>

              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  {...registerStep3('enableWhatsApp')}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Yes, enable WhatsApp notifications
                </label>
              </div>

              {enableWhatsApp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    {...registerStep3('whatsappPhone', {
                      pattern: {
                        value: /^\+91\d{10}$/,
                        message: 'Phone must be in format +91XXXXXXXXXX'
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+919876543210"
                    defaultValue={formData.phone}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    We'll send a verification code to this number
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => onSubmitStep3({ enableWhatsApp: false })}
                    className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-4 h-4" />
                        <span>Complete Setup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Need help?{' '}
          <a href="mailto:support@mymedic.com" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}
