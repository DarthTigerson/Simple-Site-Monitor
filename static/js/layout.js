// Global functions and utilities
document.addEventListener('DOMContentLoaded', function() {
    // Add any global event listeners or initializations here
    console.log('Layout script loaded');
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
