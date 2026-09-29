import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = "silent_sos_token";

function AdminEntry() {
  const [state, setState] = useState({
    loading: true,
    authorized: false,
    error: ""
  });

  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setState({
          loading: false,
          authorized: false,
          error: "Authentication required."
        });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "Unable to verify account."
          );
        }

        if (data?.user?.role !== "admin") {
          setState({
            loading: false,
            authorized: false,
            error: "Admin access required."
          });
          return;
        }

        setState({
          loading: false,
          authorized: true,
          error: ""
        });
      } catch (error) {
        console.error("ADMIN AUTH CHECK ERROR:", error);

        setState({
          loading: false,
          authorized: false,
          error:
            error.message ||
            "Unable to verify administrator access."
        });
      }
    };

    verifyAdmin();
  }, []);

  if (state.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#080b12",
          color: "#f8fafc",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, sans-serif"
        }}
      >
        Verifying administrator access...
      </div>
    );
  }

  if (!state.authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#080b12",
          color: "#f8fafc",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, sans-serif",
          textAlign: "center"
        }}
      >
        <div>
          <h2>Access Denied</h2>
          <p style={{ color: "#94a3b8" }}>
            {state.error}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              marginTop: "12px",
              padding: "10px 16px",
              border: 0,
              borderRadius: "9px",
              background: "#dc2626",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Return to Silent SOS
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard
      onLogout={() => {
        window.location.href = "/";
      }}
    />
  );
}

function RootApplication() {
  const isAdminRoute =
    window.location.pathname === "/admin" ||
    window.location.pathname === "/admin/";

  if (isAdminRoute) {
    return <AdminEntry />;
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootApplication />
  </StrictMode>
);