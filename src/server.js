require("dotenv").config({ path: "./.env" });
const http = require("http");
const express = require("express"); // ✅ ADD THIS
const app = require("./app");
const server = http.createServer(app);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);
app.use("/uploads", express.static("uploads"));
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true
  }
});
const sessionController = require("./controllers/sessionController");
sessionController.setSocket(io);

require("./sockets/chatSocket")(io);

server.listen(5000, () => {
  console.log("Server running");
});
console.log("CHAT_SECRET_KEY:", process.env.CHAT_SECRET_KEY);