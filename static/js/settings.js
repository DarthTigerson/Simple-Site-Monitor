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
        if (webhookUrlInput && testWebhookBtn) {
            if (isEnabled) {
                // Enable the webhook URL input and show test button
                webhookUrlInput.removeAttribute('disabled');
                testWebhookBtn.style.display = 'flex'; // Use flex to maintain centering
            } else {
                // Disable the webhook URL input and hide test button
                webhookUrlInput.setAttribute('disabled', 'disabled');
                testWebhookBtn.style.display = 'none';
            }
        }
    }
    
    // Handle save button click
    if (saveSettingsBtn && settingsForm) {
        saveSettingsBtn.addEventListener('click', function() {
            // Validate form manually
            const scanInterval = document.getElementById('scanInterval');
            const defaultTimeout = document.getElementById('defaultTimeout');
            const slowThreshold = document.getElementById('slowThreshold');
            const expiringTokenThreshold = document.getElementById('expiringTokenThreshold');
            
            if (!scanInterval.value || !defaultTimeout.value || !slowThreshold.value || !expiringTokenThreshold.value) {
                window.showNotification('Please fill out all required fields', 'error');
                return;
            }
            
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
            
            // Save settings
            saveSettings(globalSettings)
                .then(() => {
                    // If webhook URL is provided, save webhook
                    if (hasWebhook) {
                        const webhook = {
                            type: determineWebhookType(webhookUrl),
                            url: webhookUrl,
                            enabled: webhookEnabledInput.value === 'true'
                        };
                        
                        return saveWebhook(webhook);
                    } else {
                        // If URL is empty, delete the webhook if it exists
                        return deleteWebhookIfExists();
                    }
                })
                .then(() => {
                    window.showNotification('Settings saved successfully', 'success');
                })
                .catch(error => {
                    console.error('Error saving settings:', error);
                    window.showNotification('Error saving settings: ' + error.message, 'error');
                });
        });
    }
    
    // Test the webhook to see if it works
    if (testWebhookBtn) {
        testWebhookBtn.addEventListener('click', function() {
            const webhookUrl = webhookUrlInput.value.trim();
            if (!webhookUrl) {
                window.showNotification('Please enter a webhook URL', 'error');
                return;
            }
            
            fetch('/api/test-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    type: determineWebhookType(webhookUrl)
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to test webhook');
                }
                return response.json();
            })
            .then(data => {
                window.showNotification('Webhook test message sent successfully', 'success');
            })
            .catch(error => {
                console.error('Error testing webhook:', error);
                window.showNotification('Error testing webhook: ' + error.message, 'error');
            });
        });
    }
    
    // Function to determine webhook type from URL
    function determineWebhookType(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('discord.com')) {
            return 'discord';
        } else if (urlLower.includes('slack.com')) {
            return 'slack';
        } else if (urlLower.includes('office.com') || urlLower.includes('microsoft.com')) {
            return 'teams';
        } else {
            return 'custom';
        }
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
    
    // Function to save webhook
    function saveWebhook(webhook) {
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
                throw new Error('Failed to save webhook');
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