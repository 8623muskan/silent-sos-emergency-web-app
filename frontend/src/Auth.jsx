import { useState } from "react";
import "./Auth.css";

const API_BASE_URL = "http://localhost:5000/api/auth";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isLogin = mode === "login";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setError("");
    setSuccess("");
  };

  const switchMode = (newMode) => {
    setMode(newMode);

    setFormData({
      name: "",
      phone: "",
      email: "",
      password: ""
    });

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (!formData.password) {
      return "Please enter your password.";
    }

    if (formData.password.length < 6) {
      return "Password must contain at least 6 characters.";
    }

    if (!isLogin) {
      if (!formData.name.trim()) {
        return "Please enter your name.";
      }

      if (!formData.phone.trim()) {
        return "Please enter your phone number.";
      }

      const phone = formData.phone.replace(/\D/g, "");

      if (phone.length < 10) {
        return "Please enter a valid phone number.";
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin
        ? `${API_BASE_URL}/login`
        : `${API_BASE_URL}/register`;

      const body = isLogin
        ? {
            email: formData.email.trim().toLowerCase(),
            password: formData.password
          }
        : {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (isLogin
              ? "Login failed."
              : "Registration failed.")
        );
      }

      if (!data.token) {
        throw new Error(
          "Authentication token was not returned by the server."
        );
      }

      localStorage.setItem(
        "silent_sos_token",
        data.token
      );

      if (data.user) {
        localStorage.setItem(
          "silent_sos_user",
          JSON.stringify(data.user)
        );
      }

      setSuccess(
        isLogin
          ? "Login successful. Opening your safety dashboard..."
          : "Account created successfully. Opening your safety dashboard..."
      );

      setTimeout(() => {
        if (typeof onLogin === "function") {
          onLogin(data.token);
        }
      }, 500);
    } catch (error) {
      console.error("AUTH ERROR:", error);

      if (
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        setError(
          "Cannot connect to the Silent SOS server. Please make sure the backend is running on port 5000."
        );
      } else {
        setError(
          error.message ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-background">
        <div className="auth-glow auth-glow-one"></div>
        <div className="auth-glow auth-glow-two"></div>
      </div>

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            SOS
          </div>

          <div>
            <h1>Silent SOS</h1>
            <p>Emergency Safety System</p>
          </div>
        </div>

        <div className="auth-heading">
          <span className="auth-security-dot"></span>

          <div>
            <h2>
              {isLogin
                ? "Welcome back"
                : "Create your account"}
            </h2>

            <p>
              {isLogin
                ? "Sign in to access your emergency safety dashboard."
                : "Create a secure account to configure your emergency contacts and SOS system."}
            </p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              isLogin
                ? "auth-tab active"
                : "auth-tab"
            }
            onClick={() => switchMode("login")}
            disabled={loading}
          >
            Sign In
          </button>

          <button
            type="button"
            className={
              !isLogin
                ? "auth-tab active"
                : "auth-tab"
            }
            onClick={() => switchMode("register")}
            disabled={loading}
          >
            Create Account
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {!isLogin && (
            <>
              <div className="auth-field">
                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete={
                isLogin
                  ? "current-password"
                  : "new-password"
              }
              disabled={loading}
            />
          </div>

          {error && (
            <div className="auth-message auth-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="auth-message auth-success">
              <span>✓</span>
              <p>{success}</p>
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner"></span>
                {isLogin
                  ? "Signing In..."
                  : "Creating Account..."}
              </>
            ) : (
              <>
                {isLogin
                  ? "Sign In Securely"
                  : "Create Secure Account"}

                <span className="auth-arrow">
                  →
                </span>
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span></span>
          <p>SECURE ACCESS</p>
          <span></span>
        </div>

        <div className="auth-security">
          <div className="security-item">
            <span>✓</span>
            <p>Protected authentication</p>
          </div>

          <div className="security-item">
            <span>✓</span>
            <p>Emergency data secured</p>
          </div>

          <div className="security-item">
            <span>✓</span>
            <p>GPS access only when required</p>
          </div>
        </div>

        <p className="auth-footer">
          Silent SOS requires an account so your
          emergency alerts and trusted contacts can
          be associated with you securely.
        </p>
      </section>
    </main>
  );
}

export default Auth;