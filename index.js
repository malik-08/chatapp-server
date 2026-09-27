import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
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

    // notify everyone in the room (including the joiner) that someone joined
    io.to(cleanRoom).emit("system", { text: `${username} joined the chat` });
  });

  socket.on("leave", (roomId) => {
    const cleanRoom = roomId.trim().toLowerCase();
    io.to(cleanRoom).emit("system", { text: `${socket.data.username} left the chat` });
    socket.leave(cleanRoom);
  });

  socket.on("send", (message) => {
    const room = message.room.trim().toLowerCase();
    console.log({ ...message, room });
    io.to(room).emit("message", { ...message, room });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    if (socket.data.room) {
      io.to(socket.data.room).emit("system", {
        text: `${socket.data.username} left the chat`,
      });
    }
  });
});

server.listen(5050, () => {
  console.log(`Server is running on port 5050`);
});