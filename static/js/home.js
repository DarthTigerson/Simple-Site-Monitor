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
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    const addFirstSiteBtn = document.getElementById('addFirstSiteBtn');
    
    // Tags input
    initTagsInput();
    
    // Table sorting functionality
    initTableSorting();
    
    // Auto-refresh setup
    setupAutoRefresh();
    
    // Restore sorting state if coming back from a refresh
    restoreSortingState();
    
    // Set "All Sites" status card as active by default
    const allSitesCard = document.querySelector('.status-card[data-filter="all"]');
    if (allSitesCard) {
        allSitesCard.classList.add('active');
        updateMonitoringHeader(allSitesCard.querySelector('.status-label').textContent.trim(), 'all');
        
        // Also set the filter dropdown to "All Sites"
        const logFilter = document.getElementById('logFilter');
        if (logFilter) {
            logFilter.value = 'all';
        }
    }
    
    // Refresh button functionality
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Save current sort state before refreshing
            saveSortingState();
            
            this.classList.add('rotating');
            setTimeout(() => {
                this.classList.remove('rotating');
                window.location.reload();
            }, 1000);
        });
    }
    
    // Add event listeners for opening/closing modals
    if (addSiteBtn && siteModal) {
        addSiteBtn.addEventListener('click', function() {
            openAddSiteModal();
        });
    }
    
    if (addFirstSiteBtn && siteModal) {
        addFirstSiteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            openAddSiteModal();
        });
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
    
    // Handle edit and delete buttons for existing sites
    const siteCards = document.querySelectorAll('.site-card');
    siteCards.forEach(function(card) {
        const actionButtons = card.querySelectorAll('[data-action]');
        const siteIndex = card.getAttribute('data-site-index');
        
        actionButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const action = button.getAttribute('data-action');
                
                if (action === 'edit') {
                    // Fetch site data for editing
                    fetch(`/api/sites/${siteIndex}`)
                        .then(response => response.json())
                        .then(data => {
                            // Populate form with site data
                            document.getElementById('siteIndex').value = siteIndex;
                            document.getElementById('siteName').value = data.name;
                            document.getElementById('siteUrl').value = data.url;
                            document.getElementById('siteTimeout').value = data.timeout;
                            document.getElementById('triggerType').value = data.trigger.type;
                            document.getElementById('triggerValue').value = data.trigger.value;
                            document.getElementById('webhookEnabled').checked = data.webhook;
                            
                            // Load tags
                            loadTags(data.tags || []);
                            
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
                    document.getElementById('deleteIndex').value = siteIndex;
                    deleteModal.style.display = 'flex';
                }
            });
        });
    });
    
    // Edit and delete buttons for legacy support
    const editBtns = document.querySelectorAll('.btn-edit');
    const deleteBtns = document.querySelectorAll('.btn-delete');
    
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const siteCard = this.closest('.site-card');
            const siteIndex = siteCard.getAttribute('data-site-index');
            
            // Fetch site data for editing
            fetch(`/api/sites/${siteIndex}`)
                .then(response => response.json())
                .then(data => {
                    // Populate form with site data
                    document.getElementById('siteIndex').value = siteIndex;
                    document.getElementById('siteName').value = data.name;
                    document.getElementById('siteUrl').value = data.url;
                    document.getElementById('siteTimeout').value = data.timeout;
                    document.getElementById('triggerType').value = data.trigger.type;
                    document.getElementById('triggerValue').value = data.trigger.value;
                    document.getElementById('webhookEnabled').checked = data.webhook;
                    
                    // Load tags
                    loadTags(data.tags || []);
                    
                    // Update modal title
                    document.getElementById('modalTitle').textContent = 'Edit Site';
                    
                    // Show modal
                    siteModal.style.display = 'flex';
                })
                .catch(error => {
                    console.error('Error fetching site data:', error);
                    if (window.showNotification) {
                        window.showNotification('Failed to load site data for editing.', 'error');
                    } else {
                        alert('Failed to load site data for editing.');
                    }
                });
        });
    });
    
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const siteCard = this.closest('.site-card');
            const siteIndex = siteCard.getAttribute('data-site-index');
            
            // Set up delete confirmation
            document.getElementById('deleteIndex').value = siteIndex;
            deleteModal.style.display = 'flex';
        });
    });
    
    // Handle form submissions
    if (siteForm) {
        siteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const siteIndex = document.getElementById('siteIndex').value;
            const isNew = siteIndex === '';
            
            // Get URL and validate
            const urlInput = document.getElementById('siteUrl');
            let siteUrl = urlInput.value.trim();
            
            // Check if URL starts with http:// or https://
            if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
                siteUrl = 'https://' + siteUrl;
                urlInput.value = siteUrl;
            }
            
            // Validate URL format
            try {
                new URL(siteUrl); // Will throw if invalid URL
            } catch (e) {
                alert("Please enter a valid URL");
                return;
            }
            
            // Get tags from UI
            const tags = getTagsFromUI();
            
            const formData = {
                name: document.getElementById('siteName').value,
                url: siteUrl,
                timeout: parseInt(document.getElementById('siteTimeout').value),
                trigger: {
                    type: document.getElementById('triggerType').value,
                    value: document.getElementById('triggerValue').value
                },
                webhook: document.getElementById('webhookEnabled').checked,
                tags: tags
            };
            
            const url = isNew ? '/api/sites' : `/api/sites/${siteIndex}`;
            
            fetch(url, {
                method: isNew ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Close modal and reload page to show changes
                siteModal.style.display = 'none';
                window.location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                if (window.showNotification) {
                    window.showNotification('Failed to save site configuration.', 'error');
                } else {
                    alert('Failed to save site configuration.');
                }
            });
        });
    }
    
    // Handle delete confirmation
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const siteIndex = document.getElementById('deleteIndex').value;
            
            fetch(`/api/sites/${siteIndex}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Close modal and reload page
                deleteModal.style.display = 'none';
                window.location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                if (window.showNotification) {
                    window.showNotification('Failed to delete site.', 'error');
                } else {
                    alert('Failed to delete site.');
                }
            });
        });
    }
    
    // Status card click functionality
    const statusCards = document.querySelectorAll('.status-card');
    statusCards.forEach(card => {
        card.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');
            const filterText = this.querySelector('.status-label').textContent.trim();
            const logFilter = document.getElementById('logFilter');
            
            if (logFilter && filterValue) {
                logFilter.value = filterValue;
                updateMonitoringHeader(filterText, filterValue);
                // Trigger the change event to apply filtering
                const event = new Event('change');
                logFilter.dispatchEvent(event);
                
                // Add active class to selected card and remove from others
                statusCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Log filtering functionality
    const logFilter = document.getElementById('logFilter');
    if (logFilter) {
        logFilter.addEventListener('change', function() {
            const filterValue = this.value;
            const selectedOption = this.options[this.selectedIndex];
            const filterText = selectedOption.textContent.trim();
            const rows = document.querySelectorAll('.log-row');
            
            updateMonitoringHeader(filterText, filterValue);

            // Update active status on cards based on selected filter
            const statusCards = document.querySelectorAll('.status-card');
            statusCards.forEach(card => {
                if (card.getAttribute('data-filter') === filterValue) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
            
            rows.forEach(row => {
                if (filterValue === 'all') {
                    row.style.display = '';
                } else if (filterValue === 'down' && row.classList.contains('error')) {
                    row.style.display = '';
                } else if (filterValue === 'slow' && row.classList.contains('warning')) {
                    row.style.display = '';
                } else if (filterValue === 'expiring' && row.classList.contains('expiring')) {
                    row.style.display = '';
                } else if (filterValue === 'healthy' && row.classList.contains('success')) {
                    row.style.display = '';
                } else if (filterValue === 'unknown' && row.classList.contains('unknown')) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
});

// Auto-refresh functionality
function setupAutoRefresh() {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (!dashboardContainer) return;
    
    // Get refresh interval from data attribute (in seconds)
    const refreshInterval = parseInt(dashboardContainer.getAttribute('data-refresh-interval')) || 60;
    
    // Convert to milliseconds and set minimum of 10 seconds
    const refreshMs = Math.max(refreshInterval * 1000, 10000);
    
    // Set up interval for auto-refresh
    setInterval(() => {
        // Save current sort state
        saveSortingState();
        
        // Simulate click on refresh button to use existing animation
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.click();
        } else {
            // Fallback if button not found
            window.location.reload();
        }
    }, refreshMs);
    
    console.log(`Auto-refresh set up to refresh every ${refreshInterval} seconds`);
}

// Save the current sorting state to localStorage
function saveSortingState() {
    const sortingState = {
        columnIndex: -1,
        isAscending: true
    };
    
    // Find which header has sorting class
    const headers = document.querySelectorAll('.logs-table th');
    headers.forEach((header, index) => {
        if (header.classList.contains('sorting-asc')) {
            sortingState.columnIndex = index;
            sortingState.isAscending = true;
        } else if (header.classList.contains('sorting-desc')) {
            sortingState.columnIndex = index;
            sortingState.isAscending = false;
        }
    });
    
    // Also save current filter
    const logFilter = document.getElementById('logFilter');
    if (logFilter) {
        sortingState.filterValue = logFilter.value;
    }
    
    // Save to localStorage
    localStorage.setItem('siteMonitorSortState', JSON.stringify(sortingState));
}

// Restore sorting state from localStorage
function restoreSortingState() {
    try {
        const savedState = localStorage.getItem('siteMonitorSortState');
        if (!savedState) return;
        
        const sortingState = JSON.parse(savedState);
        if (sortingState.columnIndex === -1) return;
        
        // Apply the saved filter
        if (sortingState.filterValue) {
            const logFilter = document.getElementById('logFilter');
            if (logFilter && logFilter.value !== sortingState.filterValue) {
                logFilter.value = sortingState.filterValue;
                
                const selectedOptionText = logFilter.options[logFilter.selectedIndex].textContent.trim();
                updateMonitoringHeader(selectedOptionText, sortingState.filterValue);
                
                // Update status card active states
                const statusCards = document.querySelectorAll('.status-card');
                statusCards.forEach(card => {
                    if (card.getAttribute('data-filter') === sortingState.filterValue) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                });
                
                // Apply the filter to rows
                const rows = document.querySelectorAll('.log-row');
                rows.forEach(row => {
                    const filter = sortingState.filterValue;
                    if (filter === 'all') {
                        row.style.display = '';
                    } else if (filter === 'down' && row.classList.contains('error')) {
                        row.style.display = '';
                    } else if (filter === 'slow' && row.classList.contains('warning')) {
                        row.style.display = '';
                    } else if (filter === 'expiring' && row.classList.contains('expiring')) {
                        row.style.display = '';
                    } else if (filter === 'healthy' && row.classList.contains('success')) {
                        row.style.display = '';
                    } else if (filter === 'unknown' && row.classList.contains('unknown')) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            }
        }
        
        // Find and click the appropriate header to restore sort
        const headers = document.querySelectorAll('.logs-table th');
        if (headers.length > sortingState.columnIndex) {
            const targetHeader = headers[sortingState.columnIndex];
            
            // If current state doesn't match saved state, click once
            if ((targetHeader.classList.contains('sorting-asc') && !sortingState.isAscending) ||
                (targetHeader.classList.contains('sorting-desc') && sortingState.isAscending) ||
                (!targetHeader.classList.contains('sorting-asc') && !targetHeader.classList.contains('sorting-desc'))) {
                // Programmatically click the header
                targetHeader.click();
            }
            
            // If after first click we need opposite direction, click again
            if ((targetHeader.classList.contains('sorting-asc') && !sortingState.isAscending) ||
                (targetHeader.classList.contains('sorting-desc') && sortingState.isAscending)) {
                targetHeader.click();
            }
        }
    } catch (e) {
        console.error('Error restoring sort state:', e);
        // Clean up potentially corrupted state
        localStorage.removeItem('siteMonitorSortState');
    }
}

// Table sorting functionality
function initTableSorting() {
    const table = document.querySelector('.logs-table table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    const tableBody = document.querySelector('.table-scroll-container tbody'); // Updated selector
    const rows = tableBody.querySelectorAll('tr');
    
    // Skip the no-sites message row for sorting
    const dataRows = Array.from(rows).filter(row => !row.querySelector('.no-sites-message'));
    
    // Add sort direction indicators and click handlers to all headers
    headers.forEach((header, index) => {
        // Add sort icons and make headers look clickable
        header.classList.add('sortable');
        
        // Get header text
        const headerText = header.textContent.trim();
        
        // Create sort header with center alignment
        header.innerHTML = `
            <div class="sort-header">
                ${headerText}
                <span class="sort-icon"></span>
            </div>
        `;
        
        // Add click handler for sorting
        header.addEventListener('click', () => {
            // Determine sort direction based on current state of the clicked header
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
            headers.forEach(h => {
                h.classList.remove('sorting-asc', 'sorting-desc');
            });
            
            // Add the appropriate class to the clicked header
            header.classList.add(isAscending ? 'sorting-asc' : 'sorting-desc');
            
            // Sort the table rows
            sortTable(dataRows, index, isAscending);
            
            // Re-append rows to update the display
            dataRows.forEach(row => {
                tableBody.appendChild(row);
            });
        });
    });
    
    // Default sort by status (0) and then name (1)
    if (dataRows.length > 0 && headers.length > 1) {
        // Set status column as initial sort
        headers[0].classList.add('sorting-asc');
        sortTable(dataRows, 0, true); // Sort by status ascending
        
        // Re-append rows to update the display
        dataRows.forEach(row => {
            tableBody.appendChild(row);
        });
    }
}

function sortTable(rows, columnIndex, ascending) {
    rows.sort((a, b) => {
        // Get the cell content to compare
        const aValue = getCellValue(a, columnIndex);
        const bValue = getCellValue(b, columnIndex);
        
        // Special case for status column - use custom status priority
        if (columnIndex === 0) {
            return compareStatus(a, b, ascending);
        }
        
        // Special case for Tags column (index 3)
        if (columnIndex === 3) {
            // Handle "No tags" case
            const aNoTags = aValue.includes('No tags');
            const bNoTags = bValue.includes('No tags');
            
            if (aNoTags && bNoTags) return 0;
            if (aNoTags) return ascending ? 1 : -1;
            if (bNoTags) return ascending ? -1 : 1;
            
            // For rows with tags, sort alphabetically
            return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        
        // Special handling for Load Time column - parse numeric value
        if (columnIndex === 4) { // Load Time column
            return compareNumeric(aValue, bValue, ascending);
        }
        
        // Special handling for Duration column - convert to seconds for comparison
        if (columnIndex === 5) { // Duration column
            return compareDuration(aValue, bValue, ascending);
        }
        
        // Special handling for Last Scan column - "X ago" format
        if (columnIndex === 6) { // Last Scan column
            return compareDuration(aValue, bValue, ascending);
        }
        
        // Special handling for SSL Expiry column
        if (columnIndex === 7) { // SSL Expiry column
            return compareSSLExpiry(aValue, bValue, ascending);
        }
        
        // Default string comparison
        if (ascending) {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });
}

function getCellValue(row, index) {
    const cell = row.cells[index];
    
    // If it's the status cell, get the status text
    if (index === 0) {
        const statusText = cell.querySelector('.status-text');
        return statusText ? statusText.textContent.trim() : '';
    }
    
    // For URL cell, get the URL text
    if (index === 2) {
        const link = cell.querySelector('a');
        return link ? link.textContent.trim() : '';
    }
    
    // For tags cell, get all tag badges or "No tags"
    if (index === 3) {
        const noTags = cell.querySelector('.no-tags');
        if (noTags) {
            return "No tags";
        }
        
        const tagBadges = cell.querySelectorAll('.tag-badge');
        if (tagBadges && tagBadges.length > 0) {
            return Array.from(tagBadges)
                .map(badge => badge.textContent.trim())
                .join(", ");
        }
        return '';
    }
    
    // For SSL cell, handle special cases
    if (index === 7) {
        const sslDays = cell.querySelector('.ssl-days');
        if (sslDays && !sslDays.classList.contains('not-monitored')) {
            return sslDays.textContent.trim();
        }
        return 'Not Monitored'; // For consistent sorting of non-monitored sites
    }
    
    // For other cells, get the text content
    return cell ? cell.textContent.trim() : '';
}

function compareStatus(rowA, rowB, ascending) {
    // Get status priority based on class names
    const statusPriority = {
        'success': 1,   // Healthy
        'error': 2,     // Down
        'warning': 3,   // Slow
        'expiring': 4,  // Token Expiring
        'unknown': 5    // Unknown/Pending
    };
    
    // Determine row status from the class
    const getRowStatus = (row) => {
        if (row.classList.contains('error')) return 'error';
        if (row.classList.contains('warning')) return 'warning';
        if (row.classList.contains('expiring')) return 'expiring';
        if (row.classList.contains('unknown')) return 'unknown';
        return 'success';
    };
    
    const statusA = getRowStatus(rowA);
    const statusB = getRowStatus(rowB);
    
    // Compare by status priority
    const result = statusPriority[statusA] - statusPriority[statusB];
    
    // If statuses are equal, compare by name (2nd column)
    if (result === 0) {
        const nameA = getCellValue(rowA, 1);
        const nameB = getCellValue(rowB, 1);
        return nameA.localeCompare(nameB); // Always sort alphabetically within same status
    }
    
    return ascending ? result : -result;
}

function compareNumeric(a, b, ascending) {
    // Extract numeric values from strings like "1.23s"
    const numA = parseFloat(a.replace(/[^\d.-]/g, '')) || 0;
    const numB = parseFloat(b.replace(/[^\d.-]/g, '')) || 0;
    
    return ascending ? numA - numB : numB - numA;
}

function compareDuration(a, b, ascending) {
    // Convert duration strings to seconds for comparison
    const getSeconds = (str) => {
        if (!str) return 0;
        
        // For "X minutes ago" or "X days ago" format
        if (str.includes('ago')) {
            const value = parseInt(str.match(/\d+/)[0] || 0);
            if (str.includes('second')) return value;
            if (str.includes('minute')) return value * 60;
            if (str.includes('hour')) return value * 3600;
            if (str.includes('day')) return value * 86400;
            return 0;
        }
        
        // For "X days" or "X hours" format (without "ago")
        const value = parseInt(str.match(/\d+/)[0] || 0);
        if (str.includes('second')) return value;
        if (str.includes('minute')) return value * 60;
        if (str.includes('hour')) return value * 3600;
        if (str.includes('day')) return value * 86400;
        return 0;
    };
    
    const secondsA = getSeconds(a);
    const secondsB = getSeconds(b);
    
    return ascending ? secondsA - secondsB : secondsB - secondsA;
}

function compareSSLExpiry(a, b, ascending) {
    // "Not Monitored" should always be last
    if (a === 'Not Monitored' && b !== 'Not Monitored') return 1;
    if (a !== 'Not Monitored' && b === 'Not Monitored') return -1;
    if (a === 'Not Monitored' && b === 'Not Monitored') return 0;
    
    // Extract days value for comparison
    const daysA = parseInt(a.match(/\d+/)[0] || 0);
    const daysB = parseInt(b.match(/\d+/)[0] || 0);
    
    return ascending ? daysA - daysB : daysB - daysA;
}

// Modal handling functions
function openAddSiteModal() {
    siteForm.reset();
    document.getElementById('siteIndex').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Site';
    
    // Set the default trigger value
    document.getElementById('triggerType').value = 'status_code';
    document.getElementById('triggerValue').value = '200';
    
    // Pre-populate URL field with https://
    document.getElementById('siteUrl').value = 'https://';
    
    siteModal.style.display = 'flex';
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

// Function to update the monitoring header text and color
function updateMonitoringHeader(text, filterValue) {
    const headerTitle = document.getElementById('monitoringHeaderTitle');
    const tableHeaderRow = document.getElementById('monitoringTableHeaderRow');

    if (headerTitle) {
        headerTitle.textContent = text;
        headerTitle.classList.remove('header-healthy', 'header-slow', 'header-expiring', 'header-down', 'header-unknown');
        if (filterValue && filterValue !== 'all') {
            headerTitle.classList.add(`header-${filterValue}`);
        }
    }

    if (tableHeaderRow) {
        // Remove any existing header row color classes
        tableHeaderRow.classList.remove('header-row-healthy', 'header-row-slow', 'header-row-expiring', 'header-row-down', 'header-row-unknown');
        // Add the new class based on filterValue
        if (filterValue && filterValue !== 'all') {
            tableHeaderRow.classList.add(`header-row-${filterValue}`);
        }
        // If filterValue is 'all' or not provided, it will use the default CSS for the <tr>
    }
}
