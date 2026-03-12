require("dotenv").config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const counselorRoutes = require('./routes/counselorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const chatRoutes = require('./routes/chatRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express(); // ✅ FIRST create app

// middlewares
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static files
app.use("/uploads", express.static("uploads"));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', availabilityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use("/api/google", require("./routes/googleRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));


module.exports = app;
