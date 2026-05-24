/**
 * App.jsx — TalentProctor
 *
 * FIX B-04: Added 'org_owner' to allowedRoles for every recruiter-facing
 * route. The backend roleMiddleware already permits org_owner everywhere
 * recruiter is allowed (recruiterOnly and adminOrRecruiter both include it),
 * but the frontend ProtectedRoute was blocking them with Access Denied.
 *
 * Changed routes:
 *   /recruiter/dashboard              ['recruiter']              → ['recruiter','org_owner']
 *   /recruiter/tests/:testId/questions ['recruiter']             → ['recruiter','org_owner']
 *   /recruiter/reports/:testId         ['recruiter','admin']     → ['recruiter','org_owner','admin']
 *   /recruiter/reports/candidate/:id   ['recruiter','admin']     → ['recruiter','org_owner','admin']
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider }  from './context/ThemeContext';
import ProtectedRoute    from './components/auth/ProtectedRoute';

// Public
import Home     from './pages/Home';
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboards
import AdminDashboard     from './pages/admin/Dashboard';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import CandidateDashboard from './pages/candidate/Dashboard';
import OrgDashboard       from './pages/org/Dashboard';

// Test Management
import TestQuestions from './pages/recruiter/TestQuestions';

// Candidate Flow
import TestEnrollment   from './pages/candidate/TestEnrollment';
import PreExamChecks    from './pages/candidate/PreExamChecks';
import ExamInterface    from './pages/candidate/ExamInterface';
import CandidateResults from './pages/candidate/CandidateResults';
import MobileCameraPage from './pages/candidate/MobileCameraPage';

// Reports
import ReportsPage    from './pages/recruiter/ReportsPage';
import CandidateReport from './pages/recruiter/CandidateReport';

// Auth misc
import InviteAccept from './pages/auth/InviteAccept';

// Shared role constants — avoids magic-string duplication across routes
const RECRUITER_ROLES = ['recruiter', 'org_owner'];
const RECRUITER_ADMIN_ROLES = ['recruiter', 'org_owner', 'admin'];

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public ── */}
              <Route path="/"              element={<Home />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/register"      element={<Register />} />
              <Route path="/invite/accept" element={<InviteAccept />} />

              {/* Mobile Camera — public, token-validated inside the page component */}
              <Route path="/mobile-camera" element={<MobileCameraPage />} />

              {/* ── Admin ── */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Org Owner ── */}
              <Route
                path="/org/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['org_owner']}>
                    <OrgDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Recruiter (+ org_owner who has all recruiter capabilities) ── */}
              <Route
                path="/recruiter/dashboard"
                element={
                  <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                    <RecruiterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/tests/:testId/questions"
                element={
                  <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                    <TestQuestions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/reports/:testId"
                element={
                  <ProtectedRoute allowedRoles={RECRUITER_ADMIN_ROLES}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/reports/candidate/:assignmentId"
                element={
                  <ProtectedRoute allowedRoles={RECRUITER_ADMIN_ROLES}>
                    <CandidateReport />
                  </ProtectedRoute>
                }
              />

              {/* ── Candidate ── */}
              <Route
                path="/candidate/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['candidate']}>
                    <CandidateDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/tests/:testId/enrollment"
                element={
                  <ProtectedRoute allowedRoles={['candidate']}>
                    <TestEnrollment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/tests/:testId/pre-exam"
                element={
                  <ProtectedRoute allowedRoles={['candidate']}>
                    <PreExamChecks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/tests/:testId/exam"
                element={
                  <ProtectedRoute allowedRoles={['candidate']}>
                    <ExamInterface />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/results/:assignmentId"
                element={
                  <ProtectedRoute allowedRoles={['candidate']}>
                    <CandidateResults />
                  </ProtectedRoute>
                }
              />

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;