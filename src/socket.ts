"use client";
import Peer from "peerjs";
import { io } from "socket.io-client";

export const socket = io();

export const peer = new Peer();
