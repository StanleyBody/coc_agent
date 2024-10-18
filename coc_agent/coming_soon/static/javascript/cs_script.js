// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Set the date we're counting down to
    const countDownDate = new Date("Dec 31, 2024 23:59:59").getTime();

    // Update the count down every 1 second
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = countDownDate - now;

        // Calculate time parts
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Output the result
        document.getElementById("days").textContent = days;
        document.getElementById("hours").textContent = hours;
        document.getElementById("minutes").textContent = minutes;
        document.getElementById("seconds").textContent = seconds;

        // If the count down is finished, stop the timer
        if (distance < 0) {
            clearInterval(interval);
            document.querySelector(".countdown-timer").textContent = "Launched!";
        }
    }, 1000);
});
