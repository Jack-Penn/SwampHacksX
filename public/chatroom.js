const socket = io("/"); // Make sure to include socket.io client library
const peer = new Peer(); // Make sure to include Peer.js library

let speakLang;

let isSocketConnected = false;
let roomId = "";
let videoDevices = [];
let selectedDeviceId = "";
let userStream = null;

isSocketConnected = false;
const myVideo = document.getElementById("myVideo");
const peerVideo = document.getElementById("peerVideo");

// Setup connection status
socket.on("connect", () => {
  isSocketConnected = true;
  getRoom();
});

socket.on("disconnect", () => {
  isSocketConnected = false;
});

// Fetch video devices
async function fetchDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  videoDevices = devices.filter((device) => device.kind === "videoinput");
  videoDevices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Camera ${device.deviceId}`;
    cameraSelect.appendChild(option);
  });

  if (videoDevices.length > 0) {
    selectedDeviceId = videoDevices[0].deviceId; // Default to first camera
    cameraSelect.value = selectedDeviceId;
  }
}

function getRoom() {
  // Get the current URL's query string
  const queryString = window.location.search;

  // Create a URLSearchParams object
  const urlParams = new URLSearchParams(queryString);

  // Get the value of a specific parameter
  const speak = urlParams.get("speak");
  speakLang = speak;

  const learn = urlParams.get("learn");

  if (isSocketConnected) {
    socket.emit("find-room", { speak, learn });
  }
}

socket.on("matched-room", joinRoom);

// Join room
async function joinRoom(roomId) {
  console.log(roomId);
  // Get user media (camera) based on selected device
  userStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  myVideo.srcObject = userStream;

  recognition.callback = createTextBubble;
  recognition.start();

  // Emit room join signal
  socket.emit("join-room", { roomId, peerId: peer.id });

  socket.on("room-peers", (peers) => {
    console.log(peers);
    peers.forEach((otherPeerId) => {
      const call = peer.call(otherPeerId, userStream);
      call.on("stream", (remoteStream) => {
        peerVideo.srcObject = remoteStream;
      });
    });

    peer.on("call", (call) => {
      call.answer(userStream);
      call.on("stream", (remoteStream) => {
        peerVideo.srcObject = remoteStream;
      });
    });
  });
}

// Function to handle the dynamic text stream
function createTextBubble(text) {
  // Create or update the text bubble container
  const container = document.querySelector("#text-bubble-container");

  // Function to create a new text bubble
  const textBubble = document.createElement("div");
  textBubble.className = "text-bubble";
  textBubble.innerHTML = text
    .split(" ")
    .map((token) => `<span onclick="handleClick('${encodeURIComponent(token)}', '${encodeURIComponent(text)}')">${token} </span>`)
    .join("");
  container.appendChild(textBubble);
  return textBubble;
}

// Example handleClick function
async function handleClick(token, text) {
  const res = await fetch(`/api/translate?segment=${encodeURIComponent(token)}&phrase=${encodeURIComponent(text)}&lang=${encodeURIComponent(speakLang)}`);
  const { Translation, PhraseToken } = await res.json();

  const container = document.querySelector("#text-bubble-container2");

  // Function to create a new text bubble
  const textBubble = document.createElement("div");
  textBubble.className = "text-bubble";
  textBubble.innerHTML = PhraseToken ?? token + " = " + Translation;
  container.appendChild(textBubble);
  return textBubble;
}
