import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
      socket.to(roomId).emit("user-connected", socket.id);

      socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
        socket.to(roomId).emit("user-disconnected", socket.id);
      });
    });

    socket.on("send-signal", (test) => {
      const { signal, to } = test;
      console.log("test");
      console.log("signal", JSON.stringify(signal));
      socket.to(to).emit("receive-signal", { signal, from: socket.id });
    });

    socket.on("return-signal", ({ signal, to }) => {
      io.to(to).emit("signal-accepted", { signal, from: socket.id });
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
