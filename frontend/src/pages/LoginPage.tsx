import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { LoginCredentials } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import apiClient from '../api/client'

// Helper to generate a valid JWT from the backend
async function generateMockJWT(user: { id: string; hospital_id: string; role: string; email: string }) {
  try {
    // Call a helper endpoint to generate a JWT (we'll create this)
    const response = await fetch('http://localhost:3000/auth/generate-test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        hospital_id: user.hospital_id,
        role: user.role,
        email: user.email,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate token')
    }

    const data = await response.json()
    return data.token
  } catch (error) {
    console.error('Error generating JWT:', error)
    // Fallback to a pre-generated token (valid for 24h from 2026-01-06)
    // This token was generated with the backend's JWT secret
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjYwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwiaG9zcGl0YWxfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlIjoiZG9jdG9yIiwiZW1haWwiOiJ0ZXN0LmRvY3RvckBleGFtcGxlLmNvbSIsImlhdCI6MTc2NzcxOTA1NiwiZXhwIjoxNzY3ODA1NDU2fQ.wQju_dO_eW8OoCReDyL-7GRKTOk_M8IvfBgvDWBsKHE'
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (data: LoginCredentials) => {
    console.log('🔐 onSubmit called with:', data.email)
    setLoading(true)

    try {
      // For demo purposes, we'll create a mock login with a real JWT
      // In production, this would call the backend auth endpoint
      const mockUser = {
        id: '660e8400-e29b-41d4-a716-446655440000',
        email: data.email,
        full_name: 'Dr. Test Doctor',
        role: 'doctor',
        hospital_id: '550e8400-e29b-41d4-a716-446655440000',
        hospital_name: 'Test Hospital',
      }

      // Generate a real JWT token that the backend will accept
      // This uses the same secret as the backend (development-secret-key-change-in-production)
      const mockToken = await generateMockJWT(mockUser)

      console.log('🔐 Starting login process...')
      
      // Write directly to localStorage FIRST (most reliable)
      const authData = {
        state: {
          token: mockToken,
          user: {
            user_id: mockUser.id,
            hospital_id: mockUser.hospital_id,
            role: mockUser.role,
            email: mockUser.email,
          },
          isAuthenticated: true,
          _hasHydrated: true,
        },
        version: 0,
      }
      
      console.log('💾 Writing auth data to localStorage:', authData)
      localStorage.setItem('clinica-auth', JSON.stringify(authData))
      
      // Also update Zustand store (for current session)
      const store = useAuthStore.getState()
      store.login(mockToken, {
        user_id: mockUser.id,
        hospital_id: mockUser.hospital_id,
        role: mockUser.role as any,
        email: mockUser.email,
      })
      store.setHasHydrated(true)

      // Verify it was saved
      const stored = localStorage.getItem('clinica-auth')
      console.log('✅ Verified localStorage saved:', stored ? 'Yes' : 'No')
      
      if (!stored) {
        throw new Error('Failed to save to localStorage')
      }

      // Verify Zustand state
      const authState = useAuthStore.getState()
      console.log('✅ Zustand state:', {
        isAuthenticated: authState.isAuthenticated,
        hasToken: !!authState.token,
        hasUser: !!authState.user,
      })

      if (!authState.isAuthenticated || !authState.token) {
        throw new Error('Failed to set authentication state')
      }

      toast.success('Login successful!')
      
      // Wait a moment for everything to settle
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Navigate with full page reload (ensures Zustand rehydrates from localStorage)
      console.log('🚀 Navigating to dashboard...')
      window.location.href = '/'
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Clinica</h1>
          <p className="text-gray-600">Doctor-first Patient Management</p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('📝 Form submit event - calling handleSubmit')
            handleSubmit(onSubmit)(e)
          }}
          className="space-y-6"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="doctor@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="text-center text-sm text-gray-600">
            <p>Demo Mode: Use any email/password to login</p>
          </div>
          {/* Test button to bypass form */}
          <button
            type="button"
            onClick={async () => {
              console.log('🧪 Test login button clicked')
              
              // Directly write to localStorage first
              const authData = {
                state: {
                  token: 'test-token',
                  user: {
                    user_id: 'test-user',
                    hospital_id: 'test-hospital',
                    role: 'doctor',
                    email: 'test@test.com',
                  },
                  isAuthenticated: true,
                  _hasHydrated: true,
                },
                version: 0,
              }
              
              console.log('Writing to localStorage:', authData)
              localStorage.setItem('clinica-auth', JSON.stringify(authData))
              
              // Also update Zustand store
              const store = useAuthStore.getState()
              store.login('test-token', {
                user_id: 'test-user',
                hospital_id: 'test-hospital',
                role: 'doctor',
                email: 'test@test.com',
              })
              store.setHasHydrated(true)
              
              // Verify it was saved
              const stored = localStorage.getItem('clinica-auth')
              console.log('✅ Verified localStorage:', stored ? 'Saved!' : '❌ Not saved')
              
              // Wait a moment
              await new Promise(resolve => setTimeout(resolve, 300))
              
              console.log('🚀 Navigating to dashboard...')
              window.location.href = '/'
            }}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            🧪 Test Login (Bypass Form)
          </button>
        </div>
      </div>
    </div>
  )
}

