import { Navigate } from 'react-router-dom'
import { getToken } from '../api/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // no token means go to login
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}