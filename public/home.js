const speakLangSelect = document.getElementById("speak-language");
const leanLangSelect = document.getElementById("learn-language");

function submit() {
  window.location.href = `/chatroom.html?speak=${speakLangSelect.value}&learn=${leanLangSelect.value}`;
}
