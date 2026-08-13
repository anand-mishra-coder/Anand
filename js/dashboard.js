/* =========================================================
   CallWeb — Dashboard Controller
   File: js/dashboard.js

   FLOW
   ---------------------------------------------------------
   Dashboard
      ↓
   Audio / Video Call Button
      ↓
   call.html
      ↓
   webrtc.js
      ↓
   Firestore signaling
      ↓
   Receiver's call.html
      ↓
   Incoming Call
   ========================================================= */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


/* =========================================================
   CONFIG
========================================================= */

const LOGIN_PAGE = "index.html";
const CALL_PAGE = "call.html";


/* =========================================================
   DOM
========================================================= */

const userList =
    document.getElementById("userList");

const searchInput =
    document.getElementById("searchInput");

const currentUserName =
    document.getElementById("currentUserName");

const currentUserEmail =
    document.getElementById("currentUserEmail");

const profileAvatar =
    document.getElementById("profileAvatar");

const logoutButton =
    document.getElementById("logoutButton");

const emptyState =
    document.getElementById("emptyState");

const loadingState =
    document.getElementById("loadingState");

const dashboardMessage =
    document.getElementById("dashboardMessage");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let allUsers = [];
let unsubscribeUsers = null;
let isOpeningCall = false;


/* =========================================================
   INITIALS
========================================================= */

function getInitials(name = "") {

    const words = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
        return "U";
    }

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
   ESCAPE HTML
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
   LOADING
========================================================= */

function setLoading(show) {

    if (!loadingState) {
        return;
    }

    loadingState.style.display =
        show ? "flex" : "none";
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message = "",
    type = ""
) {

    if (!dashboardMessage) {
        return;
    }

    dashboardMessage.textContent =
        message;

    dashboardMessage.className =
        type
            ? `dashboard-message ${type}`
            : "dashboard-message";
}


/* =========================================================
   CURRENT USER
========================================================= */

function renderCurrentUser(user) {

    if (!user) {
        return;
    }

    const name =
        user.displayName ||
        user.email?.split("@")[0] ||
        "User";

    const email =
        user.email ||
        "";


    if (currentUserName) {
        currentUserName.textContent =
            name;
    }


    if (currentUserEmail) {
        currentUserEmail.textContent =
            email;
    }


    if (profileAvatar) {
        profileAvatar.textContent =
            getInitials(name);
    }
}


/* =========================================================
   CREATE USER CARD
========================================================= */

function createUserCard(user) {

    const name =
        user.displayName ||
        user.name ||
        user.email?.split("@")[0] ||
        "CallWeb User";

    const email =
        user.email ||
        "";

    /*
     * IMPORTANT
     *
     * Firestore may have:
     *
     * uid field
     * OR document ID
     */

    const uid =
        user.uid ||
        user.id ||
        "";

    const photoURL =
        user.photoURL ||
        "";


    if (!uid) {
        return null;
    }


    const card =
        document.createElement("article");

    card.className =
        "user-card";


    card.dataset.uid =
        uid;

    card.dataset.name =
        name.toLowerCase();

    card.dataset.email =
        email.toLowerCase();


    /* =====================================================
       AVATAR
    ===================================================== */

    const avatarHTML =
        photoURL

            ? `
                <img
                    src="${escapeHTML(photoURL)}"
                    alt="${escapeHTML(name)}"
                    class="user-avatar-image"
                >
            `

            : `
                <span class="user-avatar-initials">
                    ${escapeHTML(
                        getInitials(name)
                    )}
                </span>
            `;


    /* =====================================================
       CARD
    ===================================================== */

    card.innerHTML = `

        <div class="user-info">

            <div class="user-avatar">

                ${avatarHTML}

                <span
                    class="online-indicator"
                    title="Available"
                ></span>

            </div>


            <div class="user-details">

                <h3>
                    ${escapeHTML(name)}
                </h3>

                <p>
                    ${escapeHTML(email)}
                </p>

            </div>

        </div>


        <div class="call-actions">


            <!-- =========================================
                 AUDIO CALL
            ========================================== -->

            <button
                type="button"
                class="call-button audio-call-button"
                data-call-type="audio"
                data-user-id="${escapeHTML(uid)}"
                data-user-name="${escapeHTML(name)}"
                data-user-email="${escapeHTML(email)}"
                aria-label="Audio call ${escapeHTML(name)}"
                title="Audio Call"
            >

                <i data-lucide="phone"></i>

            </button>


            <!-- =========================================
                 VIDEO CALL
            ========================================== -->

            <button
                type="button"
                class="call-button video-call-button"
                data-call-type="video"
                data-user-id="${escapeHTML(uid)}"
                data-user-name="${escapeHTML(name)}"
                data-user-email="${escapeHTML(email)}"
                aria-label="Video call ${escapeHTML(name)}"
                title="Video Call"
            >

                <i data-lucide="video"></i>

            </button>

        </div>

    `;


    return card;
}


/* =========================================================
   RENDER USERS
========================================================= */

function renderUsers(users) {

    if (!userList) {
        return;
    }


    userList.innerHTML = "";


    const filteredUsers =
        users.filter(user => {

            const uid =
                user.uid ||
                user.id ||
                "";

            return (
                uid &&
                uid !== currentUser?.uid
            );
        });


    if (!filteredUsers.length) {

        if (emptyState) {
            emptyState.style.display =
                "flex";
        }

        return;
    }


    if (emptyState) {
        emptyState.style.display =
            "none";
    }


    const fragment =
        document.createDocumentFragment();


    filteredUsers.forEach(user => {

        const card =
            createUserCard(user);

        if (card) {
            fragment.appendChild(card);
        }

    });


    userList.appendChild(
        fragment
    );


    refreshIcons();
}


/* =========================================================
   LUCIDE
========================================================= */

function refreshIcons() {

    if (
        window.lucide &&
        typeof window.lucide.createIcons ===
        "function"
    ) {

        window.lucide.createIcons();
    }
}


/* =========================================================
   LOAD USERS
========================================================= */

function loadUsers() {

    if (!currentUser) {
        return;
    }


    setLoading(true);

    showMessage();


    if (unsubscribeUsers) {

        unsubscribeUsers();

        unsubscribeUsers = null;
    }


    const usersRef =
        collection(
            db,
            "users"
        );


    unsubscribeUsers =
        onSnapshot(

            usersRef,

            snapshot => {

                allUsers =
                    snapshot.docs.map(
                        document => ({

                            id:
                                document.id,

                            ...document.data()

                        })
                    );


                console.log(
                    "CallWeb users:",
                    allUsers
                );


                renderUsers(
                    allUsers
                );


                setLoading(false);


                const otherUsers =
                    allUsers.filter(
                        user => {

                            const uid =
                                user.uid ||
                                user.id ||
                                "";

                            return (
                                uid &&
                                uid !==
                                currentUser.uid
                            );
                        }
                    );


                if (!otherUsers.length) {

                    showMessage(
                        "No other users found.",
                        "success"
                    );

                } else {

                    showMessage();
                }

            },

            error => {

                console.error(
                    "Firestore Users Error:",
                    error
                );


                setLoading(false);


                showMessage(
                    "Unable to load users. Check Firestore Rules.",
                    "error"
                );
            }
        );
}


/* =========================================================
   SEARCH
========================================================= */

function searchUsers(value) {

    const search =
        String(value)
            .trim()
            .toLowerCase();


    if (!search) {

        renderUsers(
            allUsers
        );

        return;
    }


    const filtered =
        allUsers.filter(user => {

            const name =
                String(
                    user.displayName ||
                    user.name ||
                    ""
                ).toLowerCase();


            const email =
                String(
                    user.email ||
                    ""
                ).toLowerCase();


            return (
                name.includes(search) ||
                email.includes(search)
            );
        });


    renderUsers(
        filtered
    );
}


/* =========================================================
   SEARCH LISTENER
========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        event => {

            searchUsers(
                event.target.value
            );
        }
    );
}


/* =========================================================
   OPEN CALL PAGE
========================================================= */

function openCallPage(
    receiverId,
    receiverName,
    receiverEmail,
    callType
) {

    /* -----------------------------------------------
       Login check
    ------------------------------------------------ */

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------
       Receiver check
    ------------------------------------------------ */

    if (!receiverId) {

        showMessage(
            "Invalid receiver.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------
       Self call protection
    ------------------------------------------------ */

    if (
        receiverId ===
        currentUser.uid
    ) {

        showMessage(
            "You cannot call yourself.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------
       Call type
    ------------------------------------------------ */

    if (
        callType !== "audio" &&
        callType !== "video"
    ) {

        callType =
            "audio";
    }


    /* -----------------------------------------------
       Prevent double click
    ------------------------------------------------ */

    if (isOpeningCall) {
        return;
    }


    isOpeningCall = true;


    /*
     * IMPORTANT
     *
     * No WebRTC call starts here.
     *
     * We ONLY open call.html.
     *
     * call.html + webrtc.js will start
     * the actual call.
     */


    const params =
        new URLSearchParams();


    params.set(
        "receiverId",
        receiverId
    );


    params.set(
        "receiverName",
        receiverName || "User"
    );


    params.set(
        "receiverEmail",
        receiverEmail || ""
    );


    params.set(
        "type",
        callType
    );


    params.set(
        "callerId",
        currentUser.uid
    );


    params.set(
        "callerName",
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "User"
    );


    params.set(
        "callerEmail",
        currentUser.email || ""
    );


    /*
     * Open dedicated call page.
     */

    window.location.href =
        `${CALL_PAGE}?${params.toString()}`;
}


/* =========================================================
   CALL BUTTON EVENT
========================================================= */

if (userList) {

    userList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".call-button"
                );


            if (!button) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            const receiverId =
                button.dataset.userId ||
                "";


            const receiverName =
                button.dataset.userName ||
                "User";


            const receiverEmail =
                button.dataset.userEmail ||
                "";


            const callType =
                button.dataset.callType ||
                "audio";


            console.log(
                "Opening call page:",
                {
                    receiverId,
                    receiverName,
                    receiverEmail,
                    callType
                }
            );


            openCallPage(
                receiverId,
                receiverName,
                receiverEmail,
                callType
            );

        }
    );
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        if (unsubscribeUsers) {

            unsubscribeUsers();

            unsubscribeUsers = null;
        }


        await signOut(
            auth
        );


        window.location.replace(
            LOGIN_PAGE
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        showMessage(
            "Unable to logout. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   LOGOUT BUTTON
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            currentUser =
                null;


            if (unsubscribeUsers) {

                unsubscribeUsers();

                unsubscribeUsers = null;
            }


            window.location.replace(
                LOGIN_PAGE
            );


            return;
        }


        currentUser =
            user;


        console.log(
            "CallWeb logged in:",
            {
                uid:
                    user.uid,

                name:
                    user.displayName,

                email:
                    user.email
            }
        );


        renderCurrentUser(
            user
        );


        loadUsers();

    }
);


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (unsubscribeUsers) {

            unsubscribeUsers();

            unsubscribeUsers = null;
        }
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

refreshIcons();


console.log(
    "CallWeb Dashboard Controller loaded."
);
