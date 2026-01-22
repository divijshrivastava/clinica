import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUser, FiUsers, FiActivity, FiCheck, FiArrowRight } from 'react-icons/fi'

type ProviderType = 'doctor' | 'clinic' | 'hospital' | null

interface ProviderCardProps {
  type: 'doctor' | 'clinic' | 'hospital'
  selected: boolean
  onSelect: () => void
}

function ProviderCard({ type, selected, onSelect }: ProviderCardProps) {
  const configs = {
    doctor: {
      icon: FiUser,
      title: 'Independent Doctor',
      subtitle: 'Perfect for solo practice',
      features: [
        'Quick setup in minutes',
        'Start with 100 patients free',
        'Simple patient management',
        'Appointments & prescriptions'
      ],
      color: 'blue'
    },
    clinic: {
      icon: FiUsers,
      title: 'Clinic (2-10 doctors)',
      subtitle: 'Built for team collaboration',
      features: [
        'Team collaboration',
        'Shared patient records',
        'Multi-user management',
        'Advanced reporting'
      ],
      color: 'purple'
    },
    hospital: {
      icon: FiActivity,
      title: 'Hospital / Enterprise',
      subtitle: 'Enterprise-grade features',
      features: [
        'Custom workflows',
        'Department management',
        'Dedicated support',
        'Unlimited users'
      ],
      color: 'green'
    }
  }

  const config = configs[type]
  const Icon = config.icon

  const colorClasses = {
    blue: {
      border: selected ? 'border-blue-500' : 'border-gray-200',
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      hover: 'hover:border-blue-300'
    },
    purple: {
      border: selected ? 'border-purple-500' : 'border-gray-200',
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      hover: 'hover:border-purple-300'
    },
    green: {
      border: selected ? 'border-green-500' : 'border-gray-200',
      bg: 'bg-green-100',
      text: 'text-green-600',
      hover: 'hover:border-green-300'
    }
  }

  const colors = colorClasses[config.color]

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-6 rounded-xl border-2 transition-all ${colors.border} ${colors.hover} ${
        selected ? 'shadow-lg scale-105' : 'shadow-sm hover:shadow-md'
      } bg-white`}
    >
      {selected && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
          <FiCheck className="w-4 h-4" />
        </div>
      )}

      <div className="flex items-start space-x-4 mb-4">
        <div className={`${colors.bg} ${colors.text} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{config.subtitle}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {config.features.map((feature, idx) => (
          <li key={idx} className="flex items-center text-sm text-gray-700">
            <FiCheck className={`w-4 h-4 mr-2 ${colors.text}`} />
            {feature}
          </li>
        ))}
      </ul>
    </button>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<ProviderType>(null)

  const handleContinue = () => {
    if (!selectedType) return

    // Route to specific onboarding flow
    navigate(`/onboarding/${selectedType}`)
  }

  const handleContactSales = () => {
    window.location.href = 'mailto:sales@mymedic.com?subject=Hospital%20Enterprise%20Inquiry'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-primary-600 rounded-2xl shadow-lg mb-4">
            <FiActivity className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-primary-600 bg-clip-text text-transparent mb-3">
            Welcome to MyMedic
          </h1>
          <p className="text-xl text-gray-700 font-medium">
            Modern Patient Management Platform
          </p>
          <p className="text-base text-gray-600 mt-3">
            Choose your provider type to get started
          </p>
        </div>

        {/* Provider Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ProviderCard
            type="doctor"
            selected={selectedType === 'doctor'}
            onSelect={() => setSelectedType('doctor')}
          />
          <ProviderCard
            type="clinic"
            selected={selectedType === 'clinic'}
            onSelect={() => setSelectedType('clinic')}
          />
          <ProviderCard
            type="hospital"
            selected={selectedType === 'hospital'}
            onSelect={() => setSelectedType('hospital')}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center space-y-4">
          {selectedType === 'hospital' ? (
            <div className="flex space-x-4">
              <button
                onClick={handleContactSales}
                className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <span>Contact Sales</span>
              </button>
              <button
                onClick={handleContinue}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>Self-Serve Setup</span>
                <FiArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleContinue}
              disabled={!selectedType}
              className="px-12 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg disabled:shadow-none text-lg"
            >
              <span>Get Started</span>
              <FiArrowRight className="w-5 h-5" />
            </button>
          )}

          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Log In
            </button>
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-600 mb-6 font-medium">Trusted by healthcare professionals worldwide</p>
          <div className="flex items-center justify-center space-x-12 text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Secure & Private</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
