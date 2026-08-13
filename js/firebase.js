/* =========================================================
   CallWeb — Firebase Configuration
   File: js/firebase.js
   ========================================================= */

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   Firebase Configuration
   =========================================================
   Replace these values with your Firebase project config.
   Firebase Console:
   Project Settings → Your Apps → Web App
   ========================================================= */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjA9mR5DoiUYGtgGrDuEL06yJHmcZZEEk",
  authDomain: "callapp-72e39.firebaseapp.com",
  projectId: "callapp-72e39",
  storageBucket: "callapp-72e39.firebasestorage.app",
  messagingSenderId: "888678726875",
  appId: "1:888678726875:web:d35640047a732eed4ba0fe",
  measurementId: "G-NV9BDKB2FZ"
};
/* =========================================================
   Initialize Firebase
   ========================================================= */

const app = initializeApp(firebaseConfig);


/* =========================================================
   Firebase Authentication
   ========================================================= */

const auth = getAuth(app);


/* =========================================================
   Firestore Database
   ========================================================= */

const db = getFirestore(app);


/* =========================================================
   Export
   ========================================================= */

export {
    app,
    auth,
    db
};
