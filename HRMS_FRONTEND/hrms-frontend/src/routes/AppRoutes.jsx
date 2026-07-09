import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROLES, ROLE_DASHBOARD_MAP } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

// Lazy-loaded pages — add more here as you build them
const Login         = lazy(() => import('../pages/auth/Login'));
const Unauthorized  = lazy(() => import('../pages/auth/Unauthorized'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

// Dashboards
const HROfficerDashboard      = lazy(() => import('../pages/dashboard/HROfficerDashboard'));
const HRDirectorDashboard     = lazy(() => import('../pages/dashboard/HRDirectorDashboard'));
const DeptHeadDashboard       = lazy(() => import('../pages/dashboard/DeptHeadDashboard'));
const SeniorMgmtDashboard     = lazy(() => import('../pages/dashboard/SeniorMgmtDashboard'));
const BoardDashboard          = lazy(() => import('../pages/dashboard/BoardDashboard'));
const EmployeeDashboard       = lazy(() => import('../pages/dashboard/EmployeeDashboard'));
const ApplicantDashboard      = lazy(() => import('../pages/dashboard/ApplicantDashboard'));
const GradTraineeDashboard    = lazy(() => import('../pages/dashboard/GradTraineeDashboard'));
const InternDashboard         = lazy(() => import('../pages/dashboard/InternDashboard'));
const AdminDashboard          = lazy(() => import('../pages/dashboard/AdminDashboard'));

// Feature modules
const EmployeeList    = lazy(() => import('../pages/employees/EmployeeList'));
const ManpowerList    = lazy(() => import('../pages/manpower/ManpowerList'));
const RecruitmentList = lazy(() => import('../pages/recruitment/RecruitmentList'));
const LeaveList       = lazy(() => import('../pages/leave/LeaveList'));
const LeaveDetail     = lazy(() => import('../pages/leave/LeaveDetail'));
const TransferList    = lazy(() => import('../pages/transfers/TransferList'));
const EvaluationList  = lazy(() => import('../pages/evaluation/EvaluationList'));
const TraineeList     = lazy(() => import('../pages/trainees/TraineeList'));
const ReportsOverview = lazy(() => import('../pages/reports/ReportsOverview'));
const UserManagement  = lazy(() => import('../pages/settings/UserManagement'));

function Loading() {
  return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
}

function NotFound() {
  const { user } = useAuth();
  const dashboardPath = user ? (ROLE_DASHBOARD_MAP[user.role] || '/dashboard/employee') : '/login';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '1rem', textAlign: 'center',
      fontFamily: 'var(--font-family, sans-serif)', color: 'var(--color-text, #111)',
    }}>
      <span style={{ fontSize: '5rem', fontWeight: 700, color: 'var(--color-border, #e5e7eb)', lineHeight: 1 }}>404</span>
      <p style={{ color: 'var(--color-text-muted, #6b7280)', fontSize: '0.95rem' }}>Page not found.</p>
      <a href={dashboardPath} style={{ fontSize: '0.9rem', color: 'var(--color-primary, #2563eb)' }}>Go to dashboard</a>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/reset-password" element={
          <ProtectedRoute><ResetPassword /></ProtectedRoute>
        } />

        {/* Dashboards */}
        <Route path="/dashboard/hr-officer" element={
          <ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}>
            <HROfficerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/hr-director" element={
          <ProtectedRoute allowedRoles={[ROLES.HR_DIRECTOR]}>
            <HRDirectorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/department-head" element={
          <ProtectedRoute allowedRoles={[ROLES.DEPARTMENT_HEAD]}>
            <DeptHeadDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/senior-management" element={
          <ProtectedRoute allowedRoles={[ROLES.SENIOR_MANAGEMENT]}>
            <SeniorMgmtDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/board" element={
          <ProtectedRoute allowedRoles={[ROLES.BOARD]}>
            <BoardDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/employee" element={
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/applicant" element={
          <ProtectedRoute allowedRoles={[ROLES.APPLICANT]}>
            <ApplicantDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/graduate-trainee" element={
          <ProtectedRoute allowedRoles={[ROLES.GRADUATE_TRAINEE]}>
            <GradTraineeDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/intern" element={
          <ProtectedRoute allowedRoles={[ROLES.INTERN]}>
            <InternDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/admin" element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Feature modules — visible to any authenticated user; pages self-scope by role */}
        <Route path="/workforce" element={
          <ProtectedRoute><EmployeeList /></ProtectedRoute>
        } />
        <Route path="/manpower" element={
          <ProtectedRoute><ManpowerList /></ProtectedRoute>
        } />
        <Route path="/recruitment" element={
          <ProtectedRoute><RecruitmentList /></ProtectedRoute>
        } />
        <Route path="/leave" element={
          <ProtectedRoute><LeaveList /></ProtectedRoute>
        } />
        <Route path="/leave/:id" element={
          <ProtectedRoute><LeaveDetail /></ProtectedRoute>
        } />
        <Route path="/transfers" element={
          <ProtectedRoute><TransferList /></ProtectedRoute>
        } />
        <Route path="/evaluation" element={
          <ProtectedRoute><EvaluationList /></ProtectedRoute>
        } />
        <Route path="/trainees" element={
          <ProtectedRoute><TraineeList /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute><ReportsOverview /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <UserManagement />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="/" element={<Navigate to={'/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
