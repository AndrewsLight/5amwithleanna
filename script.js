// PASSWORD LOGIC
const correctPW = "i miss you";

document.getElementById("pwBtn").onclick = () => {
    const val = document.getElementById("pwInput").value.trim();
    if (val === correctPW) {
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("appContainer").classList.remove("hidden");
    } else {
        document.getElementById("pwError").innerText = "wrong password baba 😭";
    }
};

// SIDEBAR
document.getElementById("toggleSidebar").onclick = () => {
    document.getElementById("sidebar").classList.toggle("closed");
};

// TAB SWITCHING
document.querySelectorAll(".sideBtn").forEach(btn => {
    btn.onclick = () => {
        let tab = btn.dataset.tab;
        document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
        document.getElementById(tab + "Tab").classList.remove("hidden");
    }
});

// CHAT (LOCAL)
document.getElementById("sendChat").onclick = () => {
    const msg = document.getElementById("chatInput").value;
    if (msg.trim() === "") return;

    const div = document.createElement("div");
    div.innerText = "You: " + msg;
    document.getElementById("chatBox").appendChild(div);

    document.getElementById("chatInput").value = "";

    // Fake girlfriend reply
    setTimeout(() => {
        const reply = document.createElement("div");
        reply.innerText = "baba: " + cuteReply();
        document.getElementById("chatBox").appendChild(reply);
    }, 1000);
};

// Cute Reply Generator
function cuteReply() {
    const arr = [
        "hehe i love you 😭💜",
        "come here baba",
        "ur the cutest ever",
        "muahh",
        "i miss u"
    ];
    return arr[Math.floor(Math.random() * arr.length)];
}

// LETTERS
document.getElementById("saveLetter").onclick = () => {
    localStorage.setItem("letter", document.getElementById("letterBox").value);
    alert("saved for her 💜");
};

document.getElementById("letterBox").value = localStorage.getItem("letter") || "";

// GALLERY
document.getElementById("photoUpload").onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function() {
        const img = document.createElement("img");
        img.src = reader.result;
        document.getElementById("gallery").appendChild(img);
    }
    reader.readAsDataURL(file);
};

// GAME
let startTime = 0;

function showCircle() {
    const circle = document.getElementById("circle");
    const area = document.getElementById("gameArea");

    const x = Math.random() * (area.clientWidth - 40);
    const y = Math.random() * (area.clientHeight - 40);

    circle.style.left = x + "px";
    circle.style.top = y + "px";
    circle.style.display = "block";

    startTime = Date.now();
}

document.getElementById("gameArea").onclick = function(e) {
    const circle = document.getElementById("circle");

    if (e.target.id === "circle") {
        const reaction = Date.now() - startTime;
        document.getElementById("reactionScore").innerText =
            "Reaction: " + reaction + "ms";

        circle.style.display = "none";

        setTimeout(showCircle, 700);
    }
};

// Start the game once tab is clicked
document.querySelector("[data-tab='game']").onclick = () => {
    setTimeout(showCircle, 800);
};
