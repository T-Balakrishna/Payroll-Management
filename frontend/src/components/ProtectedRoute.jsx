import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  // Wait until AuthProvider finishes checking session
  if (loading) {
    return null; // or minimal spinner if needed
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role validation
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
