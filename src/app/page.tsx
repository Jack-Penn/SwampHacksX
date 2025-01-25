"use client";

import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{ [key: string]: RTCPeerConnection }>({});
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});

  // Setup connection status
  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Fetch video devices
  useEffect(() => {
    async function fetchDevices() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      setVideoDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId); // Default to first camera
      }
    }

    fetchDevices();
  }, []);

  // Join room and start video streaming
  const joinRoom = async () => {
    if (roomId) {
      socket.emit("join-room", roomId);

      // Get user media (camera) based on selected device
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId },
        audio: true,
      });
      setUserStream(stream);

      // Set the user's video stream
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }

      // Send the video stream to others in the room
      stream.getTracks().forEach((track) => {
        console.log({
          signal: track,
          to: roomId,
        });
        socket.emit("send-signal", {
          signal: track,
          to: roomId,
        });
      });
      // Setup the video tracks to receive video from other users
      socket.on("receive-signal", async ({ signal, from }) => {
        console.log("signal", signal);

        const peerConnection = new RTCPeerConnection();
        setPeers((prevPeers) => ({ ...prevPeers, [from]: peerConnection }));

        peerConnection.ontrack = (event) => {
          if (peerVideosRef.current[from]) {
            peerVideosRef.current[from].srcObject = event.streams[0];
          }
        };

        // Add user stream tracks to the peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Create an offer for the other user
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send the offer back to the other user
        socket.emit("return-signal", { signal: offer, to: from });
      });

      socket.on("signal-accepted", async ({ signal, from }) => {
        const peerConnection = peers[from];
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        }
      });
    }
  };

  return (
    <div>
      <h1>Join Room and Stream Video</h1>
      <input type="text" placeholder="Enter Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <button onClick={joinRoom} disabled={!isConnected || !roomId}>
        Join Room
      </button>

      <h2>Select Camera</h2>
      <select onChange={(e) => setSelectedDeviceId(e.target.value)} value={selectedDeviceId}>
        {videoDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId}`}
          </option>
        ))}
      </select>

      <h2>Your Video</h2>
      <video ref={userVideoRef} autoPlay muted width="300" />

      <h2>Connected Peers: {Object.keys(peers).length}</h2>
      <h2>Peer Videos</h2>
      {Object.keys(peers).map((peerId) => (
        <div key={peerId}>
          <h3>Peer: {peerId}</h3>
          <video
            ref={(el) => {
              if (el) {
                peerVideosRef.current[peerId] = el;
              }
            }}
            autoPlay
            width="300"
          />
        </div>
      ))}
    </div>
  );
}
