/* =========================================================
   MOCHACHAT
   Firebase realtime anonymous chat
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    onDisconnect,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


/* =========================================================
   01. FIREBASE
   ========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyCvhhLbOUom3CVWKq6pHqrK_nHiMGbW_-E",
    authDomain: "chat-14103.firebaseapp.com",
    projectId: "chat-14103",
    storageBucket: "chat-14103.firebasestorage.app",
    messagingSenderId: "432992246016",
    appId: "1:432992246016:web:9775ddf67ab3fe6a1ebbe5"
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);


/* =========================================================
   02. APP STATE
   ========================================================= */

const state = {

    user: null,

    profile: null,

    currentRoom: "general",

    currentRoomName: "General",

    messages: {},

    users: {},

    reports: {},

    bannedUsers: {},

    moderationLogs: {},

    typingUsers: {},

    listeners: {},

    reportTarget: null,

    editingMessage: null,

    replyingTo: null,

    isModerator: false,

    isOwner: false,

    acceptedRules: false,

    loaded: false,

    onlinePresenceStarted: false,

    selectedColor: null,

    settings: {
        theme: "pink",
        sound: true,
        enterToSend: true
    }
};


/* =========================================================
   03. CONSTANTS
   ========================================================= */

const MAX_MESSAGE_LENGTH = 500;

const MAX_USERNAME_LENGTH = 24;

const TYPING_TIMEOUT = 2500;

const COLORS = [
    "#ff79a9",
    "#ff8fae",
    "#f08ccf",
    "#c792ed",
    "#9e8bea",
    "#78a9e8",
    "#69b8d6",
    "#65cfa0",
    "#9acb70",
    "#e6ad69",
    "#e98873",
    "#d783a7"
];

const KAOMOJI = [
    "(｡•́‿•̀｡)",
    "(≧▽≦)",
    "(｡♥‿♥｡)",
    "(´• ω •`)",
    "(╥﹏╥)",
    "(づ｡◕‿‿◕｡)づ",
    "(˶ᵔ ᵕ ᵔ˶)",
    "(✿◠‿◠)",
    "(๑˃ᴗ˂)ﻭ",
    "٩(◕‿◕｡)۶",
    "(っ˘ω˘ς )",
    "(¬‿¬)",
    "(•̀ᴗ•́)و",
    "ヽ(>∀<☆)ノ"
];

const ROOM_DATA = {
    general: {
        name: "General",
        icon: "💬",
        description: "Talk about anything"
    },

    random: {
        name: "Random",
        icon: "🎀",
        description: "Random conversations"
    },

    anime: {
        name: "Anime",
        icon: "🌸",
        description: "Anime & manga"
    },

    games: {
        name: "Games",
        icon: "🎮",
        description: "Gaming chat"
    }
};


/* =========================================================
   04. DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

function getElement(...selectors) {
    for (const selector of selectors) {
        const element = document.querySelector(selector);

        if (element) {
            return element;
        }
    }

    return null;
}

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getInitials(username) {
    if (!username) {
        return "?";
    }

    return username
        .trim()
        .slice(0, 2)
        .toUpperCase();
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function formatTime(timestamp) {
    if (!timestamp) {
        return "now";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "now";
    }

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatDate(timestamp) {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function sanitizeUsername(username) {

    let clean = String(username || "")
        .trim()
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ");

    clean = clean.slice(0, MAX_USERNAME_LENGTH);

    return clean;
}

function isValidUsername(username) {

    if (!username) {
        return false;
    }

    if (username.length < 2) {
        return false;
    }

    return true;
}


/* =========================================================
   05. TOAST
   ========================================================= */

function toast(message, type = "normal") {

    const container =
        getElement("#toastContainer", ".toast-container");

    if (!container) {
        return;
    }

    const toastElement = document.createElement("div");

    toastElement.className = "toast";

    let icon = "♡";

    if (type === "success") {
        icon = "✓";
    }

    if (type === "error") {
        icon = "!";
    }

    if (type === "warning") {
        icon = "⚠";
    }

    toastElement.innerHTML = `
        <span>${icon}</span>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toastElement);

    setTimeout(() => {
        toastElement.remove();
    }, 4200);
}


/* =========================================================
   06. LOADING / SCREEN MANAGEMENT
   ========================================================= */

function showElement(element) {
    if (!element) return;

    element.classList.remove("hidden");
}

function hideElement(element) {
    if (!element) return;

    element.classList.add("hidden");
}

function showApp() {

    const loading = getElement("#loadingScreen", ".loading-screen");
    const rules = getElement("#rulesScreen", ".rules-screen");
    const app = getElement("#app", ".app");

    hideElement(loading);

    if (state.acceptedRules) {
        hideElement(rules);
        showElement(app);
    } else {
        showElement(rules);
        hideElement(app);
    }
}

function showLoading(message = "Loading Mochachat...") {

    const loading = getElement("#loadingScreen", ".loading-screen");

    if (!loading) {
        return;
    }

    const messageElement =
        getElement("#loadingMessage", ".loading-message");

    if (messageElement) {
        messageElement.textContent = message;
    }

    showElement(loading);
}


/* =========================================================
   07. LOCAL STORAGE
   ========================================================= */

function loadLocalSettings() {

    try {

        const saved = localStorage.getItem("mochachat_settings");

        if (saved) {
            state.settings = {
                ...state.settings,
                ...JSON.parse(saved)
            };
        }

    } catch (error) {
        console.warn("Could not load settings.", error);
    }
}

function saveLocalSettings() {

    try {

        localStorage.setItem(
            "mochachat_settings",
            JSON.stringify(state.settings)
        );

    } catch (error) {
        console.warn("Could not save settings.", error);
    }
}

function getRulesAccepted() {

    try {
        return localStorage.getItem("mochachat_rules_accepted") === "true";
    } catch {
        return false;
    }
}

function setRulesAccepted() {

    try {
        localStorage.setItem(
            "mochachat_rules_accepted",
            "true"
        );
    } catch {
        /* ignored */
    }

    state.acceptedRules = true;
}


/* =========================================================
   08. ANONYMOUS LOGIN
   ========================================================= */

async function startAuthentication() {

    showLoading("Connecting you anonymously...");

    try {

        await signInAnonymously(auth);

    } catch (error) {

        console.error(error);

        showLoading("Could not connect to Firebase.");

        toast(
            "Firebase authentication failed. Check your Firebase settings.",
            "error"
        );
    }
}

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        return;
    }

    state.user = user;

    console.log("Anonymous Firebase user:", user.uid);

    await initializeUser(user);

});


/* =========================================================
   09. CREATE / LOAD USER PROFILE
   ========================================================= */

async function initializeUser(user) {

    showLoading("Preparing your identity...");

    const userRef = ref(db, `users/${user.uid}`);

    try {

        const snapshot = await get(userRef);

        if (snapshot.exists()) {

            state.profile = snapshot.val();

        } else {

            const newProfile = {
                uid: user.uid,

                username: generateUsername(),

                color: randomItem(COLORS),

                createdAt: Date.now(),

                lastSeen: serverTimestamp(),

                status: "online",

                role: "user",

                banned: false,

                bio: "just another lil bean ♡",

                messageCount: 0
            };

            await set(userRef, newProfile);

            state.profile = newProfile;
        }

        state.selectedColor = state.profile.color;

        state.isModerator =
            state.profile.role === "moderator" ||
            state.profile.role === "admin" ||
            state.profile.role === "owner";

        state.isOwner =
            state.profile.role === "owner";

        await checkBan();

        await startPresence();

        startFirebaseListeners();

        setupInterface();

        state.loaded = true;

        showApp();

        renderCurrentUser();

    } catch (error) {

        console.error("User initialization failed:", error);

        toast(
            "Couldn't load your account.",
            "error"
        );
    }
}


/* =========================================================
   10. USERNAME GENERATOR
   ========================================================= */

function generateUsername() {

    const first = [
        "mochi",
        "boba",
        "sakura",
        "mimi",
        "yuki",
        "kiki",
        "momo",
        "pocky",
        "choco",
        "nana",
        "coco",
        "kuma",
        "pika",
        "peach",
        "berry",
        "miso",
        "tofu",
        "suki",
        "luna",
        "riri"
    ];

    const second = [
        "bun",
        "bean",
        "cat",
        "bunny",
        "star",
        "berry",
        "puff",
        "chan",
        "cupcake",
        "sprite",
        "cloud",
        "muffin",
        "kitty",
        "pearl",
        "flower"
    ];

    const number =
        Math.floor(100 + Math.random() * 900);

    return `${randomItem(first)}${randomItem(second)}${number}`;
}


/* =========================================================
   11. BAN CHECK
   ========================================================= */

async function checkBan() {

    if (!state.user) {
        return false;
    }

    const banRef =
        ref(db, `bans/${state.user.uid}`);

    try {

        const snapshot = await get(banRef);

        if (!snapshot.exists()) {
            return false;
        }

        const ban = snapshot.val();

        if (!ban.permanent && ban.expiresAt) {

            if (Date.now() > ban.expiresAt) {

                await remove(banRef);

                return false;
            }
        }

        showBannedScreen(ban);

        return true;

    } catch (error) {

        console.error("Ban check failed:", error);

        return false;
    }
}


/* =========================================================
   12. BAN SCREEN
   ========================================================= */

function showBannedScreen(ban) {

    const reason =
        escapeHTML(ban.reason || "No reason provided.");

    const until =
        ban.permanent
            ? "Permanent"
            : formatDate(ban.expiresAt);

    document.body.innerHTML = `
        <div class="screen">
            <div class="loading-card">
                <div class="loading-kaomoji">(╥﹏╥)</div>

                <h1 class="loading-title">
                    You are banned
                </h1>

                <p class="loading-message">
                    You cannot use Mochachat right now.
                </p>

                <br>

                <p style="font-size:12px;color:var(--text-soft)">
                    <strong>Reason:</strong><br>
                    ${reason}
                </p>

                <br>

                <p style="font-size:11px;color:var(--text-muted)">
                    ${until}
                </p>
            </div>
        </div>
    `;

    throw new Error("User is banned.");
}


/* =========================================================
   13. PRESENCE
   ========================================================= */

async function startPresence() {

    if (!state.user || state.onlinePresenceStarted) {
        return;
    }

    state.onlinePresenceStarted = true;

    const uid = state.user.uid;

    const userStatusRef =
        ref(db, `presence/${uid}`);

    const userRef =
        ref(db, `users/${uid}`);

    try {

        await set(userStatusRef, {
            online: true,
            lastSeen: serverTimestamp()
        });

        await update(userRef, {
            status: "online",
            lastSeen: serverTimestamp()
        });

        onDisconnect(userStatusRef).set({
            online: false,
            lastSeen: serverTimestamp()
        });

        onDisconnect(userRef).update({
            status: "offline",
            lastSeen: serverTimestamp()
        });

    } catch (error) {

        console.error(
            "Presence initialization failed:",
            error
        );
    }
}


/* =========================================================
   14. FIREBASE LISTENERS
   ========================================================= */

function startFirebaseListeners() {

    listenToUsers();

    listenToPresence();

    listenToRoom(state.currentRoom);

    listenToReports();

    listenToBans();

    listenToModerationLogs();
}


/* =========================================================
   15. USERS
   ========================================================= */

function listenToUsers() {

    const usersRef = ref(db, "users");

    state.listeners.users =
        onValue(usersRef, (snapshot) => {

            state.users =
                snapshot.val() || {};

            renderOnlineUsers();

        });
}


/* =========================================================
   16. PRESENCE
   ========================================================= */

function listenToPresence() {

    const presenceRef = ref(db, "presence");

    state.listeners.presence =
        onValue(presenceRef, (snapshot) => {

            state.presence =
                snapshot.val() || {};

            renderOnlineUsers();

        });
}


/* =========================================================
   17. ROOM MESSAGES
   ========================================================= */

function listenToRoom(roomId) {

    if (state.listeners.messages) {
        state.listeners.messages();
    }

    state.messages = {};

    const messagesRef =
        ref(db, `messages/${roomId}`);

    state.listeners.messages =
        onValue(messagesRef, (snapshot) => {

            state.messages =
                snapshot.val() || {};

            renderMessages();

        });
}


/* =========================================================
   18. REPORTS
   ========================================================= */

function listenToReports() {

    if (!state.isModerator) {
        return;
    }

    const reportsRef =
        ref(db, "reports");

    state.listeners.reports =
        onValue(reportsRef, (snapshot) => {

            state.reports =
                snapshot.val() || {};

            renderReports();

        });
}


/* =========================================================
   19. BANS
   ========================================================= */

function listenToBans() {

    if (!state.isModerator) {
        return;
    }

    const bansRef =
        ref(db, "bans");

    state.listeners.bans =
        onValue(bansRef, (snapshot) => {

            state.bannedUsers =
                snapshot.val() || {};

            renderModerationUsers();

        });
}


/* =========================================================
   20. MODERATION LOGS
   ========================================================= */

function listenToModerationLogs() {

    if (!state.isModerator) {
        return;
    }

    const logsRef =
        ref(db, "moderationLogs");

    state.listeners.logs =
        onValue(logsRef, (snapshot) => {

            state.moderationLogs =
                snapshot.val() || {};

            renderModerationLogs();

        });
}


/* =========================================================
   21. SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (!state.user || !state.profile) {
        return;
    }

    const input =
        getElement("#messageInput", ".message-input");

    if (!input) {
        return;
    }

    let text = input.value.trim();

    if (!text) {
        return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {

        toast(
            `Messages can only be ${MAX_MESSAGE_LENGTH} characters.`,
            "warning"
        );

        return;
    }

    const banned =
        await checkBan();

    if (banned) {
        return;
    }

    const messageRef =
        push(ref(db, `messages/${state.currentRoom}`));

    const message = {

        id: messageRef.key,

        uid: state.user.uid,

        username: state.profile.username,

        color: state.profile.color,

        text: text,

        createdAt: serverTimestamp(),

        edited: false,

        replyTo: state.replyingTo
            ? state.replyingTo.id
            : null

    };

    try {

        await set(messageRef, message);

        input.value = "";

        autoResizeTextarea(input);

        stopTyping();

        state.replyingTo = null;

        renderReplyPreview();

        await incrementMessageCount();

        playMessageSound();

    } catch (error) {

        console.error(error);

        toast(
            "Message couldn't be sent.",
            "error"
        );
    }
}


/* =========================================================
   22. MESSAGE COUNT
   ========================================================= */

async function incrementMessageCount() {

    if (!state.user) {
        return;
    }

    const current =
        Number(state.profile.messageCount || 0);

    state.profile.messageCount = current + 1;

    await update(
        ref(db, `users/${state.user.uid}`),
        {
            messageCount: current + 1
        }
    );
}


/* =========================================================
   23. DELETE MESSAGE
   ========================================================= */

async function deleteMessage(messageId) {

    const message =
        state.messages[messageId];

    if (!message) {
        return;
    }

    const allowed =
        message.uid === state.user.uid ||
        state.isModerator;

    if (!allowed) {
        toast(
            "You can't delete that message.",
            "error"
        );

        return;
    }

    try {

        await remove(
            ref(
                db,
                `messages/${state.currentRoom}/${messageId}`
            )
        );

        if (state.isModerator && message.uid !== state.user.uid) {

            await createModerationLog(
                "deleted_message",
                message.uid,
                `Deleted message by ${message.username}`
            );
        }

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't delete the message.",
            "error"
        );
    }
}


/* =========================================================
   24. EDIT MESSAGE
   ========================================================= */

async function editMessage(messageId) {

    const message =
        state.messages[messageId];

    if (!message) {
        return;
    }

    if (message.uid !== state.user.uid) {
        toast(
            "You can only edit your own messages.",
            "error"
        );

        return;
    }

    const input =
        getElement("#messageInput", ".message-input");

    if (!input) {
        return;
    }

    input.value = message.text;

    state.editingMessage = messageId;

    input.focus();

    toast("Editing your message ♡");
}


/* =========================================================
   25. SAVE EDIT
   ========================================================= */

async function saveEditedMessage() {

    if (!state.editingMessage) {
        return false;
    }

    const input =
        getElement("#messageInput", ".message-input");

    if (!input) {
        return false;
    }

    const text =
        input.value.trim();

    if (!text) {
        return false;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
        toast(
            `Messages can only be ${MAX_MESSAGE_LENGTH} characters.`,
            "warning"
        );

        return false;
    }

    const messageId =
        state.editingMessage;

    const message =
        state.messages[messageId];

    if (!message) {
        state.editingMessage = null;
        return false;
    }

    try {

        await update(
            ref(
                db,
                `messages/${state.currentRoom}/${messageId}`
            ),
            {
                text,
                edited: true,
                editedAt: serverTimestamp()
            }
        );

        input.value = "";

        state.editingMessage = null;

        autoResizeTextarea(input);

        toast("Message edited ♡");

        return true;

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't edit the message.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   26. REPLY
   ========================================================= */

function startReply(messageId) {

    const message =
        state.messages[messageId];

    if (!message) {
        return;
    }

    state.replyingTo = {
        id: messageId,
        username: message.username,
        text: message.text
    };

    renderReplyPreview();

    const input =
        getElement("#messageInput", ".message-input");

    input?.focus();
}

function renderReplyPreview() {

    let preview =
        getElement("#replyPreview");

    if (!preview) {
        return;
    }

    if (!state.replyingTo) {

        preview.innerHTML = "";

        preview.classList.add("hidden");

        return;
    }

    preview.classList.remove("hidden");

    preview.innerHTML = `
        <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            padding:8px 10px;
            margin-bottom:6px;
            background:var(--soft-bg);
            border:1px solid var(--border);
            border-radius:10px;
            font-size:10px;
        ">
            <div>
                <strong style="color:var(--primary-dark)">
                    Replying to ${escapeHTML(state.replyingTo.username)}
                </strong>
                <div style="
                    color:var(--text-muted);
                    margin-top:2px;
                    overflow:hidden;
                    white-space:nowrap;
                    text-overflow:ellipsis;
                ">
                    ${escapeHTML(state.replyingTo.text)}
                </div>
            </div>

            <button
                type="button"
                id="cancelReplyButton"
                style="
                    width:26px;
                    height:26px;
                    border-radius:8px;
                    background:var(--panel-bg);
                    color:var(--text-muted);
                "
            >
                ×
            </button>
        </div>
    `;

    $("#cancelReplyButton")?.addEventListener(
        "click",
        () => {

            state.replyingTo = null;

            renderReplyPreview();
        }
    );
}


/* =========================================================
   27. RENDER MESSAGES
   ========================================================= */

function renderMessages() {

    const container =
        getElement("#messages", ".messages");

    if (!container) {
        return;
    }

    const messageArray =
        Object.entries(state.messages)
            .map(([id, message]) => ({
                id,
                ...message
            }))
            .sort(
                (a, b) =>
                    Number(a.createdAt || 0) -
                    Number(b.createdAt || 0)
            );

    if (!messageArray.length) {

        container.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-decoration">
                    ✦ ✧ ✦
                </div>

                <div class="empty-chat-kaomoji">
                    (｡•́‿•̀｡)
                </div>

                <h2>
                    It's quiet here...
                </h2>

                <p>
                    Be the first bean to say something ♡
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    let previousUser = null;
    let previousTime = null;

    for (const message of messageArray) {

        const date =
            Number(message.createdAt || Date.now());

        const grouped =
            previousUser === message.uid &&
            previousTime &&
            date - previousTime < 5 * 60 * 1000;

        container.appendChild(
            createMessageElement(
                message,
                grouped
            )
        );

        previousUser = message.uid;

        previousTime = date;
    }

    requestAnimationFrame(() => {

        const messageContainer =
            getElement(
                "#messageContainer",
                ".message-container"
            );

        if (messageContainer) {

            const nearBottom =
                messageContainer.scrollHeight -
                messageContainer.scrollTop -
                messageContainer.clientHeight < 250;

            if (nearBottom) {
                messageContainer.scrollTop =
                    messageContainer.scrollHeight;
            }
        }

    });
}


/* =========================================================
   28. CREATE MESSAGE ELEMENT
   ========================================================= */

function createMessageElement(message, grouped) {

    const element =
        document.createElement("article");

    element.className =
        `message${grouped ? " grouped" : ""}`;

    element.dataset.messageId =
        message.id;

    const isOwn =
        message.uid === state.user?.uid;

    const canDelete =
        isOwn || state.isModerator;

    const role =
        state.users[message.uid]?.role ||
        "user";

    let roleHTML = "";

    if (
        role === "moderator" ||
        role === "admin" ||
        role === "owner"
    ) {

        roleHTML = `
            <span class="message-role">
                ${escapeHTML(role)}
            </span>
        `;
    }

    let replyHTML = "";

    if (message.replyTo && state.messages[message.replyTo]) {

        const replied =
            state.messages[message.replyTo];

        replyHTML = `
            <div style="
                margin-bottom:5px;
                padding:5px 8px;
                border-left:3px solid var(--primary);
                background:var(--soft-bg);
                border-radius:7px;
                color:var(--text-muted);
                font-size:9px;
            ">
                <strong>
                    ${escapeHTML(replied.username)}
                </strong>
                <br>
                ${escapeHTML(replied.text)}
            </div>
        `;
    }

    element.innerHTML = `

        <div class="message-avatar">
            <div
                class="avatar avatar-small"
                style="
                    background:
                    linear-gradient(
                        135deg,
                        ${escapeHTML(message.color || state.profile?.color || "#ff79a9")},
                        ${escapeHTML(message.color || state.profile?.color || "#ff79a9")}aa
                    );
                "
            >
                ${escapeHTML(getInitials(message.username))}
            </div>
        </div>

        <div class="message-body">

            <div class="message-meta">

                ${
                    grouped
                        ? ""
                        : `
                            <span
                                class="message-username"
                                data-profile-id="${escapeHTML(message.uid)}"
                            >
                                ${escapeHTML(message.username)}
                            </span>

                            ${roleHTML}

                            <span class="message-time">
                                ${formatTime(message.createdAt)}
                            </span>
                        `
                }

            </div>

            ${replyHTML}

            <div class="message-text">
                ${escapeHTML(message.text)}
                ${
                    message.edited
                        ? `<span class="message-edited">(edited)</span>`
                        : ""
                }
            </div>

            <div class="message-actions">

                <button
                    class="message-action"
                    data-action="reply"
                    title="Reply"
                >
                    ↩
                </button>

                ${
                    isOwn
                        ? `
                            <button
                                class="message-action"
                                data-action="edit"
                                title="Edit"
                            >
                                ✎
                            </button>
                        `
                        : ""
                }

                ${
                    canDelete
                        ? `
                            <button
                                class="message-action danger"
                                data-action="delete"
                                title="Delete"
                            >
                                ×
                            </button>
                        `
                        : ""
                }

                <button
                    class="message-action"
                    data-action="report"
                    title="Report"
                >
                    ⚑
                </button>

            </div>

        </div>
    `;

    return element;
}


/* =========================================================
   29. ONLINE USERS
   ========================================================= */

function renderOnlineUsers() {

    const container =
        getElement(
            "#onlineUsers",
            ".online-users"
        );

    if (!container) {
        return;
    }

    const presence =
        state.presence || {};

    const users =
        Object.values(state.users || {})
            .filter(user => {
                return presence[user.uid]?.online === true ||
                    user.uid === state.user?.uid;
            })
            .sort((a, b) => {

                if (a.uid === state.user?.uid) return -1;

                if (b.uid === state.user?.uid) return 1;

                return String(a.username)
                    .localeCompare(String(b.username));
            });

    if (!users.length) {

        container.innerHTML = `
            <div class="moderation-empty">
                Nobody is here yet ♡
            </div>
        `;

        updateOnlineCount(0);

        return;
    }

    container.innerHTML = "";

    for (const user of users) {

        const element =
            document.createElement("button");

        element.type = "button";

        element.className = "online-user";

        element.dataset.uid = user.uid;

        const role =
            user.role &&
            user.role !== "user"
                ? ` · ${user.role}`
                : "";

        element.innerHTML = `

            <div
                class="avatar avatar-small"
                style="
                    background:
                    linear-gradient(
                        135deg,
                        ${escapeHTML(user.color || "#ff79a9")},
                        ${escapeHTML(user.color || "#ff79a9")}aa
                    );
                "
            >
                ${escapeHTML(getInitials(user.username))}
            </div>

            <div class="online-user-info">

                <span class="online-user-name">
                    ${escapeHTML(user.username)}
                </span>

                <span class="online-user-status">
                    <span class="status-dot"></span>
                    online${escapeHTML(role)}
                </span>

            </div>
        `;

        container.appendChild(element);
    }

    updateOnlineCount(users.length);
}

function updateOnlineCount(count) {

    const element =
        getElement("#onlineCount", ".online-count");

    if (element) {
        element.textContent = count;
    }
}


/* =========================================================
   30. CURRENT USER
   ========================================================= */

function renderCurrentUser() {

    if (!state.profile) {
        return;
    }

    const usernameElements =
        $$(
            "[data-current-username], #currentUsername, .sidebar-username"
        );

    usernameElements.forEach(element => {
        element.textContent =
            state.profile.username;
    });

    const avatarElements =
        $$(
            "[data-current-avatar], #currentAvatar, .sidebar-avatar"
        );

    avatarElements.forEach(element => {

        element.textContent =
            getInitials(state.profile.username);

        element.style.background =
            `linear-gradient(
                135deg,
                ${state.profile.color},
                ${state.profile.color}aa
            )`;
    });

    document.documentElement.style.setProperty(
        "--user-color",
        state.profile.color
    );
}


/* =========================================================
   31. ROOMS
   ========================================================= */

function switchRoom(roomId) {

    if (!ROOM_DATA[roomId]) {
        return;
    }

    state.currentRoom = roomId;

    state.currentRoomName =
        ROOM_DATA[roomId].name;

    $$(".room-button").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.room === roomId
        );
    });

    const roomName =
        getElement(
            "#chatRoomName",
            ".chat-room-name"
        );

    const roomDescription =
        getElement(
            "#chatRoomDescription",
            ".chat-room-description"
        );

    const roomIcon =
        getElement(
            "#chatRoomIcon",
            ".chat-room-icon"
        );

    if (roomName) {
        roomName.textContent =
            ROOM_DATA[roomId].name;
    }

    if (roomDescription) {
        roomDescription.textContent =
            ROOM_DATA[roomId].description;
    }

    if (roomIcon) {
        roomIcon.textContent =
            ROOM_DATA[roomId].icon;
    }

    listenToRoom(roomId);

    closeSidebarMobile();
}


/* =========================================================
   32. TYPING
   ========================================================= */

let typingTimer = null;

function handleTyping() {

    if (!state.user) {
        return;
    }

    setTyping(true);

    clearTimeout(typingTimer);

    typingTimer = setTimeout(() => {

        stopTyping();

    }, TYPING_TIMEOUT);
}

async function setTyping(active) {

    if (!state.user) {
        return;
    }

    const typingRef =
        ref(
            db,
            `typing/${state.currentRoom}/${state.user.uid}`
        );

    if (!active) {

        try {
            await remove(typingRef);
        } catch {
            /* ignored */
        }

        return;
    }

    try {

        await set(typingRef, {
            username: state.profile.username,
            timestamp: serverTimestamp()
        });

        onDisconnect(typingRef).remove();

    } catch {
        /* ignored */
    }
}

function stopTyping() {

    clearTimeout(typingTimer);

    setTyping(false);
}


/* =========================================================
   33. TYPING LISTENER
   ========================================================= */

function listenToTyping() {

    if (state.listeners.typing) {
        state.listeners.typing();
    }

    const typingRef =
        ref(
            db,
            `typing/${state.currentRoom}`
        );

    state.listeners.typing =
        onValue(typingRef, snapshot => {

            state.typingUsers =
                snapshot.val() || {};

            renderTyping();
        });
}

function renderTyping() {

    const element =
        getElement(
            "#typingIndicator",
            ".typing-indicator"
        );

    if (!element) {
        return;
    }

    const users =
        Object.entries(state.typingUsers || {})
            .filter(([uid]) =>
                uid !== state.user?.uid
            )
            .map(([, data]) =>
                data.username
            );

    if (!users.length) {

        element.innerHTML = "";

        element.classList.add("hidden");

        return;
    }

    let text = "";

    if (users.length === 1) {
        text =
            `${escapeHTML(users[0])} is typing`;
    } else if (users.length === 2) {
        text =
            `${escapeHTML(users[0])} and ${escapeHTML(users[1])} are typing`;
    } else {
        text =
            `${users.length} people are typing`;
    }

    element.innerHTML = `
        <span>${text}</span>

        <span class="typing-dots">
            <i></i>
            <i></i>
            <i></i>
        </span>
    `;

    element.classList.remove("hidden");
}


/* =========================================================
   34. REPORTING
   ========================================================= */

function openReport(messageId) {

    const message =
        state.messages[messageId];

    if (!message) {
        return;
    }

    state.reportTarget = {
        messageId,
        uid: message.uid,
        username: message.username,
        text: message.text
    };

    const target =
        getElement("#reportTargetText");

    if (target) {

        target.textContent =
            `${message.username}: ${message.text}`;
    }

    openModal("reportModal");
}

async function submitReport() {

    if (!state.user || !state.reportTarget) {
        return;
    }

    const reasonElement =
        getElement(
            'input[name="reportReason"]:checked'
        );

    const detailsElement =
        getElement("#reportDetails");

    const reason =
        reasonElement?.value ||
        "other";

    const details =
        detailsElement?.value.trim() ||
        "";

    const reportRef =
        push(ref(db, "reports"));

    const report = {

        id: reportRef.key,

        reporterUid:
            state.user.uid,

        reporterUsername:
            state.profile.username,

        targetUid:
            state.reportTarget.uid,

        targetUsername:
            state.reportTarget.username,

        messageId:
            state.reportTarget.messageId,

        messageText:
            state.reportTarget.text,

        reason,

        details,

        room:
            state.currentRoom,

        createdAt:
            serverTimestamp(),

        status:
            "open"

    };

    try {

        await set(reportRef, report);

        closeModal("reportModal");

        toast(
            "Report submitted. Thank you for keeping the chat safe ♡",
            "success"
        );

        state.reportTarget = null;

        if (detailsElement) {
            detailsElement.value = "";
        }

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't submit your report.",
            "error"
        );
    }
}


/* =========================================================
   35. MODERATION
   ========================================================= */

async function banUser(uid, duration = "permanent") {

    if (!state.isModerator) {
        toast(
            "You don't have permission to do that.",
            "error"
        );

        return;
    }

    if (uid === state.user.uid) {
        toast(
            "You can't ban yourself.",
            "warning"
        );

        return;
    }

    const user =
        state.users[uid];

    if (!user) {
        return;
    }

    if (
        user.role === "owner" &&
        !state.isOwner
    ) {

        toast(
            "Only the owner can moderate the owner.",
            "error"
        );

        return;
    }

    let expiresAt = null;

    if (duration === "1h") {
        expiresAt =
            Date.now() + 60 * 60 * 1000;
    }

    if (duration === "1d") {
        expiresAt =
            Date.now() + 24 * 60 * 60 * 1000;
    }

    if (duration === "7d") {
        expiresAt =
            Date.now() + 7 * 24 * 60 * 60 * 1000;
    }

    const reason =
        prompt(
            `Reason for banning ${user.username}:`
        );

    if (reason === null) {
        return;
    }

    const banData = {

        uid,

        username:
            user.username,

        reason:
            reason.trim() ||
            "Rule violation",

        createdAt:
            serverTimestamp(),

        createdBy:
            state.user.uid,

        createdByUsername:
            state.profile.username,

        permanent:
            duration === "permanent",

        expiresAt

    };

    try {

        await set(
            ref(db, `bans/${uid}`),
            banData
        );

        await createModerationLog(
            "ban",
            uid,
            `Banned ${user.username}`
        );

        toast(
            `${user.username} has been banned.`,
            "success"
        );

        renderModerationUsers();

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't ban that user.",
            "error"
        );
    }
}


/* =========================================================
   36. UNBAN
   ========================================================= */

async function unbanUser(uid) {

    if (!state.isModerator) {
        return;
    }

    const user =
        state.users[uid];

    try {

        await remove(
            ref(db, `bans/${uid}`)
        );

        await createModerationLog(
            "unban",
            uid,
            `Unbanned ${user?.username || uid}`
        );

        toast(
            "User unbanned ♡",
            "success"
        );

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't unban that user.",
            "error"
        );
    }
}


/* =========================================================
   37. ROLE MANAGEMENT
   ========================================================= */

async function changeUserRole(uid, role) {

    if (!state.isOwner) {

        toast(
            "Only the owner can change staff roles.",
            "error"
        );

        return;
    }

    const user =
        state.users[uid];

    if (!user) {
        return;
    }

    if (uid === state.user.uid) {

        toast(
            "You can't change your own role.",
            "warning"
        );

        return;
    }

    try {

        await update(
            ref(db, `users/${uid}`),
            {
                role
            }
        );

        await createModerationLog(
            "role_change",
            uid,
            `Changed ${user.username}'s role to ${role}`
        );

        toast(
            `${user.username} is now ${role}.`,
            "success"
        );

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't change the user's role.",
            "error"
        );
    }
}


/* =========================================================
   38. MODERATION LOG
   ========================================================= */

async function createModerationLog(
    action,
    targetUid,
    description
) {

    if (!state.user) {
        return;
    }

    const logRef =
        push(ref(db, "moderationLogs"));

    await set(logRef, {

        action,

        targetUid,

        description,

        moderatorUid:
            state.user.uid,

        moderatorUsername:
            state.profile.username,

        createdAt:
            serverTimestamp()

    });
}


/* =========================================================
   39. REPORT STATUS
   ========================================================= */

async function resolveReport(reportId) {

    if (!state.isModerator) {
        return;
    }

    try {

        await update(
            ref(db, `reports/${reportId}`),
            {
                status: "resolved",

                resolvedBy:
                    state.user.uid,

                resolvedAt:
                    serverTimestamp()
            }
        );

        toast(
            "Report marked as resolved.",
            "success"
        );

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't update the report.",
            "error"
        );
    }
}


/* =========================================================
   40. MODERATION UI
   ========================================================= */

function renderReports() {

    const container =
        getElement("#reportsList");

    if (!container) {
        return;
    }

    const reports =
        Object.entries(state.reports || {})
            .map(([id, report]) => ({
                id,
                ...report
            }))
            .filter(report =>
                report.status !== "resolved"
            )
            .sort(
                (a, b) =>
                    Number(b.createdAt || 0) -
                    Number(a.createdAt || 0)
            );

    if (!reports.length) {

        container.innerHTML = `
            <div class="moderation-empty">
                No open reports ♡
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    for (const report of reports) {

        const element =
            document.createElement("div");

        element.className = "report-card";

        element.innerHTML = `

            <div class="report-card-header">

                <span class="report-reason">
                    ${escapeHTML(report.reason || "other")}
                </span>

                <span class="report-time">
                    ${formatTime(report.createdAt)}
                </span>

            </div>

            <div class="report-card-body">

                <strong>
                    ${escapeHTML(report.targetUsername)}
                </strong>

                <br>

                Reported by
                ${escapeHTML(report.reporterUsername)}

                <br><br>

                "${escapeHTML(report.messageText)}"

                ${
                    report.details
                        ? `
                            <br><br>
                            <strong>
                                Details:
                            </strong>
                            ${escapeHTML(report.details)}
                        `
                        : ""
                }

            </div>

            <div class="report-card-actions">

                <button
                    data-report-action="ban"
                    data-report-user="${escapeHTML(report.targetUid)}"
                >
                    Ban
                </button>

                <button
                    data-report-action="resolve"
                    data-report-id="${escapeHTML(report.id)}"
                >
                    Resolve
                </button>

            </div>
        `;

        container.appendChild(element);
    }
}


/* =========================================================
   41. MODERATION USERS
   ========================================================= */

function renderModerationUsers() {

    const container =
        getElement("#moderationUsersList");

    if (!container) {
        return;
    }

    const users =
        Object.values(state.users || {});

    if (!users.length) {

        container.innerHTML = `
            <div class="moderation-empty">
                No users found.
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    for (const user of users) {

        const banned =
            Boolean(state.bannedUsers[user.uid]);

        const element =
            document.createElement("div");

        element.className =
            "moderation-user-card";

        element.innerHTML = `

            <div
                class="avatar avatar-small"
                style="
                    background:
                    linear-gradient(
                        135deg,
                        ${escapeHTML(user.color || "#ff79a9")},
                        ${escapeHTML(user.color || "#ff79a9")}aa
                    );
                "
            >
                ${escapeHTML(getInitials(user.username))}
            </div>

            <div class="moderation-user-information">

                <strong>
                    ${escapeHTML(user.username)}
                </strong>

                <span>
                    ${escapeHTML(user.role || "user")}
                    ${banned ? " · BANNED" : ""}
                </span>

            </div>

            <div class="moderation-user-actions">

                ${
                    banned
                        ? `
                            <button
                                data-unban="${escapeHTML(user.uid)}"
                            >
                                Unban
                            </button>
                        `
                        : `
                            <button
                                data-ban="${escapeHTML(user.uid)}"
                            >
                                Ban
                            </button>
                        `
                }

                ${
                    state.isOwner &&
                    user.uid !== state.user.uid
                        ? `
                            <button
                                data-promote="${escapeHTML(user.uid)}"
                            >
                                Role
                            </button>
                        `
                        : ""
                }

            </div>
        `;

        container.appendChild(element);
    }
}


/* =========================================================
   42. MODERATION LOGS
   ========================================================= */

function renderModerationLogs() {

    const container =
        getElement("#moderationLogsList");

    if (!container) {
        return;
    }

    const logs =
        Object.values(state.moderationLogs || {})
            .sort(
                (a, b) =>
                    Number(b.createdAt || 0) -
                    Number(a.createdAt || 0)
            )
            .slice(0, 100);

    if (!logs.length) {

        container.innerHTML = `
            <div class="moderation-empty">
                No moderation actions yet.
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    for (const log of logs) {

        const element =
            document.createElement("div");

        element.className =
            "moderation-log";

        element.innerHTML = `
            <strong>
                ${escapeHTML(log.moderatorUsername || "Staff")}
            </strong>

            ${escapeHTML(log.description || log.action)}

            <div style="
                margin-top:3px;
                color:var(--text-muted);
                font-size:8px;
            ">
                ${formatTime(log.createdAt)}
            </div>
        `;

        container.appendChild(element);
    }
}


/* =========================================================
   43. PROFILE EDITING
   ========================================================= */

async function saveProfile() {

    if (!state.user || !state.profile) {
        return;
    }

    const usernameInput =
        getElement("#profileUsername");

    const bioInput =
        getElement("#profileBio");

    const username =
        sanitizeUsername(
            usernameInput?.value ||
            state.profile.username
        );

    const bio =
        String(
            bioInput?.value ||
            state.profile.bio ||
            ""
        )
        .trim()
        .slice(0, 120);

    if (!isValidUsername(username)) {

        toast(
            "Username must be at least 2 characters.",
            "warning"
        );

        return;
    }

    const updates = {

        username,

        bio,

        color:
            state.selectedColor ||
            state.profile.color

    };

    try {

        await update(
            ref(db, `users/${state.user.uid}`),
            updates
        );

        state.profile = {
            ...state.profile,
            ...updates
        };

        renderCurrentUser();

        closeModal("profileModal");

        toast(
            "Profile updated ♡",
            "success"
        );

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't save your profile.",
            "error"
        );
    }
}


/* =========================================================
   44. PROFILE MODAL
   ========================================================= */

function openProfileEditor() {

    if (!state.profile) {
        return;
    }

    const username =
        getElement("#profileUsername");

    const bio =
        getElement("#profileBio");

    if (username) {
        username.value =
            state.profile.username;
    }

    if (bio) {
        bio.value =
            state.profile.bio || "";
    }

    state.selectedColor =
        state.profile.color;

    renderColorPicker();

    openModal("profileModal");
}

function renderColorPicker() {

    const container =
        getElement("#colorPicker");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (const color of COLORS) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "color-option";

        if (color === state.selectedColor) {
            button.classList.add("selected");
        }

        button.style.setProperty(
            "--color",
            color
        );

        button.dataset.color = color;

        container.appendChild(button);
    }
}


/* =========================================================
   45. VIEW USER PROFILE
   ========================================================= */

function openUserProfile(uid) {

    const user =
        state.users[uid];

    if (!user) {
        return;
    }

    const modal =
        getElement("#userProfileModal");

    if (!modal) {
        return;
    }

    const avatar =
        getElement(
            "#viewUserAvatar",
            ".view-user-avatar"
        );

    const username =
        getElement(
            "#viewUserUsername",
            ".view-user-username"
        );

    const bio =
        getElement(
            "#viewUserBio",
            ".view-user-bio"
        );

    const role =
        getElement(
            "#viewUserRole",
            ".user-role-badge"
        );

    if (avatar) {

        avatar.textContent =
            getInitials(user.username);

        avatar.style.background =
            `linear-gradient(
                135deg,
                ${user.color || "#ff79a9"},
                ${user.color || "#ff79a9"}aa
            )`;
    }

    if (username) {
        username.textContent =
            user.username;
    }

    if (bio) {
        bio.textContent =
            user.bio ||
            "just another lil bean ♡";
    }

    if (role) {
        role.textContent =
            user.role || "user";
    }

    const reportButton =
        getElement("#viewUserReportButton");

    const banButton =
        getElement("#viewUserBanButton");

    if (reportButton) {

        reportButton.onclick = () => {

            closeModal("userProfileModal");

            openReportForUser(uid);
        };
    }

    if (banButton) {

        if (state.isModerator && uid !== state.user.uid) {

            banButton.classList.remove("hidden");

            banButton.onclick = async () => {

                await banUser(uid);

                closeModal("userProfileModal");
            };

        } else {

            banButton.classList.add("hidden");
        }
    }

    openModal("userProfileModal");
}


/* =========================================================
   46. REPORT USER
   ========================================================= */

function openReportForUser(uid) {

    const user =
        state.users[uid];

    if (!user) {
        return;
    }

    state.reportTarget = {

        messageId: null,

        uid,

        username:
            user.username,

        text:
            "User profile report"

    };

    const target =
        getElement("#reportTargetText");

    if (target) {

        target.textContent =
            `User: ${user.username}`;
    }

    openModal("reportModal");
}


/* =========================================================
   47. MODALS
   ========================================================= */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");
}

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");
}

function closeAllModals() {

    $$(".modal").forEach(modal => {

        modal.classList.add("hidden");
    });
}


/* =========================================================
   48. SETTINGS
   ========================================================= */

function applySettings() {

    const theme =
        state.settings.theme;

    if (theme === "pink") {

        document.body.removeAttribute(
            "data-theme"
        );

    } else {

        document.body.dataset.theme =
            theme;
    }

    const soundToggle =
        getElement("#soundToggle");

    if (soundToggle) {
        soundToggle.checked =
            state.settings.sound;
    }

    const enterToggle =
        getElement("#enterToSendToggle");

    if (enterToggle) {
        enterToggle.checked =
            state.settings.enterToSend;
    }

    const themeSelect =
        getElement("#themeSelect");

    if (themeSelect) {
        themeSelect.value =
            theme;
    }
}


/* =========================================================
   49. SOUND
   ========================================================= */

let audioContext = null;

function playMessageSound() {

    if (!state.settings.sound) {
        return;
    }

    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();
        }

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "sine";

        oscillator.frequency.value = 650;

        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.025,
            audioContext.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.08
        );

        oscillator.connect(gain);

        gain.connect(audioContext.destination);

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.09
        );

    } catch {
        /* Audio isn't essential */
    }
}


/* =========================================================
   50. TEXTAREA
   ========================================================= */

function autoResizeTextarea(textarea) {

    if (!textarea) {
        return;
    }

    textarea.style.height = "auto";

    textarea.style.height =
        `${Math.min(
            textarea.scrollHeight,
            130
        )}px`;
}


/* =========================================================
   51. KAOMOJI
   ========================================================= */

function setupKaomoji() {

    const bar =
        getElement("#kaomojiBar", ".kaomoji-bar");

    if (!bar) {
        return;
    }

    if (bar.children.length) {
        return;
    }

    for (const kaomoji of KAOMOJI) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "kaomoji-button";

        button.textContent =
            kaomoji;

        button.addEventListener(
            "click",
            () => insertAtCursor(kaomoji)
        );

        bar.appendChild(button);
    }
}

function insertAtCursor(text) {

    const input =
        getElement(
            "#messageInput",
            ".message-input"
        );

    if (!input) {
        return;
    }

    const start =
        input.selectionStart;

    const end =
        input.selectionEnd;

    input.value =
        input.value.slice(0, start) +
        text +
        input.value.slice(end);

    input.selectionStart =
        input.selectionEnd =
            start + text.length;

    input.focus();

    autoResizeTextarea(input);
}


/* =========================================================
   52. SIDEBAR MOBILE
   ========================================================= */

function openSidebarMobile() {

    const sidebar =
        getElement(".sidebar");

    const overlay =
        getElement(".mobile-overlay");

    sidebar?.classList.add(
        "mobile-open"
    );

    overlay?.classList.remove(
        "hidden"
    );
}

function closeSidebarMobile() {

    const sidebar =
        getElement(".sidebar");

    const overlay =
        getElement(".mobile-overlay");

    sidebar?.classList.remove(
        "mobile-open"
    );

    overlay?.classList.add(
        "hidden"
    );
}


/* =========================================================
   53. RULES
   ========================================================= */

function acceptRules() {

    setRulesAccepted();

    showApp();

    toast(
        `Welcome to Mochachat, ${state.profile?.username || "bean"} ♡`,
        "success"
    );
}


/* =========================================================
   54. INTERFACE EVENT SETUP
   ========================================================= */

function setupInterface() {

    loadLocalSettings();

    applySettings();

    setupKaomoji();

    setupMessageInput();

    setupRoomButtons();

    setupModalButtons();

    setupProfileButtons();

    setupSettingsButtons();

    setupModerationButtons();

    setupMobileNavigation();

    setupMessageInteractions();

    setupOnlineUserInteractions();

    setupGlobalClicks();

    listenToTyping();

    renderReplyPreview();

    renderCurrentUser();

    updateModerationVisibility();
}


/* =========================================================
   55. MESSAGE INPUT
   ========================================================= */

function setupMessageInput() {

    const input =
        getElement(
            "#messageInput",
            ".message-input"
        );

    if (!input) {
        return;
    }

    input.maxLength =
        MAX_MESSAGE_LENGTH;

    input.addEventListener(
        "input",
        () => {

            autoResizeTextarea(input);

            handleTyping();

            updateCharacterCounter(
                input.value.length
            );
        }
    );

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey &&
                state.settings.enterToSend
            ) {

                event.preventDefault();

                sendOrEdit();
            }
        }
    );
}

function sendOrEdit() {

    if (state.editingMessage) {

        saveEditedMessage();

    } else {

        sendMessage();
    }
}

function updateCharacterCounter(length) {

    const counter =
        getElement(
            "#characterCounter",
            ".character-counter"
        );

    if (!counter) {
        return;
    }

    counter.textContent =
        `${length}/${MAX_MESSAGE_LENGTH}`;
}


/* =========================================================
   56. ROOM BUTTONS
   ========================================================= */

function setupRoomButtons() {

    $$(".room-button").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const room =
                    button.dataset.room;

                switchRoom(room);
            }
        );
    });
}


/* =========================================================
   57. MODAL BUTTONS
   ========================================================= */

function setupModalButtons() {

    $$(".modal-close").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const modal =
                    button.closest(".modal");

                if (modal) {
                    closeModal(modal.id);
                }
            }
        );
    });

    $$(".modal-backdrop").forEach(backdrop => {

        backdrop.addEventListener(
            "click",
            () => {

                const modal =
                    backdrop.closest(".modal");

                if (modal) {
                    closeModal(modal.id);
                }
            }
        );
    });

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeAllModals();
            }
        }
    );
}


/* =========================================================
   58. PROFILE BUTTONS
   ========================================================= */

function setupProfileButtons() {

    const profileButton =
        getElement(
            "#profileButton",
            ".sidebar-profile"
        );

    profileButton?.addEventListener(
        "click",
        openProfileEditor
    );

    const saveProfileButton =
        getElement("#saveProfileButton");

    saveProfileButton?.addEventListener(
        "click",
        saveProfile
    );

    const colorPicker =
        getElement("#colorPicker");

    colorPicker?.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".color-option"
                );

            if (!button) {
                return;
            }

            state.selectedColor =
                button.dataset.color;

            renderColorPicker();
        }
    );
}


/* =========================================================
   59. SETTINGS
   ========================================================= */

function setupSettingsButtons() {

    const settingsButton =
        getElement(
            "#settingsButton",
            '[data-open="settingsModal"]'
        );

    settingsButton?.addEventListener(
        "click",
        () => {

            applySettings();

            openModal("settingsModal");
        }
    );

    const themeSelect =
        getElement("#themeSelect");

    themeSelect?.addEventListener(
        "change",
        () => {

            state.settings.theme =
                themeSelect.value;

            applySettings();

            saveLocalSettings();
        }
    );

    const soundToggle =
        getElement("#soundToggle");

    soundToggle?.addEventListener(
        "change",
        () => {

            state.settings.sound =
                soundToggle.checked;

            saveLocalSettings();
        }
    );

    const enterToggle =
        getElement("#enterToSendToggle");

    enterToggle?.addEventListener(
        "change",
        () => {

            state.settings.enterToSend =
                enterToggle.checked;

            saveLocalSettings();
        }
    );
}


/* =========================================================
   60. MODERATION BUTTONS
   ========================================================= */

function setupModerationButtons() {

    const moderationButton =
        getElement(
            "#moderationButton",
            '[data-open="moderationModal"]'
        );

    moderationButton?.addEventListener(
        "click",
        () => {

            if (!state.isModerator) {

                toast(
                    "You don't have moderation permissions.",
                    "error"
                );

                return;
            }

            renderReports();

            renderModerationUsers();

            renderModerationLogs();

            openModal("moderationModal");
        }
    );

    const submitReportButton =
        getElement("#submitReportButton");

    submitReportButton?.addEventListener(
        "click",
        submitReport
    );
}


/* =========================================================
   61. MODERATION TABS
   ========================================================= */

function setupModerationTabs() {

    $$(".moderation-tab").forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                $$(".moderation-tab")
                    .forEach(other => {
                        other.classList.remove("active");
                    });

                $$(".moderation-tab-content")
                    .forEach(content => {
                        content.classList.add("hidden");
                    });

                tab.classList.add("active");

                const target =
                    document.getElementById(
                        tab.dataset.target
                    );

                target?.classList.remove(
                    "hidden"
                );
            }
        );
    });
}


/* =========================================================
   62. MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {

    const menuButton =
        getElement(
            "#mobileMenuButton",
            ".mobile-menu-button"
        );

    menuButton?.addEventListener(
        "click",
        openSidebarMobile
    );

    const closeButton =
        getElement(
            "#sidebarCloseButton",
            ".sidebar-close-button"
        );

    closeButton?.addEventListener(
        "click",
        closeSidebarMobile
    );

    const overlay =
        getElement(".mobile-overlay");

    overlay?.addEventListener(
        "click",
        closeSidebarMobile
    );
}


/* =========================================================
   63. ONLINE USERS
   ========================================================= */

function setupOnlineUserInteractions() {

    const container =
        getElement(
            "#onlineUsers",
            ".online-users"
        );

    container?.addEventListener(
        "click",
        event => {

            const user =
                event.target.closest(
                    ".online-user"
                );

            if (!user) {
                return;
            }

            openUserProfile(
                user.dataset.uid
            );
        }
    );
}


/* =========================================================
   64. MESSAGE INTERACTIONS
   ========================================================= */

function setupMessageInteractions() {

    const container =
        getElement(
            "#messages",
            ".messages"
        );

    if (!container) {
        return;
    }

    container.addEventListener(
        "click",
        event => {

            const username =
                event.target.closest(
                    ".message-username"
                );

            if (username) {

                openUserProfile(
                    username.dataset.profileId
                );

                return;
            }

            const action =
                event.target.closest(
                    ".message-action"
                );

            if (!action) {
                return;
            }

            const message =
                action.closest(".message");

            if (!message) {
                return;
            }

            const messageId =
                message.dataset.messageId;

            switch (
                action.dataset.action
            ) {

                case "reply":
                    startReply(messageId);
                    break;

                case "edit":
                    editMessage(messageId);
                    break;

                case "delete":
                    deleteMessage(messageId);
                    break;

                case "report":
                    openReport(messageId);
                    break;
            }
        }
    );
}


/* =========================================================
   65. GLOBAL CLICKS
   ========================================================= */

function setupGlobalClicks() {

    document.addEventListener(
        "click",
        async event => {

            const acceptRulesButton =
                event.target.closest(
                    "#acceptRulesButton"
                );

            if (acceptRulesButton) {

                acceptRules();

                return;
            }

            const colorOption =
                event.target.closest(
                    ".color-option"
                );

            if (colorOption) {
                return;
            }

            const banButton =
                event.target.closest(
                    "[data-ban]"
                );

            if (banButton) {

                await banUser(
                    banButton.dataset.ban
                );

                return;
            }

            const unbanButton =
                event.target.closest(
                    "[data-unban]"
                );

            if (unbanButton) {

                await unbanUser(
                    unbanButton.dataset.unban
                );

                return;
            }

            const promoteButton =
                event.target.closest(
                    "[data-promote]"
                );

            if (promoteButton) {

                const uid =
                    promoteButton.dataset.promote;

                const role =
                    prompt(
                        "Enter role: user, moderator, admin, owner"
                    );

                if (
                    role === "user" ||
                    role === "moderator" ||
                    role === "admin" ||
                    role === "owner"
                ) {

                    await changeUserRole(
                        uid,
                        role
                    );
                }

                return;
            }

            const resolveButton =
                event.target.closest(
                    '[data-report-action="resolve"]'
                );

            if (resolveButton) {

                await resolveReport(
                    resolveButton.dataset.reportId
                );

                return;
            }

            const reportBanButton =
                event.target.closest(
                    '[data-report-action="ban"]'
                );

            if (reportBanButton) {

                await banUser(
                    reportBanButton.dataset.reportUser
                );

                return;
            }
        }
    );
}


/* =========================================================
   66. MODERATION VISIBILITY
   ========================================================= */

function updateModerationVisibility() {

    const moderationButton =
        getElement(
            "#moderationButton",
            '[data-open="moderationModal"]'
        );

    if (!moderationButton) {
        return;
    }

    if (state.isModerator) {

        moderationButton.classList.remove(
            "hidden"
        );

    } else {

        moderationButton.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   67. SETUP AFTER DOM
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        state.acceptedRules =
            getRulesAccepted();

        loadLocalSettings();

        setupModerationTabs();

        applySettings();

    }
);


/* =========================================================
   68. START
   ========================================================= */

startAuthentication();


/* =========================================================
   69. DEBUG HELPERS
   ========================================================= */

window.Mochachat = {

    state,

    sendMessage,

    switchRoom,

    openModal,

    closeModal,

    openUserProfile,

    banUser,

    unbanUser,

    changeUserRole,

    generateUsername

};

console.log(
    "%cMochachat ♡",
    "font-size:22px;font-weight:900;color:#ff79a9"
);

console.log(
    "Firebase chat system loaded."
);
