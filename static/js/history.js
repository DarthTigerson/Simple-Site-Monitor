// History Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initDateSuggestions(); // Initialize date suggestions first
    initSearchHelp();
    initSearchFunctionality();
    initTableSorting();
    restoreSortingState();
    initExportFunctionality(); // Initialize export functionality
});

// Initialize export functionality
function initExportFunctionality() {
    const exportBtn = document.getElementById('exportBtn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportTableData();
        });
    }
}

// Export table data as CSV
function exportTableData() {
    // Get the table data
    const tableData = getTableData();
    
    // Create filename with current date and time in readable format
    const now = new Date();
    
    // Format date as YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Format time as HH-MM-SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}-${minutes}-${seconds}`;
    
    const filename = `SSM_Export_${dateStr}_${timeStr}.csv`;
    
    // Convert to CSV and download
    const csvContent = convertToCSV(tableData);
    downloadFile(csvContent, filename, 'text/csv');
}

// Get data from the table, respecting filters
function getTableData() {
    const rows = document.querySelectorAll('#logResults tr.log-row');
    const headers = document.querySelectorAll('.logs-table thead th');
    const headerTexts = Array.from(headers).map(header => header.textContent.trim());
    
    // Get only visible rows (respecting any filters applied)
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
    
    // Convert rows to data objects
    return visibleRows.map(row => {
        const rowData = {};
        Array.from(row.cells).forEach((cell, index) => {
            // For each cell, get the text content
            let cellValue;
            
            // Special handling for status
            if (index === 0) {
                cellValue = cell.querySelector('.status-text').textContent.trim();
            }
            // Special handling for tags
            else if (index === 3) {
                const tagBadges = cell.querySelectorAll('.tag-badge');
                if (tagBadges.length > 0) {
                    cellValue = Array.from(tagBadges).map(badge => badge.textContent.trim()).join(', ');
                } else {
                    cellValue = 'No tags';
                }
            }
            // Special handling for URL (if it's a link)
            else if (index === 2) {
                const link = cell.querySelector('a');
                cellValue = link ? link.href : cell.textContent.trim();
            }
            // Default handling
            else {
                cellValue = cell.textContent.trim();
            }
            
            rowData[headerTexts[index]] = cellValue;
        });
        return rowData;
    });
}

// Convert data to CSV format
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => {
            // Escape quotes and wrap in quotes if the value contains comma or quotes
            const value = String(item[header] || '');
            const escapedValue = value.replace(/"/g, '""');
            return value.includes(',') || value.includes('"') ? `"${escapedValue}"` : value;
        });
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// Generic file download function
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

// Autocomplete suggestions data
const suggestions = [
    { field: 'status', operators: [':', '!='], values: ['down', 'healthy', 'slow', 'expiring'], description: 'Filter by site status' },
    { field: 'name', operators: [':', '!=', ':*', '!:*'], values: [], description: 'Filter by site name' },
    { field: 'url', operators: [':', '!=', ':*', '!:*'], values: [], description: 'Filter by site URL' },
    { field: 'tag', operators: [':', '!='], values: [], description: 'Filter by site tag (e.g. tag:production)' },
    { field: 'start_time', operators: [':'], values: [], description: 'Filter logs after this date' },
    { field: 'end_time', operators: [':'], values: [], description: 'Filter logs before this date' }
];

// Initialize date suggestion values
function initDateSuggestions() {
    // For start_time, suggest 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const formattedTwoDaysAgo = twoDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // For end_time, suggest today
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Update suggestion values
    const startTimeField = suggestions.find(s => s.field === 'start_time');
    const endTimeField = suggestions.find(s => s.field === 'end_time');
    
    if (startTimeField) {
        startTimeField.values = [formattedTwoDaysAgo];
    }
    
    if (endTimeField) {
        endTimeField.values = [formattedToday];
    }
}

// Initialize search help toggling functionality
function initSearchHelp() {
    const helpToggle = document.querySelector('.help-toggle');
    const helpContent = document.querySelector('.help-content');
    
    if (helpToggle && helpContent) {
        // Create backdrop element
        const backdrop = document.createElement('div');
        backdrop.className = 'help-backdrop';
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100%';
        backdrop.style.height = '100%';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        backdrop.style.display = 'none';
        backdrop.style.zIndex = '9';
        document.body.appendChild(backdrop);
        
        // Toggle help panel
        helpToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (helpContent.style.display === 'block') {
                // Hide panel
                helpContent.style.opacity = '0';
                backdrop.style.opacity = '0';
                
                setTimeout(() => {
                    helpContent.style.display = 'none';
                    backdrop.style.display = 'none';
                }, 200);
            } else {
                // Show panel
                helpContent.style.display = 'block';
                backdrop.style.display = 'block';
                helpContent.style.opacity = '0';
                backdrop.style.opacity = '0';
                
                setTimeout(() => {
                    helpContent.style.opacity = '1';
                    backdrop.style.opacity = '1';
                }, 10);
            }
        });
        
        // Close help content when clicking backdrop
        backdrop.addEventListener('click', function() {
            helpContent.style.opacity = '0';
            backdrop.style.opacity = '0';
            
            setTimeout(() => {
                helpContent.style.display = 'none';
                backdrop.style.display = 'none';
            }, 200);
        });
        
        // Apply transitions
        helpContent.style.transition = 'opacity 0.2s ease';
        backdrop.style.transition = 'opacity 0.2s ease';
    }
}

// Initialize search functionality
function initSearchFunctionality() {
    const searchQuery = document.getElementById('searchQuery');
    const richSearchInput = document.getElementById('richSearchInput');
    const searchBtn = document.getElementById('searchBtn');
    const autocompleteContainer = document.getElementById('autocomplete');
    
    if (!searchQuery || !richSearchInput) return;
    
    // Populate tag suggestions from existing tags
    populateTagSuggestions();
    
    // Set placeholder text on rich input
    richSearchInput.setAttribute('data-placeholder', 'Search logs... (e.g. status:down name:example tag:production)');
    
    // When user types in contentEditable div
    richSearchInput.addEventListener('input', function() {
        const plainText = this.innerText;
        searchQuery.value = plainText;
        highlightTags(this);
        showAutocomplete(plainText, autocompleteContainer);
    });
    
    // When user focuses on rich input
    richSearchInput.addEventListener('focus', function() {
        const plainText = this.innerText;
        if (plainText) {
            showAutocomplete(plainText, autocompleteContainer);
        }
    });
    
    // Handle keyboard navigation in autocomplete and search input
    richSearchInput.addEventListener('keydown', function(e) {
        // Tab key for autocomplete
        if (e.key === 'Tab' && !e.shiftKey && autocompleteContainer.style.display === 'block') {
            e.preventDefault();
            const selected = autocompleteContainer.querySelector('.selected') || 
                             autocompleteContainer.querySelector('.autocomplete-item');
            if (selected) {
                selected.click();
                return;
            }
        }
        
        // Handle word-by-word navigation with Ctrl+Arrow keys
        if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            moveWordByWord(e.key === 'ArrowRight', richSearchInput);
            return;
        }
        
        // Handle autocomplete navigation with arrow keys
        handleAutocompleteKeyNavigation(e, autocompleteContainer, richSearchInput);
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!richSearchInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
            autocompleteContainer.style.display = 'none';
        }
    });
    
    // Search button click
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            performSearch(searchQuery.value);
        });
    }
    
    // Enter key in search box
    richSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchQuery.value);
            autocompleteContainer.style.display = 'none';
        }
    });
}

// Function to highlight filter tags in blue
function highlightTags(element) {
    const text = element.innerText;
    const tagRegex = /\b(status|name|url|tag|start_time|end_time):/g;
    
    // Save cursor position
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretOffset = preCaretRange.toString().length;
    
    // Apply highlighting
    let html = text.replace(tagRegex, '<span class="tag-highlight">$1:</span>');
    
    // Update content without losing focus
    element.innerHTML = html;
    
    // Restore cursor position
    placeCursorAtOffset(element, caretOffset);
}

// Helper function to place cursor at specific text offset
function placeCursorAtOffset(element, offset) {
    // Create a range
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Set range based on character offset
    let charCount = 0;
    let foundOffset = false;
    
    function searchNodeForOffset(node) {
        if (node.nodeType === 3) { // Text node
            if (charCount + node.length >= offset) {
                range.setStart(node, offset - charCount);
                foundOffset = true;
                return true;
            }
            charCount += node.length;
        } else if (node.nodeType === 1) { // Element node
            for (let i = 0; i < node.childNodes.length; i++) {
                if (searchNodeForOffset(node.childNodes[i])) {
                    return true;
                }
            }
        }
        return false;
    }
    
    searchNodeForOffset(element);
    
    if (!foundOffset) {
        // If we couldn't find the exact position, place at end
        const lastChild = element.lastChild;
        if (lastChild && lastChild.nodeType === 3) {
            range.setStart(lastChild, lastChild.length);
        } else {
            range.setStart(element, element.childNodes.length);
        }
    }
    
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

// Function to move cursor word by word in the rich input
function moveWordByWord(forward, input) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const currentPosition = range.startOffset;
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    
    const text = textNode.textContent;
    let newPos;
    
    if (forward) {
        // Find next word boundary
        const match = /\S+\s*/.exec(text.substring(currentPosition));
        newPos = match ? currentPosition + match[0].length : text.length;
    } else {
        // Find previous word boundary
        const beforeCursor = text.substring(0, currentPosition);
        const lastSpace = beforeCursor.lastIndexOf(' ');
        const lastColon = beforeCursor.lastIndexOf(':');
        newPos = Math.max(lastSpace, lastColon);
        
        if (newPos === -1) {
            newPos = 0;
        } else {
            newPos += 1; // Move past the space/colon
        }
    }
    
    // Set new position
    range.setStart(textNode, newPos);
    range.setEnd(textNode, newPos);
    selection.removeAllRanges();
    selection.addRange(range);
}

function handleAutocompleteKeyNavigation(event, container, searchInput) {
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key) ||
        container.style.display === 'none') {
        return;
    }
    
    const items = container.querySelectorAll('.autocomplete-item');
    if (!items.length) return;
    
    const selected = container.querySelector('.selected');
    let index = -1;
    
    if (selected) {
        items.forEach((item, i) => {
            if (item === selected) index = i;
        });
    }
    
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (selected) selected.classList.remove('selected');
        index = (index + 1) % items.length;
        items[index].classList.add('selected');
        items[index].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (selected) selected.classList.remove('selected');
        index = (index - 1 + items.length) % items.length;
        items[index].classList.add('selected');
        items[index].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' || event.key === 'Tab') {
        if (selected) {
            event.preventDefault();
            selected.click();
        }
    } else if (event.key === 'Escape') {
        container.style.display = 'none';
    }
}

function showAutocomplete(text, container) {
    if (!text || !container) {
        if (container) container.style.display = 'none';
        return;
    }
    
    // Determine current input context
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Get current position and text up to cursor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(range.startContainer.parentNode);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretPos = preCaretRange.toString().length;
    
    const textUpToCursor = text.substring(0, caretPos);
    const lastSpacePos = Math.max(
        textUpToCursor.lastIndexOf(' '),
        textUpToCursor.lastIndexOf('(')
    );
    const currentInput = lastSpacePos === -1 
        ? textUpToCursor 
        : textUpToCursor.substring(lastSpacePos + 1);
    
    let matchedSuggestions = [];
    
    // If typing a field (no operator yet)
    if (!currentInput.includes(':') && !currentInput.includes('>') && !currentInput.includes('<')) {
        matchedSuggestions = suggestions
            .filter(s => s.field.startsWith(currentInput.toLowerCase()))
            .map(s => ({
                display: `<span class="autocomplete-field">${s.field}</span><span class="autocomplete-operator">:</span>`,
                value: `${s.field}:`,
                description: s.description
            }));
    } 
    // If typing after a field and operator
    else {
        const parts = currentInput.match(/^(\w+)(.+?)(.*)$/);
        if (parts) {
            const [_, field, operator, value] = parts;
            const fieldSuggestion = suggestions.find(s => s.field.toLowerCase() === field.toLowerCase());
            
            if (fieldSuggestion && fieldSuggestion.values.length > 0) {
                matchedSuggestions = fieldSuggestion.values
                    .filter(v => v.toLowerCase().startsWith(value.toLowerCase()))
                    .map(v => ({
                        display: `<span class="autocomplete-field">${field}</span><span class="autocomplete-operator">${operator}</span><span class="autocomplete-value">${v}</span>`,
                        value: `${field}${operator}${v}`,
                        description: `Example value for ${field}`
                    }));
            }
        }
    }
    
    // Add help text for tab completion
    if (matchedSuggestions.length > 0) {
        container.innerHTML = `
            <div class="autocomplete-help">
                Press <kbd>Tab</kbd> to complete, <kbd>↑</kbd><kbd>↓</kbd> to navigate
            </div>
        `;
        
        // Always select the first item by default
        let firstItem = true;
        
        matchedSuggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item' + (firstItem ? ' selected' : '');
            firstItem = false;
            
            div.innerHTML = `
                ${suggestion.display}
                <div class="autocomplete-description">${suggestion.description}</div>
            `;
            
            div.addEventListener('click', () => {
                const richInput = document.getElementById('richSearchInput');
                const plainInput = document.getElementById('searchQuery');
                
                // Get current input text
                const currentText = richInput.innerText;
                
                // Calculate positions for insertion
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(richInput);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                const caretPos = preCaretRange.toString().length;
                
                // Insert suggestion
                const beforeCursor = currentText.substring(0, lastSpacePos + 1);
                const afterCursor = currentText.substring(caretPos);
                
                // Update both inputs
                const newText = beforeCursor + suggestion.value + afterCursor;
                plainInput.value = newText;
                richInput.innerText = newText;
                
                // Re-highlight the tags
                highlightTags(richInput);
                
                // Focus and position cursor
                richInput.focus();
                placeCursorAtOffset(richInput, (beforeCursor + suggestion.value).length);
                
                container.style.display = 'none';
            });
            
            container.appendChild(div);
        });
        
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Perform search on the log data
function performSearch(query) {
    const logRows = document.querySelectorAll('#logResults tr.log-row');
    const resultCount = document.getElementById('resultCount');
    let visibleRows = 0;
    
    if (!query.trim()) {
        // If no query, show all rows
        logRows.forEach(row => {
            row.style.display = '';
            visibleRows++;
        });
    } else {
        // Parse the query for filters
        const filters = parseSearchQuery(query);
        
        // Apply filters to each row
        logRows.forEach(row => {
            if (matchesFilters(row, filters)) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    // Update result count
    if (resultCount) {
        resultCount.textContent = visibleRows;
    }
}

// Parse the search query into individual filters
function parseSearchQuery(query) {
    const filters = [];
    // Match patterns like field:value, field:>value, field:<value
    const regex = /(\w+):(<?|>?)([^\s]+)/g;
    let match;
    
    while ((match = regex.exec(query)) !== null) {
        filters.push({
            field: match[1],
            operator: match[2] || '=', // Default to equals if no operator
            value: match[3]
        });
    }
    
    return filters;
}

// Check if a row matches all the provided filters
function matchesFilters(row, filters) {
    for (const filter of filters) {
        // Special handling for date filters
        if (filter.field === 'start_time' || filter.field === 'end_time') {
            const isStartTime = filter.field === 'start_time';
            const timeCell = row.cells[isStartTime ? 4 : 5];
            
            if (!timeCell) return false;
            
            // Get the date component from the row's timestamp
            const timeText = timeCell.textContent.trim();
            const rowDate = new Date(timeText);
            const rowDateStr = rowDate.toISOString().split('T')[0]; // Get just the date part YYYY-MM-DD
            
            // Parse the filter value as a date
            try {
                // Handle date format YYYY-MM-DD
                if (filter.value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // For start_time, set time to start of day (00:00:00)
                    // For end_time, set time to end of day (23:59:59)
                    const filterDate = new Date(filter.value);
                    if (isNaN(filterDate.getTime())) {
                        console.warn('Invalid date format in filter:', filter.value);
                        return false;
                    }
                    
                    // For start_time comparison, we need row date >= filter date
                    // For end_time comparison, we need row date <= filter date
                    // Compare just the date parts without time
                    const filterDateStr = filterDate.toISOString().split('T')[0];
                    
                    if (isStartTime && rowDateStr < filterDateStr) return false;
                    if (!isStartTime && rowDateStr > filterDateStr) return false;
                } else {
                    console.warn('Invalid date format in filter:', filter.value);
                    return false;
                }
            } catch (e) {
                console.warn('Error parsing date:', e);
                return false;
            }
            
            // This filter passed
            continue;
        }
        
        const value = getRowValue(row, filter.field);
        
        if (value === null) {
            return false; // Field not found
        }
        
        // Apply the appropriate comparison based on operator
        if (filter.operator === '=') {
            // For equals, do a case-insensitive substring match
            if (!value.toString().toLowerCase().includes(filter.value.toLowerCase())) {
                return false;
            }
        } else if (filter.operator === '>') {
            // For greater than
            if (parseFilterValue(value) <= parseFilterValue(filter.value)) {
                return false;
            }
        } else if (filter.operator === '<') {
            // For less than
            if (parseFilterValue(value) >= parseFilterValue(filter.value)) {
                return false;
            }
        }
    }
    
    return true; // All filters passed
}

// Get the value from a row for a specific field
function getRowValue(row, field) {
    // Map field names to column indices
    const fieldMap = {
        'status': 0,
        'name': 1,
        'url': 2,
        'tag': 3,
        'start_time': 4,
        'end_time': 5,
        'duration': 6
    };
    
    const index = fieldMap[field.toLowerCase()];
    
    if (index !== undefined) {
        const cell = row.cells[index];
        
        // Special handling for status
        if (field === 'status') {
            return cell.querySelector('.status-text').textContent.trim();
        }
        
        // Special handling for tags
        if (field === 'tag') {
            // Get all tags in the cell
            const tagElements = cell.querySelectorAll('.tag-badge');
            if (tagElements.length === 0) return '';
            
            // Return a comma-separated string of tag values
            return Array.from(tagElements).map(tag => tag.textContent.trim()).join(',');
        }
        
        return cell.textContent.trim();
    }
    
    return null;
}

// Parse a value for comparison, handling duration and time formats
function parseFilterValue(value) {
    // Try to parse as a number first
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
        return numValue;
    }
    
    // Check if it's a duration format like "2m 15s"
    if (/\d+m\s+\d+s/.test(value)) {
        const matches = value.match(/(\d+)m\s+(\d+)s/);
        if (matches) {
            return parseInt(matches[1]) * 60 + parseInt(matches[2]);
        }
    }
    
    // Check if it's a date/time format
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
        return dateValue.getTime();
    }
    
    // Fall back to string value
    return value;
}

// Function to collect available tags from the table
function populateTagSuggestions() {
    const tagField = suggestions.find(s => s.field === 'tag');
    if (!tagField) return;
    
    // Clear existing values
    tagField.values = [];
    
    // Find all tag badges in the table
    const tagBadges = document.querySelectorAll('.tags-cell .tag-badge');
    const tagSet = new Set();
    
    // Collect all unique tag values
    tagBadges.forEach(badge => {
        const tagValue = badge.textContent.trim();
        if (tagValue) tagSet.add(tagValue);
    });
    
    // Add to suggestions
    tagField.values = Array.from(tagSet).sort();
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
    
    // Save to localStorage
    localStorage.setItem('historyTableSortState', JSON.stringify(sortingState));
}

// Restore sorting state from localStorage
function restoreSortingState() {
    try {
        const savedState = localStorage.getItem('historyTableSortState');
        if (!savedState) return;
        
        const sortingState = JSON.parse(savedState);
        if (sortingState.columnIndex === -1) return;
    
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
        localStorage.removeItem('historyTableSortState');
    }
}

// Table sorting functionality
function initTableSorting() {
    const table = document.querySelector('.logs-table table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    const tableBody = document.querySelector('.table-scroll-container tbody'); // Updated selector
    const rows = tableBody.querySelectorAll('tr');
    
    // Skip the no-logs message row for sorting
    const dataRows = Array.from(rows).filter(row => !row.querySelector('.no-logs-message'));
        
    // Add sort direction indicators and click handlers to all headers
    headers.forEach((header, index) => {
        // Add sort icons and make headers look clickable
        header.classList.add('sortable');
        
        // Get header text
        const headerText = header.textContent.trim();
        
        // Create sort header with appropriate alignment based on column
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
            
            // Save the sorting state
            saveSortingState();
        });
    });
    
    // Default sort by Start Time column (index 4) in descending order
    if (dataRows.length > 0 && headers.length > 4) {
        // Set Start Time column as initial sort with descending order
        headers[4].classList.add('sorting-desc');
        sortTable(dataRows, 4, false); // Sort by Start Time descending
        
        // Re-append rows to update the display
        dataRows.forEach(row => {
            tableBody.appendChild(row);
        });
        
        // Save the initial sorting state
        saveSortingState();
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
        
        // Special handling for Start Time and End Time columns - parse as dates
        if (columnIndex === 4 || columnIndex === 5) {
            // Try to convert to Date objects for comparison
            const dateA = new Date(aValue);
            const dateB = new Date(bValue);
            
            // Check if dates are valid
            if (!isNaN(dateA) && !isNaN(dateB)) {
                return ascending ? dateA - dateB : dateB - dateA;
            }
        }

        // Special handling for Duration column - convert to seconds for comparison
        if (columnIndex === 6) { // Duration column
            return compareDuration(aValue, bValue, ascending);
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
    
    // For other cells, get the text content
    return cell ? cell.textContent.trim() : '';
}

function compareStatus(rowA, rowB, ascending) {
    // Get status priority based on class names
    const statusPriority = {
        'error': 1,     // Down
        'warning': 2,   // Slow
        'expiring': 3,  // Token Expiring
        'unknown': 4,   // Unknown/Pending
        'success': 5    // Healthy
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
        return nameA.localeCompare(nameB);
    }
    
    return ascending ? result : -result;
}

function compareDuration(a, b, ascending) {
    // Convert duration strings to seconds for comparison
    const getSeconds = (str) => {
        if (!str) return 0;
        
        const value = parseInt(str.match(/\d+/)?.[0] || 0);
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
