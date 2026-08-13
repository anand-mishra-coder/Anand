/* =========================================================
   CallWeb — Profile
   File: js/profile.js
   ========================================================= */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { auth } from "./firebase.js";


/* =========================================================
   DOM Elements
   ========================================================= */

const backButton =
    document.getElementById("backButton");

const logoutButton =
    document.getElementById("logoutButton");

const profileAvatar =
    document.getElementById("profileAvatar");

const profileInitial =
    document.getElementById("profileInitial");

const profilePhoto =
    document.getElementById("profilePhoto");

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const profileProvider =
    document.getElementById("profileProvider");

const infoName =
    document.getElementById("infoName");

const infoEmail =
    document.getElementById("infoEmail");

const infoProvider =
    document.getElementById("infoProvider");

const profileMessage =
    document.getElementById("profileMessage");


/* =========================================================
   Configuration
   ========================================================= */

const LOGIN_PAGE = "index.html";
const DASHBOARD_PAGE = "dashboard.html";


/* =========================================================
   Utility — Message
   ========================================================= */

function showMessage(message, type = "error") {

    if (!profileMessage) return;

    profileMessage.textContent = message;

    profileMessage.className =
        `profile-message ${type}`;
}


function clearMessage() {

    if (!profileMessage) return;

    profileMessage.textContent = "";

    profileMessage.className =
        "profile-message";
}


/* =========================================================
   Utility — Get Initial
   ========================================================= */

function getInitial(user) {

    const name =
        user?.displayName?.trim();

    const email =
        user?.email?.trim();

    if (name) {
        return name.charAt(0).toUpperCase();
    }

    if (email) {
        return email.charAt(0).toUpperCase();
    }

    return "U";
}


/* =========================================================
   Utility — Provider Name
   ========================================================= */

function getProviderName(user) {

    if (!user || !user.providerData) {
        return "Firebase";
    }

    const provider = user.providerData[0];

    if (!provider) {
        return "Firebase";
    }

    switch (provider.providerId) {

        case "google.com":
            return "Google";

        case "password":
            return "Email & Password";

        case "phone":
            return "Phone";

        default:
            return provider.providerId
                .replace(".com", "")
                .replace("-", " ");
    }
}


/* =========================================================
   Display Profile
   ========================================================= */

function displayProfile(user) {

    if (!user) return;


    /* -----------------------------------------------------
       Basic Information
       ----------------------------------------------------- */

    const name =
        user.displayName?.trim() ||
        "CallWeb User";

    const email =
        user.email ||
        "No email available";

    const initial =
        getInitial(user);

    const provider =
        getProviderName(user);


    /* -----------------------------------------------------
       Main Profile
       ----------------------------------------------------- */

    if (profileName) {
        profileName.textContent = name;
    }


    if (profileEmail) {
        profileEmail.textContent = email;
    }


    /* -----------------------------------------------------
       Avatar Initial
       ----------------------------------------------------- */

    if (profileInitial) {
        profileInitial.textContent = initial;
    }


    /* -----------------------------------------------------
       Profile Photo
       ----------------------------------------------------- */

    if (
        user.photoURL &&
        profilePhoto
    ) {

        profilePhoto.src =
            user.photoURL;

        profilePhoto.hidden = false;

        if (profileInitial) {
            profileInitial.style.display =
                "none";
        }

    } else {

        if (profilePhoto) {
            profilePhoto.hidden = true;
            profilePhoto.src = "";
        }

        if (profileInitial) {
            profileInitial.style.display =
                "block";
        }
    }


    /* -----------------------------------------------------
       Provider Badge
       ----------------------------------------------------- */

    if (profileProvider) {

        const span =
            profileProvider.querySelector("span");

        if (span) {

            span.textContent =
                `${provider} account`;

        }
    }


    /* -----------------------------------------------------
       Account Information
       ----------------------------------------------------- */

    if (infoName) {
        infoName.textContent = name;
    }


    if (infoEmail) {
        infoEmail.textContent = email;
    }


    if (infoProvider) {
        infoProvider.textContent =
            provider;
    }


    /* -----------------------------------------------------
       Avatar Error Handling
       ----------------------------------------------------- */

    if (profilePhoto) {

        profilePhoto.onerror = () => {

            profilePhoto.hidden = true;

            profilePhoto.src = "";

            if (profileInitial) {
                profileInitial.style.display =
                    "block";
            }
        };

    }
}


/* =========================================================
   Authentication State
   ========================================================= */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        /*
         * User is not logged in.
         * Send them back to login.
         */

        window.location.replace(
            LOGIN_PAGE
        );

        return;
    }


    /*
     * User is logged in.
     */

    displayProfile(user);

});


/* =========================================================
   Back Button
   ========================================================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            /*
             * If browser history exists,
             * go back to previous page.
             */

            if (window.history.length > 1) {

                window.history.back();

            } else {

                window.location.href =
                    DASHBOARD_PAGE;
            }

        }
    );

}


/* =========================================================
   Logout
   ========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to logout?"
                );

            if (!confirmed) {
                return;
            }


            try {

                clearMessage();

                logoutButton.disabled = true;

                logoutButton.classList.add(
                    "loading"
                );


                await signOut(auth);


                showMessage(
                    "Logged out successfully.",
                    "success"
                );


                setTimeout(() => {

                    window.location.replace(
                        LOGIN_PAGE
                    );

                }, 500);


            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );


                logoutButton.disabled =
                    false;

                logoutButton.classList.remove(
                    "loading"
                );


                showMessage(
                    "Unable to logout. Please try again.",
                    "error"
                );

            }

        }
    );

}


/* =========================================================
   Keyboard Support
   ========================================================= */

document.addEventListener(
    "keydown",
    (event) => {

        /*
         * Escape = Back
         */

        if (
            event.key === "Escape" &&
            backButton
        ) {

            backButton.click();

        }

    }
);
