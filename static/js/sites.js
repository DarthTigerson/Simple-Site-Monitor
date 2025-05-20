document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const siteModal = document.getElementById('siteModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeModalBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Forms
    const siteForm = document.getElementById('siteForm');
    
    // Buttons
    const addSiteBtn = document.getElementById('addSiteBtn');
    const addFirstSiteBtn = document.getElementById('addFirstSiteBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    // View containers
    const sitesContainer = document.querySelector('.sites-grid');
    
    // Form fields
    const triggerTypeSelect = document.getElementById('triggerType');
    const triggerValueInput = document.getElementById('triggerValue');
    const triggerHelp = document.getElementById('triggerHelp');
    
    // Test and Response Preview elements
    const testSiteBtn = document.getElementById('testSiteBtn');
    const testResultSuccess = document.getElementById('testResultSuccess');
    const testResultFailure = document.getElementById('testResultFailure');
    const responsePreviewPanel = document.getElementById('responsePreviewPanel');
    const toggleResponseDetailsBtn = document.getElementById('toggleResponseDetailsBtn');
    const responseDetails = document.getElementById('responseDetails');
    const responseBody = document.getElementById('responseBody');
    
    // Initialize timeoutInput for use in other functions
    const timeoutInput = document.getElementById('timeout');
    
    // Initialize tags input
    initTagsInput();
    
    // Initialize table sorting in list view
    initTableSorting();
    
    // Attach event listeners to site cards
    attachSiteCardEvents();
    
    // View toggle functionality
    if (gridViewBtn && listViewBtn && sitesContainer) {
        // Check if there's a saved preference
        const viewPreference = localStorage.getItem('sitesViewPreference') || 'grid';
        
        // Apply the saved preference on page load
        if (viewPreference === 'list') {
            sitesContainer.classList.remove('sites-grid');
            sitesContainer.classList.add('sites-list');
            gridViewBtn.classList.remove('active');
            listViewBtn.classList.add('active');
        }
        
        gridViewBtn.addEventListener('click', function() {
            sitesContainer.classList.remove('sites-list');
            sitesContainer.classList.add('sites-grid');
            listViewBtn.classList.remove('active');
            gridViewBtn.classList.add('active');
            localStorage.setItem('sitesViewPreference', 'grid');
        });
        
        listViewBtn.addEventListener('click', function() {
            sitesContainer.classList.remove('sites-grid');
            sitesContainer.classList.add('sites-list');
            gridViewBtn.classList.remove('active');
            listViewBtn.classList.add('active');
            localStorage.setItem('sitesViewPreference', 'list');
            
            // Sort by name when switching to list view
            setTimeout(() => {
                const headerCells = document.querySelectorAll('.sites-list-header .list-header-cell');
                if (headerCells.length > 0) {
                    // Remove any existing sort classes
                    headerCells.forEach(h => {
                        h.classList.remove('sorting-asc', 'sorting-desc');
                    });
                    
                    // Add ascending sort class to name header
                    headerCells[0].classList.add('sorting-asc');
                    
                    // Get all site cards and sort them
                    const siteCards = Array.from(document.querySelectorAll('.site-card'));
                    sortSiteCards(siteCards, 0, true); // Sort by name (index 0) in ascending order
                    
                    // Reappend the sorted site cards to update the display
                    siteCards.forEach(card => {
                        sitesContainer.appendChild(card);
                    });
                }
            }, 10); // Small delay to ensure DOM is updated
        });
    }
    
    // Add event listeners for opening/closing modals
    if (addSiteBtn && siteModal) {
        addSiteBtn.addEventListener('click', function() {
            openAddSiteModal();
        });
    }
    
    // Handle dropdown menu actions in list view
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            
            const action = item.getAttribute('data-action');
            const siteCard = item.closest('.site-card');
            const siteIndex = siteCard.getAttribute('data-site-index');
            
            // Handle the action (scan, edit, delete)
            handleSiteAction(action, siteCard, siteIndex);
        });
    });
    
    function openAddSiteModal() {
        // Reset form for adding new site
        siteForm.reset();
        document.getElementById('siteIndex').value = '';
        document.getElementById('modalTitle').textContent = 'Add New Site';
        
        // Set default values
        triggerTypeSelect.value = 'status_code';
        triggerValueInput.value = '200';
        updateTriggerHelp();
        
        // Pre-populate URL field with https://
        document.getElementById('siteUrl').value = 'https://';
        
        // Hide test results and response preview
        hideTestResults();
        hideResponsePreview();
        
        // Display modal
        siteModal.style.display = 'flex';
    }
    
    // Test Site functionality
    if (testSiteBtn) {
        testSiteBtn.addEventListener('click', function() {
            // Get values from form
            const url = document.getElementById('siteUrl').value;
            const triggerType = triggerTypeSelect.value;
            const triggerValue = triggerValueInput.value;
            const timeout = parseInt(document.getElementById('timeout').value, 10) || 0;
            
            // Try to get additional optional fields
            const methodInput = document.getElementById('siteMethod');
            const contentTypeInput = document.getElementById('siteContentType');
            const bodyInput = document.getElementById('siteBody');
            
            // Validate URL
            if (!url || url === 'https://') {
                alert('Please enter a valid URL');
                return;
            }
            
            // Simulate loading state
            testSiteBtn.classList.add('loading');
            testSiteBtn.disabled = true;
            
            // Hide previous results
            hideTestResults();
            hideResponsePreview();
            
            // Prepare the request data
            const requestData = {
                url: url,
                trigger_type: triggerType,
                trigger_value: triggerValue,
                timeout: timeout
            };
            
            // Add optional parameters if they exist
            if (methodInput && methodInput.value) {
                requestData.method = methodInput.value;
            }
            
            if (contentTypeInput && contentTypeInput.value) {
                requestData.content_type = contentTypeInput.value;
            }
            
            if (bodyInput && bodyInput.value) {
                requestData.body = bodyInput.value;
            }
            
            // Make the API call to test the site
            fetch('/api/test-site', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Remove loading state
                testSiteBtn.classList.remove('loading');
                testSiteBtn.disabled = false;
                
                // Handle the response
                if (data.success) {
                    // Show success message
                    testResultSuccess.style.display = 'flex';
                } else {
                    // Show failure message
                    testResultFailure.style.display = 'flex';
                    
                    // Show response preview panel for troubleshooting
                    showResponsePreview();
                    
                    // Populate response data
                    populateResponseData(data);
                }
            })
            .catch(error => {
                // Remove loading state
                testSiteBtn.classList.remove('loading');
                testSiteBtn.disabled = false;
                
                // Show error message
                testResultFailure.style.display = 'flex';
                
                // Show response preview for error details
                showResponsePreview();
                responseBody.textContent = `Error testing site: ${error.message}`;
                
                // Set other fields to indicate error
                document.getElementById('responseStatusCode').textContent = 'Error';
                document.getElementById('responseTime').textContent = '0ms';
                document.getElementById('responseContentType').textContent = 'N/A';
                
                console.error('Error testing site:', error);
            });
        });
    }
    
    // Helper to populate response data from API
    function populateResponseData(data) {
        // Set response details
        document.getElementById('responseStatusCode').textContent = data.status_code || 'N/A';
        document.getElementById('responseTime').textContent = `${data.response_time}ms`;
        document.getElementById('responseContentType').textContent = data.content_type || 'N/A';
        
        // Set response body
        const body = data.body || 'No response body';
        
        // If using text trigger type and we have both body and trigger value, highlight the text
        const triggerType = document.getElementById('triggerType').value;
        const triggerValue = document.getElementById('triggerValue').value;
        
        if (triggerType === 'text' && body && triggerValue) {
            try {
                // Try to highlight the trigger text if it exists
                let displayBody = body;
                
                if (body.includes(triggerValue)) {
                    // Escape HTML to prevent XSS
                    const escapedBody = body
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                    
                    // Escape the trigger value for use in regex
                    const escapedTrigger = triggerValue
                        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Replace the trigger value with a highlighted version
                    const regex = new RegExp(escapedTrigger, 'g');
                    displayBody = escapedBody.replace(regex, '<span class="highlight">$&</span>');
                    
                    // Use innerHTML carefully since we've already escaped the content
                    responseBody.innerHTML = displayBody;
                    return;
                }
            } catch (e) {
                console.error('Error highlighting text:', e);
            }
        }
        
        // Default case, just set as text
        responseBody.textContent = body;
    }
    
    // Response Preview Panel functions
    function hideTestResults() {
        if (testResultSuccess) testResultSuccess.style.display = 'none';
        if (testResultFailure) testResultFailure.style.display = 'none';
    }
    
    function hideResponsePreview() {
        if (responsePreviewPanel) responsePreviewPanel.style.display = 'none';
    }
    
    function showResponsePreview() {
        if (responsePreviewPanel) {
            responsePreviewPanel.style.display = 'block';
            
            // Reset details view
            if (responseDetails) responseDetails.style.display = 'none';
            if (toggleResponseDetailsBtn) toggleResponseDetailsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Details';
        }
    }
    
    // Toggle details button
    if (toggleResponseDetailsBtn && responseDetails) {
        toggleResponseDetailsBtn.addEventListener('click', function() {
            const isVisible = responseDetails.style.display === 'block';
            
            if (isVisible) {
                responseDetails.style.display = 'none';
                toggleResponseDetailsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Details';
            } else {
                responseDetails.style.display = 'block';
                toggleResponseDetailsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 15L12 8L19 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Hide';
            }
        });
    }
    
    // Update help text based on trigger type
    if (triggerTypeSelect && triggerHelp) {
        triggerTypeSelect.addEventListener('change', updateTriggerHelp);
    }
    
    function updateTriggerHelp() {
        if (triggerTypeSelect.value === 'status_code') {
            triggerHelp.textContent = 'HTTP status code (usually 200) to verify the site is up';
            triggerValueInput.placeholder = 'e.g. 200';
        } else {
            triggerHelp.textContent = 'Text content that must be present in the response';
            triggerValueInput.placeholder = 'e.g. "Welcome to our site"';
        }
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            siteModal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            siteModal.style.display = 'none';
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === siteModal) {
            siteModal.style.display = 'none';
        }
        if (event.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });
    
    // Handle actions in both grid and list views
    document.addEventListener('click', function(e) {
        // Find the closest action button, whether in grid or list view
        const actionButton = e.target.closest('[data-action]');
        
        if (actionButton) {
            const action = actionButton.getAttribute('data-action');
            const card = actionButton.closest('.site-card');
            const siteIndex = card.getAttribute('data-site-index');
            
            console.log('Action button clicked:', action);
            console.log('Site card element:', card);
            console.log('Site index:', siteIndex);
            
            // Handle the action
            handleSiteAction(action, card, siteIndex);
        }
    });
    
    if (addFirstSiteBtn && siteModal) {
        addFirstSiteBtn.addEventListener('click', function() {
            openAddSiteModal();
        });
    }
    
    // Handle form submissions
    if (siteForm) {
        siteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById("siteName");
            const urlInput = document.getElementById("siteUrl");
            const methodInput = document.getElementById("siteMethod");
            const contentTypeInput = document.getElementById("siteContentType");
            const bodyInput = document.getElementById("siteBody");
            const triggerTypeInput = document.getElementById("triggerType");
            const triggerValueInput = document.getElementById("triggerValue");
            const timeoutInput = document.getElementById("timeout");
            const scanIntervalInput = document.getElementById("scanInterval");
            const monitorTokenInput = document.getElementById("monitorTokenExpiry");
            const webhookEnabledInput = document.getElementById("webhookEnabled");
            
            // Enhanced URL validation
            const errorAlert = document.getElementById("formError");
            
            // Validate form
            if (!nameInput.value || !urlInput.value) {
                // Show error
                errorAlert.textContent = "Please fill in all required fields";
                errorAlert.style.display = "block";
                return;
            }
            
            // URL validation
            let siteUrl = urlInput.value.trim();
            
            // Check if URL starts with http:// or https://
            if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
                siteUrl = 'https://' + siteUrl;
                urlInput.value = siteUrl;
            }
            
            try {
                new URL(siteUrl); // Will throw if invalid URL
            } catch (e) {
                errorAlert.textContent = "Please enter a valid URL";
                errorAlert.style.display = "block";
                return;
            }
            
            // Get site index if editing
            const siteIndex = document.getElementById("siteIndex").value;
            
            // Hide error if visible
            errorAlert.style.display = "none";
            
            // Show loading
            const submitBtn = document.getElementById("siteSubmitBtn");
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            submitBtn.disabled = true;
            
            // Properly parse hidden input values as boolean
            const isMonitoringToken = monitorTokenInput.value === 'true';
            const isWebhookEnabled = webhookEnabledInput.value === 'true';
            
            console.log('Current notification toggle value:', webhookEnabledInput.value);
            console.log('Parsed notification value:', isWebhookEnabled);
            
            // Get tags from UI
            const tags = getTagsFromUI();
            
            // Create basic site data object with only required fields
            let siteData = {
                name: nameInput.value,
                url: siteUrl,
                trigger: {
                    type: triggerTypeInput.value,
                    value: triggerValueInput.value
                },
                timeout: parseInt(timeoutInput.value, 10) || 0,
                scan_interval: parseInt(scanIntervalInput.value, 10) || 0,
                monitor_expiring_token: isMonitoringToken,
                webhook: isWebhookEnabled,
                tags: tags
            };
            
            // Only add method, content_type, and body if they have values
            if (methodInput && methodInput.value && methodInput.value !== 'GET') {
                siteData.method = methodInput.value;
            }
            
            if (contentTypeInput && contentTypeInput.value && contentTypeInput.value !== 'application/json') {
                siteData.content_type = contentTypeInput.value;
            }
            
            if (bodyInput && bodyInput.value && bodyInput.value.trim() !== '') {
                siteData.body = bodyInput.value;
            }
            
            let endpoint = '/api/sites';
            if (siteIndex !== '') {
                const siteIndexInt = parseInt(siteIndex, 10);
                if (isNaN(siteIndexInt)) {
                    console.error('Invalid site index:', siteIndex);
                    alert('Error: Invalid site index');
                    return;
                }
                endpoint = `/api/sites/${siteIndexInt}`;
            }
            
            console.log('Submitting to URL:', endpoint);
            console.log('Form data:', siteData);
            
            fetch(endpoint, {
                method: siteIndex === '' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(siteData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Success notification
                if (window.showNotification) {
                    window.showNotification(`Site ${siteIndex === '' ? 'added' : 'updated'} successfully`, 'success');
                }
                
                // Close modal and reload page to show changes
                siteModal.style.display = 'none';
                window.location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                // Show error
                window.showNotification ? 
                    window.showNotification('Failed to save site configuration.', 'error') : 
                    alert('Failed to save site configuration.');
            });
        });
    }
    
    // Handle delete confirmation
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const siteIndexStr = document.getElementById('deleteIndex').value;
            
            // Make sure siteIndex is an integer
            const siteIndexInt = parseInt(siteIndexStr, 10);
            if (isNaN(siteIndexInt)) {
                console.error('Invalid site index for deletion:', siteIndexStr);
                alert('Error: Invalid site index');
                return;
            }
            
            // Show loading state
            const originalText = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<svg class="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg> Deleting...';
            
            console.log('Deleting site with index:', siteIndexInt);
            
            fetch(`/api/sites/${siteIndexInt}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Success notification
                if (window.showNotification) {
                    window.showNotification('Site deleted successfully', 'success');
                }
                
                // Close modal and reload page
                deleteModal.style.display = 'none';
                window.location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Reset button state
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = originalText;
                
                // Show error
                window.showNotification ? 
                    window.showNotification('Failed to delete site.', 'error') : 
                    alert('Failed to delete site.');
            });
        });
    }

    // Handle timeout and scan interval increment and decrement buttons
    const timeoutDecrement = document.getElementById("timeout-decrement");
    const timeoutIncrement = document.getElementById("timeout-increment");

    if (timeoutInput && timeoutDecrement && timeoutIncrement) {
        timeoutDecrement.addEventListener("click", function() {
            if (timeoutInput.value > 0) {
                timeoutInput.stepDown();
                timeoutInput.dispatchEvent(new Event('change'));
            }
        });

        timeoutIncrement.addEventListener("click", function() {
            timeoutInput.stepUp();
            timeoutInput.dispatchEvent(new Event('change'));
        });
    }
    
    // Scan Interval controls
    const scanIntervalInput = document.getElementById("scanInterval");
    const scanIntervalDecrement = document.getElementById("scanInterval-decrement");
    const scanIntervalIncrement = document.getElementById("scanInterval-increment");

    if (scanIntervalInput && scanIntervalDecrement && scanIntervalIncrement) {
        scanIntervalDecrement.addEventListener("click", function() {
            if (scanIntervalInput.value > 0) {
                scanIntervalInput.stepDown();
                scanIntervalInput.dispatchEvent(new Event('change'));
            }
        });

        scanIntervalIncrement.addEventListener("click", function() {
            scanIntervalInput.stepUp();
            scanIntervalInput.dispatchEvent(new Event('change'));
        });
    }

    // Handle SSL toggle button
    const sslToggleBtn = document.getElementById('sslToggleBtn');
    const monitorTokenInput = document.getElementById('monitorTokenExpiry');
    
    if (sslToggleBtn && monitorTokenInput) {
        // Initialize button state
        updateSSLToggleState();
        
        sslToggleBtn.addEventListener('click', function() {
            // Toggle the value
            const currentValue = monitorTokenInput.value === 'true';
            monitorTokenInput.value = currentValue ? 'false' : 'true';
            
            // Update button appearance
            updateSSLToggleState();
        });
    }
    
    function updateSSLToggleState() {
        const isEnabled = monitorTokenInput.value === 'true';
        
        // Update button text and class
        if (isEnabled) {
            sslToggleBtn.textContent = 'Monitoring SSL';
            sslToggleBtn.classList.remove('disabled');
            sslToggleBtn.classList.add('enabled');
        } else {
            sslToggleBtn.textContent = 'Not Monitoring SSL';
            sslToggleBtn.classList.remove('enabled');
            sslToggleBtn.classList.add('disabled');
        }
    }
    
    // Handle Notifications toggle button
    const notifyToggleBtn = document.getElementById('notifyToggleBtn');
    const webhookEnabledInput = document.getElementById('webhookEnabled');
    
    if (notifyToggleBtn && webhookEnabledInput) {
        // Initialize button state
        updateNotifyToggleState();
        
        console.log('Setting up notification toggle click handler');
        
        notifyToggleBtn.addEventListener('click', function() {
            console.log('Notification toggle button clicked');
            
            // Toggle the value
            const currentValue = webhookEnabledInput.value === 'true';
            console.log('Current webhook value before toggle:', currentValue);
            
            webhookEnabledInput.value = currentValue ? 'false' : 'true';
            console.log('New webhook value after toggle:', webhookEnabledInput.value);
            
            // Update button appearance
            updateNotifyToggleState();
        });
    }
    
    function updateNotifyToggleState() {
        const isEnabled = webhookEnabledInput.value === 'true';
        console.log('Updating notify toggle state, enabled:', isEnabled);
        
        // Update button text and class
        if (isEnabled) {
            notifyToggleBtn.textContent = 'Send Webhooks';
            notifyToggleBtn.classList.remove('disabled');
            notifyToggleBtn.classList.add('enabled');
        } else {
            notifyToggleBtn.textContent = 'No Webhooks';
            notifyToggleBtn.classList.remove('enabled');
            notifyToggleBtn.classList.add('disabled');
        }
    }

    // Attach event listeners to site cards
    function attachSiteCardEvents() {
        console.log('Attaching site card events');
        
        const siteCards = document.querySelectorAll('.site-card');
        siteCards.forEach(card => {
            const siteIndex = card.getAttribute('data-site-index');
            
            // Edit buttons
            const editBtns = card.querySelectorAll('.btn-edit');
            editBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    handleSiteAction('edit', card, siteIndex);
                });
            });
            
            // Delete buttons
            const deleteBtns = card.querySelectorAll('.btn-delete');
            deleteBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    handleSiteAction('delete', card, siteIndex);
                });
            });
        });
    }
});

// Table sorting functionality
function initTableSorting() {
    // Get list header cells
    const headerCells = document.querySelectorAll('.sites-list-header .list-header-cell');
    if (!headerCells.length) return;
    
    // Find list view container to get site cards
    const sitesContainer = document.querySelector('.sites-grid');
    if (!sitesContainer) return;
    
    // Add sort indicators and click handlers to header cells
    headerCells.forEach((header, index) => {
        // Skip action column (last column)
        if (header.classList.contains('site-actions-col')) return;
        
        // Add sort icons and make headers look clickable
        header.classList.add('sortable');
        
        // Create sort header with icon
        const originalText = header.textContent;
        header.innerHTML = `<div class="sort-header">${originalText}<span class="sort-icon"></span></div>`;
        
        // Add click handler for sorting
        header.addEventListener('click', () => {
            // Determine sort direction based on current state
            let isAscending = true;
            
            // If this header is already being used for sorting
            if (header.classList.contains('sorting-asc')) {
                // Was ascending, now should be descending
                isAscending = false;
            } else if (header.classList.contains('sorting-desc')) {
                // Was descending, now should be ascending
                isAscending = true;
            } else {
                // Not currently sorted, default to ascending
                isAscending = true;
            }
            
            // Remove sorting classes from all headers
            headerCells.forEach(h => {
                h.classList.remove('sorting-asc', 'sorting-desc');
            });
            
            // Add the appropriate class to the clicked header
            header.classList.add(isAscending ? 'sorting-asc' : 'sorting-desc');
            
            // Get all site cards
            const siteCards = Array.from(document.querySelectorAll('.site-card'));
            
            // Sort the site cards
            sortSiteCards(siteCards, index, isAscending);
            
            // Reappend the sorted site cards to update the display
            siteCards.forEach(card => {
                sitesContainer.appendChild(card);
            });
        });
    });

    // Set default sort to name column (index 0) in ascending order on initialization
    setTimeout(() => {
        const nameHeader = headerCells[0]; // First column is name
        if (nameHeader) {
            // Remove any existing sort classes
            headerCells.forEach(h => {
                h.classList.remove('sorting-asc', 'sorting-desc');
            });
            
            // Add ascending sort class to name header
            nameHeader.classList.add('sorting-asc');
            
            // Get all site cards and sort them
            const siteCards = Array.from(document.querySelectorAll('.site-card'));
            sortSiteCards(siteCards, 0, true); // Sort by name (index 0) in ascending order
            
            // Reappend the sorted site cards to update the display
            siteCards.forEach(card => {
                sitesContainer.appendChild(card);
            });
        }
    }, 0);
}

function sortSiteCards(cards, columnIndex, ascending) {
    cards.sort((a, b) => {
        // Get the cell content to compare from the list view content
        const aCell = a.querySelector('.list-view-content').children[columnIndex];
        const bCell = b.querySelector('.list-view-content').children[columnIndex];
        
        // Get text values for comparison
        const aValue = getCellValue(aCell);
        const bValue = getCellValue(bCell);
        
        // Special case for Tags column
        if (aCell.classList.contains('site-tags-col')) {
            // If both have "No tags", they're equal
            const aNoTags = aValue.includes('No tags');
            const bNoTags = bValue.includes('No tags');
            
            if (aNoTags && bNoTags) return 0;
            if (aNoTags) return ascending ? 1 : -1;
            if (bNoTags) return ascending ? -1 : 1;
            
            // Otherwise compare the tag text
            return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        
        // Special case for SSL and Webhook columns
        if (aCell.classList.contains('site-ssl-col') || aCell.classList.contains('site-webhook-col')) {
            const aEnabled = aCell.textContent.trim().includes('Enabled');
            const bEnabled = bCell.textContent.trim().includes('Enabled');
            
            if (aEnabled === bEnabled) return 0;
            return ascending ? (aEnabled ? -1 : 1) : (aEnabled ? 1 : -1);
        }
        
        // Special case for timeout and interval columns
        if (aCell.classList.contains('site-timeout-col') || aCell.classList.contains('site-interval-col')) {
            const aIsDefault = aValue.includes('default');
            const bIsDefault = bValue.includes('default');
            
            if (aIsDefault && !bIsDefault) return ascending ? 1 : -1;
            if (!aIsDefault && bIsDefault) return ascending ? -1 : 1;
            
            if (!aIsDefault && !bIsDefault) {
                // Extract numeric values
                const aNum = parseFloat(aValue) || 0;
                const bNum = parseFloat(bValue) || 0;
                return ascending ? (aNum - bNum) : (bNum - aNum);
            }
            
            return 0;
        }
        
        // Default string comparison
        return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
}

function getCellValue(cell) {
    // Handle links in URL cell
    const link = cell.querySelector('a');
    if (link) return link.textContent.trim();
    
    // Handle status spans
    const statusSpan = cell.querySelector('.ssl-status, .webhook-status');
    if (statusSpan) return statusSpan.textContent.trim();
    
    // Handle default value spans
    const defaultSpan = cell.querySelector('.default-value');
    if (defaultSpan) return defaultSpan.textContent.trim();
    
    // Default to cell text content
    return cell.textContent.trim();
}

// Function to handle site actions from either grid or list view
function handleSiteAction(action, card, siteIndex) {
    console.log('handleSiteAction called with:', action, siteIndex);
    
    // Make sure siteIndex is an integer
    const siteIndexInt = parseInt(siteIndex, 10);
    if (isNaN(siteIndexInt)) {
        console.error('Invalid site index:', siteIndex);
        alert('Error: Invalid site index');
        return;
    }
    
    if (action === 'edit') {
        // Fetch site data for editing
        console.log('Attempting to fetch site data from:', `/api/sites/${siteIndexInt}`);
        
        fetch(`/api/sites/${siteIndexInt}`)
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received site data:', data);
                // Populate form with site data
                document.getElementById('siteIndex').value = siteIndexInt;
                document.getElementById('siteName').value = data.name;
                document.getElementById('siteUrl').value = data.url;
                document.getElementById('timeout').value = data.timeout;
                document.getElementById('scanInterval').value = data.scan_interval || 0;
                document.getElementById('triggerType').value = data.trigger.type;
                document.getElementById('triggerValue').value = data.trigger.value;
                
                // Handle token expiry field
                const monitorTokenExpiry = document.getElementById('monitorTokenExpiry');
                if (monitorTokenExpiry && data.monitor_expiring_token !== undefined) {
                    monitorTokenExpiry.value = data.monitor_expiring_token.toString();
                    
                    // Update SSL toggle button if it exists
                    const sslToggleBtn = document.getElementById('sslToggleBtn');
                    if (sslToggleBtn) {
                        if (data.monitor_expiring_token) {
                            sslToggleBtn.textContent = 'Monitoring SSL';
                            sslToggleBtn.classList.remove('disabled');
                            sslToggleBtn.classList.add('enabled');
                        } else {
                            sslToggleBtn.textContent = 'Not Monitoring SSL';
                            sslToggleBtn.classList.remove('enabled');
                            sslToggleBtn.classList.add('disabled');
                        }
                    }
                }
                
                // Handle webhook notifications field
                const webhookEnabled = document.getElementById('webhookEnabled');
                if (webhookEnabled && data.webhook !== undefined) {
                    webhookEnabled.value = data.webhook.toString();
                    
                    // Update notifications toggle button if it exists
                    const notifyToggleBtn = document.getElementById('notifyToggleBtn');
                    if (notifyToggleBtn) {
                        if (data.webhook) {
                            notifyToggleBtn.textContent = 'Send Webhooks';
                            notifyToggleBtn.classList.remove('disabled');
                            notifyToggleBtn.classList.add('enabled');
                        } else {
                            notifyToggleBtn.textContent = 'No Webhooks';
                            notifyToggleBtn.classList.remove('enabled');
                            notifyToggleBtn.classList.add('disabled');
                        }
                    }
                }
                
                // Load tags
                loadTags(data.tags || []);
                
                // Make sure updateTriggerHelp function is accessible
                if (typeof updateTriggerHelp === 'function') {
                    updateTriggerHelp();
                }
                
                // Update modal title
                document.getElementById('modalTitle').textContent = 'Edit Site';
                
                // Show modal
                siteModal.style.display = 'flex';
            })
            .catch(error => {
                console.error('Error fetching site data:', error);
                alert('Failed to load site data for editing.');
            });
    }
    else if (action === 'delete') {
        // Set up delete confirmation
        document.getElementById('deleteIndex').value = siteIndexInt;
        deleteModal.style.display = 'flex';
    }
}

// Initialize tags input functionality
function initTagsInput() {
    const tagInput = document.getElementById('tagInput');
    const tagsContainer = document.getElementById('tagsContainer');
    const siteTagsInput = document.getElementById('siteTags');
    
    if (!tagInput || !tagsContainer || !siteTagsInput) return;
    
    // Handle input events
    tagInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(this.value.trim());
            this.value = '';
        } else if (e.key === 'Backspace' && this.value === '') {
            // Remove the last tag when backspace is pressed and input is empty
            const tags = tagsContainer.querySelectorAll('.tag-item');
            if (tags.length > 0) {
                tags[tags.length - 1].remove();
                updateHiddenInput();
            }
        }
    });
    
    // Handle input blur to add any pending tag
    tagInput.addEventListener('blur', function() {
        if (this.value.trim() !== '') {
            addTag(this.value.trim());
            this.value = '';
        }
    });
    
    // Function to add a new tag
    function addTag(tag) {
        if (tag === '') return;
        
        // Check if tag already exists
        const existingTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(t => 
            t.querySelector('.tag-text').textContent.toLowerCase()
        );
        
        if (existingTags.includes(tag.toLowerCase())) return;
        
        // Create tag element
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-item';
        
        const tagText = document.createElement('span');
        tagText.className = 'tag-text';
        tagText.textContent = tag;
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'tag-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function() {
            tagElement.remove();
            updateHiddenInput();
        });
        
        tagElement.appendChild(tagText);
        tagElement.appendChild(closeBtn);
        
        // Insert before the input
        tagsContainer.insertBefore(tagElement, tagInput);
        
        // Update the hidden input
        updateHiddenInput();
    }
    
    // Function to update the hidden input with current tags
    function updateHiddenInput() {
        const tags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(tag => 
            tag.querySelector('.tag-text').textContent
        );
        siteTagsInput.value = JSON.stringify(tags);
    }
}

// Function to load existing tags into the UI
function loadTags(tags) {
    const tagsContainer = document.getElementById('tagsContainer');
    const tagInput = document.getElementById('tagInput');
    const siteTagsInput = document.getElementById('siteTags');
    
    if (!tagsContainer || !tagInput || !siteTagsInput) return;
    
    // Clear existing tags
    Array.from(tagsContainer.querySelectorAll('.tag-item')).forEach(tag => tag.remove());
    
    // Add each tag
    tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-item';
        
        const tagText = document.createElement('span');
        tagText.className = 'tag-text';
        tagText.textContent = tag;
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'tag-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function() {
            tagElement.remove();
            updateHiddenInput();
        });
        
        tagElement.appendChild(tagText);
        tagElement.appendChild(closeBtn);
        
        // Insert before the input
        tagsContainer.insertBefore(tagElement, tagInput);
    });
    
    // Update the hidden input
    updateHiddenInput();
    
    // Function to update the hidden input with current tags
    function updateHiddenInput() {
        const currentTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(tag => 
            tag.querySelector('.tag-text').textContent
        );
        siteTagsInput.value = JSON.stringify(currentTags);
    }
}

// Function to get all tags from the UI
function getTagsFromUI() {
    const tagsContainer = document.getElementById('tagsContainer');
    if (!tagsContainer) return [];
    
    return Array.from(tagsContainer.querySelectorAll('.tag-item')).map(tag => 
        tag.querySelector('.tag-text').textContent
    );
} 