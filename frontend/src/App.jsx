// App routing and authentication state orchestration.
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import ModernLayout from "./components/ModernLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import CowManagementPage from "./pages/CowManagementPage";
import AddCowPage from "./pages/AddCowPage";
import CowRecordsPage from "./pages/CowRecordsPage";
import DashboardPage from "./pages/DashboardPage";
import DetectionPage from "./pages/DetectionPage";
import LoginPage from "./pages/LoginPage";
import MilkLogPage from "./pages/MilkLogPage";
import ModuleSelectionPage from "./pages/ModuleSelectionPage";
import GuidancePage from "./pages/GuidancePage";
import AboutPage from "./pages/AboutPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";
import LandingPage from "./pages/LandingPage";
import { getProfile, setAuthToken } from "./services/api";
import { ThemeProvider } from "./context/ThemeContext";

// Admin imports
import { AdminAuthProvider } from "../admin/src/context/AdminAuthContext";
import { AdminRoutes } from "../admin/src/routes/AdminRoutes";

const userStorageKey = "cattlesense_user";
const tokenStorageKey = "cattlesense_token";

function FarmerApp() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(userStorageKey);
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey) || "");
  const [authBootstrapped, setAuthBootstrapped] = useState(() => !localStorage.getItem(tokenStorageKey));

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const handleLogout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem(userStorageKey);
    localStorage.removeItem(tokenStorageKey);
    setAuthToken("");
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setAuthBootstrapped(true);
        return;
      }

      try {
        setAuthToken(token);
        const response = await getProfile();
        if (response?.user) {
          setUser(response.user);
          localStorage.setItem(userStorageKey, JSON.stringify(response.user));
        } else {
          handleLogout();
        }
      } catch (err) {
        console.warn("Session verification failed, logging out:", err);
        handleLogout();
      } finally {
        setAuthBootstrapped(true);
      }
    };

    loadProfile();
  }, [token]);

  const handleLogin = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
    localStorage.setItem(tokenStorageKey, nextToken);
    setAuthToken(nextToken);
  };

  const handleProfileUpdate = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
  };

  if (!authBootstrapped) {
    return null;
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LandingPage token={token} user={user} onLogout={handleLogout} onLogin={handleLogin} />} />
        <Route
          path="/login"
          element={token ? <Navigate to="/modules" replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route path="/signup" element={token ? <Navigate to="/modules" replace /> : <SignupPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <DashboardPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cows"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <CowManagementPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cows/add"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <AddCowPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cows/:cowId"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <CowRecordsPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/milk"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <MilkLogPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <ModuleSelectionPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/guidance"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <GuidancePage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <AboutPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/detect/:moduleKey"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <DetectionPage />
              </ModernLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute token={token}>
              <ModernLayout onLogout={handleLogout} user={user}>
                <ProfilePage onProfileUpdate={handleProfileUpdate} onLogout={handleLogout} user={user} />
              </ModernLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={token ? "/modules" : "/login"} replace />} />
      </Routes>
    </ThemeProvider>
  );
}

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Handle admin routes separately with AdminAuthProvider & ThemeProvider
  if (isAdminRoute) {
    return (
      <ThemeProvider>
        <AdminAuthProvider>
          <AdminRoutes />
        </AdminAuthProvider>
      </ThemeProvider>
    );
  }

  // Farmer app routes...
  return <FarmerApp />;
}

export default App;
