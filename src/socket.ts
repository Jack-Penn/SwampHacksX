import Peer from "peerjs";
import { io } from "socket.io-client";

export const socket = io("http://127.0.1.2:5000");
export const peer = new Peer();

const os = require("os");
