/* =========================================================
   CallWeb — WebRTC Calling Engine
   File: js/webrtc.js

   FLOW
   ---------------------------------------------------------
   Dashboard
      ↓
   call.html?receiverId=...&type=audio/video
      ↓
   Firestore call document
      ↓
   Receiver's call.html
      ↓
   Incoming Call
      ↓
   Accept
      ↓
   WebRTC Audio / Video
   ========================================================= */

import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "./firebase.js";


/* =========================================================
   WEBRTC CONFIG
========================================================= */

const RTC_CONFIG = {

    iceServers: [

        {
            urls: "stun:stun.l.google.com:19302"
        },

        {
            urls: "stun:stun1.l.google.com:19302"
        }

    ]

};


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let peerConnection = null;

let localStream = null;

let remoteStream = null;

let currentCallId = null;

let currentCallType = "audio";

let currentCallerId = null;

let currentReceiverId = null;

let currentRemoteName = "User";

let callStartTime = null;

let pendingCandidates = [];

let unsubscribeCall = null;

let unsubscribeCandidates = null;

let unsubscribeIncomingCalls = null;

let isEnding = false;

let callTimerInterval = null;


/* =========================================================
   DOM
========================================================= */

const callLoading =
    document.getElementById("callLoading");

const loadingMessage =
    document.getElementById("loadingMessage");

const outgoingCallModal =
    document.getElementById("outgoingCallModal");

const incomingCallModal =
    document.getElementById("incomingCallModal");

const activeCallModal =
    document.getElementById("activeCallModal");

const callModal =
    document.getElementById("callModal");


/* =========================================================
   OUTGOING
========================================================= */

const outgoingAvatar =
    document.getElementById("outgoingAvatar");

const outgoingCallerName =
    document.getElementById("outgoingCallerName");

const outgoingCallType =
    document.getElementById("outgoingCallType");

const outgoingCallStatus =
    document.getElementById("outgoingCallStatus");

const cancelCallButton =
    document.getElementById("cancelCallButton");


/* =========================================================
   INCOMING
========================================================= */

const incomingAvatar =
    document.getElementById("incomingAvatar");

const incomingCallerName =
    document.getElementById("incomingCallerName");

const incomingCallType =
    document.getElementById("incomingCallType");

const acceptCallButton =
    document.getElementById("acceptCallButton");

const rejectCallButton =
    document.getElementById("rejectCallButton");


/* =========================================================
   ACTIVE CALL
========================================================= */

const remoteVideo =
    document.getElementById("remoteVideo");

const localVideo =
    document.getElementById("localVideo");

const localAudio =
    document.getElementById("localAudio");

const remotePlaceholder =
    document.getElementById("remotePlaceholder");

const activeCallerAvatar =
    document.getElementById("activeCallerAvatar");

const callerName =
    document.getElementById("callerName");

const callStatus =
    document.getElementById("callStatus");

const topCallerAvatar =
    document.getElementById("topCallerAvatar");

const topCallerName =
    document.getElementById("topCallerName");

const topCallStatus =
    document.getElementById("topCallStatus");

const callTimer =
    document.getElementById("callTimer");

const localVideoContainer =
    document.getElementById("localVideoContainer");


/* =========================================================
   CONTROLS
========================================================= */

const muteButton =
    document.getElementById("muteButton");

const cameraButton =
    document.getElementById("cameraButton");

const speakerButton =
    document.getElementById("speakerButton");

const endCallButton =
    document.getElementById("endCallButton");


/* =========================================================
   ERROR
========================================================= */

const callErrorMessage =
    document.getElementById("callErrorMessage");

const closeCallErrorButton =
    document.getElementById(
        "closeCallErrorButton"
    );


/* =========================================================
   URL PARAMETERS
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const urlReceiverId =
    params.get("receiverId") || "";

const urlReceiverName =
    params.get("receiverName") || "User";

const urlReceiverEmail =
    params.get("receiverEmail") || "";

const urlCallType =
    params.get("type") || "audio";

const urlCallerId =
    params.get("callerId") || "";

const urlCallerName =
    params.get("callerName") || "User";


/* =========================================================
   UTILITIES
========================================================= */

function getInitials(
    name = "User"
) {

    const words =
        String(name)
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
   ICONS
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
   SHOW / HIDE
========================================================= */

function hideAllScreens() {

    if (callLoading) {
        callLoading.hidden = true;
    }

    if (outgoingCallModal) {
        outgoingCallModal.hidden = true;
    }

    if (incomingCallModal) {
        incomingCallModal.hidden = true;
    }

    if (activeCallModal) {
        activeCallModal.hidden = true;
    }

    if (callModal) {
        callModal.hidden = true;
    }

}


/* =========================================================
   LOADING
========================================================= */

function showLoading(
    message = "Preparing call..."
) {

    hideAllScreens();


    if (callLoading) {

        callLoading.hidden = false;

    }


    if (loadingMessage) {

        loadingMessage.textContent =
            message;

    }

}


/* =========================================================
   OUTGOING UI
========================================================= */

function showOutgoingUI() {

    hideAllScreens();


    if (outgoingCallModal) {

        outgoingCallModal.hidden =
            false;

    }


    const name =
        currentRemoteName || "User";


    if (outgoingAvatar) {

        outgoingAvatar.textContent =
            getInitials(name);

    }


    if (outgoingCallerName) {

        outgoingCallerName.textContent =
            name;

    }


    if (outgoingCallType) {

        outgoingCallType.textContent =
            currentCallType === "video"
                ? "Video call"
                : "Audio call";

    }


    if (outgoingCallStatus) {

        outgoingCallStatus.textContent =
            "Calling...";

    }


    refreshIcons();

}


/* =========================================================
   INCOMING UI
========================================================= */

function showIncomingUI() {

    hideAllScreens();


    if (incomingCallModal) {

        incomingCallModal.hidden =
            false;

    }


    const name =
        currentRemoteName || "User";


    if (incomingAvatar) {

        incomingAvatar.textContent =
            getInitials(name);

    }


    if (incomingCallerName) {

        incomingCallerName.textContent =
            name;

    }


    if (incomingCallType) {

        incomingCallType.textContent =
            currentCallType === "video"
                ? "Incoming video call"
                : "Incoming audio call";

    }


    refreshIcons();

}


/* =========================================================
   ACTIVE UI
========================================================= */

function showActiveUI() {

    hideAllScreens();


    if (activeCallModal) {

        activeCallModal.hidden =
            false;

    }


    const name =
        currentRemoteName || "User";


    const initials =
        getInitials(name);


    if (activeCallerAvatar) {

        activeCallerAvatar.textContent =
            initials;

    }


    if (callerName) {

        callerName.textContent =
            name;

    }


    if (topCallerAvatar) {

        topCallerAvatar.textContent =
            initials;

    }


    if (topCallerName) {

        topCallerName.textContent =
            name;

    }


    setStatus(
        "Connected"
    );


    /*
     * Audio call:
     * show avatar instead of black video.
     */

    if (currentCallType === "audio") {

        if (remoteVideo) {

            remoteVideo.style.display =
                "none";

        }


        if (remotePlaceholder) {

            remotePlaceholder.style.display =
                "flex";

        }


        if (localVideoContainer) {

            localVideoContainer.style.display =
                "none";

        }

    }


    /*
     * Video call.
     */

    if (currentCallType === "video") {

        if (remoteVideo) {

            remoteVideo.style.display =
                "block";

        }


        if (localVideoContainer) {

            localVideoContainer.style.display =
                "block";

        }

    }


    startCallTimer();

    refreshIcons();

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
    message
) {

    if (callStatus) {

        callStatus.textContent =
            message;

    }


    if (topCallStatus) {

        topCallStatus.textContent =
            message;

    }


    if (outgoingCallStatus) {

        outgoingCallStatus.textContent =
            message;

    }

}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    console.error(
        "CallWeb:",
        message
    );


    hideAllScreens();


    if (callModal) {

        callModal.hidden =
            false;

    }


    if (callErrorMessage) {

        callErrorMessage.textContent =
            message;

    }


    refreshIcons();

}


/* =========================================================
   CALL TIMER
========================================================= */

function startCallTimer() {

    stopCallTimer();


    callStartTime =
        callStartTime ||
        Date.now();


    callTimerInterval =
        setInterval(
            () => {

                if (!callStartTime) {
                    return;
                }


                const seconds =
                    Math.floor(
                        (
                            Date.now() -
                            callStartTime
                        ) / 1000
                    );


                const minutes =
                    Math.floor(
                        seconds / 60
                    );


                const remaining =
                    seconds % 60;


                if (callTimer) {

                    callTimer.textContent =
                        `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;

                }

            },
            1000
        );

}


function stopCallTimer() {

    if (callTimerInterval) {

        clearInterval(
            callTimerInterval
        );

        callTimerInterval =
            null;

    }

}


/* =========================================================
   CREATE PEER CONNECTION
========================================================= */

function createPeerConnection() {

    if (peerConnection) {

        try {
            peerConnection.close();
        } catch {}

    }


    peerConnection =
        new RTCPeerConnection(
            RTC_CONFIG
        );


    remoteStream =
        new MediaStream();


    /*
     * Remote video.
     */

    if (remoteVideo) {

        remoteVideo.srcObject =
            remoteStream;

    }


    /*
     * Remote audio.
     */

    if (localAudio) {

        localAudio.srcObject =
            remoteStream;

    }


    /* =====================================================
       REMOTE TRACK
    ===================================================== */

    peerConnection.ontrack =
        event => {

            console.log(
                "Remote track:",
                event.track.kind
            );


            if (
                event.streams &&
                event.streams[0]
            ) {

                event.streams[0]
                    .getTracks()
                    .forEach(
                        track => {

                            const exists =
                                remoteStream
                                    .getTracks()
                                    .some(
                                        t =>
                                            t.id ===
                                            track.id
                                    );


                            if (!exists) {

                                remoteStream.addTrack(
                                    track
                                );

                            }

                        }
                    );

            } else {

                remoteStream.addTrack(
                    event.track
                );

            }


            if (remoteVideo) {

                remoteVideo.srcObject =
                    remoteStream;

                remoteVideo.play()
                    .catch(() => {});

            }


            if (localAudio) {

                localAudio.srcObject =
                    remoteStream;

                localAudio.play()
                    .catch(() => {});

            }


            /*
             * Once remote video arrives,
             * hide placeholder.
             */

            if (
                currentCallType ===
                "video"
            ) {

                if (remotePlaceholder) {

                    remotePlaceholder.style.display =
                        "none";

                }

            }

        };


    /* =====================================================
       ICE CANDIDATE
    ===================================================== */

    peerConnection.onicecandidate =
        async event => {

            if (
                !event.candidate ||
                !currentCallId ||
                !currentUser
            ) {

                return;

            }


            try {

                await addDoc(
                    collection(
                        db,
                        "calls",
                        currentCallId,
                        "candidates"
                    ),
                    {

                        candidate:
                            event.candidate.toJSON(),

                        senderId:
                            currentUser.uid,

                        createdAt:
                            serverTimestamp()

                    }
                );

            } catch (error) {

                console.error(
                    "ICE candidate error:",
                    error
                );

            }

        };


    /* =====================================================
       CONNECTION STATE
    ===================================================== */

    peerConnection.onconnectionstatechange =
        async () => {

            if (!peerConnection) {
                return;
            }


            const state =
                peerConnection.connectionState;


            console.log(
                "Connection:",
                state
            );


            if (
                state ===
                "connecting"
            ) {

                setStatus(
                    "Connecting..."
                );

            }


            if (
                state ===
                "connected"
            ) {

                setStatus(
                    "Connected"
                );

                if (!callStartTime) {

                    callStartTime =
                        Date.now();

                }

            }


            if (
                state ===
                "disconnected"
            ) {

                setStatus(
                    "Connection interrupted..."
                );

            }


            if (
                state ===
                "failed"
            ) {

                setStatus(
                    "Connection failed"
                );

            }


            if (
                state ===
                "closed"
            ) {

                setStatus(
                    "Call ended"
                );

            }

        };


    return peerConnection;

}


/* =========================================================
   GET LOCAL MEDIA
========================================================= */

async function getLocalMedia(
    type
) {

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        localStream =
            null;

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "Camera and microphone are not supported."
        );

    }


    const isVideo =
        type === "video";


    const constraints = {

        audio: {

            echoCancellation: true,

            noiseSuppression: true,

            autoGainControl: true

        },

        video: isVideo
            ? {

                facingMode: "user",

                width: {
                    ideal: 1280
                },

                height: {
                    ideal: 720
                },

                frameRate: {
                    ideal: 30
                }

            }
            : false

    };


    try {

        localStream =
            await navigator.mediaDevices
                .getUserMedia(
                    constraints
                );


        console.log(
            "Local media ready."
        );


        if (localVideo) {

            localVideo.srcObject =
                localStream;

            localVideo.muted =
                true;

            localVideo.autoplay =
                true;

            localVideo.playsInline =
                true;


            await localVideo
                .play()
                .catch(() => {});

        }


        if (!peerConnection) {

            throw new Error(
                "Peer connection is not ready."
            );

        }


        localStream
            .getTracks()
            .forEach(
                track => {

                    peerConnection.addTrack(
                        track,
                        localStream
                    );

                }
            );


        return localStream;

    } catch (error) {

        console.error(
            "getUserMedia error:",
            error
        );


        if (
            error.name ===
            "NotAllowedError"
        ) {

            throw new Error(
                "Camera/microphone permission was denied."
            );

        }


        if (
            error.name ===
            "NotFoundError"
        ) {

            throw new Error(
                "Camera or microphone was not found."
            );

        }


        throw new Error(
            "Unable to access camera or microphone."
        );

    }

}


/* =========================================================
   START OUTGOING CALL
========================================================= */

async function startOutgoingCall() {

    if (!currentUser) {
        return;
    }


    if (!urlReceiverId) {

        showError(
            "Receiver information is missing."
        );

        return;

    }


    if (
        urlReceiverId ===
        currentUser.uid
    ) {

        showError(
            "You cannot call yourself."
        );

        return;

    }


    currentCallType =
        urlCallType === "video"
            ? "video"
            : "audio";


    currentReceiverId =
        urlReceiverId;


    currentCallerId =
        currentUser.uid;


    currentRemoteName =
        urlReceiverName ||
        "User";


    showOutgoingUI();


    try {

        /*
         * Create peer.
         */

        createPeerConnection();


        /*
         * Camera / microphone.
         */

        await getLocalMedia(
            currentCallType
        );


        /*
         * Create call document.
         */

        const callRef =
            doc(
                collection(
                    db,
                    "calls"
                )
            );


        currentCallId =
            callRef.id;


        await setDoc(
            callRef,
            {

                callerId:
                    currentUser.uid,

                receiverId:
                    currentReceiverId,

                callerName:
                    currentUser.displayName ||
                    currentUser.email?.split("@")[0] ||
                    "User",

                callerEmail:
                    currentUser.email ||
                    "",

                receiverName:
                    currentRemoteName,

                callType:
                    currentCallType,

                status:
                    "ringing",

                createdAt:
                    serverTimestamp()

            }
        );


        /*
         * Create offer.
         */

        const offer =
            await peerConnection
                .createOffer();


        await peerConnection
            .setLocalDescription(
                offer
            );


        /*
         * Save offer.
         */

        await updateDoc(
            callRef,
            {

                offer: {

                    type:
                        offer.type,

                    sdp:
                        offer.sdp

                }

            }
        );


        /*
         * Listen for answer/status.
         */

        listenToCallDocument();


        /*
         * Listen for receiver ICE.
         */

        listenForICE(
            currentCallId,
            currentReceiverId
        );


        console.log(
            "Outgoing call created:",
            currentCallId
        );

    } catch (error) {

        console.error(
            "Outgoing call error:",
            error
        );


        await endCall(
            false,
            false
        );


        showError(
            error.message ||
            "Unable to start the call."
        );

    }

}


/* =========================================================
   LISTEN TO CALL DOCUMENT
========================================================= */

function listenToCallDocument() {

    if (!currentCallId) {
        return;
    }


    if (unsubscribeCall) {

        unsubscribeCall();

        unsubscribeCall =
            null;

    }


    const callRef =
        doc(
            db,
            "calls",
            currentCallId
        );


    unsubscribeCall =
        onSnapshot(
            callRef,
            async snapshot => {

                if (!snapshot.exists()) {

                    await cleanup();

                    return;

                }


                const data =
                    snapshot.data();


                /*
                 * Receiver accepted.
                 */

                if (
                    data.answer &&
                    peerConnection &&
                    !peerConnection
                        .currentRemoteDescription
                ) {

                    try {

                        await peerConnection
                            .setRemoteDescription(
                                new RTCSessionDescription(
                                    data.answer
                                )
                            );


                        await applyPendingICE();


                        callStartTime =
                            Date.now();


                        showActiveUI();

                    } catch (error) {

                        console.error(
                            "Answer error:",
                            error
                        );

                    }

                }


                /*
                 * Rejected.
                 */

                if (
                    data.status ===
                    "rejected"
                ) {

                    showError(
                        "Call declined."
                    );


                    await cleanup();

                }


                /*
                 * Ended.
                 */

                if (
                    data.status ===
                    "ended"
                ) {

                    await cleanup();

                }

            },

            error => {

                console.error(
                    "Call listener error:",
                    error
                );

            }
        );

}


/* =========================================================
   LISTEN FOR INCOMING CALLS
========================================================= */

function listenForIncomingCalls() {

    if (!currentUser) {
        return;
    }


    if (unsubscribeIncomingCalls) {

        unsubscribeIncomingCalls();

        unsubscribeIncomingCalls =
            null;

    }


    const callsRef =
        collection(
            db,
            "calls"
        );


    unsubscribeIncomingCalls =
        onSnapshot(
            callsRef,
            snapshot => {

                snapshot.docChanges()
                    .forEach(
                        change => {

                            if (
                                change.type !==
                                "added"
                            ) {

                                return;

                            }


                            const data =
                                change.doc.data();


                            /*
                             * Only calls
                             * for this user.
                             */

                            if (
                                data.receiverId !==
                                currentUser.uid
                            ) {

                                return;

                            }


                            /*
                             * Only ringing.
                             */

                            if (
                                data.status !==
                                "ringing"
                            ) {

                                return;

                            }


                            /*
                             * Ignore if
                             * already in call.
                             */

                            if (
                                currentCallId
                            ) {

                                return;

                            }


                            currentCallId =
                                change.doc.id;


                            currentCallerId =
                                data.callerId;


                            currentReceiverId =
                                data.receiverId;


                            currentCallType =
                                data.callType ===
                                "video"
                                    ? "video"
                                    : "audio";


                            currentRemoteName =
                                data.callerName ||
                                "User";


                            console.log(
                                "Incoming call:",
                                data
                            );


                            showIncomingUI();


                            /*
                             * Listen for caller ICE.
                             */

                            listenForICE(
                                currentCallId,
                                currentCallerId
                            );

                        }
                    );

            },

            error => {

                console.error(
                    "Incoming call error:",
                    error
                );

            }
        );

}


/* =========================================================
   ACCEPT CALL
========================================================= */

async function acceptCall() {

    if (
        !currentCallId ||
        !currentUser
    ) {

        return;

    }


    try {

        const callRef =
            doc(
                db,
                "calls",
                currentCallId
            );


        const snapshot =
            await getDoc(
                callRef
            );


        if (!snapshot.exists()) {

            showError(
                "This call is no longer available."
            );

            await cleanup();

            return;

        }


        const data =
            snapshot.data();


        if (
            data.status !==
            "ringing"
        ) {

            showError(
                "This call is no longer ringing."
            );

            await cleanup();

            return;

        }


        currentCallerId =
            data.callerId;


        currentReceiverId =
            data.receiverId;


        currentCallType =
            data.callType === "video"
                ? "video"
                : "audio";


        currentRemoteName =
            data.callerName ||
            "User";


        showLoading(
            "Connecting..."
        );


        /*
         * Create peer.
         */

        createPeerConnection();


        /*
         * Get camera/microphone.
         */

        await getLocalMedia(
            currentCallType
        );


        /*
         * Caller offer must exist.
         */

        if (!data.offer) {

            throw new Error(
                "Caller offer is missing."
            );

        }


        /*
         * Set remote offer.
         */

        await peerConnection
            .setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );


        /*
         * Apply ICE received earlier.
         */

        await applyPendingICE();


        /*
         * Create answer.
         */

        const answer =
            await peerConnection
                .createAnswer();


        await peerConnection
            .setLocalDescription(
                answer
            );


        /*
         * Save answer.
         */

        await updateDoc(
            callRef,
            {

                answer: {

                    type:
                        answer.type,

                    sdp:
                        answer.sdp

                },

                status:
                    "accepted",

                acceptedAt:
                    serverTimestamp()

            }
        );


        callStartTime =
            Date.now();


        showActiveUI();


        /*
         * Listen for call end.
         */

        listenToCallDocument();


    } catch (error) {

        console.error(
            "Accept call error:",
            error
        );


        showError(
            error.message ||
            "Unable to accept call."
        );

    }

}


/* =========================================================
   REJECT CALL
========================================================= */

async function rejectCall() {

    if (!currentCallId) {
        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "calls",
                currentCallId
            ),
            {

                status:
                    "rejected",

                endedBy:
                    currentUser?.uid ||
                    "",

                endedAt:
                    serverTimestamp()

            }
        );

    } catch (error) {

        console.error(
            "Reject error:",
            error
        );

    }


    await cleanup();

}


/* =========================================================
   LISTEN FOR ICE
========================================================= */

function listenForICE(
    callId,
    remoteUserId
) {

    if (!callId) {
        return;
    }


    if (unsubscribeCandidates) {

        unsubscribeCandidates();

        unsubscribeCandidates =
            null;

    }


    const candidatesRef =
        collection(
            db,
            "calls",
            callId,
            "candidates"
        );


    unsubscribeCandidates =
        onSnapshot(
            candidatesRef,
            snapshot => {

                snapshot.docChanges()
                    .forEach(
                        async change => {

                            if (
                                change.type !==
                                "added"
                            ) {

                                return;

                            }


                            const data =
                                change.doc.data();


                            if (
                                data.senderId ===
                                currentUser?.uid
                            ) {

                                return;

                            }


                            if (
                                remoteUserId &&
                                data.senderId !==
                                remoteUserId
                            ) {

                                return;

                            }


                            if (
                                !data.candidate
                            ) {

                                return;

                            }


                            if (
                                !peerConnection ||
                                !peerConnection
                                    .remoteDescription
                            ) {

                                pendingCandidates.push(
                                    data.candidate
                                );

                                return;

                            }


                            try {

                                await peerConnection
                                    .addIceCandidate(
                                        new RTCIceCandidate(
                                            data.candidate
                                        )
                                    );

                            } catch (error) {

                                console.error(
                                    "ICE error:",
                                    error
                                );

                            }

                        }
                    );

            },

            error => {

                console.error(
                    "ICE listener error:",
                    error
                );

            }
        );

}


/* =========================================================
   APPLY PENDING ICE
========================================================= */

async function applyPendingICE() {

    if (
        !peerConnection ||
        !peerConnection.remoteDescription
    ) {

        return;

    }


    const candidates =
        [...pendingCandidates];


    pendingCandidates =
        [];


    for (
        const candidate
        of candidates
    ) {

        try {

            await peerConnection
                .addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );

        } catch (error) {

            console.error(
                "Pending ICE error:",
                error
            );

        }

    }

}


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

    if (!localStream) {
        return;
    }


    const tracks =
        localStream.getAudioTracks();


    if (!tracks.length) {
        return;
    }


    const enabled =
        tracks[0].enabled;


    tracks.forEach(
        track => {

            track.enabled =
                !enabled;

        }
    );


    const muted =
        enabled;


    if (muteButton) {

        muteButton.classList.toggle(
            "muted",
            muted
        );


        const icon =
            muteButton.querySelector(
                "[data-lucide]"
            );


        if (icon) {

            icon.setAttribute(
                "data-lucide",
                muted
                    ? "mic-off"
                    : "mic"
            );

        }


        muteButton.setAttribute(
            "aria-label",
            muted
                ? "Unmute microphone"
                : "Mute microphone"
        );

    }


    refreshIcons();

}


/* =========================================================
   CAMERA
========================================================= */

function toggleCamera() {

    if (!localStream) {
        return;
    }


    const tracks =
        localStream.getVideoTracks();


    if (!tracks.length) {
        return;
    }


    const enabled =
        tracks[0].enabled;


    tracks.forEach(
        track => {

            track.enabled =
                !enabled;

        }
    );


    const cameraOff =
        enabled;


    if (cameraButton) {

        cameraButton.classList.toggle(
            "camera-off",
            cameraOff
        );


        const icon =
            cameraButton.querySelector(
                "[data-lucide]"
            );


        if (icon) {

            icon.setAttribute(
                "data-lucide",
                cameraOff
                    ? "video-off"
                    : "video"
            );

        }

    }


    refreshIcons();

}


/* =========================================================
   SPEAKER
========================================================= */

function toggleSpeaker() {

    /*
     * Browser support for setSinkId
     * is not universal.
     */

    const media =
        remoteVideo ||
        localAudio;


    if (
        !media
    ) {

        return;

    }


    if (
        typeof media.setSinkId !==
        "function"
    ) {

        /*
         * Mobile browsers normally
         * handle speaker routing
         * through the system.
         */

        if (speakerButton) {

            speakerButton.classList.toggle(
                "speaker-active"
            );

        }

        return;

    }


    /*
     * Default audio output.
     */

    media.setSinkId("")
        .catch(
            error => {

                console.warn(
                    "Speaker selection unavailable:",
                    error
                );

            }
        );

}


/* =========================================================
   END CALL
========================================================= */

async function endCall(
    saveHistory = true,
    showErrorAfter = true
) {

    if (isEnding) {
        return;
    }


    isEnding = true;


    const callId =
        currentCallId;


    const callerId =
        currentCallerId;


    const receiverId =
        currentReceiverId;


    const callType =
        currentCallType;


    const duration =
        callStartTime
            ? Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        callStartTime
                    ) / 1000
                )
            )
            : 0;


    try {

        if (
            callId &&
            currentUser
        ) {

            try {

                await updateDoc(
                    doc(
                        db,
                        "calls",
                        callId
                    ),
                    {

                        status:
                            "ended",

                        duration:
                            duration,

                        endedBy:
                            currentUser.uid,

                        endedAt:
                            serverTimestamp()

                    }
                );

            } catch (error) {

                console.warn(
                    "Could not update call:",
                    error
                );

            }


            if (
                saveHistory &&
                duration >= 0
            ) {

                try {

                    await addDoc(
                        collection(
                            db,
                            "callHistory"
                        ),
                        {

                            callerId:
                                callerId || "",

                            receiverId:
                                receiverId || "",

                            callType:
                                callType || "audio",

                            duration:
                                duration,

                            status:
                                "completed",

                            createdAt:
                                serverTimestamp()

                        }
                    );

                } catch (error) {

                    console.warn(
                        "History error:",
                        error
                    );

                }

            }

        }

    } finally {

        await cleanup();

        isEnding = false;

    }

}


/* =========================================================
   CLEANUP
========================================================= */

async function cleanup() {

    stopCallTimer();


    /*
     * Local media.
     */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    try {
                        track.stop();
                    } catch {}

                }
            );

        localStream =
            null;

    }


    /*
     * Peer.
     */

    if (peerConnection) {

        try {

            peerConnection.ontrack =
                null;

            peerConnection.onicecandidate =
                null;

            peerConnection.onconnectionstatechange =
                null;

            peerConnection.close();

        } catch {}

        peerConnection =
            null;

    }


    /*
     * Firestore listeners.
     */

    if (unsubscribeCall) {

        try {
            unsubscribeCall();
        } catch {}

        unsubscribeCall =
            null;

    }


    if (unsubscribeCandidates) {

        try {
            unsubscribeCandidates();
        } catch {}

        unsubscribeCandidates =
            null;

    }


    /*
     * Media elements.
     */

    if (localVideo) {

        localVideo.srcObject =
            null;

    }


    if (remoteVideo) {

        remoteVideo.srcObject =
            null;

    }


    if (localAudio) {

        localAudio.srcObject =
            null;

    }


    /*
     * Reset.
     */

    currentCallId =
        null;

    currentCallerId =
        null;

    currentReceiverId =
        null;

    currentCallType =
        "audio";

    currentRemoteName =
        "User";

    callStartTime =
        null;

    pendingCandidates =
        [];


    /*
     * Go dashboard after
     * finished call.
     */

    hideAllScreens();


    window.location.replace(
        "dashboard.html"
    );

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

if (acceptCallButton) {

    acceptCallButton.addEventListener(
        "click",
        acceptCall
    );

}


if (rejectCallButton) {

    rejectCallButton.addEventListener(
        "click",
        rejectCall
    );

}


if (cancelCallButton) {

    cancelCallButton.addEventListener(
        "click",
        () => {

            endCall(
                false
            );

        }
    );

}


if (endCallButton) {

    endCallButton.addEventListener(
        "click",
        () => {

            endCall(
                true
            );

        }
    );

}


if (muteButton) {

    muteButton.addEventListener(
        "click",
        toggleMute
    );

}


if (cameraButton) {

    cameraButton.addEventListener(
        "click",
        toggleCamera
    );

}


if (speakerButton) {

    speakerButton.addEventListener(
        "click",
        toggleSpeaker
    );

}


if (closeCallErrorButton) {

    closeCallErrorButton.addEventListener(
        "click",
        () => {

            window.location.replace(
                "dashboard.html"
            );

        }
    );

}


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        currentUser =
            user || null;


        if (!user) {

            window.location.replace(
                "index.html"
            );

            return;

        }


        console.log(
            "CallWeb user:",
            user.uid
        );


        /*
         * IMPORTANT:
         *
         * If call.html was opened
         * from dashboard with receiverId,
         * this is the caller.
         */

        if (urlReceiverId) {

            /*
             * Prevent the same user from
             * treating his own outgoing call
             * as incoming.
             */

            if (
                urlReceiverId !==
                user.uid
            ) {

                await startOutgoingCall();

            }

            return;

        }


        /*
         * No receiverId means this page
         * is waiting for incoming call.
         */

        showLoading(
            "Waiting for incoming call..."
        );


        listenForIncomingCalls();

    }
);


/* =========================================================
   PAGE CLOSE
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        stopCallTimer();

        if (unsubscribeCall) {

            try {
                unsubscribeCall();
            } catch {}

        }

        if (unsubscribeCandidates) {

            try {
                unsubscribeCandidates();
            } catch {}

        }

        if (unsubscribeIncomingCalls) {

            try {
                unsubscribeIncomingCalls();
            } catch {}

        }

    }
);


/* =========================================================
   INITIAL UI
========================================================= */

hideAllScreens();

refreshIcons();


console.log(
    "CallWeb WebRTC Engine loaded."
);
