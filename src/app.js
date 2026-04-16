require("dotenv").config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const requestLogger = require('./middleware/requestLogger');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const counselorRoutes = require('./routes/counselorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const chatRoutes = require('./routes/chatRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const collegeRoutes = require('./routes/collegeRoutes');

const app = express(); // âœ… FIRST create app
app.use(requestLogger);

// middlewares
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health check
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// static files
app.use("/uploads", express.static("uploads"));
app.use("/frontend", express.static(path.join(__dirname, "../frontend")));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/chat', chatRoutes);

// optional
app.use("/api/google", require("./routes/googleRoutes"));
app.use("/api/dev", require("./routes/devSeedRoutes"));

module.exports = app;
