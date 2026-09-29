import { useCallback, useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = "silent_sos_token";

const STATUS_ORDER = [
  "ACTIVE",
  "ACKNOWLEDGED",
  "RESPONDING",
  "RESOLVED",
  "CANCELLED"
];

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium"
  });
};

const formatCoordinates = (location) => {
  if (!location) return "Location unavailable";

  return `${Number(location.latitude).toFixed(6)}, ${Number(
    location.longitude
  ).toFixed(6)}`;
};

const getMapUrl = (location) => {
  if (!location) return "#";

  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
};

const getStatusClass = (status) => {
  return String(status || "UNKNOWN").toLowerCase();
};

function AdminDashboard({ onLogout }) {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const token = localStorage.getItem(TOKEN_KEY);

  const authenticatedRequest = useCallback(
    async (url, options = {}) => {
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {})
        }
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message || `Request failed with status ${response.status}`
        );
      }

      return data;
    },
    [token]
  );

  const loadAlerts = useCallback(
    async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const data = await authenticatedRequest("/admin/alerts");

        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("ADMIN LOAD ALERTS ERROR:", error);
        setErrorMessage(error.message || "Unable to load alerts.");
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [authenticatedRequest]
  );

  useEffect(() => {
    loadAlerts(true);

    const interval = setInterval(() => {
      loadAlerts(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadAlerts]);

  const handleAlertAction = async (alertId, action) => {
    try {
      setActionLoading(`${alertId}-${action}`);
      setErrorMessage("");

      await authenticatedRequest(`/admin/alerts/${alertId}/${action}`, {
        method: "PATCH"
      });

      await loadAlerts(false);

      if (selectedAlert?._id === alertId) {
        const refreshed = await authenticatedRequest(
          `/admin/alerts/${alertId}`
        );

        setSelectedAlert(refreshed.alert || null);
      }
    } catch (error) {
      console.error(`ADMIN ${action.toUpperCase()} ERROR:`, error);

      setErrorMessage(
        error.message || `Unable to ${action} this emergency.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleSelectAlert = async (alertId) => {
    try {
      setErrorMessage("");

      const data = await authenticatedRequest(
        `/admin/alerts/${alertId}`
      );

      setSelectedAlert(data.alert || null);
    } catch (error) {
      console.error("ADMIN LOAD ALERT DETAILS ERROR:", error);

      setErrorMessage(
        error.message || "Unable to load alert details."
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);

    if (typeof onLogout === "function") {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  const handleBackToMainPage = () => {
    window.location.href = "/";
  };

  const counters = useMemo(() => {
    return STATUS_ORDER.reduce((result, status) => {
      result[status] = alerts.filter(
        (alert) => alert.status === status
      ).length;

      return result;
    }, {});
  }, [alerts]);

  const activeAlerts = useMemo(() => {
    return alerts.filter((alert) =>
      ["ACTIVE", "ACKNOWLEDGED", "RESPONDING"].includes(
        alert.status
      )
    );
  }, [alerts]);

  const historicalAlerts = useMemo(() => {
    return alerts.filter((alert) =>
      ["RESOLVED", "CANCELLED"].includes(alert.status)
    );
  }, [alerts]);

  if (!token) {
    return (
      <div className="admin-page">
        <div className="admin-empty-state">
          <div className="admin-empty-icon">🔐</div>

          <h2>Authentication Required</h2>

          <p>
            Please log in again to access the emergency responder
            dashboard.
          </p>

          <button
            className="admin-primary-button"
            onClick={() => window.location.reload()}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand-icon">🛡️</div>

          <div>
            <h1>Silent SOS</h1>
            <p>Emergency Response Dashboard</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <div className="admin-live-indicator">
            <span className="admin-live-dot"></span>
            Live Monitoring
          </div>

          {/* BACK TO MAIN PAGE */}
          <button
            className="admin-refresh-button"
            onClick={handleBackToMainPage}
            type="button"
          >
            ← Main Page
          </button>

          <button
            className="admin-refresh-button"
            onClick={() => loadAlerts(true)}
            disabled={isLoading}
            type="button"
          >
            ↻ Refresh
          </button>

          <button
            className="admin-logout-button"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-content">
        <section className="admin-introduction">
          <div>
            <span className="admin-eyebrow">
              EMERGENCY RESPONSE CENTER
            </span>

            <h2>Monitor Emergency Alerts</h2>

            <p>
              Track active Silent SOS emergencies, review live
              locations, and manage emergency response status.
            </p>
          </div>

          <div className="admin-last-updated">
            <span>Last updated</span>

            <strong>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString("en-IN")
                : "Loading..."}
            </strong>
          </div>
        </section>

        {errorMessage && (
          <div className="admin-error">
            <strong>⚠ Error</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        <section className="admin-stat-grid">
          <div className="admin-stat-card active">
            <span className="admin-stat-label">ACTIVE</span>
            <strong>{counters.ACTIVE || 0}</strong>
            <small>Immediate attention</small>
          </div>

          <div className="admin-stat-card acknowledged">
            <span className="admin-stat-label">ACKNOWLEDGED</span>
            <strong>{counters.ACKNOWLEDGED || 0}</strong>
            <small>Alert received</small>
          </div>

          <div className="admin-stat-card responding">
            <span className="admin-stat-label">RESPONDING</span>
            <strong>{counters.RESPONDING || 0}</strong>
            <small>Response in progress</small>
          </div>

          <div className="admin-stat-card resolved">
            <span className="admin-stat-label">RESOLVED</span>
            <strong>{counters.RESOLVED || 0}</strong>
            <small>Successfully closed</small>
          </div>

          <div className="admin-stat-card cancelled">
            <span className="admin-stat-label">CANCELLED</span>
            <strong>{counters.CANCELLED || 0}</strong>
            <small>Cancelled alerts</small>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">REAL-TIME</span>
              <h3>Active Emergencies</h3>
            </div>

            <span className="admin-count-badge">
              {activeAlerts.length} active
            </span>
          </div>

          {isLoading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Loading emergency alerts...</p>
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="admin-empty-state compact">
              <div className="admin-empty-icon">✓</div>

              <h3>No Active Emergencies</h3>

              <p>
                There are currently no active emergency alerts.
              </p>
            </div>
          ) : (
            <div className="admin-alert-grid">
              {activeAlerts.map((alert) => {
                const user = alert.user || {};

                const location =
                  alert.currentLocation ||
                  alert.initialLocation;

                return (
                  <article
                    className={`admin-alert-card ${getStatusClass(
                      alert.status
                    )}`}
                    key={alert._id}
                  >
                    <div className="admin-alert-top">
                      <div>
                        <span className="admin-alert-label">
                          EMERGENCY ALERT
                        </span>

                        <h4>
                          {user.name || "Unknown User"}
                        </h4>
                      </div>

                      <span
                        className={`admin-status ${getStatusClass(
                          alert.status
                        )}`}
                      >
                        {alert.status}
                      </span>
                    </div>

                    <div className="admin-alert-details">
                      <div className="admin-detail-row">
                        <span>📞 Phone</span>

                        <strong>
                          {user.phone || "Not available"}
                        </strong>
                      </div>

                      <div className="admin-detail-row">
                        <span>✉ Email</span>

                        <strong>
                          {user.email || "Not available"}
                        </strong>
                      </div>

                      <div className="admin-detail-row">
                        <span>🕐 Triggered</span>

                        <strong>
                          {formatDateTime(
                            alert.triggeredAt
                          )}
                        </strong>
                      </div>

                      <div className="admin-detail-row">
                        <span>📍 Location</span>

                        <strong>
                          {formatCoordinates(location)}
                        </strong>
                      </div>

                      <div className="admin-detail-row">
                        <span>🎯 Accuracy</span>

                        <strong>
                          {location?.accuracy != null
                            ? `${Math.round(
                                location.accuracy
                              )} m`
                            : "Not available"}
                        </strong>
                      </div>

                      <div className="admin-detail-row">
                        <span>🔄 Last update</span>

                        <strong>
                          {formatDateTime(
                            alert.lastLocationUpdate
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="admin-alert-actions">
                      <button
                        className="admin-map-button"
                        onClick={() =>
                          window.open(
                            getMapUrl(location),
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        disabled={!location}
                        type="button"
                      >
                        📍 Open Map
                      </button>

                      <button
                        className="admin-view-button"
                        onClick={() =>
                          handleSelectAlert(alert._id)
                        }
                        type="button"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="admin-response-actions">
                      {alert.status === "ACTIVE" && (
                        <button
                          className="admin-action acknowledge"
                          disabled={
                            actionLoading ===
                            `${alert._id}-acknowledge`
                          }
                          onClick={() =>
                            handleAlertAction(
                              alert._id,
                              "acknowledge"
                            )
                          }
                          type="button"
                        >
                          {actionLoading ===
                          `${alert._id}-acknowledge`
                            ? "Processing..."
                            : "Acknowledge"}
                        </button>
                      )}

                      {alert.status === "ACKNOWLEDGED" && (
                        <button
                          className="admin-action respond"
                          disabled={
                            actionLoading ===
                            `${alert._id}-respond`
                          }
                          onClick={() =>
                            handleAlertAction(
                              alert._id,
                              "respond"
                            )
                          }
                          type="button"
                        >
                          {actionLoading ===
                          `${alert._id}-respond`
                            ? "Processing..."
                            : "Respond"}
                        </button>
                      )}

                      {[
                        "ACTIVE",
                        "ACKNOWLEDGED",
                        "RESPONDING"
                      ].includes(alert.status) && (
                        <button
                          className="admin-action resolve"
                          disabled={
                            actionLoading ===
                            `${alert._id}-resolve`
                          }
                          onClick={() =>
                            handleAlertAction(
                              alert._id,
                              "resolve"
                            )
                          }
                          type="button"
                        >
                          {actionLoading ===
                          `${alert._id}-resolve`
                            ? "Processing..."
                            : "Resolve"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">HISTORY</span>

              <h3>Emergency History</h3>
            </div>

            <span className="admin-count-badge">
              {historicalAlerts.length} records
            </span>
          </div>

          {historicalAlerts.length === 0 ? (
            <div className="admin-empty-state compact">
              <p>
                No resolved or cancelled alerts yet.
              </p>
            </div>
          ) : (
            <div className="admin-history-table-wrapper">
              <table className="admin-history-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Triggered</th>
                    <th>Resolved</th>
                    <th>Response Time</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {historicalAlerts.map((alert) => (
                    <tr key={alert._id}>
                      <td>
                        <strong>
                          {alert.user?.name || "Unknown"}
                        </strong>

                        <small>
                          {alert.user?.phone || "—"}
                        </small>
                      </td>

                      <td>
                        <span
                          className={`admin-status ${getStatusClass(
                            alert.status
                          )}`}
                        >
                          {alert.status}
                        </span>
                      </td>

                      <td>
                        {formatDateTime(
                          alert.triggeredAt
                        )}
                      </td>

                      <td>
                        {formatDateTime(
                          alert.resolvedAt ||
                            alert.cancelledAt
                        )}
                      </td>

                      <td>
                        {alert.responseTimeSeconds != null
                          ? `${alert.responseTimeSeconds}s`
                          : "—"}
                      </td>

                      <td>
                        <button
                          className="admin-small-button"
                          onClick={() =>
                            handleSelectAlert(
                              alert._id
                            )
                          }
                          type="button"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedAlert && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="admin-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">
                  ALERT DETAILS
                </span>

                <h2>
                  {selectedAlert.user?.name ||
                    "Unknown User"}
                </h2>
              </div>

              <button
                className="admin-modal-close"
                onClick={() =>
                  setSelectedAlert(null)
                }
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-status">
              <span
                className={`admin-status ${getStatusClass(
                  selectedAlert.status
                )}`}
              >
                {selectedAlert.status}
              </span>
            </div>

            <div className="admin-modal-grid">
              <div>
                <span>Alert ID</span>

                <strong>
                  {selectedAlert._id}
                </strong>
              </div>

              <div>
                <span>User</span>

                <strong>
                  {selectedAlert.user?.name ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Phone</span>

                <strong>
                  {selectedAlert.user?.phone ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Email</span>

                <strong>
                  {selectedAlert.user?.email ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Triggered</span>

                <strong>
                  {formatDateTime(
                    selectedAlert.triggeredAt
                  )}
                </strong>
              </div>

              <div>
                <span>Acknowledged</span>

                <strong>
                  {formatDateTime(
                    selectedAlert.acknowledgedAt
                  )}
                </strong>
              </div>

              <div>
                <span>Resolved</span>

                <strong>
                  {formatDateTime(
                    selectedAlert.resolvedAt
                  )}
                </strong>
              </div>

              <div>
                <span>Response Time</span>

                <strong>
                  {selectedAlert.responseTimeSeconds !=
                  null
                    ? `${selectedAlert.responseTimeSeconds} seconds`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="admin-modal-location">
              <div>
                <span>Current Location</span>

                <strong>
                  {formatCoordinates(
                    selectedAlert.currentLocation
                  )}
                </strong>

                <small>
                  Accuracy:{" "}
                  {selectedAlert.currentLocation
                    ?.accuracy != null
                    ? `${Math.round(
                        selectedAlert
                          .currentLocation
                          .accuracy
                      )} m`
                    : "Not available"}
                </small>
              </div>

              <a
                href={getMapUrl(
                  selectedAlert.currentLocation ||
                    selectedAlert.initialLocation
                )}
                target="_blank"
                rel="noreferrer"
                className="admin-primary-button"
              >
                Open in Google Maps
              </a>
            </div>

            <div className="admin-modal-footer">
              {selectedAlert.status ===
                "ACTIVE" && (
                <button
                  className="admin-action acknowledge"
                  disabled={
                    actionLoading ===
                    `${selectedAlert._id}-acknowledge`
                  }
                  onClick={() =>
                    handleAlertAction(
                      selectedAlert._id,
                      "acknowledge"
                    )
                  }
                  type="button"
                >
                  {actionLoading ===
                  `${selectedAlert._id}-acknowledge`
                    ? "Processing..."
                    : "Acknowledge"}
                </button>
              )}

              {selectedAlert.status ===
                "ACKNOWLEDGED" && (
                <button
                  className="admin-action respond"
                  disabled={
                    actionLoading ===
                    `${selectedAlert._id}-respond`
                  }
                  onClick={() =>
                    handleAlertAction(
                      selectedAlert._id,
                      "respond"
                    )
                  }
                  type="button"
                >
                  {actionLoading ===
                  `${selectedAlert._id}-respond`
                    ? "Processing..."
                    : "Respond"}
                </button>
              )}

              {[
                "ACTIVE",
                "ACKNOWLEDGED",
                "RESPONDING"
              ].includes(
                selectedAlert.status
              ) && (
                <button
                  className="admin-action resolve"
                  disabled={
                    actionLoading ===
                    `${selectedAlert._id}-resolve`
                  }
                  onClick={() =>
                    handleAlertAction(
                      selectedAlert._id,
                      "resolve"
                    )
                  }
                  type="button"
                >
                  {actionLoading ===
                  `${selectedAlert._id}-resolve`
                    ? "Processing..."
                    : "Resolve"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;