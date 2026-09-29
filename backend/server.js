const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const alertRoutes = require("./routes/alertRoutes");
const adminAlertRoutes = require("./routes/adminAlertRoutes");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.disable("x-powered-by");

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/admin/alerts", adminAlertRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Silent SOS Emergency API is running"
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "silent-sos-backend",
    status: "healthy",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Silent SOS backend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
