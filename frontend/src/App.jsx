import { useEffect, useRef, useState } from "react";
import "./App.css";
import Auth from "./Auth";

const API_URL = "http://localhost:5000/api";

const ACTIVE_ALERT_STATUSES = [
  "ACTIVE",
  "ACKNOWLEDGED",
  "RESPONDING"
];

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("silent_sos_token")
  );

  const [isAdmin, setIsAdmin] = useState(false);

  const [isSOSActive, setIsSOSActive] = useState(false);
  const [alertId, setAlertId] = useState(null);
  const [location, setLocation] = useState(null);
  const [alertStatus, setAlertStatus] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  const [statusMessage, setStatusMessage] = useState(
    "System ready. Your emergency system is standing by."
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    relationship: "",
    isPrimary: false
  });

  const watchIdRef = useRef(null);
  const holdTimerRef = useRef(null);
  const holdStartedAtRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  /*
   * =====================================================
   * LOCATION CLEANUP
   * =====================================================
   */

  const stopLocationTracking = () => {
    if (
      watchIdRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }
  };

  /*
   * =====================================================
   * INITIAL CLEANUP
   * =====================================================
   */

  useEffect(() => {
    return () => {
      stopLocationTracking();

      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, []);

  /*
   * =====================================================
   * LOAD CONTACTS
   * =====================================================
   */

  useEffect(() => {
    if (token) {
      loadContacts();
    } else {
      setContacts([]);
    }
  }, [token]);

  /*
   * =====================================================
   * ADMIN ACCESS
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return;
    }

    const checkAdminAccess = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          setIsAdmin(false);
          return;
        }

        if (!response.ok || !data.success) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(
          data.user?.role === "admin"
        );
      } catch (error) {
        console.error(
          "ADMIN ACCESS CHECK ERROR:",
          error
        );

        setIsAdmin(false);
      }
    };

    checkAdminAccess();
  }, [token]);

  /*
   * =====================================================
   * LOAD ACTIVE ALERT
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    loadActiveAlert();
  }, [token]);

  const loadActiveAlert = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/alerts/active`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        return;
      }

      const foundAlert =
        data.alert ||
        (Array.isArray(data.alerts)
          ? data.alerts[0]
          : null);

      if (!foundAlert) {
        setIsSOSActive(false);
        setAlertId(null);
        setAlertStatus(null);
        setActiveAlert(null);
        return;
      }

      setActiveAlert(foundAlert);

      setAlertId(foundAlert._id);

      const currentStatus =
        foundAlert.status || "ACTIVE";

      setAlertStatus(currentStatus);

      setIsSOSActive(
        ACTIVE_ALERT_STATUSES.includes(
          currentStatus
        )
      );

      if (foundAlert.currentLocation) {
        setLocation(foundAlert.currentLocation);
      }

      if (
        ACTIVE_ALERT_STATUSES.includes(
          currentStatus
        )
      ) {
        if (currentStatus === "ACKNOWLEDGED") {
          setStatusMessage(
            "Your emergency alert has been acknowledged. Live location tracking is active."
          );
        } else if (
          currentStatus === "RESPONDING"
        ) {
          setStatusMessage(
            "A response is in progress. Live location tracking is active."
          );
        } else {
          setStatusMessage(
            "SOS alert is active. Your location is being tracked."
          );
        }

        startLocationTracking(foundAlert._id);
      }
    } catch (error) {
      console.error(
        "LOAD ACTIVE ALERT ERROR:",
        error
      );
    }
  };

  /*
   * =====================================================
   * CONTACTS
   * =====================================================
   */

  const loadContacts = async () => {
    if (!token) {
      return;
    }

    setContactsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/contacts`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load contacts."
        );
      }

      setContacts(data.contacts || []);
    } catch (error) {
      console.error(
        "LOAD CONTACTS ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load trusted contacts."
      );
    } finally {
      setContactsLoading(false);
    }
  };

  const openAddContact = () => {
    setEditingContact(null);

    setContactForm({
      name: "",
      phone: "",
      email: "",
      relationship: "",
      isPrimary: contacts.length === 0
    });

    setShowContactModal(true);
    setErrorMessage("");
  };

  const openEditContact = (contact) => {
    setEditingContact(contact);

    setContactForm({
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      relationship: contact.relationship || "",
      isPrimary: Boolean(contact.isPrimary)
    });

    setShowContactModal(true);
    setErrorMessage("");
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setEditingContact(null);

    setContactForm({
      name: "",
      phone: "",
      email: "",
      relationship: "",
      isPrimary: false
    });
  };

  const handleContactChange = (event) => {
    const {
      name,
      value,
      type,
      checked
    } = event.target;

    setContactForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value
    }));
  };

  const saveContact = async (event) => {
    event.preventDefault();

    if (!token) {
      setErrorMessage(
        "You are not logged in. Please login first."
      );

      return;
    }

    if (!contactForm.name.trim()) {
      setErrorMessage(
        "Contact name is required."
      );

      return;
    }

    if (!contactForm.phone.trim()) {
      setErrorMessage(
        "Contact phone is required."
      );

      return;
    }

    setContactsLoading(true);
    setErrorMessage("");

    try {
      const isEditing = Boolean(
        editingContact
      );

      const url = isEditing
        ? `${API_URL}/contacts/${editingContact._id}`
        : `${API_URL}/contacts`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },

        body: JSON.stringify({
          name: contactForm.name.trim(),
          phone: contactForm.phone.trim(),
          email: contactForm.email.trim(),
          relationship:
            contactForm.relationship.trim(),
          isPrimary: contactForm.isPrimary
        })
      });

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to save trusted contact."
        );
      }

      await loadContacts();

      closeContactModal();

      setStatusMessage(
        isEditing
          ? "Trusted contact updated successfully."
          : "Trusted contact added successfully."
      );
    } catch (error) {
      console.error(
        "SAVE CONTACT ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save trusted contact."
      );
    } finally {
      setContactsLoading(false);
    }
  };

  const deleteContact = async (contactId) => {
    const shouldDelete =
      window.confirm(
        "Are you sure you want to remove this trusted contact?"
      );

    if (!shouldDelete) {
      return;
    }

    if (!token) {
      setErrorMessage(
        "You are not logged in."
      );

      return;
    }

    setContactsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/contacts/${contactId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to delete contact."
        );
      }

      await loadContacts();

      setStatusMessage(
        "Trusted contact removed."
      );
    } catch (error) {
      console.error(
        "DELETE CONTACT ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to delete trusted contact."
      );
    } finally {
      setContactsLoading(false);
    }
  };

  /*
   * =====================================================
   * ALERT STATUS POLLING
   * =====================================================
   */

  useEffect(() => {
    if (
      !token ||
      !alertId ||
      !isSOSActive
    ) {
      return undefined;
    }

    const intervalId =
      window.setInterval(async () => {
        try {
          const response = await fetch(
            `${API_URL}/alerts/${alertId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const data = await response.json();

          if (response.status === 401) {
            handleLogout();
            return;
          }

          if (
            !response.ok ||
            !data.success ||
            !data.alert
          ) {
            return;
          }

          const currentAlert = data.alert;
          const currentStatus =
            currentAlert.status;

          setActiveAlert(currentAlert);
          setAlertStatus(currentStatus);

          if (currentAlert.currentLocation) {
            setLocation(
              currentAlert.currentLocation
            );
          }

          if (
            ["RESOLVED", "CANCELLED"].includes(
              currentStatus
            )
          ) {
            stopLocationTracking();

            setIsSOSActive(false);
            setAlertId(null);
            setActiveAlert(currentAlert);

            setStatusMessage(
              currentStatus === "RESOLVED"
                ? "Emergency alert resolved successfully."
                : "Emergency alert cancelled."
            );
          } else if (
            currentStatus === "ACKNOWLEDGED"
          ) {
            setStatusMessage(
              "Your emergency alert has been acknowledged. Live location tracking is active."
            );
          } else if (
            currentStatus === "RESPONDING"
          ) {
            setStatusMessage(
              "A response is in progress. Live location tracking is active."
            );
          } else {
            setStatusMessage(
              "SOS alert is active. Your location is being tracked."
            );
          }
        } catch (error) {
          console.error(
            "ALERT STATUS POLLING ERROR:",
            error
          );
        }
      }, 5000);

    return () =>
      window.clearInterval(intervalId);
  }, [token, alertId, isSOSActive]);

  /*
   * =====================================================
   * GPS
   * =====================================================
   */

  const getCurrentPosition = () => {
    return new Promise(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(
            new Error(
              "Geolocation is not supported by this browser."
            )
          );

          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      }
    );
  };

  const startLocationTracking = (
    createdAlertId
  ) => {
    if (!navigator.geolocation) {
      setErrorMessage(
        "Your browser does not support GPS location."
      );

      return;
    }

    stopLocationTracking();

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        async (position) => {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const accuracy =
            position.coords.accuracy;

          setLocation({
            latitude,
            longitude,
            accuracy
          });

          try {
            const response =
              await fetch(
                `${API_URL}/alerts/${createdAlertId}/location`,
                {
                  method: "PATCH",

                  headers: {
                    "Content-Type":
                      "application/json",

                    Authorization: `Bearer ${token}`
                  },

                  body: JSON.stringify({
                    latitude,
                    longitude,
                    accuracy
                  })
                }
              );

            if (response.status === 401) {
              handleLogout();
            }
          } catch (error) {
            console.error(
              "LOCATION UPDATE ERROR:",
              error
            );
          }
        },

        (error) => {
          console.error(
            "GPS TRACKING ERROR:",
            error
          );

          setErrorMessage(
            "Live location tracking was interrupted."
          );
        },

        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000
        }
      );
  };

  /*
   * =====================================================
   * EMERGENCY LOCATION
   * =====================================================
   */

  const getEmergencyCoordinates = () => {
    const emergencyLocation =
      activeAlert?.currentLocation ||
      location;

    if (
      !emergencyLocation ||
      typeof emergencyLocation.latitude !==
        "number" ||
      typeof emergencyLocation.longitude !==
        "number"
    ) {
      return null;
    }

    return {
      latitude: emergencyLocation.latitude,
      longitude: emergencyLocation.longitude
    };
  };

  const openEmergencyLocation = () => {
    const coordinates =
      getEmergencyCoordinates();

    if (!coordinates) {
      setErrorMessage(
        "Emergency location is not available yet."
      );

      return;
    }

    const mapsUrl =
      `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;

    window.open(
      mapsUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /*
   * =====================================================
   * SOS
   * =====================================================
   */

  const triggerSOS = async () => {
    if (isSOSActive) {
      await cancelSOS();
      return;
    }

    setErrorMessage("");

    if (!token) {
      setErrorMessage(
        "You are not logged in. Please login before sending an SOS."
      );

      return;
    }

    setStatusMessage(
      "Getting your current location..."
    );

    setIsLoading(true);

    try {
      const position =
        await getCurrentPosition();

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      const accuracy =
        position.coords.accuracy;

      const currentLocation = {
        latitude,
        longitude,
        accuracy
      };

      setLocation(currentLocation);

      setStatusMessage(
        "Sending emergency alert..."
      );

      const response = await fetch(
        `${API_URL}/alerts/sos`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify({
            latitude,
            longitude,
            accuracy
          })
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to create SOS alert."
        );
      }

      const createdAlert = data.alert;

      const normalizedAlert = {
        ...createdAlert,
        currentLocation:
          createdAlert.currentLocation ||
          currentLocation
      };

      setActiveAlert(normalizedAlert);

      setAlertId(createdAlert._id);

      setAlertStatus(
        createdAlert.status || "ACTIVE"
      );

      setIsSOSActive(true);

      setStatusMessage(
        "SOS alert is active. Your location is being tracked."
      );

      startLocationTracking(
        createdAlert._id
      );

      console.log(
        "SOS ALERT CREATED:",
        createdAlert
      );
    } catch (error) {
      console.error(
        "SOS ERROR:",
        error
      );

      if (error.code === 1) {
        setErrorMessage(
          "Location permission was denied. Please allow location access and try again."
        );
      } else if (error.code === 2) {
        setErrorMessage(
          "Your current location could not be determined."
        );
      } else if (error.code === 3) {
        setErrorMessage(
          "Getting your location timed out. Please try again."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Unable to send SOS alert."
        );
      }

      setStatusMessage(
        "SOS was not activated."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSOS = async () => {
    if (!alertId || !token) {
      stopLocationTracking();

      setIsSOSActive(false);
      setAlertId(null);
      setAlertStatus("CANCELLED");

      setActiveAlert((previous) =>
        previous
          ? {
              ...previous,
              status: "CANCELLED"
            }
          : previous
      );

      setStatusMessage(
        "SOS cancelled."
      );

      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/alerts/${alertId}/cancel`,
        {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to cancel SOS."
        );
      }

      stopLocationTracking();

      setIsSOSActive(false);
      setAlertId(null);
      setAlertStatus("CANCELLED");

      setActiveAlert((previous) => ({
        ...(previous || {}),
        ...(data.alert || {}),
        status: "CANCELLED"
      }));

      setStatusMessage(
        "SOS alert cancelled successfully."
      );
    } catch (error) {
      console.error(
        "CANCEL SOS ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to cancel SOS alert."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resolveSOS = async () => {
    if (!alertId || !token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/alerts/${alertId}/resolve`,
        {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to resolve SOS alert."
        );
      }

      stopLocationTracking();

      setIsSOSActive(false);
      setAlertId(null);
      setAlertStatus("RESOLVED");

      setActiveAlert((previous) => ({
        ...(previous || {}),
        ...(data.alert || {}),
        status: "RESOLVED"
      }));

      setStatusMessage(
        "Emergency alert resolved successfully."
      );
    } catch (error) {
      console.error(
        "RESOLVE SOS ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to resolve SOS alert."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * =====================================================
   * SILENT SOS POINTER / LONG PRESS
   * =====================================================
   */

  const clearSOSHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(
        holdTimerRef.current
      );

      holdTimerRef.current = null;
    }

    holdStartedAtRef.current = null;
  };

  const handleSOSPointerDown = (event) => {
    if (isLoading) {
      return;
    }

    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    longPressTriggeredRef.current = false;

    holdStartedAtRef.current =
      Date.now();

    holdTimerRef.current =
      window.setTimeout(
        async () => {
          longPressTriggeredRef.current =
            true;

          holdTimerRef.current = null;

          await triggerSOS();
        },
        1500
      );
  };

  const handleSOSPointerUp = () => {
    clearSOSHoldTimer();
  };

  const handleSOSPointerCancel = () => {
    clearSOSHoldTimer();
  };

  const handleSOSClick = async () => {
    if (
      longPressTriggeredRef.current
    ) {
      longPressTriggeredRef.current =
        false;

      return;
    }

    await triggerSOS();
  };

  /*
   * =====================================================
   * AUTHENTICATION
   * =====================================================
   */

  const handleLogin = (newToken) => {
    localStorage.setItem(
      "silent_sos_token",
      newToken
    );

    setToken(newToken);

    setErrorMessage("");

    setStatusMessage(
      "Login successful. Your emergency system is ready."
    );
  };

  const handleLogout = () => {
    stopLocationTracking();

    localStorage.removeItem(
      "silent_sos_token"
    );

    localStorage.removeItem(
      "silent_sos_user"
    );

    setToken(null);
    setIsAdmin(false);

    setIsSOSActive(false);
    setAlertId(null);
    setAlertStatus(null);
    setActiveAlert(null);
    setLocation(null);
    setContacts([]);
    setErrorMessage("");

    setStatusMessage(
      "System ready. Your emergency system is standing by."
    );
  };

  /*
   * =====================================================
   * LOGIN
   * =====================================================
   */

  if (!token) {
    return (
      <Auth
        onLogin={handleLogin}
      />
    );
  }

  /*
   * =====================================================
   * EMERGENCY ALERT DISPLAY DATA
   * =====================================================
   */

  const displayAlert =
    activeAlert ||
    (alertId
      ? {
          _id: alertId,
          status: alertStatus || "ACTIVE",
          currentLocation:
            location
        }
      : null);

  const displayLocation =
    displayAlert?.currentLocation ||
    location;

  const displayLatitude =
    typeof displayLocation?.latitude ===
    "number"
      ? displayLocation.latitude
      : null;

  const displayLongitude =
    typeof displayLocation?.longitude ===
    "number"
      ? displayLocation.longitude
      : null;

  const displayAccuracy =
    typeof displayLocation?.accuracy ===
    "number"
      ? displayLocation.accuracy
      : null;

  const displayAlertStatus =
    displayAlert?.status ||
    alertStatus ||
    "READY";

  const displayAlertTime =
    displayAlert?.createdAt ||
    displayAlert?.created_at ||
    displayAlert?.alertTime ||
    displayAlert?.timestamp ||
    null;

  const formattedAlertTime =
    displayAlertTime
      ? new Date(
          displayAlertTime
        ).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "medium"
        })
      : "Not available";

  /*
   * =====================================================
   * DASHBOARD
   * =====================================================
   */

  return (
    <div className="app">

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">
            SOS
          </div>

          <div>
            <h1>
              Silent SOS
            </h1>

            <p>
              Emergency Safety System
            </p>
          </div>

        </div>

        <div className="header-actions">

          <div className="system-status">

            <span className="status-dot"></span>

            <span>
              System Ready
            </span>

          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin";
              }}
              style={{
                padding: "10px 14px",
                border: "1px solid rgba(220, 38, 38, 0.35)",
                borderRadius: "8px",
                background: "rgba(220, 38, 38, 0.10)",
                color: "#fca5a5",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Admin Portal
            </button>
          )}

          <button
            className="logout-button"
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>

        </div>

      </header>

      {/* =================================================
          MAIN
          ================================================= */}

      <main className="dashboard">

        {/* =================================================
            HERO
            ================================================= */}

        <section className="hero-section">

          <div className="hero-text">

            <span className="eyebrow">
              SILENT EMERGENCY RESPONSE
            </span>

            <h2>
              Stay safe.
              <br />
              <span>
                Stay silent.
              </span>
            </h2>

            <p>
              Activate a silent emergency alert
              and share your live location with
              your trusted contacts.
            </p>

          </div>

          <div className="sos-area">

            <button
              className={`sos-button ${
                isSOSActive
                  ? "active"
                  : ""
              }`}
              onClick={handleSOSClick}
              onPointerDown={
                handleSOSPointerDown
              }
              onPointerUp={
                handleSOSPointerUp
              }
              onPointerCancel={
                handleSOSPointerCancel
              }
              onPointerLeave={
                handleSOSPointerCancel
              }
              onContextMenu={(event) =>
                event.preventDefault()
              }
              disabled={isLoading}
              aria-label={
                isSOSActive
                  ? "Cancel SOS"
                  : "Send SOS"
              }
            >

              <div className="sos-inner">

                {isLoading
                  ? "..."
                  : isSOSActive
                  ? "ACTIVE"
                  : "SOS"}

              </div>

            </button>

            <p className="sos-hint">

              {isSOSActive
                ? "Tap to cancel emergency alert"
                : "Tap or hold for 1.5 seconds to send a silent SOS"}

            </p>

          </div>

        </section>

        {/* =================================================
            ERROR
            ================================================= */}

        {errorMessage && (
          <div className="error-banner">

            <strong>
              Warning:
            </strong>

            <span>
              {errorMessage}
            </span>

          </div>
        )}

        {/* =================================================
            ALERT STATUS
            ================================================= */}

        <div
          className={`alert-banner ${
            isSOSActive
              ? "alert-active"
              : ""
          }`}
        >

          <div className="alert-icon">
            {isSOSActive
              ? "!"
              : "✓"}
          </div>

          <div>

            <strong>
              {isSOSActive
                ? `Emergency alert ${
                    alertStatus ===
                    "ACKNOWLEDGED"
                      ? "acknowledged"
                      : alertStatus ===
                        "RESPONDING"
                      ? "responding"
                      : "active"
                  }`
                : alertStatus ===
                  "RESOLVED"
                ? "Emergency alert resolved"
                : alertStatus ===
                  "CANCELLED"
                ? "Emergency alert cancelled"
                : "System standing by"}
            </strong>

            <span>
              {statusMessage}
            </span>

            {isSOSActive &&
              alertId && (
                <button
                  type="button"
                  className="resolve-alert-button"
                  onClick={resolveSOS}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Working..."
                    : "Resolve alert"}
                </button>
              )}

          </div>

        </div>

        {/* =================================================
            EMERGENCY ALERT DETAILS
            ================================================= */}

        {displayAlert && (
          <section className="emergency-alert-card">

            <div className="emergency-alert-header">

              <div>
                <span className="card-label">
                  EMERGENCY ALERT DETAILS
                </span>

                <h3>
                  Live Emergency Location
                </h3>
              </div>

              <div
                className={`emergency-status-badge ${
                  ACTIVE_ALERT_STATUSES.includes(
                    displayAlertStatus
                  )
                    ? "active"
                    : ""
                }`}
              >
                <span className="emergency-status-dot"></span>

                {displayAlertStatus}
              </div>

            </div>

            <div className="emergency-alert-grid">

              <div className="emergency-detail-item">

                <span>
                  Alert ID
                </span>

                <strong>
                  {displayAlert._id ||
                    "Not available"}
                </strong>

              </div>

              <div className="emergency-detail-item">

                <span>
                  Alert Time
                </span>

                <strong>
                  {formattedAlertTime}
                </strong>

              </div>

              <div className="emergency-detail-item">

                <span>
                  Latitude
                </span>

                <strong>
                  {displayLatitude !== null
                    ? displayLatitude.toFixed(6)
                    : "--"}
                </strong>

              </div>

              <div className="emergency-detail-item">

                <span>
                  Longitude
                </span>

                <strong>
                  {displayLongitude !== null
                    ? displayLongitude.toFixed(6)
                    : "--"}
                </strong>

              </div>

              <div className="emergency-detail-item">

                <span>
                  GPS Accuracy
                </span>

                <strong>
                  {displayAccuracy !== null
                    ? `${Math.round(
                        displayAccuracy
                      )} m`
                    : "--"}
                </strong>

              </div>

              <div className="emergency-detail-item">

                <span>
                  Alert Status
                </span>

                <strong
                  className={
                    ACTIVE_ALERT_STATUSES.includes(
                      displayAlertStatus
                    )
                      ? "emergency-active-value"
                      : ""
                  }
                >
                  {displayAlertStatus}
                </strong>

              </div>

            </div>

            <div className="emergency-alert-actions">

              <button
                type="button"
                className="emergency-location-button"
                onClick={
                  openEmergencyLocation
                }
                disabled={
                  displayLatitude === null ||
                  displayLongitude === null
                }
              >
                <span>
                  ◎
                </span>

                View Emergency Location
              </button>

              {isSOSActive && (
                <div className="live-gps-indicator">

                  <span className="live-gps-dot"></span>

                  <span>
                    Live GPS tracking active
                  </span>

                </div>
              )}

            </div>

          </section>
        )}

        {/* =================================================
            INFORMATION CARDS
            ================================================= */}

        <section className="cards-grid">

          {/* LOCATION */}

          <div className="card location-card">

            <div className="card-header">

              <div>

                <span className="card-label">
                  LIVE LOCATION
                </span>

                <h3>
                  {isSOSActive
                    ? "Location Tracking Active"
                    : "Location Ready"}
                </h3>

              </div>

              <div className="card-icon">
                ◎
              </div>

            </div>

            <div className="location-details">

              <div className="location-row">

                <span>
                  Latitude
                </span>

                <strong>
                  {location
                    ? location.latitude.toFixed(
                        6
                      )
                    : "--"}
                </strong>

              </div>

              <div className="location-row">

                <span>
                  Longitude
                </span>

                <strong>
                  {location
                    ? location.longitude.toFixed(
                        6
                      )
                    : "--"}
                </strong>

              </div>

              <div className="location-row">

                <span>
                  Accuracy
                </span>

                <strong>
                  {location
                    ? `${Math.round(
                        location.accuracy
                      )} m`
                    : "--"}
                </strong>

              </div>

              <div className="location-row">

                <span>
                  Alert status
                </span>

                <strong>
                  {alertStatus || "READY"}
                </strong>

              </div>

            </div>

            <button
              type="button"
              className="emergency-location-button"
              onClick={
                openEmergencyLocation
              }
              disabled={
                !location
              }
            >
              <span>
                ◎
              </span>

              View Emergency Location
            </button>

          </div>

          {/* CONTACTS */}

          <div className="card contacts-card">

            <div className="card-header">

              <div>

                <span className="card-label">
                  TRUSTED CONTACTS
                </span>

                <h3>
                  Emergency Network
                </h3>

              </div>

              <div className="card-icon">
                ♙
              </div>

            </div>

            {contactsLoading &&
            contacts.length === 0 ? (

              <div className="contacts-loading">
                Loading contacts...
              </div>

            ) : contacts.length === 0 ? (

              <div className="contact-placeholder">

                <div className="contact-avatar">
                  +
                </div>

                <div>

                  <strong>
                    No trusted contacts
                  </strong>

                  <span>
                    Add someone who should
                    receive your emergency
                    alert.
                  </span>

                </div>

              </div>

            ) : (

              <div className="contacts-list">

                {contacts
                  .slice(0, 3)
                  .map((contact) => (

                    <div
                      className="contact-item"
                      key={contact._id}
                    >

                      <div className="contact-avatar">

                        {contact.name
                          .charAt(0)
                          .toUpperCase()}

                      </div>

                      <div className="contact-info">

                        <div className="contact-name">

                          <strong>
                            {contact.name}
                          </strong>

                          {contact.isPrimary && (
                            <span className="primary-badge">
                              PRIMARY
                            </span>
                          )}

                        </div>

                        <span>
                          {contact.relationship ||
                            contact.phone}
                        </span>

                      </div>

                      <div className="contact-actions">

                        <button
                          className="contact-edit-button"
                          onClick={() =>
                            openEditContact(
                              contact
                            )
                          }
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          className="contact-delete-button"
                          onClick={() =>
                            deleteContact(
                              contact._id
                            )
                          }
                          type="button"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  ))}

              </div>

            )}

            <button
              className="add-contact-button"
              onClick={openAddContact}
              type="button"
            >

              <span>
                +
              </span>

              {contacts.length > 0
                ? "Manage trusted contacts"
                : "Add trusted contact"}

            </button>

          </div>

          {/* SAFETY STATUS */}

          <div className="card safety-card">

            <div className="card-header">

              <div>

                <span className="card-label">
                  SAFETY STATUS
                </span>

                <h3>
                  {isSOSActive
                    ? "Emergency Active"
                    : "Protected"}
                </h3>

              </div>

              <div className="shield-icon">

                {isSOSActive
                  ? "!"
                  : "✓"}

              </div>

            </div>

            <div className="safety-status">

              <span
                className={
                  isSOSActive
                    ? "status-dot active-dot"
                    : "status-dot"
                }
              ></span>

              <span>

                {isSOSActive
                  ? "SOS monitoring active"
                  : "Emergency system ready"}

              </span>

            </div>

            <div className="safety-stat">

              <span>
                Trusted contacts
              </span>

              <strong>
                {contacts.length}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            SAFETY SETUP
            ================================================= */}

        <section className="setup-section">

          <div className="section-heading">

            <span className="card-label">
              SAFETY SETUP
            </span>

            <h3>
              Prepare before an emergency
            </h3>

          </div>

          <div className="setup-grid">

            <div className="setup-item">

              <span className="setup-number">
                01
              </span>

              <div>

                <strong>
                  Allow location access
                </strong>

                <p>
                  GPS is required to share
                  your emergency location.
                </p>

              </div>

            </div>

            <div className="setup-item">

              <span className="setup-number">
                02
              </span>

              <div>

                <strong>
                  Add trusted contacts
                </strong>

                <p>
                  Choose people who should
                  receive your SOS.
                </p>

              </div>

            </div>

            <div className="setup-item">

              <span className="setup-number">
                03
              </span>

              <div>

                <strong>
                  Test your emergency flow
                </strong>

                <p>
                  Use the SOS button with one
                  tap or hold it for 1.5 seconds.
                </p>

              </div>

            </div>

          </div>

        </section>

      </main>

      <footer>

        <span>
          Silent SOS Emergency System
        </span>

        <span>
          Phase 1 • Web Application
        </span>

      </footer>

      {/* =================================================
          CONTACT MODAL
          ================================================= */}

      {showContactModal && (

        <div
          className="modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeContactModal();
            }

          }}
        >

          <div className="contact-modal">

            <div className="modal-header">

              <div>

                <span className="card-label">
                  EMERGENCY NETWORK
                </span>

                <h2>
                  {editingContact
                    ? "Edit contact"
                    : "Add trusted contact"}
                </h2>

              </div>

              <button
                className="modal-close"
                onClick={closeContactModal}
                type="button"
              >
                ×
              </button>

            </div>

            <form
              className="contact-form"
              onSubmit={saveContact}
            >

              <label>

                <span>
                  Full name
                </span>

                <input
                  type="text"
                  name="name"
                  value={contactForm.name}
                  onChange={
                    handleContactChange
                  }
                  placeholder="e.g. Rahul Sharma"
                  maxLength={80}
                  required
                />

              </label>

              <label>

                <span>
                  Phone number
                </span>

                <input
                  type="tel"
                  name="phone"
                  value={contactForm.phone}
                  onChange={
                    handleContactChange
                  }
                  placeholder="e.g. 9876543210"
                  maxLength={20}
                  required
                />

              </label>

              <label>

                <span>
                  Email
                </span>

                <input
                  type="email"
                  name="email"
                  value={contactForm.email}
                  onChange={
                    handleContactChange
                  }
                  placeholder="contact@example.com"
                />

              </label>

              <label>

                <span>
                  Relationship
                </span>

                <input
                  type="text"
                  name="relationship"
                  value={
                    contactForm.relationship
                  }
                  onChange={
                    handleContactChange
                  }
                  placeholder="e.g. Mother, Father, Friend"
                  maxLength={40}
                />

              </label>

              <label className="primary-checkbox">

                <input
                  type="checkbox"
                  name="isPrimary"
                  checked={
                    contactForm.isPrimary
                  }
                  onChange={
                    handleContactChange
                  }
                />

                <span>
                  Make this my primary
                  emergency contact
                </span>

              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeContactModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-contact-button"
                  disabled={contactsLoading}
                >
                  {contactsLoading
                    ? "Saving..."
                    : editingContact
                    ? "Update contact"
                    : "Save contact"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;