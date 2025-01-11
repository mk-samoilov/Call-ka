const socket = io();

const dialPad = document.getElementById("dial-pad");
const callStatus = document.getElementById("call-status");
const incomingCall = document.getElementById("incoming-call");
const statusText = document.getElementById("status-text");
const callerNumber = document.getElementById("caller-number");
const callBtn = document.getElementById("call-btn");
const endCallBtn = document.getElementById("end-call-btn");
const acceptCallBtn = document.getElementById("accept-call-btn");
const declineCallBtn = document.getElementById("decline-call-btn");
const toggleMuteBtn = document.getElementById("toggle-mute-btn");
const volumeControl = document.getElementById("volume-control");

let currentCallNumber = null;
let peerConnection;
let localStream;
let remoteStream;
let isMuted = false;

const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        {
            urls: "turn:numb.viagenie.ca",
            credential: "muazkh",
            username: "webrtc@live.com"
        },
    ]
};

function handleICEConnectionStateChange() {
    console.log("ICE connection state: ", peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === "failed") {
        console.log("ICE Connection failed. Restarting ICE.");
        peerConnection.restartIce();
    }
}

async function startCall(phoneNumber) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia is not supported in this browser");
        }

        socket.emit("start_call", { target: phoneNumber });
        await new Promise(resolve => setTimeout(resolve, 500));

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.oniceconnectionstatechange = handleICEConnectionStateChange;

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("New ICE candidate: ", event.candidate);
                socket.emit("ice_candidate", { target: phoneNumber, candidate: event.candidate });
            } else {
                console.log("All ICE candidates have been sent");
            }
        };

        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            const remoteAudio = new Audio();
            remoteAudio.srcObject = remoteStream;
            remoteAudio.play();
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit("offer", { target: phoneNumber, offer: offer });
        currentCallNumber = phoneNumber;
        updateCallStatus("Calling...");
    } catch (error) {
        console.error("Error starting call:", error);
        alert("Failed to start call. Please ensure you\"re using a supported browser and have granted microphone permissions.");
        resetCallUI();
    }
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (currentCallNumber) {
        socket.emit("end_call", { target: currentCallNumber });
    }
    resetCallUI();
}

function updateCallStatus(status) {
    dialPad.style.display = "none";
    callStatus.style.display = "block";
    statusText.textContent = status;
}

function resetCallUI() {
    dialPad.style.display = "block";
    callStatus.style.display = "none";
    incomingCall.style.display = "none";
    currentCallNumber = null;
    isMuted = false;
    callBtn.style.display = "inline-block";
    toggleMuteBtn.textContent = "Mute";
}

callBtn.addEventListener("click", function() {
    const phoneNumber = document.getElementById("number-input").value;
    if (phoneNumber) {
        startCall(phoneNumber);
    }
});

endCallBtn.addEventListener("click", endCall);

acceptCallBtn.addEventListener("click", async function() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice_candidate", { target: callerNumber.textContent, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            const remoteAudio = new Audio();
            remoteAudio.srcObject = remoteStream;
            remoteAudio.play();
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("answer", { target: callerNumber.textContent, answer: answer });
        updateCallStatus("In call with " + callerNumber.textContent);
        incomingCall.style.display = "none";
    } catch (error) {
        console.error("Error accepting call:", error);
        alert("Failed to accept call. Please check your microphone permissions and try again.");
    }
});

declineCallBtn.addEventListener("click", function() {
    socket.emit("decline_call", { from: callerNumber.textContent });
    resetCallUI();
});

toggleMuteBtn.addEventListener("click", function() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        isMuted = !isMuted;
        audioTrack.enabled = !isMuted;
        toggleMuteBtn.textContent = isMuted ? "Unmute" : "Mute";
    }
});

volumeControl.addEventListener("input", function() {
    if (remoteStream) {
        remoteStream.getAudioTracks()[0].enabled = true;
        remoteStream.getAudioTracks()[0].volume = volumeControl.value;
    }
});

let incomingOffer;

socket.on("incoming_call", function(data) {
    callerNumber.textContent = data.from;
    incomingCall.style.display = "block";
});

socket.on("offer", async function(data) {
    incomingOffer = data.offer;
    callerNumber.textContent = data.caller;
    incomingCall.style.display = "block";
});

socket.on("answer", async function(data) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on("ice_candidate", async function(data) {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
    }
});

socket.on("call_accepted", function(data) {
    updateCallStatus("In call with " + data.by);
});

socket.on("call_declined", function(data) {
    updateCallStatus("Call declined by " + data.by);
    setTimeout(resetCallUI, 3000);
});

socket.on("call_ended", function(data) {
    updateCallStatus("Call ended by " + data.by);
    setTimeout(resetCallUI, 3000);
    endCall();
});

socket.on("call_error", function(data) {
    alert(data.message);
    resetCallUI();
});

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia is not supported in this browser");
        }
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone permission granted");
    } catch (error) {
        console.error("Error requesting microphone permission:", error);
        alert("Your browser doesn\"t support getUserMedia or you haven\"t granted microphone permissions. Some features may not work.");
    }
});