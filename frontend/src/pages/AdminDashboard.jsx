import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const adminRoles = ["Admin", "Super Admin", "Department Admin"];

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/auth/me")
      .then(res => {
        if (!adminRoles.includes(res.data.role)) {
          navigate("/");
        }
      })
      .catch(() => {
        navigate("/");
      });
  }, [navigate]);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* rest of admin UI */}
    </div>
  );
}
