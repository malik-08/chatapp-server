import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Live aur local dono ke liye allow kar diya hai
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // Multimedia (images/audio/video) ke liye buffer limit increase ki hai
});

app.get("/", (req, res) => {
  res.send("Chat server running");
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("join", ({ room, username }) => {
    const cleanRoom = room.trim().toLowerCase();
    socket.data.room = cleanRoom;
    socket.data.username = username;
    socket.join(cleanRoom);
    console.log(`${username} joined room ${cleanRoom}`);

    io.to(cleanRoom).emit("system", { text: `${username} joined the chat` });
  });

  socket.on("leave", (roomId) => {
    if (!roomId) return;
    const cleanRoom = roomId.trim().toLowerCase();
    if (socket.data.username) {
      io.to(cleanRoom).emit("system", { text: `${socket.data.username} left the chat` });
    }
    socket.leave(cleanRoom);
  });

  // Message send with multimedia & status support
  socket.on("send", (message) => {
    const room = message.room.trim().toLowerCase();
    const messageWithId = {
      ...message,
      id: message.id || Date.now() + Math.random(),
      room,
      status: "delivered", // Jaise hi server pe aaye, delivered mark ho jaye ga
    };
    console.log("New message:", messageWithId);
    io.to(room).emit("message", messageWithId);
  });

  // Message seen status update event
  socket.on("mark_seen", ({ room, messageId }) => {
    const cleanRoom = room.trim().toLowerCase();
    io.to(cleanRoom).emit("message_seen", { messageId });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    if (socket.data.room && socket.data.username) {
      io.to(socket.data.room).emit("system", {
        text: `${socket.data.username} left the chat`,
      });
    }
  });
});

const PORT = process.env.PORT || 5050;

// Yeh sirf local computer par chalega, Vercel par nahi
if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
export default server;