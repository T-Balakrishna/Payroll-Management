import "./auth.css";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Just redirect for now
    navigate("/dashboard");
  };

  const handleGoogleSuccess = (credentialResponse) => {
    const token = credentialResponse.credential;
    const user = jwtDecode(token);
    console.log("Google User:", user);
    navigate("/dashboard");
  };

  const handleGoogleError = () => {
    alert("Google Sign-In Failed");
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="blue-strap">
          <h2>LOGIN</h2>
        </div>

        {/* Email/Password Form */}
        <div className="form-group">
          <label>College Mail</label>
          <input type="email" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" />
        </div>
        <button onClick={handleLogin}>Login</button>

        {/* Google Sign-In */}
        <div style={{ marginTop: "15px" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>
      </div>
    </div>
  );
}