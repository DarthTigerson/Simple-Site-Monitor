// History Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initSearchHelp();
    initPagination();
    initSearchFunctionality();
});

// Autocomplete suggestions data
const suggestions = [
    { field: 'status', operators: [':', '!='], values: ['down', 'healthy', 'slow', 'expiring'], description: 'Filter by site status' },
    { field: 'name', operators: [':', '!=', ':*', '!:*'], values: [], description: 'Filter by site name' },
    { field: 'url', operators: [':', '!=', ':*', '!:*'], values: [], description: 'Filter by site URL' }
];

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
    
    // Set placeholder text on rich input
    richSearchInput.setAttribute('data-placeholder', 'Search logs... (e.g. status:down name:example)');
    
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
    const tagRegex = /\b(status|name|url):/g;
    
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
    
    // Update result count and pagination
    if (resultCount) {
        resultCount.textContent = visibleRows;
    }
    
    updatePagination(visibleRows);
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
        'start': 3,
        'end': 4,
        'duration': 5
    };
    
    const index = fieldMap[field.toLowerCase()];
    
    if (index !== undefined) {
        const cell = row.cells[index];
        
        // Special handling for status
        if (field === 'status') {
            return cell.querySelector('.status-text').textContent.trim();
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

// Initialize pagination with dynamic row count
function initPagination() {
    const logRows = document.querySelectorAll('#logResults tr.log-row');
    let rowsPerPage = calculateRowsPerPage();
    let currentPage = 1;
    
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    
    // Update pagination on initial load
    updatePagination(logRows.length);
    
    // Handle window resize to adjust row count
    window.addEventListener('resize', debounce(function() {
        rowsPerPage = calculateRowsPerPage();
        updatePagination(getVisibleRowsCount());
        goToPage(currentPage);
    }, 250));
    
    // Handle page navigation
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (!this.disabled) {
                goToPage(currentPage - 1);
            }
        });
        
        nextPageBtn.addEventListener('click', function() {
            if (!this.disabled) {
                goToPage(currentPage + 1);
            }
        });
    }
    
    // Go to a specific page
    function goToPage(page) {
        const visibleRows = Array.from(logRows).filter(row => row.style.display !== 'none');
        const totalPages = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));
        
        // Ensure page is in bounds
        page = Math.max(1, Math.min(page, totalPages));
        currentPage = page;
        
        // Update current page display
        if (currentPageSpan) {
            currentPageSpan.textContent = page;
        }
        
        // Update button states
        if (prevPageBtn) {
            prevPageBtn.disabled = page <= 1;
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = page >= totalPages;
        }
        
        // Hide/show rows based on current page
        const startIdx = (page - 1) * rowsPerPage;
        const endIdx = startIdx + rowsPerPage;
        
        visibleRows.forEach((row, idx) => {
            if (idx >= startIdx && idx < endIdx) {
                row.classList.add('page-visible');
                row.classList.remove('page-hidden');
            } else {
                row.classList.add('page-hidden');
                row.classList.remove('page-visible');
            }
        });
    }
    
    // Calculate rows per page based on available height
    function calculateRowsPerPage() {
        const tableContainer = document.querySelector('.logs-table');
        if (!tableContainer) return 10;
        
        const containerHeight = tableContainer.clientHeight;
        const headerHeight = tableContainer.querySelector('thead')?.offsetHeight || 0;
        const availableHeight = containerHeight - headerHeight - 20; // 20px buffer
        
        // Get row height from a sample row or use default
        const sampleRow = tableContainer.querySelector('tbody tr');
        const rowHeight = sampleRow ? sampleRow.offsetHeight : 50;
        
        // Calculate how many rows can fit
        let calculatedRows = Math.floor(availableHeight / rowHeight);
        
        // Ensure at least 5 rows and at most 50 rows
        return Math.max(5, Math.min(50, calculatedRows));
    }
    
    // Get count of visible rows
    function getVisibleRowsCount() {
        return Array.from(logRows).filter(row => row.style.display !== 'none').length;
    }
    
    // Initial page load
    goToPage(1);
    
    // Utility function for resize debouncing
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }
}

// Update pagination based on visible rows count
function updatePagination(visibleRowCount) {
    const tableContainer = document.querySelector('.logs-table');
    if (!tableContainer) return;
    
    // Calculate rows per page dynamically
    const headerHeight = tableContainer.querySelector('thead')?.offsetHeight || 0;
    const availableHeight = tableContainer.clientHeight - headerHeight - 20;
    const sampleRow = tableContainer.querySelector('tbody tr');
    const rowHeight = sampleRow ? sampleRow.offsetHeight : 50;
    const rowsPerPage = Math.max(5, Math.min(50, Math.floor(availableHeight / rowHeight)));
    
    const totalPages = Math.max(1, Math.ceil(visibleRowCount / rowsPerPage));
    
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    
    // Update total pages display
    if (totalPagesSpan) {
        totalPagesSpan.textContent = totalPages;
    }
    
    // Reset to first page
    if (currentPageSpan) {
        currentPageSpan.textContent = '1';
    }
    
    // Update button states
    if (prevPageBtn) {
        prevPageBtn.disabled = true; // First page
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = totalPages <= 1;
    }
    
    // Apply pagination to visible rows
    const logRows = document.querySelectorAll('#logResults tr.log-row');
    let visibleIndex = 0;
    
    logRows.forEach(row => {
        if (row.style.display !== 'none') {
            if (visibleIndex < rowsPerPage) {
                row.classList.add('page-visible');
                row.classList.remove('page-hidden');
            } else {
                row.classList.add('page-hidden');
                row.classList.remove('page-visible');
            }
            visibleIndex++;
        } else {
            row.classList.add('page-hidden');
            row.classList.remove('page-visible');
        }
    });
}
