// PASSWORD
const correctPW = "baba123";  

function checkPassword() {
    const input = document.getElementById("pwInput").value;
    const error = document.getElementById("pwError");

    if (input === correctPW) {
        document.getElementById("passwordScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
    } else {
        error.innerText = "you entered it wrong dummy baba 😭💀";
    }
}

// PAGE SWITCHING
function showPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById(page).classList.remove("hidden");
}

// MINI GAME
let score = 0;
document.getElementById("heartBtn").addEventListener("click", () => {
    score++;
    document.getElementById("score").innerText = "score: " + score;
});

// TROLL TIMER
setTimeout(() => {
    alert("baby… you miss me that much? 😭💗");
}, 90000); // 90 seconds
