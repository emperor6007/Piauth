// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger
            const spans = hamburger.querySelectorAll('span');
            spans[0].style.transform = navMenu.classList.contains('active') 
                ? 'rotate(-45deg) translate(-5px, 6px)' 
                : 'none';
            spans[1].style.opacity = navMenu.classList.contains('active') ? '0' : '1';
            spans[2].style.transform = navMenu.classList.contains('active') 
                ? 'rotate(45deg) translate(-5px, -6px)' 
                : 'none';
        });

        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
    }
});

// Quiz Functionality
function answerQuiz(questionNum, isCorrect) {
    const feedback = document.getElementById(`feedback${questionNum}`);
    const buttons = feedback.parentElement.querySelectorAll('.quiz-btn');
    
    // Disable all buttons for this question
    buttons.forEach(btn => btn.disabled = true);
    
    feedback.classList.add('show');
    
    if (isCorrect) {
        feedback.classList.add('correct');
        feedback.classList.remove('incorrect');
        feedback.innerHTML = '<strong>✓ Correct!</strong> This is indeed a phishing attempt. Good catch!';
    } else {
        feedback.classList.add('incorrect');
        feedback.classList.remove('correct');
        feedback.innerHTML = '<strong>✗ Incorrect.</strong> This is actually a phishing/scam attempt. Be more cautious!';
    }
}

// Smooth Scrolling for Internal Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Checklist Progress Tracking
function updateChecklistProgress() {
    const checklists = document.querySelectorAll('.checklist');
    
    checklists.forEach(checklist => {
        const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
        const totalItems = checkboxes.length;
        let checkedItems = 0;
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                checkedItems = checklist.querySelectorAll('input[type="checkbox"]:checked').length;
                const percentage = Math.round((checkedItems / totalItems) * 100);
                
                // Store progress in localStorage
                const checklistId = checklist.closest('.content-section')?.querySelector('h2')?.textContent || 'checklist';
                localStorage.setItem(checklistId, JSON.stringify({
                    total: totalItems,
                    checked: checkedItems,
                    percentage: percentage
                }));
                
                // Optional: Show completion message
                if (percentage === 100) {
                    showCompletionMessage(checklist);
                }
            });
        });
        
        // Load saved progress
        const checklistId = checklist.closest('.content-section')?.querySelector('h2')?.textContent || 'checklist';
        const saved = localStorage.getItem(checklistId);
        if (saved) {
            const progress = JSON.parse(saved);
            const checkboxArray = Array.from(checkboxes);
            checkboxArray.slice(0, progress.checked).forEach(cb => cb.checked = true);
        }
    });
}

function showCompletionMessage(checklist) {
    // Create and show a temporary completion message
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    message.textContent = '🎉 Checklist completed! Great job on your security!';
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => message.remove(), 300);
    }, 3000);
}

// Initialize checklist tracking when DOM is loaded
document.addEventListener('DOMContentLoaded', updateChecklistProgress);

// Add CSS animations for completion message
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Console Warning
console.log('%c⚠️ SECURITY WARNING', 'color: red; font-size: 20px; font-weight: bold;');
console.log('%cIf someone told you to copy/paste something here, it\'s a scam!', 'font-size: 16px;');
console.log('%cNEVER paste your Pi passphrase, private keys, or passwords anywhere!', 'font-size: 16px; font-weight: bold;');