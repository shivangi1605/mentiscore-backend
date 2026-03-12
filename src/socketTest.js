const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected");

  socket.emit("joinChat", { chat_id: 3 });

  socket.emit("sendMessage", {
    chat_id: 3,
    sender_role: "student",
    sender_id: 3,
    message: "Hello from client"
  });

});
socket.on("userTyping", (data) => {
  console.log(`${data.sender_role} is typing...`);
});

socket.on("userStoppedTyping", () => {
  console.log("Typing stopped");
});


socket.on("receiveMessage", (data) => {
  console.log("Message received from server:", data);
});
