const socket = io("/"); // Make sure to include socket.io client library
const peer = new Peer(); // Make sure to include Peer.js library

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

  recognition.callback = updateTextBubbles;
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

function updateTextBubbles() {}

// Function to handle the dynamic text stream
function updateTextBubbles(streamText, timeout = 3000) {
  let lastUpdateTime = Date.now();
  let currentBubble = null;

  // Create or update the text bubble container
  const container =
    document.querySelector(".text-bubble-container") ||
    (() => {
      const newContainer = document.createElement("div");
      newContainer.className = "text-bubble-container";
      document.body.appendChild(newContainer);
      return newContainer;
    })();

  // Function to create a new text bubble
  const createNewBubble = () => {
    const textBubble = document.createElement("div");
    textBubble.className = "text-bubble";
    container.appendChild(textBubble);
    return textBubble;
  };

  // Update the current bubble or create a new one
  if (!currentBubble || Date.now() - lastUpdateTime > timeout) {
    currentBubble = createNewBubble();
  }

  // Clear and populate the current text bubble
  currentBubble.innerHTML = "";
  const words = streamText.split(" ");
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.textContent = word;
    span.setAttribute("onclick", `handleClick('${word}')`);

    currentBubble.appendChild(span);

    // Add a space between words, except after the last word
    if (index < words.length - 1) {
      currentBubble.appendChild(document.createTextNode(" "));
    }
  });

  lastUpdateTime = Date.now();
}

// Example handleClick function
function handleClick(word) {
  alert(`You clicked on: ${word}`);
}
