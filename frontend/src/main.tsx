import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useAuthStore } from './store/authStore'

// Force initial hydration check
const checkHydration = () => {
  const stored = localStorage.getItem('clinica-auth')
  console.log('🔍 Initial hydration check:', stored)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      console.log('📦 Parsed auth data:', parsed)
      if (parsed.state && !parsed.state._hasHydrated) {
        // Manually set hydrated if state exists
        useAuthStore.getState().setHasHydrated(true)
        console.log('✅ Manually set _hasHydrated')
      }
    } catch (e) {
      console.error('❌ Failed to parse stored auth:', e)
    }
  }
}

// Check on load
checkHydration()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

