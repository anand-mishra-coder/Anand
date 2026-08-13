/* =========================================================
   CallWeb — Call UI Controller
   File: js/call-ui.js
   ========================================================= */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth
} from "./firebase.js";

import {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera
} from "./webrtc.js";


/* =========================================================
   State
   ========================================================= */

let currentUser = null;

let activeCallUser = null;


/* =========================================================
   Create Call UI
   ========================================================= */

function createCallUI() {

    if (document.getElementById("callUI")) {
        return;
    }


    const wrapper =
        document.createElement("div");

    wrapper.id = "callUI";

    wrapper.innerHTML = `

        <!-- =========================================
             Incoming Call
             ========================================= -->

        <div
            id="incomingCallModal"
            class="call-modal"
            hidden
        >

            <div class="call-card">

                <div class="incoming-call-ring">

                    <div
                        id="incomingCallAvatar"
                        class="call-avatar"
                    >
                        U
                    </div>

                </div>

                <h2 id="incomingCallerName">
                    Unknown User
                </h2>

                <p id="incomingCallType">
                    Incoming call
                </p>

                <p
                    id="incomingCallStatus"
                    class="call-status"
                >
                    Calling...
                </p>

                <div class="incoming-call-actions">

                    <button
                        id="rejectCallButton"
                        class="call-control reject-call"
                        type="button"
                        title="Decline"
                        aria-label="Decline call"
                    >
                        <i data-lucide="phone-off"></i>
                    </button>

                    <button
                        id="acceptCallButton"
                        class="call-control accept-call"
                        type="button"
                        title="Accept"
                        aria-label="Accept call"
                    >
                        <i data-lucide="phone"></i>
                    </button>

                </div>

            </div>

        </div>


        <!-- =========================================
             Outgoing Call
             ========================================= -->

        <div
            id="outgoingCallModal"
            class="call-modal"
            hidden
        >

            <div class="call-card">

                <div
                    id="outgoingCallAvatar"
                    class="call-avatar"
                >
                    U
                </div>

                <h2 id="outgoingCallerName">
                    User
                </h2>

                <p id="outgoingCallType">
                    Calling...
                </p>

                <p
                    id="outgoingCallStatus"
                    class="call-status"
                >
                    Connecting...
                </p>

                <button
                    id="cancelCallButton"
                    class="cancel-call"
                    type="button"
                >
                    <i data-lucide="phone-off"></i>

                    Cancel Call

                </button>

            </div>

        </div>


        <!-- =========================================
             Active Call
             ========================================= -->

        <div
            id="activeCallModal"
            class="call-modal active-call-modal"
            hidden
        >

            <div class="call-video-container">

                <!-- Remote Video -->

                <video
                    id="remoteVideo"
                    class="remote-video"
                    autoplay
                    playsinline
                ></video>


                <!-- Remote Audio -->

                <audio
                    id="localAudio"
                    class="remote-audio"
                    autoplay
                ></audio>


                <!-- Local Video -->

                <div
                    id="localVideoWrapper"
                    class="local-video-wrapper"
                >

                    <video
                        id="localVideo"
                        class="local-video"
                        autoplay
                        muted
                        playsinline
                    ></video>

                </div>


                <!-- Header -->

                <div class="active-call-header">

                    <div class="active-caller-info">

                        <div
                            id="activeCallerAvatar"
                            class="active-caller-avatar"
                        >
                            U
                        </div>

                        <div>

                            <div
                                id="activeCallerName"
                                class="active-caller-name"
                            >
                                User
                            </div>

                            <div
                                id="activeCallStatus"
                                class="active-call-status"
                            >
                                Connected
                            </div>

                        </div>

                    </div>

                </div>


                <!-- Controls -->

                <div class="active-call-controls">

                    <button
                        id="muteButton"
                        class="active-call-control"
                        type="button"
                        title="Mute microphone"
                        aria-label="Mute microphone"
                    >
                        <i data-lucide="mic"></i>
                    </button>


                    <button
                        id="cameraButton"
                        class="active-call-control"
                        type="button"
                        title="Turn camera off"
                        aria-label="Turn camera off"
                    >
                        <i data-lucide="video"></i>
                    </button>


                    <button
                        id="endCallButton"
                        class="active-call-control end-call-control"
                        type="button"
                        title="End call"
                        aria-label="End call"
                    >
                        <i data-lucide="phone-off"></i>
                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        wrapper
    );


    if (window.lucide) {
        window.lucide.createIcons();
    }
}


/* =========================================================
   Helpers
   ========================================================= */

function getInitials(name = "") {

    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!parts.length) {
        return "U";
    }

    if (parts.length === 1) {
        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


function getElement(id) {

    return document.getElementById(id);
}


/* =========================================================
   Open Outgoing Call
   ========================================================= */

function openOutgoingCall(
    user,
    callType
) {

    activeCallUser = user;


    const modal =
        getElement(
            "outgoingCallModal"
        );

    const avatar =
        getElement(
            "outgoingCallAvatar"
        );

    const name =
        getElement(
            "outgoingCallerName"
        );

    const type =
        getElement(
            "outgoingCallType"
        );

    const status =
        getElement(
            "outgoingCallStatus"
        );


    if (avatar) {
        avatar.textContent =
            getInitials(
                user.name
            );
    }


    if (name) {
        name.textContent =
            user.name ||
            "User";
    }


    if (type) {

        type.textContent =
            callType === "video"
                ? "Video calling..."
                : "Audio calling...";
    }


    if (status) {
        status.textContent =
            "Connecting...";
    }


    if (modal) {
        modal.hidden = false;
    }
}


/* =========================================================
   Open Incoming Call
   ========================================================= */

function openIncomingCall(
    user,
    callType
) {

    activeCallUser = user;


    const modal =
        getElement(
            "incomingCallModal"
        );

    const avatar =
        getElement(
            "incomingCallAvatar"
        );

    const name =
        getElement(
            "incomingCallerName"
        );

    const type =
        getElement(
            "incomingCallType"
        );


    if (avatar) {
        avatar.textContent =
            getInitials(
                user.name
            );
    }


    if (name) {
        name.textContent =
            user.name ||
            "Unknown User";
    }


    if (type) {

        type.textContent =
            callType === "video"
                ? "Incoming video call"
                : "Incoming audio call";
    }


    if (modal) {
        modal.hidden = false;
    }
}


/* =========================================================
   Open Active Call
   ========================================================= */

function openActiveCall(
    user,
    callType
) {

    activeCallUser = user;


    const modal =
        getElement(
            "activeCallModal"
        );

    const avatar =
        getElement(
            "activeCallerAvatar"
        );

    const name =
        getElement(
            "activeCallerName"
        );

    const status =
        getElement(
            "activeCallStatus"
        );

    const localVideoWrapper =
        getElement(
            "localVideoWrapper"
        );


    if (avatar) {
        avatar.textContent =
            getInitials(
                user.name
            );
    }


    if (name) {
        name.textContent =
            user.name ||
            "User";
    }


    if (status) {
        status.textContent =
            "Connected";
    }


    /*
     * Audio call में local video
     * दिखाई नहीं देगा।
     */

    if (localVideoWrapper) {

        localVideoWrapper.style.display =
            callType === "video"
                ? "block"
                : "none";
    }


    if (modal) {
        modal.hidden = false;
    }
}


/* =========================================================
   Close All Call UI
   ========================================================= */

function closeCallUI() {

    const ids = [
        "incomingCallModal",
        "outgoingCallModal",
        "activeCallModal"
    ];


    ids.forEach(id => {

        const element =
            getElement(id);

        if (element) {
            element.hidden = true;
        }

    });
}


/* =========================================================
   Start Call
   ========================================================= */

async function makeCall(
    userId,
    userName,
    callType = "audio"
) {

    if (!currentUser) {

        console.warn(
            "User is not authenticated."
        );

        return;
    }


    if (!userId) {

        console.warn(
            "Receiver ID is missing."
        );

        return;
    }


    const user = {

        id: userId,

        name:
            userName ||
            "User"

    };


    openOutgoingCall(
        user,
        callType
    );


    try {

        await startCall(
            userId,
            callType,
            user.name
        );

    } catch (error) {

        console.error(
            "Call Error:",
            error
        );

        closeCallUI();
    }
}


/* =========================================================
   Dashboard Buttons
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const audioButton =
            event.target.closest(
                "[data-call-audio]"
            );

        const videoButton =
            event.target.closest(
                "[data-call-video]"
            );


        /* -----------------------------------------
           Audio
           ----------------------------------------- */

        if (audioButton) {

            const userId =
                audioButton.dataset.callAudio;

            const userName =
                audioButton.dataset.userName ||
                "User";


            makeCall(
                userId,
                userName,
                "audio"
            );

            return;
        }


        /* -----------------------------------------
           Video
           ----------------------------------------- */

        if (videoButton) {

            const userId =
                videoButton.dataset.callVideo;

            const userName =
                videoButton.dataset.userName ||
                "User";


            makeCall(
                userId,
                userName,
                "video"
            );

        }

    }
);


/* =========================================================
   Listen for Authentication
   ========================================================= */

onAuthStateChanged(
    auth,
    user => {

        currentUser =
            user || null;

    }
);


/* =========================================================
   Accept
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        if (
            !event.target.closest(
                "#acceptCallButton"
            )
        ) {
            return;
        }


        try {

            await acceptCall();

        } catch (error) {

            console.error(
                "Accept Error:",
                error
            );
        }

    }
);


/* =========================================================
   Reject
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        if (
            !event.target.closest(
                "#rejectCallButton"
            )
        ) {
            return;
        }


        try {

            await rejectCall();

            closeCallUI();

        } catch (error) {

            console.error(
                "Reject Error:",
                error
            );
        }

    }
);


/* =========================================================
   Cancel
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        if (
            !event.target.closest(
                "#cancelCallButton"
            )
        ) {
            return;
        }


        try {

            await endCall(false);

            closeCallUI();

        } catch (error) {

            console.error(
                "Cancel Error:",
                error
            );
        }

    }
);


/* =========================================================
   End Call
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        if (
            !event.target.closest(
                "#endCallButton"
            )
        ) {
            return;
        }


        try {

            await endCall(true);

            closeCallUI();

        } catch (error) {

            console.error(
                "End Call Error:",
                error
            );
        }

    }
);


/* =========================================================
   Mute
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                "#muteButton"
            )
        ) {
            return;
        }


        toggleMute();

    }
);


/* =========================================================
   Camera
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                "#cameraButton"
            )
        ) {
            return;
        }


        toggleCamera();

    }
);


/* =========================================================
   Create UI After DOM Ready
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        createCallUI
    );

} else {

    createCallUI();
}


/* =========================================================
   Global API
   ========================================================= */

window.CallUI = {

    makeCall,

    openOutgoingCall,

    openIncomingCall,

    openActiveCall,

    closeCallUI

};
