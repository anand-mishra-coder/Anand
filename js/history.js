/* =========================================================
   CallWeb — Professional Call History Controller
   File: js/history.js

   Features:
   • Firebase Authentication
   • Firestore Call History
   • Current-user filtering
   • Audio / Video / Missed filters
   • Search
   • Clear search
   • Loading state
   • Empty state
   • Professional call cards
   • Relative timestamps
   • Duration formatting
   • User initials / avatar
   • Dashboard navigation
   ========================================================= */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


/* =========================================================
   Configuration
   ========================================================= */

const LOGIN_PAGE = "index.html";
const DASHBOARD_PAGE = "dashboard.html";
const PROFILE_PAGE = "profile.html";

const HISTORY_COLLECTION = "callHistory";


/* =========================================================
   DOM
   ========================================================= */

const historySearch =
    document.getElementById("historySearch");

const clearHistorySearch =
    document.getElementById("clearHistorySearch");

const historyList =
    document.getElementById("historyList");

const historyEmpty =
    document.getElementById("historyEmpty");

const historyLoading =
    document.getElementById("historyLoading");

const historyMessage =
    document.getElementById("historyMessage");

const profileButton =
    document.getElementById("profileButton");

const profileAvatar =
    document.getElementById("profileAvatar");

const notificationButton =
    document.getElementById("notificationButton");

const filterButtons =
    document.querySelectorAll(".history-filter");


/* =========================================================
   State
   ========================================================= */

let currentUser = null;

let allHistory = [];

let activeFilter = "all";

let searchTerm = "";

let unsubscribeHistory = null;


/* =========================================================
   Utility
   ========================================================= */

function escapeHTML(value = "") {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   Initials
   ========================================================= */

function getInitials(name = "") {

    const cleanName =
        String(name)
            .trim()
            .replace(/\s+/g, " ");

    if (!cleanName) {
        return "U";
    }

    const words =
        cleanName.split(" ");

    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   Loading
   ========================================================= */

function setLoading(show) {

    if (!historyLoading) {
        return;
    }

    historyLoading.style.display =
        show ? "flex" : "none";
}


/* =========================================================
   Message
   ========================================================= */

function showMessage(
    message = "",
    type = ""
) {

    if (!historyMessage) {
        return;
    }

    historyMessage.textContent =
        message;

    historyMessage.className =
        "history-message";

    if (type) {
        historyMessage.classList.add(type);
    }

    historyMessage.style.display =
        message ? "block" : "none";
}


/* =========================================================
   Current User Avatar
   ========================================================= */

function renderCurrentUser(user) {

    if (!user) {
        return;
    }

    const name =
        user.displayName ||
        user.email?.split("@")[0] ||
        "User";

    if (profileAvatar) {

        profileAvatar.textContent =
            getInitials(name);
    }

    if (user.photoURL) {

        profileAvatar.innerHTML = `
            <img
                src="${escapeHTML(user.photoURL)}"
                alt="${escapeHTML(name)}"
            >
        `;
    }
}


/* =========================================================
   Timestamp
   ========================================================= */

function getDate(timestamp) {

    if (!timestamp) {
        return null;
    }

    if (
        typeof timestamp.toDate ===
        "function"
    ) {
        return timestamp.toDate();
    }

    if (timestamp instanceof Date) {
        return timestamp;
    }

    if (
        typeof timestamp.seconds ===
        "number"
    ) {
        return new Date(
            timestamp.seconds * 1000
        );
    }

    if (
        typeof timestamp ===
        "number"
    ) {
        return new Date(timestamp);
    }

    return null;
}


/* =========================================================
   Format Date
   ========================================================= */

function formatDate(timestamp) {

    const date =
        getDate(timestamp);

    if (!date) {
        return "Unknown date";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);
}


/* =========================================================
   Format Time
   ========================================================= */

function formatTime(timestamp) {

    const date =
        getDate(timestamp);

    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}


/* =========================================================
   Relative Time
   ========================================================= */

function formatRelativeTime(timestamp) {

    const date =
        getDate(timestamp);

    if (!date) {
        return "Unknown";
    }

    const now =
        Date.now();

    const difference =
        now - date.getTime();

    const seconds =
        Math.floor(
            difference / 1000
        );

    if (seconds < 30) {
        return "Just now";
    }

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 7) {
        return `${days}d ago`;
    }

    return formatDate(timestamp);
}


/* =========================================================
   Duration
   ========================================================= */

function formatDuration(seconds = 0) {

    seconds =
        Number(seconds) || 0;

    if (seconds <= 0) {
        return "0 sec";
    }

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const remainingSeconds =
        seconds % 60;


    if (hours > 0) {

        return (
            `${hours}h ` +
            `${String(minutes).padStart(2, "0")}m`
        );
    }


    if (minutes > 0) {

        return (
            `${minutes}m ` +
            `${String(
                remainingSeconds
            ).padStart(2, "0")}s`
        );
    }


    return `${remainingSeconds}s`;
}


/* =========================================================
   Call Type
   ========================================================= */

function normalizeCallType(type) {

    return String(type || "audio")
        .toLowerCase() === "video"
        ? "video"
        : "audio";
}


/* =========================================================
   Call Status
   ========================================================= */

function normalizeStatus(history) {

    const status =
        String(
            history.status || ""
        ).toLowerCase();

    if (
        status === "missed" ||
        status === "rejected" ||
        status === "declined" ||
        status === "no-answer"
    ) {
        return "missed";
    }

    return "completed";
}


/* =========================================================
   Determine Other User
   ========================================================= */

function getOtherUser(history) {

    if (!currentUser) {
        return {
            id: "",
            name: "Unknown User"
        };
    }


    const callerId =
        history.callerId || "";

    const receiverId =
        history.receiverId || "";


    if (
        callerId ===
        currentUser.uid
    ) {

        return {
            id: receiverId,
            name:
                history.receiverName ||
                history.receiverEmail ||
                "User"
        };
    }


    return {
        id: callerId,
        name:
            history.callerName ||
            history.callerEmail ||
            "User"
    };
}


/* =========================================================
   Create History Card
   ========================================================= */

function createHistoryCard(history) {

    const otherUser =
        getOtherUser(history);

    const callType =
        normalizeCallType(
            history.callType
        );

    const status =
        normalizeStatus(history);

    const name =
        otherUser.name ||
        "CallWeb User";

    const initials =
        getInitials(name);

    const isVideo =
        callType === "video";

    const isMissed =
        status === "missed";

    const icon =
        isVideo
            ? "video"
            : "phone";

    const statusText =
        isMissed
            ? "Missed call"
            : "Completed";

    const timestamp =
        history.createdAt ||
        history.startedAt ||
        history.endedAt;

    const card =
        document.createElement("article");

    card.className =
        "history-card";

    card.dataset.callType =
        callType;

    card.dataset.status =
        status;


    card.innerHTML = `

        <div class="history-card-left">

            <div class="history-avatar">

                ${
                    history.photoURL

                        ? `
                            <img
                                src="${escapeHTML(
                                    history.photoURL
                                )}"
                                alt="${escapeHTML(
                                    name
                                )}"
                            >
                          `

                        : `
                            <span>
                                ${escapeHTML(
                                    initials
                                )}
                            </span>
                          `
                }

            </div>


            <div class="history-user-info">

                <h3>
                    ${escapeHTML(name)}
                </h3>


                <div class="history-meta">

                    <span
                        class="history-call-type ${callType}"
                    >

                        <i
                            data-lucide="${icon}"
                        ></i>

                        ${
                            isVideo
                                ? "Video call"
                                : "Audio call"
                        }

                    </span>


                    <span class="history-dot">
                        •
                    </span>


                    <span
                        class="history-status ${status}"
                    >
                        ${statusText}
                    </span>

                </div>

            </div>

        </div>


        <div class="history-card-right">

            <strong class="history-duration">

                ${
                    isMissed
                        ? "Missed"
                        : formatDuration(
                            history.duration
                        )
                }

            </strong>


            <span
                class="history-time"
                title="${escapeHTML(
                    formatDate(timestamp)
                )}"
            >

                ${escapeHTML(
                    formatRelativeTime(
                        timestamp
                    )
                )}

            </span>

        </div>

    `;


    return card;
}


/* =========================================================
   Render History
   ========================================================= */

function renderHistory() {

    if (!historyList) {
        return;
    }


    historyList.innerHTML = "";


    let filtered =
        [...allHistory];


    /* -----------------------------------------
       Filter by type
       ----------------------------------------- */

    if (
        activeFilter ===
        "audio"
    ) {

        filtered =
            filtered.filter(
                item =>
                    normalizeCallType(
                        item.callType
                    ) === "audio"
            );
    }


    if (
        activeFilter ===
        "video"
    ) {

        filtered =
            filtered.filter(
                item =>
                    normalizeCallType(
                        item.callType
                    ) === "video"
            );
    }


    if (
        activeFilter ===
        "missed"
    ) {

        filtered =
            filtered.filter(
                item =>
                    normalizeStatus(
                        item
                    ) === "missed"
            );
    }


    /* -----------------------------------------
       Search
       ----------------------------------------- */

    if (searchTerm) {

        filtered =
            filtered.filter(item => {

                const otherUser =
                    getOtherUser(item);

                const name =
                    String(
                        otherUser.name ||
                        ""
                    ).toLowerCase();

                const type =
                    String(
                        item.callType ||
                        ""
                    ).toLowerCase();

                const status =
                    String(
                        item.status ||
                        ""
                    ).toLowerCase();

                return (
                    name.includes(
                        searchTerm
                    ) ||
                    type.includes(
                        searchTerm
                    ) ||
                    status.includes(
                        searchTerm
                    )
                );
            });
    }


    /* -----------------------------------------
       Empty state
       ----------------------------------------- */

    if (!filtered.length) {

        if (historyEmpty) {
            historyEmpty.style.display =
                "flex";
        }

        return;
    }


    if (historyEmpty) {
        historyEmpty.style.display =
            "none";
    }


    const fragment =
        document.createDocumentFragment();


    filtered.forEach(item => {

        fragment.appendChild(
            createHistoryCard(item)
        );

    });


    historyList.appendChild(
        fragment
    );


    if (window.lucide) {
        window.lucide.createIcons();
    }
}


/* =========================================================
   Load Call History
   ========================================================= */

function loadHistory() {

    if (!currentUser) {
        return;
    }


    setLoading(true);

    showMessage();


    if (unsubscribeHistory) {

        unsubscribeHistory();

        unsubscribeHistory = null;
    }


    const historyRef =
        collection(
            db,
            HISTORY_COLLECTION
        );


    /*
     * We intentionally use only where().
     *
     * This makes the code compatible with
     * old history documents that may not
     * have identical timestamp fields.
     */

    let historyQuery;


    try {

        historyQuery =
            query(
                historyRef,
                where(
                    "callerId",
                    "==",
                    currentUser.uid
                )
            );

    } catch (error) {

        console.error(
            "History Query Error:",
            error
        );

        setLoading(false);

        showMessage(
            "Unable to load call history.",
            "error"
        );

        return;
    }


    unsubscribeHistory =
        onSnapshot(

            historyQuery,

            snapshot => {

                const callerHistory =
                    snapshot.docs.map(
                        document => ({

                            id:
                                document.id,

                            ...document.data()

                        })
                    );


                /*
                 * We also need calls where
                 * current user was receiver.
                 *
                 * Firestore doesn't allow OR
                 * across two separate where
                 * queries here, so load the
                 * receiver side separately.
                 */

                const receiverQuery =
                    query(
                        historyRef,
                        where(
                            "receiverId",
                            "==",
                            currentUser.uid
                        )
                    );


                /*
                 * Second listener is handled
                 * separately below.
                 */

                onSnapshot(
                    receiverQuery,

                    receiverSnapshot => {

                        const receiverHistory =
                            receiverSnapshot.docs.map(
                                document => ({

                                    id:
                                        document.id,

                                    ...document.data()

                                })
                            );


                        const combined =
                            [
                                ...callerHistory,
                                ...receiverHistory
                            ];


                        /*
                         * Remove duplicate documents
                         */

                        const unique =
                            new Map();


                        combined.forEach(
                            item => {

                                unique.set(
                                    item.id,
                                    item
                                );

                            }
                        );


                        allHistory =
                            Array.from(
                                unique.values()
                            );


                        /*
                         * Sort newest first
                         */

                        allHistory.sort(
                            (
                                a,
                                b
                            ) => {

                                const dateA =
                                    getDate(
                                        a.createdAt
                                    )?.getTime() ||
                                    0;

                                const dateB =
                                    getDate(
                                        b.createdAt
                                    )?.getTime() ||
                                    0;

                                return (
                                    dateB -
                                    dateA
                                );
                            }
                        );


                        renderHistory();

                        setLoading(false);

                    },

                    error => {

                        console.error(
                            "Receiver History Error:",
                            error
                        );

                        setLoading(false);

                        showMessage(
                            "Unable to load received calls.",
                            "error"
                        );
                    }
                );

            },

            error => {

                console.error(
                    "Caller History Error:",
                    error
                );

                setLoading(false);

                showMessage(
                    "Unable to load call history. Check Firestore rules.",
                    "error"
                );
            }
        );
}


/* =========================================================
   Search
   ========================================================= */

if (historySearch) {

    historySearch.addEventListener(
        "input",
        event => {

            searchTerm =
                event.target.value
                    .trim()
                    .toLowerCase();


            if (clearHistorySearch) {

                clearHistorySearch.style.display =
                    searchTerm
                        ? "flex"
                        : "none";
            }


            renderHistory();

        }
    );
}


/* =========================================================
   Clear Search
   ========================================================= */

if (clearHistorySearch) {

    clearHistorySearch.addEventListener(
        "click",
        () => {

            if (historySearch) {
                historySearch.value = "";
            }

            searchTerm = "";

            clearHistorySearch.style.display =
                "none";

            renderHistory();

            historySearch?.focus();

        }
    );
}


/* =========================================================
   Filter Buttons
   ========================================================= */

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                activeFilter =
                    button.dataset.filter ||
                    "all";


                renderHistory();

            }
        );

    }
);


/* =========================================================
   Profile
   ========================================================= */

if (profileButton) {

    profileButton.addEventListener(
        "click",
        () => {

            window.location.href =
                PROFILE_PAGE;

        }
    );
}


/* =========================================================
   Notification
   ========================================================= */

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            showMessage(
                "No new notifications.",
                "success"
            );

        }
    );
}


/* =========================================================
   Authentication
   ========================================================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.replace(
                LOGIN_PAGE
            );

            return;
        }


        currentUser =
            user;


        renderCurrentUser(
            user
        );


        loadHistory();

    }
);


/* =========================================================
   Cleanup
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (unsubscribeHistory) {
            unsubscribeHistory();
        }

    }
);


/* =========================================================
   Global API
   ========================================================= */

window.CallWebHistory = {

    refresh() {
        renderHistory();
    },

    getAll() {
        return [...allHistory];
    },

    getCurrentFilter() {
        return activeFilter;
    },

    clearSearch() {

        if (historySearch) {
            historySearch.value = "";
        }

        searchTerm = "";

        renderHistory();
    }

};


/* =========================================================
   Initial Icons
   ========================================================= */

if (window.lucide) {
    window.lucide.createIcons();
}
