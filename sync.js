// Example using WebSocket for sync
const socket = new WebSocket("wss://your-sync-server.com");

socket.onopen = () => {
  console.log("Connected to sync server");
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.command === "PLAY") {
    document.getElementById("status").innerText = "Playing...";
    // Here you'd trigger play on the iframe/player if possible
  }

  if (data.command === "PAUSE") {
    document.getElementById("status").innerText = "Paused";
    // Trigger pause
  }

  if (data.command === "SEEK") {
    document.getElementById("status").innerText = `Seeked to ${data.value}s`;
    // Trigger seek
  }
};

// Host sends commands
function sendCommand(command, value = null) {
  const payload = { command, value };
  socket.send(JSON.stringify(payload));
}