document.addEventListener("DOMContentLoaded", function() {
    const numberInput = document.getElementById("number-input");
    const keypad = document.querySelector(".keypad");
    const backspaceBtn = document.getElementById("backspace-btn");
    const callBtn = document.getElementById("call-btn");
    const endCallBtn = document.getElementById("end-call-btn");

    keypad.addEventListener("click", function(event) {
        if (event.target.classList.contains("digit")) {
            numberInput.value += event.target.textContent;
        }
    });

    backspaceBtn.addEventListener("click", function() {
        numberInput.value = numberInput.value.slice(0, -1);
    });

    numberInput.addEventListener("input", function(event) {
        this.value = this.value.replace(/[^0-9*#]/g, "");
    });

    numberInput.addEventListener("keypress", function(event) {
        const allowedChars = /[0-9*#]/;
        if (!allowedChars.test(event.key)) {
            event.preventDefault();
        }
    });

    callBtn.addEventListener("click", function() {
        const phoneNumber = numberInput.value;
        if (phoneNumber) {
            startCall(phoneNumber);
            callBtn.style.display = 'none';
            endCallBtn.style.display = 'block';
        }
    });

    endCallBtn.addEventListener("click", function() {
        socket.emit('end_call', { target: numberInput.value });
        endCall();
        endCallBtn.style.display = 'none';
        callBtn.style.display = 'block';
    });
});