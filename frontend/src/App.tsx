import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import PatientsPage from './pages/PatientsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import VisitsPage from './pages/VisitsPage'
import VisitDetailPage from './pages/VisitDetailPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import PrescriptionDetailPage from './pages/PrescriptionDetailPage'
import AppointmentsPage from './pages/AppointmentsPage'
import AppointmentDetailPage from './pages/AppointmentDetailPage'
import MedicalNotesPage from './pages/MedicalNotesPage'
import DocumentsPage from './pages/DocumentsPage'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, _hasHydrated, checkAuth } = useAuthStore()
  const [isReady, setIsReady] = React.useState(false)
  
  // Wait for Zustand hydration
  useEffect(() => {
    if (_hasHydrated) {
      setIsReady(true)
      return
    }
    
    // If not hydrated yet, check localStorage directly as fallback
    const stored = localStorage.getItem('clinica-auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.state?.isAuthenticated && parsed.state?.token) {
          console.log('✅ PrivateRoute: Found auth in localStorage, waiting for Zustand...')
          // Give Zustand a moment to hydrate
          const timer = setTimeout(() => setIsReady(true), 200)
          return () => clearTimeout(timer)
        }
      } catch (e) {
        console.error('❌ PrivateRoute: Failed to parse localStorage:', e)
      }
    }
    
    // If no auth found, mark as ready (will redirect to login)
    setIsReady(true)
  }, [_hasHydrated])
  
  // Wait for hydration
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  // Check auth - use checkAuth() which is more reliable
  const isAuth = checkAuth()
  
  console.log('🔐 PrivateRoute auth check:', {
    isAuthenticated,
    hasToken: !!token,
    checkAuth: isAuth,
  })
  
  if (!isAuth) {
    console.log('❌ PrivateRoute: Not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }
  
  console.log('✅ PrivateRoute: Authenticated, rendering children')
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="visits/:id" element={<VisitDetailPage />} />
          <Route path="prescriptions" element={<PrescriptionsPage />} />
          <Route path="prescriptions/:id" element={<PrescriptionDetailPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="appointments/:id" element={<AppointmentDetailPage />} />
          <Route path="notes" element={<MedicalNotesPage />} />
          <Route path="documents" element={<DocumentsPage />} />
        </Route>
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  )
}

export default App

