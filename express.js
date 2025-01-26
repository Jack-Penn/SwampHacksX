import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const port = 5000;
const hostname = "127.0.1.2";

// Serve static files if needed
app.use(express.static("public"));

// Set up a basic route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "https://localhost:3000", // Allow requests from your Next.js app
    methods: ["GET", "POST"], // Specify allowed methods
    credentials: true, // Include credentials if needed
  },
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", ({ roomId, peerId }) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-connected", socket.id);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    socket.emit("room-peers", rooms[roomId]);
    rooms[roomId].push(peerId);

    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
      rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
      socket.to(roomId).emit("room-peers", rooms[roomId]);
    });
  });

  socket.on("send-signal", ({ signal, to }) => {
    console.log("Sending signal:", JSON.stringify(signal));
    socket.to(to).emit("receive-signal", { signal, from: socket.id });
  });

  socket.on("return-signal", ({ signal, to }) => {
    io.to(to).emit("signal-accepted", { signal, from: socket.id });
  });
});

httpServer.listen(port, () => {
  console.log(`> Server running at http://${hostname}:${port}`);
});
