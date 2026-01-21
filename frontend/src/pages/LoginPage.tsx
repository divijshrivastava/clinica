import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { LoginCredentials } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { login } from '../services/api'

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
    console.log('🔐 Login attempt:', data.email)
    console.log('🔐 Login data:', data)
    setLoading(true)

    try {
      console.log('🔐 Calling login API...')
      // Call the real login API
      const response = await login({
        email: data.email,
        password: data.password,
      })

      console.log('🔐 Login successful:', response)

      // Update Zustand store
      const store = useAuthStore.getState()
      store.login(response.token, response.user)
      store.setHasHydrated(true)

      toast.success('Login successful!')

      // Wait a moment for everything to settle
      await new Promise(resolve => setTimeout(resolve, 300))

      // Navigate to dashboard
      console.log('🚀 Navigating to dashboard...')
      navigate('/', { replace: true })
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed'
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">MyMedic</h1>
          <p className="text-gray-600">Doctor-first Patient Management</p>
        </div>

        <form 
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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
      </div>
    </div>
  )
}

