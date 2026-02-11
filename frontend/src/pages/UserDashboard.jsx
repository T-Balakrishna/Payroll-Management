import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function UserDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/auth/me")
      .catch(() => navigate("/"));
  }, [navigate]);

  return <h1>User Dashboard</h1>;
}
