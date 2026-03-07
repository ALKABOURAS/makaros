const passwordInput = document.getElementById('passwordInput');
const confirmInput = document.querySelector('input[name="confirmPassword"]');
const signupForm = document.querySelector('.auth-form');
const bars = document.querySelectorAll('.bar');

// 1. Λογική για το Χρωματισμό των Bars (Strength Meter)
passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    let strength = 0;

    if (val.length >= 8) strength++;
    if (val.match(/[A-Z]/) && val.match(/[a-z]/)) strength++;
    if (val.match(/[0-9]/)) strength++;
    if (val.match(/[^A-Za-z0-9]/)) strength++;

    bars.forEach(bar => bar.className = 'bar'); // Reset

    for (let i = 0; i < strength; i++) {
        if (strength === 1) bars[i].classList.add('weak');
        if (strength === 2) bars[i].classList.add('medium');
        if (strength === 3) bars[i].classList.add('strong');
        if (strength === 4) bars[i].classList.add('excellent');
    }
});

// 2. Εμπόδιο στην υποβολή αν δεν πληρούνται οι προϋποθέσεις
signupForm.addEventListener('submit', (e) => {
    if (passwordInput.value.length < 8) {
        e.preventDefault();
        alert("Ο κωδικός πρέπει να είναι τουλάχιστον 8 χαρακτήρες!");
        return;
    }

    if (passwordInput.value !== confirmInput.value) {
        e.preventDefault();
        alert("Οι κωδικοί δεν ταιριάζουν!");
        return;
    }
});