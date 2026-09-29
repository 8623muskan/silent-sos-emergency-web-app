/*
 * =========================================================
 * SILENT SOS NOTIFICATION SERVICE
 *
 * Phase 1:
 * - Supports email notifications when valid SMTP is configured.
 * - Never allows notification failure to break SOS activation.
 * - If SMTP is unavailable, notifications are safely skipped.
 * =========================================================
 */

let nodemailer = null;

try {
  nodemailer = require("nodemailer");
} catch (error) {
  console.warn(
    "Nodemailer is not installed. Email notifications will be skipped."
  );
}

/*
 * =========================================================
 * SMTP CONFIGURATION
 * =========================================================
 */

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !user || !pass) {
    return null;
  }

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    secure:
      String(process.env.SMTP_SECURE || "false").toLowerCase() ===
      "true",
    auth: {
      user,
      pass
    }
  };
}

/*
 * =========================================================
 * TRANSPORTER
 * =========================================================
 */

function createTransporter() {
  if (!nodemailer) {
    return null;
  }

  const config = getSmtpConfig();

  if (!config) {
    return null;
  }

  return nodemailer.createTransport({
    ...config,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

/*
 * =========================================================
 * MAP LINK
 * =========================================================
 */

function createGoogleMapsLink(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return "";
  }

  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/*
 * =========================================================
 * EMAIL HTML
 * =========================================================
 */

function buildEmergencyEmailHtml({
  userName,
  alertId,
  latitude,
  longitude,
  accuracy,
  triggeredAt,
  status
}) {
  const mapsLink = createGoogleMapsLink(
    latitude,
    longitude
  );

  const safeUserName =
    String(userName || "A Silent SOS user");

  const safeAlertId =
    String(alertId || "Unavailable");

  const safeAccuracy =
    typeof accuracy === "number"
      ? `${Math.round(accuracy)} meters`
      : "Unavailable";

  const safeStatus =
    String(status || "ACTIVE");

  const safeTriggeredAt =
    triggeredAt
      ? new Date(triggeredAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "medium"
        })
      : new Date().toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "medium"
        });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Silent SOS Emergency Alert</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#090b10;
    font-family:Arial,Helvetica,sans-serif;
    color:#e8eaf0;
  "
>
  <div
    style="
      max-width:620px;
      margin:30px auto;
      background:#11151d;
      border:1px solid #292e3a;
      border-radius:16px;
      overflow:hidden;
    "
  >

    <div
      style="
        padding:24px;
        background:#171b24;
        border-bottom:1px solid #292e3a;
      "
    >
      <div
        style="
          display:inline-block;
          padding:8px 12px;
          border:1px solid #ef233c;
          border-radius:8px;
          color:#ff6477;
          font-size:12px;
          font-weight:bold;
          letter-spacing:1px;
        "
      >
        SILENT SOS
      </div>

      <h1
        style="
          margin:18px 0 6px;
          color:#ffffff;
          font-size:26px;
        "
      >
        Emergency Alert
      </h1>

      <p
        style="
          margin:0;
          color:#aeb4c1;
          font-size:14px;
        "
      >
        A trusted contact has received a Silent SOS emergency alert.
      </p>
    </div>

    <div style="padding:24px;">

      <div
        style="
          padding:18px;
          background:#241117;
          border:1px solid #5d202b;
          border-radius:12px;
          margin-bottom:20px;
        "
      >
        <div
          style="
            color:#ff6477;
            font-size:12px;
            font-weight:bold;
            letter-spacing:1px;
            margin-bottom:8px;
          "
        >
          EMERGENCY STATUS
        </div>

        <div
          style="
            color:#ffffff;
            font-size:22px;
            font-weight:bold;
          "
        >
          ${safeStatus}
        </div>
      </div>

      <table
        width="100%"
        cellpadding="8"
        cellspacing="0"
        style="font-size:14px;"
      >

        <tr>
          <td style="color:#8f97a6;">Person</td>
          <td
            style="
              color:#ffffff;
              font-weight:bold;
              text-align:right;
            "
          >
            ${safeUserName}
          </td>
        </tr>

        <tr>
          <td style="color:#8f97a6;">Alert time</td>
          <td
            style="
              color:#ffffff;
              text-align:right;
            "
          >
            ${safeTriggeredAt}
          </td>
        </tr>

        <tr>
          <td style="color:#8f97a6;">Latitude</td>
          <td
            style="
              color:#ffffff;
              text-align:right;
            "
          >
            ${latitude}
          </td>
        </tr>

        <tr>
          <td style="color:#8f97a6;">Longitude</td>
          <td
            style="
              color:#ffffff;
              text-align:right;
            "
          >
            ${longitude}
          </td>
        </tr>

        <tr>
          <td style="color:#8f97a6;">GPS accuracy</td>
          <td
            style="
              color:#ffffff;
              text-align:right;
            "
          >
            ${safeAccuracy}
          </td>
        </tr>

        <tr>
          <td style="color:#8f97a6;">Alert ID</td>
          <td
            style="
              color:#ffffff;
              text-align:right;
              word-break:break-all;
            "
          >
            ${safeAlertId}
          </td>
        </tr>

      </table>

      ${
        mapsLink
          ? `
      <div
        style="
          margin-top:24px;
          text-align:center;
        "
      >
        <a
          href="${mapsLink}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-block;
            padding:13px 20px;
            background:#ef233c;
            color:#ffffff;
            text-decoration:none;
            border-radius:9px;
            font-weight:bold;
            font-size:14px;
          "
        >
          View Emergency Location
        </a>
      </div>
      `
          : ""
      }

      <p
        style="
          margin-top:26px;
          color:#8f97a6;
          font-size:12px;
          line-height:1.6;
        "
      >
        This message was generated by the Silent SOS Emergency
        System. Location information represents the GPS position
        available when the alert was created.
      </p>

    </div>

    <div
      style="
        padding:18px 24px;
        background:#0d1016;
        border-top:1px solid #292e3a;
        color:#717987;
        font-size:11px;
      "
    >
      Silent SOS Emergency System &bull; Phase 1 Web Application
    </div>

  </div>
</body>
</html>
`;
}

/*
 * =========================================================
 * SEND SINGLE EMAIL
 * =========================================================
 */

async function sendEmergencyEmail({
  to,
  userName,
  alertId,
  latitude,
  longitude,
  accuracy,
  triggeredAt,
  status
}) {
  const recipient = String(to || "").trim();

  if (!recipient) {
    return {
      success: false,
      skipped: true,
      message: "No recipient email address provided."
    };
  }

  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      skipped: true,
      message: "Email notification service is not configured."
    };
  }

  const from = String(
    process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      ""
  ).trim();

  if (!from) {
    return {
      success: false,
      skipped: true,
      message: "SMTP sender address is not configured."
    };
  }

  const subject =
    `SILENT SOS ALERT - ${userName || "Emergency Contact"}`;

  try {
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,

      text: [
        "SILENT SOS EMERGENCY ALERT",
        "",
        `Person: ${userName || "Unknown"}`,
        `Status: ${status || "ACTIVE"}`,
        `Alert ID: ${alertId || "Unavailable"}`,
        `Latitude: ${latitude}`,
        `Longitude: ${longitude}`,
        `GPS Accuracy: ${
          typeof accuracy === "number"
            ? `${Math.round(accuracy)} meters`
            : "Unavailable"
        }`,
        `Alert Time: ${
          triggeredAt
            ? new Date(triggeredAt).toLocaleString("en-IN")
            : new Date().toLocaleString("en-IN")
        }`,
        "",
        `Location: ${createGoogleMapsLink(
          latitude,
          longitude
        )}`
      ].join("\n"),

      html: buildEmergencyEmailHtml({
        userName,
        alertId,
        latitude,
        longitude,
        accuracy,
        triggeredAt,
        status
      })
    });

    console.log(
      `SOS EMAIL SENT: ${recipient} | messageId=${info.messageId}`
    );

    return {
      success: true,
      skipped: false,
      messageId: info.messageId,
      recipient
    };
  } catch (error) {
    console.error(
      `SOS EMAIL ERROR for ${recipient}:`,
      error.message
    );

    return {
      success: false,
      skipped: true,
      recipient,
      message: "Email provider unavailable."
    };
  }
}

/*
 * =========================================================
 * SEND TO TRUSTED CONTACTS
 * =========================================================
 */

async function sendEmergencyNotifications({
  contacts = [],
  userName,
  alertId,
  latitude,
  longitude,
  accuracy,
  triggeredAt,
  status
}) {
  const emailContacts = contacts.filter(
    (contact) =>
      contact &&
      contact.email &&
      String(contact.email).trim()
  );

  if (emailContacts.length === 0) {
    console.log(
      "SOS NOTIFICATION: No trusted contacts with email addresses."
    );

    return {
      success: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      results: []
    };
  }

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.log(
      `SOS NOTIFICATION: Email service skipped for ${emailContacts.length} contact(s). SMTP is not configured.`
    );

    return {
      success: true,
      attempted: emailContacts.length,
      sent: 0,
      failed: 0,
      skipped: true,
      results: emailContacts.map((contact) => ({
        contactId: contact._id,
        contactName: contact.name,
        recipient: String(contact.email).trim(),
        success: false,
        skipped: true,
        message: "Email notification service is not configured."
      }))
    };
  }

  const results = [];

  for (const contact of emailContacts) {
    const result = await sendEmergencyEmail({
      to: contact.email,
      userName,
      alertId,
      latitude,
      longitude,
      accuracy,
      triggeredAt,
      status
    });

    results.push({
      contactId: contact._id,
      contactName: contact.name,
      ...result
    });
  }

  const sent = results.filter(
    (result) => result.success
  ).length;

  const failed = results.filter(
    (result) =>
      !result.success &&
      !result.skipped
  ).length;

  const skipped = results.filter(
    (result) => result.skipped
  ).length;

  return {
    success: failed === 0,
    attempted: results.length,
    sent,
    failed,
    skipped: skipped > 0,
    results
  };
}

module.exports = {
  sendEmergencyEmail,
  sendEmergencyNotifications,
  createGoogleMapsLink
};