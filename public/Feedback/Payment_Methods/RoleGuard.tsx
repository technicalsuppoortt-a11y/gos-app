import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { type UserRole } from '../../services/auth'
import { GlobalLoader } from '../ui/GlobalLoader'

interface RoleGuardProps {
  allowedRoles: UserRole[]
}

export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return <GlobalLoader />
  }

  // Effective Role with normalization and SuperAdmin email fallback
  const effectiveRole: UserRole | null = role 
    ? (role.toLowerCase() as UserRole) 
    : (user?.email?.toLowerCase() === 'super@brand.com' ? 'superadmin' : null)

  // Not logged in -> Go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If user role is missing
  if (!effectiveRole) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#F45B69' }}>
        <h2>Unauthorized</h2>
        <p>Your account lacks permissions. Please contact support.</p>
      </div>
    )
  }

  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase())

  // If logged in but role isn't allowed for this route
  if (!normalizedAllowedRoles.includes(effectiveRole)) {
    // Redirect them to their appropriate dashboard based on their role
    if (effectiveRole === 'superadmin') return <Navigate to="/superadmin" replace />
    if (effectiveRole === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace /> // standard user
  }

  // They are authorized
  return <Outlet />
}
