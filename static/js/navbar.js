document.addEventListener('DOMContentLoaded', function() {
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', function() {
            navbarMenu.classList.toggle('active');
        });
    }
    
    // Close navbar when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInside = navbarToggle.contains(event.target) || navbarMenu.contains(event.target);
        
        if (!isClickInside && navbarMenu.classList.contains('active')) {
            navbarMenu.classList.remove('active');
        }
    });
    
    // Settings button functionality
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Scroll to global settings section
            const settingsSection = document.querySelector('.global-settings');
            if (settingsSection) {
                settingsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
});
