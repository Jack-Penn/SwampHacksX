import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

interface SignalData {
  signal: any;
  to: string;
  from?: string;
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-connected", socket.id);

    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
      socket.to(roomId).emit("user-disconnected", socket.id);
    });
  });

  socket.on("send-signal", ({ signal, to }: SignalData) => {
    io.to(to).emit("receive-signal", { signal, from: socket.id });
  });

  socket.on("return-signal", ({ signal, to }: SignalData) => {
    io.to(to).emit("signal-accepted", { signal, from: socket.id });
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
