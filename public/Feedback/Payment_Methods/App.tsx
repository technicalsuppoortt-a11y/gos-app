import React from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { RoleGuard } from './components/guards/RoleGuard'
import { seedSuperAdmin } from './services/auth'

import { MainLayout } from './components/layout/MainLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { SuperAdminLayout } from './components/layout/SuperAdminLayout'

import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import MetaOAuthCallbackPage from './pages/MetaOAuthCallbackPage'

// SuperAdmin Pages
import SuperAdminBrandsPage from './pages/superadmin/BrandsPage'
import SuperAdminProductsPage from './pages/superadmin/ProductsPage'
import SuperAdminSalesPage from './pages/superadmin/SalesPage'
import SuperAdminLandingPagesPage from './pages/superadmin/LandingPagesPage'
import SuperAdminStaffPage from './pages/superadmin/StaffPage'
import SuperAdminBrandingPage from './pages/superadmin/BrandingPage'
import SuperAdminSettingsPage from './pages/superadmin/SettingsPage'

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminPackagesPage from './pages/admin/AdminPackagesPage'
import AdminBrandSettingsPage from './pages/admin/AdminBrandSettingsPage'
import AdminAIPage from './pages/admin/AdminAIPage'

// Main App Pages
import HomePage from './pages/HomePage'
import IntelligencePage from './pages/IntelligencePage'
import StrategyPage from './pages/StrategyPage'
import IdeasPage from './pages/IdeasPage'
import AnalyticsPage from './pages/AnalyticsPage'
import CompetitorsPage from './pages/CompetitorsPage'
import TrendsPage from './pages/TrendsPage'
import AgentsPage from './pages/AgentsPage'
import AutomationPage from './pages/AutomationPage'
import InboxPage from './pages/InboxPage'
import StudioPage from './pages/StudioPage'
import CameraPage from './pages/CameraPage'
import VideoStudioPage from './pages/VideoStudioPage'
import VoiceStudioPage from './pages/VoiceStudioPage'
import DesignStudioPage from './pages/DesignStudioPage'
import LinkBioPage from './pages/LinkBioPage'
import CalendarPage from './pages/CalendarPage'
import BrandBrainPage from './pages/BrandBrainPage'
import MediaLibraryPage from './pages/MediaLibraryPage'
import SettingsPage from './pages/SettingsPage'
import ExecuteForMePage from './pages/ExecuteForMePage'
import ProductsLibraryPage from './pages/ProductsLibraryPage'
import UsageCreditsPage from './pages/UsageCreditsPage'
import PaymentMethodsPage from './pages/PaymentMethodsPage'
import PublicProductPage from './pages/PublicProductPage'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* OAuth Callback Routes — public, standalone (no layout/auth guards) */}
        <Route path="/oauth/meta" element={<MetaOAuthCallbackPage />} />

        {/* Public Product View */}
        <Route path="/product/:id" element={<PublicProductPage />} />

        {/* User Dashboard */}
        <Route element={<RoleGuard allowedRoles={['user', 'admin', 'superadmin']} />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="intelligence" element={<IntelligencePage />} />
            <Route path="strategy" element={<StrategyPage />} />
            <Route path="ideas" element={<IdeasPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="competitors" element={<CompetitorsPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="automation" element={<AutomationPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="camera" element={<CameraPage />} />
            <Route path="videostudio" element={<VideoStudioPage />} />
            <Route path="voicestudio" element={<VoiceStudioPage />} />
            <Route path="designstudio" element={<DesignStudioPage />} />
            <Route path="linkbio" element={<LinkBioPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="brandbrain" element={<BrandBrainPage />} />
            <Route path="medialibrary" element={<MediaLibraryPage />} />
            <Route path="execute-for-me" element={<ExecuteForMePage />} />
            <Route path="products-library" element={<ProductsLibraryPage />} />
            <Route path="usage-credits" element={<UsageCreditsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
          </Route>
        </Route>

        {/* Admin Dashboard */}
        <Route path="/admin" element={<RoleGuard allowedRoles={['admin', 'superadmin']} />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="packages" element={<AdminPackagesPage />} />
            <Route path="brand" element={<AdminBrandSettingsPage />} />
            <Route path="ai" element={<AdminAIPage />} />
          </Route>
        </Route>

        {/* SuperAdmin Dashboard */}
        <Route path="/superadmin" element={<RoleGuard allowedRoles={['superadmin']} />}>
          <Route element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="/superadmin/brands" replace />} />
            <Route path="brands" element={<SuperAdminBrandsPage />} />
            <Route path="products" element={<SuperAdminProductsPage />} />
            <Route path="sales" element={<SuperAdminSalesPage />} />
            <Route path="landing-pages" element={<SuperAdminLandingPagesPage />} />
            <Route path="staff" element={<SuperAdminStaffPage />} />
            <Route path="branding" element={<SuperAdminBrandingPage />} />
            <Route path="settings" element={<SuperAdminSettingsPage />} />
          </Route>
        </Route>
        {/* Catch All - Redirects to root to enforce RoleGuard/Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  React.useEffect(() => {
    seedSuperAdmin()
  }, [])

  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <AnimatedRoutes />
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
