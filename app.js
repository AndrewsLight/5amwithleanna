/* =========================================================
   5AMWITHLEANNA — ANIME TRACKER
   AniList-powered frontend

   Works with:
   - index.html
   - style.css

   AniList OAuth:
   - Implicit Grant
   - Access token returned in URL hash
   - Viewer -> authenticated user
   - MediaListCollection(userId) -> anime library
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
    CLIENT_ID: "49199",

    API_URL: "https://graphql.anilist.co",

    OAUTH_URL:
        "https://anilist.co/api/v2/oauth/authorize",

    TOKEN_KEY:
        "5am_anilist_token",

    CONTINUE_KEY:
        "5am_continue_watching",

    CACHE_KEY:
        "5am_anilist_cache",

    CACHE_TIME:
        5 * 60 * 1000
};


/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {
    token: null,

    user: null,

    lists: [],

    anime: [],

    currentView: "home",

    currentAnime: null,

    searchTimer: null,

    isLoading: false
};


/* =========================================================
   DOM HELPERS
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function $$(selector) {
    return document.querySelectorAll(selector);
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);


async function initializeApp() {

    setupNavigation();

    setupSearch();

    setupButtons();

    setupModal();

    setupMobileMenu();

    /*
     * First check whether AniList just redirected us
     * with a new access token.
     */
    const urlToken =
        readTokenFromURL();

    if (urlToken) {
        state.token = urlToken;
    } else {
        state.token =
            localStorage.getItem(
                CONFIG.TOKEN_KEY
            );
    }


    updateAuthUI();

    renderContinueWatching();


    /*
     * No automatic AniList redirect.
     *
     * This prevents the redirect loop you were
     * previously getting.
     */

    if (!state.token) {

        showLoggedOutState();

        return;
    }


    await loadAniList();

}


/* =========================================================
   OAUTH
========================================================= */

function loginAniList() {

    const url =
        `${CONFIG.OAUTH_URL}` +
        `?client_id=${encodeURIComponent(CONFIG.CLIENT_ID)}` +
        `&response_type=token`;


    /*
     * AniList's current Implicit Grant authorization
     * request uses client_id + response_type=token.
     */

    window.location.href = url;
}


function logoutAniList() {

    localStorage.removeItem(
        CONFIG.TOKEN_KEY
    );

    localStorage.removeItem(
        CONFIG.CACHE_KEY
    );


    state.token = null;

    state.user = null;

    state.lists = [];

    state.anime = [];

    state.currentAnime = null;


    updateAuthUI();

    showLoggedOutState();


    showToast(
        "Logged out of AniList."
    );
}


/* =========================================================
   READ TOKEN FROM REDIRECT
========================================================= */

function readTokenFromURL() {

    const hash =
        window.location.hash;


    if (!hash) {
        return null;
    }


    const params =
        new URLSearchParams(
            hash.substring(1)
        );


    /*
     * AniList returns:
     *
     * #access_token=...
     */

    const token =
        params.get(
            "access_token"
        );


    /*
     * Check for an OAuth error too.
     */

    const error =
        params.get("error");


    if (error) {

        const description =
            params.get(
                "error_description"
            );


        window.history.replaceState(
            {},
            document.title,
            window.location.pathname +
            window.location.search
        );


        showToast(
            description ||
            `AniList login failed: ${error}`
        );


        return null;
    }


    if (!token) {
        return null;
    }


    /*
     * Save token locally.
     */

    localStorage.setItem(
        CONFIG.TOKEN_KEY,
        token
    );


    /*
     * Remove token from the visible
     * browser URL.
     */

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname +
        window.location.search
    );


    return token;
}


/* =========================================================
   GRAPHQL REQUEST
========================================================= */

async function anilistRequest(
    query,
    variables = {},
    options = {}
) {

    if (!state.token) {

        throw new Error(
            "You are not logged into AniList."
        );
    }


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            options.timeout || 20000
        );


    try {

        const response =
            await fetch(
                CONFIG.API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${state.token}`
                    },

                    body:
                        JSON.stringify({
                            query,
                            variables
                        }),

                    signal:
                        controller.signal
                }
            );


        let json;

        try {

            json =
                await response.json();

        } catch {

            throw new Error(
                "AniList returned an invalid response."
            );

        }


        /*
         * HTTP-level errors.
         */

        if (!response.ok) {

            const message =
                json?.errors?.[0]?.message ||
                `AniList HTTP ${response.status}`;

            throw new Error(
                message
            );
        }


        /*
         * GraphQL errors.
         */

        if (
            Array.isArray(
                json.errors
            ) &&
            json.errors.length
        ) {

            const message =
                json.errors
                    .map(
                        error =>
                            error.message
                    )
                    .filter(Boolean)
                    .join(" | ");


            throw new Error(
                message ||
                "AniList GraphQL request failed."
            );
        }


        if (!json.data) {

            throw new Error(
                "AniList returned no data."
            );
        }


        return json.data;

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "AniList request timed out. Try refreshing."
            );

        }


        throw error;

    } finally {

        clearTimeout(
            timeout
        );

    }
}


/* =========================================================
   LOAD ANILIST
========================================================= */

async function loadAniList() {

    if (state.isLoading) {
        return;
    }


    state.isLoading = true;


    showLoadingState();


    try {

        /*
         * -----------------------------------------
         * STEP 1
         * Get authenticated AniList user.
         * -----------------------------------------
         */

        const viewerData =
            await anilistRequest(`

                query {

                    Viewer {

                        id

                        name

                        avatar {
                            large
                            medium
                        }

                        about

                        siteUrl

                    }

                }

            `);


        state.user =
            viewerData.Viewer;


        if (!state.user) {

            throw new Error(
                "AniList did not return your account."
            );
        }


        /*
         * -----------------------------------------
         * STEP 2
         * Get the complete anime lists.
         *
         * AniList does NOT infer the user for
         * MediaListCollection, even with a token.
         * -----------------------------------------
         */

        const listData =
            await anilistRequest(

                `

                query (
                    $userId: Int!
                ) {

                    MediaListCollection(
                        userId: $userId
                        type: ANIME
                    ) {

                        lists {

                            name

                            status

                            isCustomList

                            isSplitCompletedList

                            entries {

                                id

                                userId

                                mediaId

                                status

                                score

                                progress
                                progressVolumes

                                repeat

                                priority

                                private

                                notes

                                hiddenFromStatusLists

                                customLists

                                advancedScores

                                startedAt {
                                    year
                                    month
                                    day
                                }

                                completedAt {
                                    year
                                    month
                                    day
                                }

                                updatedAt

                                createdAt

                                media {

                                    id

                                    type

                                    title {
                                        userPreferred
                                        romaji
                                        english
                                        native
                                    }

                                    description(
                                        asHtml: false
                                    )

                                    episodes

                                    duration

                                    status

                                    format

                                    season

                                    seasonYear

                                    averageScore

                                    meanScore

                                    genres

                                    countryOfOrigin

                                    isAdult

                                    coverImage {
                                        extraLarge
                                        large
                                        medium
                                        color
                                    }

                                    bannerImage

                                    siteUrl

                                    nextAiringEpisode {
                                        id
                                        episode
                                        airingAt
                                        timeUntilAiring
                                    }

                                    startDate {
                                        year
                                        month
                                        day
                                    }

                                    endDate {
                                        year
                                        month
                                        day
                                    }

                                }

                            }

                        }

                    }

                }

                `,

                {
                    userId:
                        Number(
                            state.user.id
                        )
                }

            );


        state.lists =
            listData
                .MediaListCollection
                ?.lists ||
            [];


        /*
         * -----------------------------------------
         * STEP 3
         * Convert all lists into one collection.
         * -----------------------------------------
         */

        state.anime =
            flattenAniListLists(
                state.lists
            );


        /*
         * Cache data locally.
         */

        saveCache();


        /*
         * Update application.
         */

        updateAuthUI();

        renderHome();

        renderContinueWatching();


        /*
         * If currently looking at a library,
         * refresh the current library too.
         */

        if (
            [
                "watching",
                "completed",
                "planning",
                "paused",
                "dropped"
            ].includes(
                state.currentView
            )
        ) {

            renderLibrary(
                state.currentView
            );

        }


        showToast(
            `Loaded ${state.anime.length} anime from AniList.`
        );


    } catch (error) {

        console.error(
            "AniList load failed:",
            error
        );


        handleAniListError(
            error
        );

    } finally {

        state.isLoading = false;

    }
}


/* =========================================================
   FLATTEN ANILIST LISTS
========================================================= */

function flattenAniListLists(
    lists
) {

    const mediaMap =
        new Map();


    for (
        const list of lists
    ) {

        if (
            !Array.isArray(
                list.entries
            )
        ) {

            continue;
        }


        for (
            const entry of list.entries
        ) {

            if (
                !entry ||
                !entry.media
            ) {

                continue;
            }


            const mediaId =
                entry.media.id;


            /*
             * Preserve custom list information.
             */

            if (
                !mediaMap.has(
                    mediaId
                )
            ) {

                mediaMap.set(
                    mediaId,
                    {

                        ...entry,

                        media:
                            entry.media,

                        lists: [
                            list.name
                        ]

                    }
                );


            } else {

                const existing =
                    mediaMap.get(
                        mediaId
                    );


                if (
                    !existing.lists.includes(
                        list.name
                    )
                ) {

                    existing.lists.push(
                        list.name
                    );

                }


                /*
                 * Keep whichever entry has the
                 * most recently updated data.
                 */

                if (
                    (entry.updatedAt || 0) >
                    (existing.updatedAt || 0)
                ) {

                    existing.status =
                        entry.status;

                    existing.score =
                        entry.score;

                    existing.progress =
                        entry.progress;

                    existing.progressVolumes =
                        entry.progressVolumes;

                    existing.repeat =
                        entry.repeat;

                    existing.priority =
                        entry.priority;

                    existing.private =
                        entry.private;

                    existing.notes =
                        entry.notes;

                    existing.updatedAt =
                        entry.updatedAt;

                }

            }

        }

    }


    return Array.from(
        mediaMap.values()
    );

}


/* =========================================================
   FILTER BY ANILIST STATUS
========================================================= */

function getEntriesByStatus(
    status
) {

    return state.anime.filter(
        entry =>
            entry.status ===
            status
    );

}


/* =========================================================
   HOME PAGE
========================================================= */

function renderHome() {

    if (!state.user) {

        showLoggedOutState();

        return;
    }


    /*
     * Welcome text.
     */

    $("#welcome-title").textContent =
        `Welcome back, ${state.user.name}.`;


    $("#welcome-description").textContent =
        `${state.anime.length} anime are in your AniList library.`;


    $("#hero-login").style.display =
        "none";


    /*
     * Currently watching.
     */

    const watching =
        getEntriesByStatus(
            "CURRENT"
        );


    renderAnimeGrid(
        "#watching-grid",
        watching.slice(0, 6)
    );


    /*
     * Recently updated.
     */

    const recent =
        [...state.anime]
            .sort(
                (a, b) =>
                    (b.updatedAt || 0) -
                    (a.updatedAt || 0)
            )
            .slice(
                0,
                6
            );


    renderAnimeGrid(
        "#recent-grid",
        recent
    );


    /*
     * Continue Watching.
     */

    renderContinueWatching();

}


/* =========================================================
   LIBRARY
========================================================= */

const LIBRARY_CONFIG = {

    watching: {
        title: "Currently Watching",
        status: "CURRENT"
    },

    completed: {
        title: "Completed",
        status: "COMPLETED"
    },

    planning: {
        title: "Planning",
        status: "PLANNING"
    },

    paused: {
        title: "Paused",
        status: "PAUSED"
    },

    dropped: {
        title: "Dropped",
        status: "DROPPED"
    }

};


function renderLibrary(
    libraryName
) {

    const config =
        LIBRARY_CONFIG[
            libraryName
        ];


    if (!config) {
        return;
    }


    const entries =
        getEntriesByStatus(
            config.status
        );


    $("#library-kicker").textContent =
        "ANILIST LIBRARY";


    $("#library-title").textContent =
        config.title;


    $("#library-count").textContent =
        `${entries.length} anime`;


    renderAnimeGrid(
        "#library-grid",
        entries
    );

}


/* =========================================================
   ANIME GRID
========================================================= */

function renderAnimeGrid(
    selector,
    entries
) {

    const container =
        $(selector);


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !entries ||
        !entries.length
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Nothing here yet.
                </p>

            </div>

        `;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    for (
        const entry of entries
    ) {

        fragment.appendChild(
            createAnimeCard(
                entry
            )
        );

    }


    container.appendChild(
        fragment
    );

}


/* =========================================================
   ANIME CARD
========================================================= */

function createAnimeCard(
    entry
) {

    const media =
        entry.media;


    const title =
        getBestTitle(
            media
        );


    const poster =
        media.coverImage?.large ||
        media.coverImage?.medium ||
        "";


    const episodes =
        Number(
            media.episodes
        ) || 0;


    const progress =
        Number(
            entry.progress
        ) || 0;


    let percent =
        0;


    if (
        episodes > 0
    ) {

        percent =
            Math.min(
                100,
                (
                    progress /
                    episodes
                ) * 100
            );

    }


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "anime-card";


    card.tabIndex = 0;


    card.setAttribute(
        "data-anime-id",
        String(
            media.id
        )
    );


    card.innerHTML = `

        <div class="poster-wrap">

            ${
                poster

                ?

                `
                <img
                    src="${escapeAttribute(poster)}"
                    alt="${escapeAttribute(title)}"
                    loading="lazy"
                    decoding="async"
                >
                `

                :

                `
                <div
                    class="poster-fallback"
                    aria-label="${escapeAttribute(title)}"
                >
                    ${escapeHTML(title)}
                </div>
                `
            }


            <div class="card-overlay">

                <button
                    class="play-button"
                    type="button"
                    aria-label="Open anime"
                >
                    ▶
                </button>

            </div>

        </div>


        <div class="card-title">
            ${escapeHTML(title)}
        </div>


        <div class="card-subtitle">

            ${
                entry.status ===
                "CURRENT"

                ?

                `Episode ${progress}${
                    episodes
                        ? ` / ${episodes}`
                        : ""
                }`

                :

                formatAnimeStatus(
                    entry.status ||
                    media.status
                )

            }

        </div>


        ${
            episodes > 0 &&
            progress > 0

            ?

            `
            <div
                class="progress-bar"
                aria-label="Anime progress"
            >

                <div
                    class="progress-fill"
                    style="width:${percent}%"
                ></div>

            </div>
            `

            :

            ""
        }

    `;


    card.addEventListener(
        "click",
        () =>
            openAnime(
                Number(
                    media.id
                )
            )
    );


    card.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                openAnime(
                    Number(
                        media.id
                    )
                );

            }

        }
    );


    return card;
}


/* =========================================================
   OPEN ANIME
========================================================= */

async function openAnime(
    animeId
) {

    showToast(
        "Loading anime..."
    );


    /*
     * Find our existing list entry.
     */

    let entry =
        state.anime.find(
            item =>
                Number(
                    item.media.id
                ) ===
                Number(
                    animeId
                )
        );


    try {

        /*
         * Request fresh metadata from AniList.
         */

        const data =
            await anilistRequest(

                `

                query (
                    $id: Int!
                ) {

                    Media(
                        id: $id
                        type: ANIME
                    ) {

                        id

                        title {
                            userPreferred
                            romaji
                            english
                            native
                        }

                        description(
                            asHtml: false
                        )

                        episodes

                        duration

                        status

                        format

                        season

                        seasonYear

                        averageScore

                        meanScore

                        genres

                        countryOfOrigin

                        isAdult

                        coverImage {
                            extraLarge
                            large
                            medium
                        }

                        bannerImage

                        siteUrl

                        nextAiringEpisode {
                            id
                            episode
                            airingAt
                            timeUntilAiring
                        }

                        startDate {
                            year
                            month
                            day
                        }

                        endDate {
                            year
                            month
                            day
                        }

                    }

                }

                `,

                {
                    id:
                        Number(
                            animeId
                        )
                }

            );


        if (
            !data ||
            !data.Media
        ) {

            throw new Error(
                "AniList could not find that anime."
            );

        }


        /*
         * If it wasn't already in the user's list,
         * make a temporary entry so the modal still works.
         */

        if (!entry) {

            entry = {

                id: null,

                status: null,

                progress: 0,

                score: 0,

                updatedAt: 0,

                media:
                    data.Media

            };

        } else {

            entry = {
                ...entry,
                media:
                    data.Media
            };

        }


        state.currentAnime =
            entry;


        renderAnimeModal(
            entry
        );


        showToast(
            "Anime loaded."
        );


    } catch (error) {

        console.error(
            "Anime detail error:",
            error
        );


        showToast(
            error.message ||
            "Could not load anime."
        );

    }

}


/* =========================================================
   MODAL RENDER
========================================================= */

function renderAnimeModal(
    entry
) {

    const media =
        entry.media;


    const title =
        getBestTitle(
            media
        );


    const englishTitle =
        media.title?.english;


    /*
     * Title
     */

    $("#modal-title").textContent =
        title;


    /*
     * Subtitle
     */

    if (
        englishTitle &&
        englishTitle !== title
    ) {

        $("#modal-subtitle").textContent =
            englishTitle;

    } else {

        $("#modal-subtitle").textContent =
            media.title?.romaji ||
            media.title?.native ||
            "";

    }


    /*
     * Status
     */

    $("#modal-status").textContent =
        formatAnimeStatus(
            entry.status ||
            media.status
        );


    /*
     * Description
     */

    $("#modal-description").textContent =
        cleanDescription(
            media.description
        );


    /*
     * Metadata
     */

    const metadata = [];


    if (
        media.format
    ) {

        metadata.push(
            formatAnimeStatus(
                media.format
            )
        );

    }


    if (
        media.episodes
    ) {

        metadata.push(
            `${media.episodes} episodes`
        );

    }


    if (
        media.duration
    ) {

        metadata.push(
            `${media.duration} min`
        );

    }


    if (
        media.seasonYear
    ) {

        metadata.push(
            String(
                media.seasonYear
            )
        );

    }


    if (
        Number.isFinite(
            media.averageScore
        ) &&
        media.averageScore > 0
    ) {

        metadata.push(
            `★ ${(media.averageScore / 10).toFixed(1)}`
        );

    }


    $("#modal-meta").innerHTML =
        metadata
            .map(
                item =>
                    `
                    <span class="meta-item">
                        ${escapeHTML(item)}
                    </span>
                    `
            )
            .join("");


    /*
     * Genres
     */

    $("#modal-genres").innerHTML =
        (media.genres || [])
            .map(
                genre =>
                    `
                    <span class="genre">
                        ${escapeHTML(genre)}
                    </span>
                    `
            )
            .join("");


    /*
     * Poster
     */

    const poster =
        media.coverImage?.extraLarge ||
        media.coverImage?.large ||
        media.coverImage?.medium;


    if (poster) {

        $("#modal-poster").src =
            poster;

        $("#modal-poster").alt =
            title;

    } else {

        $("#modal-poster").removeAttribute(
            "src"
        );

        $("#modal-poster").alt =
            "";

    }


    /*
     * Banner
     */

    const banner =
        media.bannerImage ||
        media.coverImage?.extraLarge ||
        media.coverImage?.large;


    if (banner) {

        $("#modal-banner").style.backgroundImage =
            `url("${escapeAttribute(banner)}")`;

    } else {

        $("#modal-banner").style.backgroundImage =
            "none";

    }


    /*
     * User progress
     */

    renderModalProgress(
        entry
    );


    /*
     * Open AniList button.
     */

    $("#anilist-button").onclick =
        () => {

            if (
                media.siteUrl
            ) {

                window.open(
                    media.siteUrl,
                    "_blank",
                    "noopener,noreferrer"
                );

            }

        };


    /*
     * Continue Watching.
     */

    $("#continue-button").onclick =
        () => {

            saveContinueWatching(
                media.id,
                entry
            );


            renderContinueWatching();


            showToast(
                `${title} added to Continue Watching.`
            );

        };


    /*
     * Show modal.
     */

    $("#anime-modal")
        .classList
        .remove(
            "hidden"
        );

}


/* =========================================================
   MODAL PROGRESS
========================================================= */

function renderModalProgress(
    entry
) {

    const media =
        entry.media;


    const progress =
        Number(
            entry.progress
        ) || 0;


    const episodes =
        Number(
            media.episodes
        ) || 0;


    if (
        !episodes
    ) {

        $("#modal-progress").innerHTML =
            "";

        return;
    }


    const percentage =
        Math.min(
            100,
            (
                progress /
                episodes
            ) * 100
        );


    $("#modal-progress").innerHTML = `

        <div class="card-subtitle">

            Progress:
            <strong>
                ${progress}
            </strong>
            /
            <strong>
                ${episodes}
            </strong>

        </div>


        <div class="progress-bar">

            <div
                class="progress-fill"
                style="width:${percentage}%"
            ></div>

        </div>

    `;

}


/* =========================================================
   CONTINUE WATCHING
========================================================= */

function getContinueWatching() {

    try {

        const raw =
            localStorage.getItem(
                CONFIG.CONTINUE_KEY
            );


        if (!raw) {
            return [];
        }


        const parsed =
            JSON.parse(
                raw
            );


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    } catch {

        return [];

    }

}


function saveContinueWatching(
    mediaId,
    entry
) {

    const list =
        getContinueWatching();


    const id =
        Number(
            mediaId
        );


    const existing =
        list.find(
            item =>
                Number(
                    item.mediaId
                ) ===
                id
        );


    if (existing) {

        existing.episode =
            Number(
                entry.progress
            ) || 0;


        existing.updatedAt =
            Date.now();

    } else {

        list.unshift({

            mediaId:
                id,

            episode:
                Number(
                    entry.progress
                ) || 0,

            timestamp:
                0,

            updatedAt:
                Date.now()

        });

    }


    /*
     * Keep this manageable.
     */

    const trimmed =
        list
            .sort(
                (a, b) =>
                    (b.updatedAt || 0) -
                    (a.updatedAt || 0)
            )
            .slice(
                0,
                50
            );


    localStorage.setItem(
        CONFIG.CONTINUE_KEY,
        JSON.stringify(
            trimmed
        )
    );

}


/* =========================================================
   RENDER CONTINUE WATCHING
========================================================= */

function renderContinueWatching() {

    const container =
        $("#continue-grid");


    if (!container) {
        return;
    }


    const saved =
        getContinueWatching();


    const entries =
        saved
            .map(
                savedEntry => {

                    const entry =
                        state.anime.find(
                            item =>
                                Number(
                                    item.media.id
                                ) ===
                                Number(
                                    savedEntry.mediaId
                                )
                        );


                    if (!entry) {

                        return null;

                    }


                    return {

                        ...entry,

                        progress:
                            savedEntry.episode,

                        resumeTimestamp:
                            savedEntry.timestamp

                    };

                }
            )
            .filter(Boolean)
            .slice(
                0,
                6
            );


    renderAnimeGrid(
        "#continue-grid",
        entries
    );

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const input =
        $("#search-input");


    input.addEventListener(
        "input",
        event => {

            clearTimeout(
                state.searchTimer
            );


            const query =
                event.target.value
                    .trim();


            if (!query) {

                navigate(
                    "home"
                );

                return;
            }


            state.searchTimer =
                setTimeout(
                    () =>
                        searchAniList(
                            query
                        ),
                    350
                );

        }
    );

}


async function searchAniList(
    query
) {

    showView(
        "search"
    );


    $("#search-title").textContent =
        `Search results for "${query}"`;


    $("#search-grid").innerHTML = `

        <div class="empty-state">

            <p>
                Searching AniList...
            </p>

        </div>

    `;


    try {

        const data =
            await anilistRequest(

                `

                query (
                    $search: String!
                ) {

                    Page(
                        page: 1
                        perPage: 30
                    ) {

                        pageInfo {

                            total

                            currentPage

                            lastPage

                            hasNextPage

                        }

                        media(
                            search: $search
                            type: ANIME
                            sort: SEARCH_MATCH
                        ) {

                            id

                            title {
                                userPreferred
                                romaji
                                english
                                native
                            }

                            description(
                                asHtml: false
                            )

                            episodes

                            duration

                            status

                            format

                            seasonYear

                            averageScore

                            meanScore

                            genres

                            coverImage {
                                extraLarge
                                large
                                medium
                            }

                            bannerImage

                            siteUrl

                            nextAiringEpisode {
                                episode
                                airingAt
                            }

                        }

                    }

                }

                `,

                {
                    search:
                        query
                }

            );


        const media =
            data?.Page?.media ||
            [];


        const entries =
            media.map(
                mediaItem => {

                    const libraryEntry =
                        state.anime.find(
                            entry =>
                                Number(
                                    entry.media.id
                                ) ===
                                Number(
                                    mediaItem.id
                                )
                        );


                    if (
                        libraryEntry
                    ) {

                        return {

                            ...libraryEntry,

                            media:
                                mediaItem

                        };

                    }


                    return {

                        id: null,

                        status: null,

                        progress: 0,

                        score: 0,

                        updatedAt: 0,

                        media:
                            mediaItem

                    };

                }
            );


        renderAnimeGrid(
            "#search-grid",
            entries
        );


        if (!entries.length) {

            $("#search-grid").innerHTML = `

                <div class="empty-state">

                    <p>
                        No anime found.
                    </p>

                </div>

            `;

        }


    } catch (error) {

        console.error(
            "AniList search failed:",
            error
        );


        $("#search-grid").innerHTML = `

            <div class="empty-state">

                <p>
                    Search failed.
                </p>

                <small>
                    ${escapeHTML(
                        error.message
                    )}
                </small>

            </div>

        `;

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    $$(".nav-item").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    navigate(
                        button.dataset.view
                    );

                    closeMobileSidebar();

                }
            );

        }
    );


    $$(".view-all").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    navigate(
                        button.dataset.view
                    );

                }
            );

        }
    );

}


function navigate(
    view
) {

    state.currentView =
        view;


    if (
        view === "home"
    ) {

        showView(
            "home"
        );

        renderHome();

        return;
    }


    if (
        view === "search"
    ) {

        showView(
            "search"
        );

        return;
    }


    if (
        LIBRARY_CONFIG[
            view
        ]
    ) {

        showView(
            "library"
        );

        renderLibrary(
            view
        );

        return;
    }

}


/* =========================================================
   SHOW VIEW
========================================================= */

function showView(
    viewName
) {

    $$(".view").forEach(
        view => {

            view.classList.remove(
                "active-view"
            );

        }
    );


    const view =
        $(`#${viewName}-view`);


    if (view) {

        view.classList.add(
            "active-view"
        );

    }


    $$(".nav-item").forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.view ===
                state.currentView
            );

        }
    );

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

    $("#auth-button").addEventListener(
        "click",
        () => {

            if (state.token) {

                logoutAniList();

            } else {

                loginAniList();

            }

        }
    );


    $("#hero-login").addEventListener(
        "click",
        loginAniList
    );


    $("#refresh-button").addEventListener(
        "click",
        async () => {

            if (!state.token) {

                loginAniList();

                return;
            }


            await loadAniList();

        }
    );

}


/* =========================================================
   MODAL
========================================================= */

function setupModal() {

    $("#close-modal").addEventListener(
        "click",
        closeAnimeModal
    );


    $(".modal-backdrop").addEventListener(
        "click",
        closeAnimeModal
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeAnimeModal();

            }

        }
    );

}


function closeAnimeModal() {

    $("#anime-modal")
        .classList
        .add(
            "hidden"
        );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

    $("#mobile-menu").addEventListener(
        "click",
        () => {

            $("#sidebar")
                .classList
                .toggle(
                    "open"
                );

        }
    );

}


function closeMobileSidebar() {

    $("#sidebar")
        .classList
        .remove(
            "open"
        );

}


/* =========================================================
   AUTH UI
========================================================= */

function updateAuthUI() {

    const button =
        $("#auth-button");


    const sidebarUser =
        $("#sidebar-user");


    if (!state.user) {

        button.textContent =
            "Login with AniList";


        sidebarUser.innerHTML = `

            <div class="avatar-placeholder">
            </div>

            <div
                class="sidebar-user-info"
            >

                <strong>
                    Not connected
                </strong>

                <small>
                    AniList
                </small>

            </div>

        `;


        return;
    }


    button.textContent =
        "Logout";


    const avatar =
        state.user.avatar?.large ||
        state.user.avatar?.medium ||
        "";


    sidebarUser.innerHTML = `

        <div
            class="avatar-placeholder"
        >

            ${
                avatar
                    ?
                    `
                    <img
                        src="${escapeAttribute(avatar)}"
                        alt=""
                    >
                    `
                    :
                    ""
            }

        </div>


        <div
            class="sidebar-user-info"
        >

            <strong>
                ${escapeHTML(
                    state.user.name
                )}
            </strong>

            <small>
                AniList
            </small>

        </div>

    `;

}


/* =========================================================
   LOGGED OUT STATE
========================================================= */

function showLoggedOutState() {

    $("#welcome-title").textContent =
        "Your anime. Your way.";


    $("#welcome-description").textContent =
        "Connect your AniList account to instantly load your anime library, progress and watch history.";


    $("#hero-login").style.display =
        "inline-block";


    $("#hero-login").textContent =
        "Connect AniList";


    renderAnimeGrid(
        "#watching-grid",
        []
    );


    renderAnimeGrid(
        "#recent-grid",
        []
    );


    renderAnimeGrid(
        "#continue-grid",
        []
    );


    $("#library-grid").innerHTML =
        "";


    updateAuthUI();

}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoadingState() {

    $("#welcome-title").textContent =
        "Loading your library...";


    $("#welcome-description").textContent =
        "Connecting to AniList and loading your anime.";


    $("#hero-login").style.display =
        "none";


    $("#watching-grid").innerHTML = `
        <div class="empty-state">
            <p>Loading anime...</p>
        </div>
    `;


    $("#recent-grid").innerHTML = `
        <div class="empty-state">
            <p>Loading anime...</p>
        </div>
    `;

}


/* =========================================================
   ERROR HANDLING
========================================================= */

function handleAniListError(
    error
) {

    const message =
        error?.message ||
        "Unknown AniList error.";


    console.error(
        "AniList:",
        message
    );


    const lower =
        message.toLowerCase();


    /*
     * Invalid / expired token.
     */

    if (
        lower.includes("unauthorized") ||
        lower.includes("invalid token") ||
        lower.includes("jwt")
    ) {

        localStorage.removeItem(
            CONFIG.TOKEN_KEY
        );


        state.token = null;

        state.user = null;

        state.anime = [];

        state.lists = [];


        updateAuthUI();


        $("#welcome-title").textContent =
            "Your AniList session expired.";


        $("#welcome-description").textContent =
            "Reconnect your AniList account to continue.";


        $("#hero-login").style.display =
            "inline-block";


        $("#hero-login").textContent =
            "Reconnect AniList";


        showToast(
            "AniList session expired."
        );


        return;
    }


    /*
     * Normal API failure.
     */

    $("#welcome-title").textContent =
        "AniList connection failed.";


    $("#welcome-description").textContent =
        message;


    $("#hero-login").style.display =
        "inline-block";


    $("#hero-login").textContent =
        "Try Again";


    $("#hero-login").onclick =
        () => loadAniList();


    showToast(
        message
    );

}


/* =========================================================
   CACHE
========================================================= */

function saveCache() {

    try {

        const cache = {

            savedAt:
                Date.now(),

            user:
                state.user,

            lists:
                state.lists,

            anime:
                state.anime

        };


        localStorage.setItem(
            CONFIG.CACHE_KEY,
            JSON.stringify(
                cache
            )
        );

    } catch (error) {

        console.warn(
            "Could not cache AniList data.",
            error
        );

    }

}


function loadCache() {

    try {

        const raw =
            localStorage.getItem(
                CONFIG.CACHE_KEY
            );


        if (!raw) {
            return false;
        }


        const cache =
            JSON.parse(
                raw
            );


        if (
            !cache ||
            !cache.savedAt
        ) {

            return false;

        }


        const age =
            Date.now() -
            cache.savedAt;


        if (
            age >
            CONFIG.CACHE_TIME
        ) {

            return false;

        }


        if (
            cache.user
        ) {

            state.user =
                cache.user;

        }


        if (
            Array.isArray(
                cache.lists
            )
        ) {

            state.lists =
                cache.lists;

        }


        if (
            Array.isArray(
                cache.anime
            )
        ) {

            state.anime =
                cache.anime;

        }


        return true;

    } catch {

        return false;

    }

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function getBestTitle(
    media
) {

    if (!media) {
        return "Unknown Anime";
    }


    return (
        media.title?.userPreferred ||
        media.title?.english ||
        media.title?.romaji ||
        media.title?.native ||
        "Unknown Anime"
    );

}


function formatAnimeStatus(
    status
) {

    if (!status) {
        return "Unknown";
    }


    return String(status)
        .replace(
            /_/g,
            " "
        )
        .toLowerCase()
        .replace(
            /\b[a-z]/g,
            letter =>
                letter.toUpperCase()
        );

}


function cleanDescription(
    description
) {

    if (!description) {

        return "No description available.";

    }


    return String(
        description
    )
        .replace(
            /<br\s*\/?>/gi,
            "\n"
        )
        .replace(
            /<[^>]+>/g,
            ""
        )
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .trim();

}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        $("#toast");


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =========================================================
   DEBUG HELPERS
========================================================= */

/*
 * These are intentionally exposed so you can
 * test the application from your browser console.
 *
 * Example:
 *
 *   testAniList()
 *
 * or:
 *
 *   window.animeApp
 */

window.testAniList =
    async function () {

        if (!state.token) {

            console.log(
                "No AniList token."
            );

            return;

        }


        try {

            const data =
                await anilistRequest(`

                    query {

                        Viewer {

                            id
                            name
                            siteUrl

                        }

                    }

                `);


            console.log(
                "AniList Viewer:",
                data.Viewer
            );


        } catch (error) {

            console.error(
                "AniList test failed:",
                error
            );

        }

    };


window.refreshAniList =
    async function () {

        await loadAniList();

    };


window.animeApp =
    state;
