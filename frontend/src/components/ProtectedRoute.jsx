// Route guard for pages that require authentication.
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
