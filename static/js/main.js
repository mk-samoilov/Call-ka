document.addEventListener("DOMContentLoaded", function() {
    const numberInput = document.getElementById("number-input");
    const keypad = document.querySelector(".keypad");
    const backspaceBtn = document.getElementById("backspace-btn");

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
});