require("dotenv").config();
const http = require("http");
const app = require("./app");
const server = http.createServer(app);
// SOCKET
const { Server } = require("socket.io");
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
];

const io = require("socket.io")(server, {
  cors: { origin: "*" }
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("join_counselor_room", (counselor_id) => {
    socket.join(`counselor_${counselor_id}`);
  });
});

const sessionController = require("./controllers/sessionController");
sessionController.setSocket(io);

require("./sockets/chatSocket")(io);

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
