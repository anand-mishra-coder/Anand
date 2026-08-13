/* =========================================================
   CallWeb — Authentication Controller
   File: js/auth.js
   ========================================================= */

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


/* =========================================================
   Configuration
   ========================================================= */

const DASHBOARD_PAGE = "dashboard.html";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const rememberMe =
    document.getElementById("rememberMe");

const loginBtn =
    document.getElementById("loginBtn");

const loginLoader =
    document.getElementById("loginLoader");

const loginMessage =
    document.getElementById("loginMessage");

const emailError =
    document.getElementById("emailError");

const passwordError =
    document.getElementById("passwordError");

const passwordToggle =
    document.getElementById("passwordToggle");

const forgotPassword =
    document.getElementById("forgotPassword");

const googleSignInButton =
    document.getElementById("googleSignInButton");

const googleLoader =
    document.getElementById("googleLoader");


/* =========================================================
   GOOGLE PROVIDER
   ========================================================= */

const googleProvider =
    new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "error"
) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message;

    loginMessage.className =
        `login-message ${type}`;
}


function clearMessage() {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = "";

    loginMessage.className =
        "login-message";
}


/* =========================================================
   ERRORS
   ========================================================= */

function clearErrors() {

    if (emailError) {
        emailError.textContent = "";
    }

    if (passwordError) {
        passwordError.textContent = "";
    }

    clearMessage();
}


/* =========================================================
   LOADING — EMAIL LOGIN
   ========================================================= */

function setLoginLoading(
    loading
) {

    if (!loginBtn) {
        return;
    }

    loginBtn.disabled =
        loading;

    loginBtn.classList.toggle(
        "loading",
        loading
    );

    if (loginLoader) {
        loginLoader.style.display =
            loading ? "block" : "";
    }
}


/* =========================================================
   LOADING — GOOGLE
   ========================================================= */

function setGoogleLoading(
    loading
) {

    if (!googleSignInButton) {
        return;
    }

    googleSignInButton.disabled =
        loading;

    googleSignInButton.classList.toggle(
        "loading",
        loading
    );

    if (googleLoader) {
        googleLoader.style.display =
            loading ? "block" : "";
    }
}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


/* =========================================================
   FORM VALIDATION
   ========================================================= */

function validateForm() {

    let valid = true;

    const email =
        emailInput?.value.trim() || "";

    const password =
        passwordInput?.value || "";


    if (!email) {

        if (emailError) {
            emailError.textContent =
                "Please enter your email.";
        }

        valid = false;

    } else if (!isValidEmail(email)) {

        if (emailError) {
            emailError.textContent =
                "Please enter a valid email.";
        }

        valid = false;
    }


    if (!password) {

        if (passwordError) {
            passwordError.textContent =
                "Please enter your password.";
        }

        valid = false;

    } else if (password.length < 6) {

        if (passwordError) {
            passwordError.textContent =
                "Password must contain at least 6 characters.";
        }

        valid = false;
    }


    return valid;
}


/* =========================================================
   CREATE / UPDATE FIRESTORE USER
   ========================================================= */

async function createUserProfile(
    user
) {

    if (!user) {
        return;
    }


    const userRef =
        doc(
            db,
            "users",
            user.uid
        );


    const displayName =
        user.displayName ||
        user.email?.split("@")[0] ||
        "User";


    try {

        await setDoc(
            userRef,
            {
                uid:
                    user.uid,

                displayName:
                    displayName,

                email:
                    user.email || "",

                photoURL:
                    user.photoURL || "",

                online:
                    true,

                lastSeen:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp(),

                createdAt:
                    serverTimestamp()
            },
            {
                merge: true
            }
        );

        console.log(
            "User profile saved:",
            user.uid
        );

    } catch (error) {

        console.error(
            "Firestore Profile Error:",
            error
        );

        /*
         * Login should not fail just because
         * the profile write failed.
         */
    }
}


/* =========================================================
   EMAIL / PASSWORD LOGIN
   ========================================================= */

async function loginUser(
    email,
    password
) {

    try {

        setLoginLoading(true);

        clearMessage();


        /* -----------------------------------------
           Remember Me
           ----------------------------------------- */

        await setPersistence(
            auth,
            rememberMe?.checked
                ? browserLocalPersistence
                : browserSessionPersistence
        );


        /* -----------------------------------------
           Firebase Login
           ----------------------------------------- */

        const result =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        /* -----------------------------------------
           Firestore Profile
           ----------------------------------------- */

        await createUserProfile(
            result.user
        );


        showMessage(
            "Login successful. Redirecting...",
            "success"
        );


        setTimeout(() => {

            window.location.href =
                DASHBOARD_PAGE;

        }, 500);


    } catch (error) {

        console.error(
            "Email Login Error:",
            error
        );


        let message =
            "Unable to login. Please try again.";


        switch (error.code) {

            case "auth/invalid-email":

                message =
                    "The email address is invalid.";

                break;


            case "auth/user-not-found":

                message =
                    "No account found with this email.";

                break;


            case "auth/wrong-password":

                message =
                    "Incorrect password.";

                break;


            case "auth/invalid-credential":

                message =
                    "Incorrect email or password.";

                break;


            case "auth/user-disabled":

                message =
                    "This account has been disabled.";

                break;


            case "auth/too-many-requests":

                message =
                    "Too many login attempts. Please try again later.";

                break;


            case "auth/network-request-failed":

                message =
                    "Network error. Check your internet connection.";

                break;
        }


        showMessage(
            message,
            "error"
        );

        setLoginLoading(false);
    }
}


/* =========================================================
   LOGIN FORM
   ========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            clearErrors();


            if (!validateForm()) {
                return;
            }


            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            await loginUser(
                email,
                password
            );
        }
    );
}


/* =========================================================
   GOOGLE SIGN-IN
   ========================================================= */

async function loginWithGoogle() {

    try {

        setGoogleLoading(true);

        clearErrors();


        /* -----------------------------------------
           Remember Google Login
           ----------------------------------------- */

        await setPersistence(
            auth,
            rememberMe?.checked
                ? browserLocalPersistence
                : browserSessionPersistence
        );


        /* -----------------------------------------
           Google Popup
           ----------------------------------------- */

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );


        const user =
            result.user;


        /* -----------------------------------------
           Save User In Firestore
           ----------------------------------------- */

        await createUserProfile(
            user
        );


        showMessage(
            "Google sign-in successful. Redirecting...",
            "success"
        );


        setTimeout(() => {

            window.location.href =
                DASHBOARD_PAGE;

        }, 500);


    } catch (error) {

        console.error(
            "Google Sign-In Error:",
            error
        );


        let message =
            "Google sign-in failed. Please try again.";


        switch (error.code) {

            case "auth/popup-closed-by-user":

                message =
                    "Google sign-in was cancelled.";

                break;


            case "auth/popup-blocked":

                message =
                    "Your browser blocked the Google sign-in popup.";

                break;


            case "auth/cancelled-popup-request":

                message =
                    "Another Google sign-in request is already running.";

                break;


            case "auth/account-exists-with-different-credential":

                message =
                    "An account already exists with this email using another login method.";

                break;


            case "auth/network-request-failed":

                message =
                    "Network error. Check your internet connection.";

                break;


            case "auth/unauthorized-domain":

                message =
                    "This website domain is not authorized in Firebase.";

                break;
        }


        showMessage(
            message,
            "error"
        );


        setGoogleLoading(false);
    }
}


if (googleSignInButton) {

    googleSignInButton.addEventListener(
        "click",
        loginWithGoogle
    );
}


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

if (
    passwordToggle &&
    passwordInput
) {

    passwordToggle.addEventListener(
        "click",
        () => {

            const showing =
                passwordInput.type === "password";


            passwordInput.type =
                showing
                    ? "text"
                    : "password";


            passwordToggle.innerHTML =
                showing
                    ? `<i data-lucide="eye-off"></i>`
                    : `<i data-lucide="eye"></i>`;


            passwordToggle.setAttribute(
                "aria-label",
                showing
                    ? "Hide password"
                    : "Show password"
            );


            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    );
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            clearErrors();


            const email =
                emailInput?.value.trim() || "";


            if (!email) {

                if (emailError) {
                    emailError.textContent =
                        "Enter your email first.";
                }

                emailInput?.focus();

                return;
            }


            if (!isValidEmail(email)) {

                if (emailError) {
                    emailError.textContent =
                        "Enter a valid email address.";
                }

                emailInput?.focus();

                return;
            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                showMessage(
                    "Password reset email sent. Check your inbox.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Password Reset Error:",
                    error
                );


                let message =
                    "Unable to send password reset email.";


                switch (error.code) {

                    case "auth/user-not-found":

                        message =
                            "No account found with this email.";

                        break;


                    case "auth/invalid-email":

                        message =
                            "Invalid email address.";

                        break;


                    case "auth/network-request-failed":

                        message =
                            "Network error. Check your internet.";

                        break;
                }


                showMessage(
                    message,
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   EMAIL INPUT
   ========================================================= */

if (emailInput) {

    emailInput.addEventListener(
        "input",
        () => {

            emailInput.value =
                emailInput.value.replace(
                    /\s/g,
                    ""
                );


            if (emailError) {
                emailError.textContent = "";
            }

            clearMessage();
        }
    );
}


/* =========================================================
   PASSWORD INPUT
   ========================================================= */

if (passwordInput) {

    passwordInput.addEventListener(
        "input",
        () => {

            if (passwordError) {
                passwordError.textContent = "";
            }

            clearMessage();
        }
    );
}


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {
            return;
        }


        console.log(
            "Authenticated user:",
            user.uid
        );


        /*
         * Make sure the Firestore profile exists
         * even when the user was already logged in.
         */

        await createUserProfile(
            user
        );


        const currentPage =
            window.location.pathname
                .split("/")
                .pop();


        if (
            currentPage === "" ||
            currentPage === "index.html"
        ) {

            window.location.href =
                DASHBOARD_PAGE;
        }
    }
);


/* =========================================================
   LOGOUT
   ========================================================= */

export async function logoutUser() {

    try {

        await signOut(auth);

        window.location.href =
            "index.html";

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );

        throw error;
    }
}


/* =========================================================
   GLOBAL AUTH API
   ========================================================= */

window.CallWebAuth = {

    loginWithGoogle,

    logoutUser,

    createUserProfile

};
