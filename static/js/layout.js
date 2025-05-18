// Global functions and utilities
document.addEventListener('DOMContentLoaded', function() {
    // Add any global event listeners or initializations here
    console.log('Layout script loaded');
    
    // Konami
    let konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiPosition = 0;
    
    document.addEventListener('keydown', function(e) {
        // Get the key pressed
        const key = e.key;
        
        // Check if the key matches the expected key in the Konami sequence
        if (key === konamiCode[konamiPosition]) {
            // Move to the next position in the sequence
            konamiPosition++;
            
            // Check if the full sequence has been entered
            if (konamiPosition === konamiCode.length) {
                // Reset the position
                konamiPosition = 0;
                
                // Trigger the Easter egg
                activateBoatEasterEgg();
            }
        } else {
            // Reset if wrong key pressed
            konamiPosition = 0;
        }
    });
    
    function activateBoatEasterEgg() {
        console.log('Easter egg activated! 🚢');
        
        // Create boat element
        const boat = document.createElement('div');
        boat.className = 'easter-boat';
        
        // Create boat image
        const boatImg = document.createElement('img');
        boatImg.src = '/static/images/easter-boat.png';
        boatImg.alt = 'Sailing boat';
        
        // Append image to boat div
        boat.appendChild(boatImg);
        
        // Get footer element
        const footer = document.querySelector('footer');
        
        // Add boat to footer
        footer.appendChild(boat);
        
        // Listen for animation end to remove the boat
        boat.addEventListener('animationend', function() {
            boat.remove();
        });
    }
});

// Global notification system
document.addEventListener('DOMContentLoaded', function() {
    // Create global notification function
    window.showNotification = function(message, type = 'info', duration = 5000) {
        // Create notification elements
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const messageElement = document.createElement('div');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;
        
        const progress = document.createElement('div');
        progress.className = 'notification-progress';
        progress.style.animationDuration = `${duration}ms`;
        
        // Assemble notification
        content.appendChild(messageElement);
        notification.appendChild(content);
        notification.appendChild(progress);
        
        // Set up auto-removal
        notification.style.animationDelay = `0s, ${duration - 500}ms`;
        
        // Add to container
        const container = document.getElementById('notification-container');
        container.appendChild(notification);
        
        // Remove after animation completes
        setTimeout(() => {
            notification.remove();
        }, duration);
        
        return notification;
    };
    
    // Add event listeners for custom events
    document.addEventListener('showNotification', function(e) {
        window.showNotification(e.detail.message, e.detail.type, e.detail.duration);
    });
});
