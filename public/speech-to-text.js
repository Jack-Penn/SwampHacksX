let recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (recognition) {
  recognition = new recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "zh-CN";

  recognition.start();
  setTimeout(recognition.stop, 1000);

  recognition.onstart = () => {
    console.log("Recording started");
  };

  recognition.onresult = function (event) {
    let transcription = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcription += event.results[i][0].transcript + " ";
      } else {
        transcription += event.results[i][0].transcript;
      }
    }

    console.log("Real-time transcription:", transcription.trim());
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onend = function () {
    console.log("Speech recognition ended");
  };
} else {
  console.error("Speech recognition not supported");
}

function startRecording() {
  if (recognition) {
    recognition.start();
  }
}

function stopRecording() {
  if (recognition) {
    recognition.stop();
  }
}
