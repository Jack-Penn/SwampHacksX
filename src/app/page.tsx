"use client";

import { useEffect, useRef, useState } from "react";
import { peer, socket } from "../socket";
import { DataConnection } from "peerjs";

export default function Home() {
  const [isSocketConnected, setisSocketConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>("");

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Setup connection status
  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setisSocketConnected(true);
    }

    function onDisconnect() {
      setisSocketConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (userStream) {
      socket.emit("join-room", { roomId, peerId: peer.id });

      socket.on("room-peers", (peers) => {
        peers.forEach((otherPeer: string) => {
          const call = peer.call(otherPeer, userStream!);
          call.on("stream", (remoteStream) => {
            console.log(remoteStream);
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
            }
          });
        });

        peer.on("call", (call) => {
          call.answer(userStream);
          console.log(videoRef.current);
          call.on("stream", (remoteStream) => {
            console.log(remoteStream);
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
            }
          });
        });
      });
    }
  }, [userStream]);

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

  async function joinRoom(roomId: string) {
    if (roomId) {
      // Get user media (camera) based on selected device
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId },
        audio: true,
      });
      setUserStream(stream);
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }

      // // Set the user's video stream
      // if (userVideoRef.current) {
      //   userVideoRef.current.srcObject = stream;
      // }

      // // Send the video stream to others in the room
      // stream.getTracks().forEach((track) => {
      //   console.log({
      //     signal: track,
      //     to: roomId,
      //   });
      //   socket.emit("send-signal", {
      //     signal: track,
      //     to: roomId,
      //   });
      // });
      // // Setup the video tracks to receive video from other users
      // socket.on("receive-signal", async ({ signal, from }) => {
      //   console.log("signal", signal);

      //   const peerConnection = new RTCPeerConnection();
      //   setPeers((prevPeers) => ({ ...prevPeers, [from]: peerConnection }));

      //   peerConnection.ontrack = (event) => {
      //     if (peerVideosRef.current[from]) {
      //       peerVideosRef.current[from].srcObject = event.streams[0];
      //     }
      //   };

      //   // Add user stream tracks to the peer connection
      //   stream.getTracks().forEach((track) => {
      //     peerConnection.addTrack(track, stream);
      //   });

      //   // Create an offer for the other user
      //   const offer = await peerConnection.createOffer();
      //   await peerConnection.setLocalDescription(offer);

      //   // Send the offer back to the other user
      //   socket.emit("return-signal", { signal: offer, to: from });
      // });

      // socket.on("signal-accepted", async ({ signal, from }) => {
      //   const peerConnection = peers[from];
      //   if (peerConnection) {
      //     await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
      //   }
      // });
    }
  }

  return (
    <div>
      <div className=" flex">
        <h2>
          Room Id: <input className="text-black" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        </h2>
        <button onClick={() => joinRoom(roomId)} disabled={!isSocketConnected || !roomId}>
          Connect
        </button>
      </div>
      <h2>Socket Status: {isSocketConnected ? "Connected" : "Not Connected"}</h2>

      <div className="flex">
        <h2>Select Camera</h2>
        <select onChange={(e) => setSelectedDeviceId(e.target.value)} value={selectedDeviceId} className=" text-black">
          {videoDevices.map((device: MediaDeviceInfo) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>

      <h2>My Video</h2>
      <video ref={userVideoRef} autoPlay playsInline muted width={100} />
      <h2>Their Video</h2>
      <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md rounded-lg shadow-md" width={100} />
    </div>
  );
}
