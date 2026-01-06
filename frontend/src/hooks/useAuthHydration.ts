import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

/**
 * Hook to ensure Zustand persist has hydrated before rendering
 */
export function useAuthHydration() {
  const [isHydrated, setIsHydrated] = useState(false)
  const { _hasHydrated, setHasHydrated } = useAuthStore()

  useEffect(() => {
    // If Zustand hasn't hydrated yet, manually check localStorage
    if (!_hasHydrated) {
      const stored = localStorage.getItem('clinica-auth')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          console.log('Manual hydration check:', parsed)
        } catch (e) {
          console.error('Failed to parse stored auth:', e)
        }
      }
      // Set hydrated after a short delay to allow Zustand to finish
      const timer = setTimeout(() => {
        setHasHydrated(true)
        setIsHydrated(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setIsHydrated(true)
    }
  }, [_hasHydrated, setHasHydrated])

  return isHydrated
}

