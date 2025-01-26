import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const app = express();
const port = 3001;
const hostname = "localhost";

// Serve static files
app.use(express.static("public"));

// Basic route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Create HTTPS server
const httpsServer = createServer(
  {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  },
  app
);
const io = new Server(httpsServer);

let users = [];
let rooms = {};

// Handle socket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Matchmaking logic
  socket.on("find-room", ({ speak, learn }) => {
    const langId = `${speak}_${learn}`;
    const oppositeLangId = `${learn}_${speak}`;

    const matchIndex = users.findIndex((user) => user.langId === oppositeLangId);

    if (matchIndex !== -1) {
      // Found a match
      const matchedUser = users.splice(matchIndex, 1)[0];
      const roomId = uuidv4();

      console.log(`Matched users in room: ${roomId}`);

      matchedUser.socket.emit("matched-room", roomId);
      socket.emit("matched-room", roomId);

      rooms[roomId] = [];
    } else {
      // Add user to waiting list
      users.push({ socket, id: socket.id, langId });
      console.log("User added to waiting list:", socket.id);
    }
  });

  // Joining a room
  socket.on("join-room", ({ roomId, peerId }) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    rooms[roomId].push(peerId);

    socket.emit("room-peers", rooms[roomId]);
    socket.to(roomId).emit("user-connected", socket.id);

    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
      // Remove user from the room and notify others
      // if (rooms[roomId]) {
      //   rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
      //   socket.to(roomId).emit("room-peers", rooms[roomId]);
      // }
      // Remove user from waiting list
      users = users.filter((user) => user.id !== socket.id);
    });
  });

  // WebRTC signaling
  socket.on("send-signal", ({ signal, to }) => {
    console.log(`Sending signal from ${socket.id} to ${to}`);
    socket.to(to).emit("receive-signal", { signal, from: socket.id });
  });

  socket.on("return-signal", ({ signal, to }) => {
    console.log(`Returning signal from ${socket.id} to ${to}`);
    io.to(to).emit("signal-accepted", { signal, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} fully disconnected`);
    // Clean up waiting users
    users = users.filter((user) => user.id !== socket.id);
  });
});

// Start the server
httpsServer.listen(port, () => {
  console.log(`> Server running at https://${hostname}:${port}`);
});
