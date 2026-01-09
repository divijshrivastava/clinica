import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { FiArrowRight, FiArrowLeft, FiCheck, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar } from 'react-icons/fi'
import { BsBuilding } from 'react-icons/bs'
import apiClient from '../api/client'

interface OnboardingFormData {
  // Step 1: Provider Type
  provider_type: 'independent_doctor' | 'small_clinic' | 'medium_clinic' | 'large_hospital'
  
  // Step 2: Organization Info
  name: string
  license_number?: string
  license_type?: string
  email: string
  phone?: string
  
  // Step 3: Address
  address?: {
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country?: string
  }
  
  // Step 4: Admin User
  admin_email: string
  admin_password: string
  admin_full_name: string
  admin_phone?: string
  
  // Step 5: Timezone
  timezone: string
}

const PROVIDER_TYPES = [
  {
    value: 'independent_doctor',
    label: 'Independent Doctor',
    description: 'Solo practitioner running your own practice',
    icon: FiUser,
  },
  {
    value: 'small_clinic',
    label: 'Small Clinic',
    description: '2-10 doctors, small group practice',
    icon: BsBuilding,
  },
  {
    value: 'medium_clinic',
    label: 'Medium Clinic',
    description: '10-50 doctors, established clinic',
    icon: BsBuilding,
  },
  {
    value: 'large_hospital',
    label: 'Large Hospital',
    description: '50+ doctors, full hospital',
    icon: BsBuilding,
  },
]

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<OnboardingFormData>({
    defaultValues: {
      provider_type: 'independent_doctor',
      timezone: 'Asia/Kolkata',
    },
  })

  const providerType = watch('provider_type')

  const onSubmit = async (data: OnboardingFormData) => {
    setSubmitting(true)
    try {
      // Register Hospital with Admin User
      const payload = {
        name: data.name,
        license_number: data.license_number,
        license_type: data.license_type,
        provider_type: data.provider_type,
        email: data.email,
        phone: data.phone?.trim() || undefined, // Trim and ensure empty strings become undefined
        address: data.address,
        timezone: data.timezone,
        subscription_tier: data.provider_type === 'independent_doctor' ? 'starter' : 
                          data.provider_type === 'small_clinic' ? 'professional' : 'enterprise',
        admin_user: {
          full_name: data.admin_full_name,
          email: data.admin_email,
          password: data.admin_password,
          phone: data.admin_phone?.trim() || undefined, // Trim and ensure empty strings become undefined
          role: 'admin',
        },
      }
      
      console.log('Phone value:', JSON.stringify(data.phone), 'Type:', typeof data.phone, 'Length:', data.phone?.length)
      console.log('Admin phone value:', JSON.stringify(data.admin_phone), 'Type:', typeof data.admin_phone, 'Length:', data.admin_phone?.length)
      console.log('Submitting hospital registration with payload:', JSON.stringify(payload, null, 2))
      
      const hospitalResponse = await apiClient.post('/onboarding/register-hospital', payload)
      
      console.log('Hospital and admin user created successfully:', hospitalResponse.data)
      
      toast.success('Organization registered successfully! Please log in to continue.')
      navigate('/login')
    } catch (error: any) {
      console.error('Full error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error response JSON:', JSON.stringify(error.response?.data, null, 2))
      
      // Extract detailed error message
      let errorMessage = 'Failed to complete onboarding'
      if (error.response?.data?.error) {
        const errorData = error.response.data.error
        console.error('Error data:', errorData)
        console.error('Validation errors:', errorData.validation_errors)
        
        if (errorData.validation_errors && Array.isArray(errorData.validation_errors)) {
          // Show validation errors
          errorMessage = errorData.validation_errors.map((d: any) => `${d.field}: ${d.error}`).join(', ')
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to MyMedic</h1>
          <p className="mt-2 text-sm text-gray-600">Let's get your organization set up</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step < currentStep
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : step === currentStep
                      ? 'border-primary-600 text-primary-600 bg-white'
                      : 'border-gray-300 text-gray-400 bg-white'
                  }`}
                >
                  {step < currentStep ? (
                    <FiCheck className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </div>
                <span className="mt-2 text-xs text-gray-500 text-center">
                  {step === 1 && 'Type'}
                  {step === 2 && 'Details'}
                  {step === 3 && 'Address'}
                  {step === 4 && 'Admin'}
                  {step === 5 && 'Settings'}
                </span>
              </div>
              {step < 5 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    step < currentStep ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-8">
          {/* Step 1: Provider Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">What type of practice are you?</h2>
                <p className="text-sm text-gray-600">Select the option that best describes your organization</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDER_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValue('provider_type', type.value as any)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        providerType === type.value
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${providerType === type.value ? 'text-primary-600' : 'text-gray-400'}`} />
                      <h3 className="font-semibold text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </button>
                  )
                })}
              </div>
              <input type="hidden" {...register('provider_type', { required: true })} />
            </div>
          )}

          {/* Step 2: Organization Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Information</h2>
                <p className="text-sm text-gray-600">Tell us about your practice</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Organization name is required' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  placeholder="e.g., City Medical Center"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="contact@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    {...register('phone', {
                      pattern: {
                        value: /^[\d\s\-\+\(\)]+$/,
                        message: 'Phone must contain only numbers, spaces, +, -, ( )'
                      }
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="+91 888 888 8888"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Format: +91 888 888 8888</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    {...register('license_number')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="LIC-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Type
                  </label>
                  <input
                    type="text"
                    {...register('license_type')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="e.g., Medical License"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Address</h2>
                <p className="text-sm text-gray-600">Where is your practice located?</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  {...register('address.line1', { required: 'Address is required' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  placeholder="123 Main Street"
                />
                {errors.address?.line1 && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.line1.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  {...register('address.line2')}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  placeholder="Suite 100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    {...register('address.city', { required: 'City is required' })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="New York"
                  />
                  {errors.address?.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    {...register('address.state', { required: 'State is required' })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="NY"
                  />
                  {errors.address?.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.state.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    {...register('address.postal_code', { required: 'Postal code is required' })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="10001"
                  />
                  {errors.address?.postal_code && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.postal_code.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    {...register('address.country')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="USA"
                    defaultValue="USA"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Admin User */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Admin Account</h2>
                <p className="text-sm text-gray-600">Set up your administrator account</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  {...register('admin_full_name', { required: 'Full name is required' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  placeholder="Dr. John Smith"
                />
                {errors.admin_full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_full_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('admin_email', { required: 'Email is required' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  placeholder="admin@example.com"
                />
                {errors.admin_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_email.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    {...register('admin_password', { 
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' }
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                  {errors.admin_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.admin_password.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    {...register('admin_phone', {
                      pattern: {
                        value: /^[\d\s\-\+\(\)]+$/,
                        message: 'Phone must contain only numbers, spaces, +, -, ( )'
                      }
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="+91 888 888 8888"
                  />
                  {errors.admin_phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.admin_phone.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Format: +91 888 888 8888</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Timezone & Final */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Final Settings</h2>
                <p className="text-sm text-gray-600">Configure your timezone</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone *
                </label>
                <select
                  {...register('timezone', { required: 'Timezone is required' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2 text-gray-900"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Ready to go!</h3>
                <p className="text-sm text-blue-800">
                  Once you submit, your organization will be created and you'll be able to log in with your admin account.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </button>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                Next
                <FiArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

