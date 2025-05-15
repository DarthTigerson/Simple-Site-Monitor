document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const settingsForm = document.getElementById('settingsForm');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const webhookToggleBtn = document.getElementById('webhookToggleBtn');
    const webhookEnabledInput = document.getElementById('webhookEnabled');
    const webhookUrlInput = document.getElementById('webhookUrl');
    const testWebhookBtn = document.getElementById('testWebhookBtn');
    const debugToggleBtn = document.getElementById('debugToggleBtn');
    const includeErrorDebuggingInput = document.getElementById('includeErrorDebugging');
    
    // Track if form has been modified
    let formModified = false;
    
    // Function to mark form as modified
    function markFormAsModified() {
        if (!formModified) {
            formModified = true;
            saveSettingsBtn.classList.add('modified');
        }
    }
    
    // Function to reset modified state
    function resetModifiedState() {
        formModified = false;
        saveSettingsBtn.classList.remove('modified');
    }
    
    // Add change listeners to all form inputs
    if (settingsForm) {
        // Listen for changes on all number inputs
        const numberInputs = settingsForm.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            input.addEventListener('change', markFormAsModified);
        });
        
        // Listen for changes on text/url inputs
        const textInputs = settingsForm.querySelectorAll('input[type="text"], input[type="url"]');
        textInputs.forEach(input => {
            input.addEventListener('input', markFormAsModified);
        });
        
        // Listen for clicks on number increment/decrement buttons
        const numberButtons = settingsForm.querySelectorAll('.number-increment, .number-decrement');
        numberButtons.forEach(button => {
            button.addEventListener('click', markFormAsModified);
        });
    }
    
    // Initialize webhook field states based on current toggle value
    if (webhookEnabledInput && webhookUrlInput && testWebhookBtn) {
        updateWebhookFieldStates(webhookEnabledInput.value === 'true');
    }
    
    // Toggle webhook enabled/disabled
    if (webhookToggleBtn && webhookEnabledInput) {
        webhookToggleBtn.addEventListener('click', function() {
            const currentState = webhookEnabledInput.value === 'true';
            const newState = !currentState;
            
            // Update hidden input value
            webhookEnabledInput.value = newState.toString();
            
            // Mark form as modified
            markFormAsModified();
            
            // Update button text and class
            if (newState) {
                webhookToggleBtn.textContent = 'Webhook Enabled';
                webhookToggleBtn.classList.remove('disabled');
                webhookToggleBtn.classList.add('enabled');
            } else {
                webhookToggleBtn.textContent = 'Webhook Disabled';
                webhookToggleBtn.classList.remove('enabled');
                webhookToggleBtn.classList.add('disabled');
            }
            
            // Update webhook field states
            updateWebhookFieldStates(newState);
        });
    }
    
    // Toggle debug enabled/disabled
    if (debugToggleBtn && includeErrorDebuggingInput) {
        debugToggleBtn.addEventListener('click', function() {
            const currentState = includeErrorDebuggingInput.value === 'true';
            const newState = !currentState;
            
            console.log('Debug toggle: current state =', currentState, ', new state =', newState);
            
            // Update hidden input value
            includeErrorDebuggingInput.value = newState.toString();
            console.log('Updated includeErrorDebugging value =', includeErrorDebuggingInput.value);
            
            // Mark form as modified
            markFormAsModified();
            
            // Update button text and class
            if (newState) {
                debugToggleBtn.textContent = 'Error Details Included';
                debugToggleBtn.classList.remove('disabled');
                debugToggleBtn.classList.add('enabled');
            } else {
                debugToggleBtn.textContent = 'Simple Details';
                debugToggleBtn.classList.remove('enabled');
                debugToggleBtn.classList.add('disabled');
            }
        });
    }
    
    // Function to update webhook field states based on enabled/disabled state
    function updateWebhookFieldStates(isEnabled) {
        // Get the cards we want to show/hide
        const webhookDetailsCard = document.querySelector('.webhook-details-card');
        const webhookUrlCard = document.querySelector('.webhook-url-card');
        
        if (webhookUrlInput) {
            if (isEnabled) {
                // Enable the webhook URL input
                webhookUrlInput.removeAttribute('disabled');
                
                // Show the webhook details and URL cards
                if (webhookDetailsCard) webhookDetailsCard.style.display = 'block';
                if (webhookUrlCard) webhookUrlCard.style.display = 'block';
            } else {
                // Disable the webhook URL input
                webhookUrlInput.setAttribute('disabled', 'disabled');
                
                // Hide the webhook details and URL cards
                if (webhookDetailsCard) webhookDetailsCard.style.display = 'none';
                if (webhookUrlCard) webhookUrlCard.style.display = 'none';
            }
        }
        
        // Always ensure the test button is visible, but disable it when webhook is disabled
        if (testWebhookBtn) {
            testWebhookBtn.style.display = 'flex'; // Always show
            testWebhookBtn.disabled = !isEnabled; // But disable when webhook is disabled
        }
    }
    
    // Handle save button click
    if (saveSettingsBtn && settingsForm) {
        saveSettingsBtn.addEventListener('click', async function() {
            // Validate form manually
            const scanInterval = document.getElementById('scanInterval');
            const defaultTimeout = document.getElementById('defaultTimeout');
            const slowThreshold = document.getElementById('slowThreshold');
            const expiringTokenThreshold = document.getElementById('expiringTokenThreshold');
            
            if (!scanInterval.value || !defaultTimeout.value || !slowThreshold.value || !expiringTokenThreshold.value) {
                window.showNotification('Please fill out all required fields', 'error');
                return;
            }
            
            // Show loading state
            saveSettingsBtn.disabled = true;
            const originalBtnHTML = saveSettingsBtn.innerHTML;
            saveSettingsBtn.innerHTML = '<svg class="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg>';
            
            try {
                // Get global settings
                const globalSettings = {
                    default_scan_interval: parseInt(scanInterval.value),
                    default_timeout: parseInt(defaultTimeout.value),
                    default_slow_threshold: parseFloat(slowThreshold.value),
                    expiring_token_threshold: parseInt(expiringTokenThreshold.value),
                    attempt_before_trigger: parseInt(document.getElementById('attemptBeforeTrigger').value),
                    include_error_debugging: document.getElementById('includeErrorDebugging').value === 'true'
                };
                
                // Get webhook settings
                const webhookUrl = webhookUrlInput.value.trim();
                const hasWebhook = webhookUrl !== '';
                
                // Save global settings first
                await saveSettings(globalSettings);
                
                // Then handle webhook
                if (hasWebhook) {
                    const webhook = {
                        type: determineWebhookType(webhookUrl),
                        url: webhookUrl,
                        enabled: webhookEnabledInput.value === 'true'
                    };
                    
                    await saveWebhook(webhook);
                } else {
                    // If URL is empty, delete the webhook if it exists
                    await deleteWebhookIfExists();
                }
                
                // Reset modified state after successful save
                resetModifiedState();
                
                window.showNotification('Settings saved successfully', 'success');
            } catch (error) {
                console.error('Error saving settings:', error);
                window.showNotification('Error: ' + error.message, 'error');
            } finally {
                // Restore button state
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.innerHTML = originalBtnHTML;
            }
        });
    }
    
    // Test the webhook to see if it works
    if (testWebhookBtn) {
        testWebhookBtn.addEventListener('click', async function() {
            const webhookUrl = webhookUrlInput.value.trim();
            if (!webhookUrl) {
                window.showNotification('Please enter a webhook URL', 'error');
                return;
            }
            
            // Show loading state
            testWebhookBtn.disabled = true;
            testWebhookBtn.innerHTML = '<svg class="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg>';
            
            try {
                // First validate the webhook
                const validation = await validateWebhook(webhookUrl);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }
                
                // Use the validated webhook type
                const webhookType = validation.type;
                
                // Then send the test
                const response = await fetch('/api/test-webhook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: webhookUrl,
                        type: webhookType
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to test webhook');
                }
                
                window.showNotification('Test notification sent. Check your ' + webhookType.charAt(0).toUpperCase() + webhookType.slice(1) + ' channel for the test message.', 'success');
            } catch (error) {
                console.error('Error testing webhook:', error);
                window.showNotification('Error: ' + error.message, 'error');
            } finally {
                // Restore button state
                testWebhookBtn.disabled = false;
                testWebhookBtn.innerHTML = '<svg fill="currentColor" height="18" width="18" viewBox="0 0 24 24"><path d="M23,24H1v-4.3l7-12V2H6V0h12v2h-2v5.7l7,12V24z M12,22h9v-1.7l-3.4-5.9l0,0c-2.6-1.5-3.9-0.8-5.4-0.1S9,15.7,6.5,14.5 l-3.4,5.9V22H12z M7.4,12.7C9,13.4,10,13,11.3,12.4c1.2-0.5,2.7-1.2,4.7-0.7l-2-3.4V2h-4v6.3L7.4,12.7z"></path><circle cx="14.5" cy="17.5" r="1.5"></circle><circle cx="9.5" cy="18.5" r="1.5"></circle></svg>';
            }
        });
    }
    
    // Function to determine webhook type from URL
    function determineWebhookType(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('discord.com') && urlLower.includes('/api/webhooks/')) {
            return 'discord';
        } else if (urlLower.includes('hooks.slack.com') && urlLower.includes('/services/')) {
            return 'slack';
        } else {
            // Default to empty as we only support discord and slack
            return '';
        }
    }
    
    // Function to validate webhook URL
    async function validateWebhook(url) {
        if (!url) return { valid: false, error: 'Webhook URL cannot be empty' };
        
        try {
            const response = await fetch('/api/validate-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                return { valid: false, error: errorData.detail || 'Error validating webhook' };
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error validating webhook:', error);
            return { valid: false, error: error.message || 'Error validating webhook' };
        }
    }
    
    // Validate webhook field on blur
    if (webhookUrlInput) {
        webhookUrlInput.addEventListener('blur', async function() {
            const url = webhookUrlInput.value.trim();
            if (!url) return; // Skip validation for empty URLs
            
            const errorContainer = document.getElementById('webhookUrlError') || createErrorElement();
            
            const result = await validateWebhook(url);
            if (!result.valid) {
                // Show error
                errorContainer.textContent = result.error;
                errorContainer.style.display = 'block';
                webhookUrlInput.classList.add('error');
            } else {
                // Clear error
                errorContainer.style.display = 'none';
                webhookUrlInput.classList.remove('error');
            }
        });
    }
    
    // Create error element if it doesn't exist
    function createErrorElement() {
        const errorContainer = document.createElement('div');
        errorContainer.id = 'webhookUrlError';
        errorContainer.className = 'error-message';
        errorContainer.style.color = '#f44336';
        errorContainer.style.fontSize = '0.85rem';
        errorContainer.style.marginTop = '4px';
        
        webhookUrlInput.parentNode.appendChild(errorContainer);
        return errorContainer;
    }
    
    // Function to save global settings
    function saveSettings(settings) {
        console.log('Saving settings:', settings);
        return fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save global settings');
            }
            return response.json();
        })
        .then(data => {
            console.log('Settings saved successfully:', data);
            return data;
        });
    }
    
    // Function to save webhook with validation
    async function saveWebhook(webhook) {
        // Validate webhook URL if provided
        if (webhook.url) {
            const validation = await validateWebhook(webhook.url);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Use the validated webhook type
            webhook.type = validation.type;
        }
        
        // Always use PUT to update the existing webhook object
        return fetch('/api/webhooks/0', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhook)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || 'Failed to save webhook');
                });
            }
            return response.json();
        });
    }
    
    // Function to delete webhook if it exists
    function deleteWebhookIfExists() {
        // Instead of deleting, update with empty values
        const emptyWebhook = {
            type: '',
            url: '',
            enabled: false
        };
        
        return fetch('/api/webhooks/0', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emptyWebhook)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to clear webhook');
            }
            return { message: 'Webhook cleared successfully' };
        });
    }
}); 