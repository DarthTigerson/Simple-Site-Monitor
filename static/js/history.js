// History Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initDateSuggestions(); // Initialize date suggestions first
    initSearchHelp();
    initSearchFunctionality();
    initTableSorting();
    restoreSortingState();
    initExportFunctionality(); // Initialize export functionality
    initClearButton(); // Initialize clear button functionality
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
    { field: 'status', operators: ['=', '!='], values: ['down', 'healthy', 'slow', 'expiring'], description: 'Filter by site status' },
    { field: 'name', operators: ['=', '!='], values: [], description: 'Filter by site name' },
    { field: 'url', operators: ['=', '!='], values: [], description: 'Filter by site URL' },
    { field: 'tags', operators: ['=', '!='], values: [], description: 'Filter by site tags (e.g. tags=production)' },
    { field: 'start_time', operators: ['=', '>', '<'], values: [], description: 'Filter logs after this date' },
    { field: 'end_time', operators: ['=', '>', '<'], values: [], description: 'Filter logs before this date' },
    { field: 'duration', operators: ['=', '>', '<'], values: ['30s', '1m', '5m', '30m', '1h', '2h 30m', '1d'], description: 'Filter by check duration' }
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
        // Toggle help panel
        helpToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (helpContent.style.display === 'block') {
                // Hide panel
                helpContent.style.opacity = '0';
                
                setTimeout(() => {
                    helpContent.style.display = 'none';
                }, 200);
            } else {
                // Show panel
                helpContent.style.display = 'block';
                helpContent.style.opacity = '0';
                
                setTimeout(() => {
                    helpContent.style.opacity = '1';
                }, 10);
            }
        });
        
        // Close help content when clicking outside
        document.addEventListener('click', function(e) {
            if (!helpContent.contains(e.target) && !helpToggle.contains(e.target) && helpContent.style.display === 'block') {
            helpContent.style.opacity = '0';
            
            setTimeout(() => {
                helpContent.style.display = 'none';
            }, 200);
            }
        });
        
        // Apply transitions
        helpContent.style.transition = 'opacity 0.2s ease';
    }
}

// Initialize search functionality
function initSearchFunctionality() {
    const searchQuery = document.getElementById('searchQuery');
    const richSearchInput = document.getElementById('richSearchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (!searchQuery || !richSearchInput) return;
    
    // Populate tag suggestions from existing tags
    populateTagSuggestions();
    
    // Set placeholder text on rich input
    richSearchInput.setAttribute('data-placeholder', 'Search logs... (e.g. status=down name=example tag=production)');
    
    // When user types in contentEditable div
    richSearchInput.addEventListener('input', function() {
        const plainText = this.innerText;
        searchQuery.value = plainText;
        highlightTags(this);
        showAutocomplete(plainText);
    });
    
    // When user focuses on rich input
    richSearchInput.addEventListener('focus', function() {
        // Show suggestions when focused
        showAutocomplete(this.innerText);
    });
    
    // Handle keyboard navigation and tab completion
    richSearchInput.addEventListener('keydown', function(e) {
        // Tab key for ghost text completion
        if (e.key === 'Tab') {
            handleGhostTextCompletion(e);
                return;
        }
        
        // Handle word-by-word navigation with Ctrl+Arrow keys
        if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            moveWordByWord(e.key === 'ArrowRight', richSearchInput);
            return;
        }
        
        // Clear any displayed ghost text when user starts typing
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Backspace", "Delete"].includes(e.key)) {
            setTimeout(() => {
                // Re-evaluate ghost text after DOM updates
                showAutocomplete(richSearchInput.innerText);
            }, 10);
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
            
            // Clear any ghost text
            const ghostOverlay = document.getElementById('ghostOverlay');
            if (ghostOverlay) {
                ghostOverlay.innerHTML = '';
                delete ghostOverlay.dataset.suggestion;
            }
        }
    });
}

// Function to highlight filter tags in blue
function highlightTags(element) {
    const text = element.innerText;
    
    // Save cursor position
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretOffset = preCaretRange.toString().length;
    
    // First, escape HTML to prevent XSS
    const safeText = escapeHtml(text);
    
    // Apply highlighting using regex replacements
    let html = safeText;
    
    // Highlight logical operators in green (do this first to avoid conflicts)
    const logicalRegex = /\b(AND|OR)\b/gi;
    html = html.replace(logicalRegex, '<span class="logical-highlight">$1</span>');
    
    // Highlight field names and operators
    const tagRegex = /\b(status|name|url|tags|start_time|end_time|duration)(=|!=|>|<)/g;
    html = html.replace(tagRegex, '<span class="tag-highlight">$1</span><span class="operator-highlight">$2</span>');
    
    // Also handle legacy colon syntax for backward compatibility
    html = html.replace(/\b(status|name|url|tags|start_time|end_time|duration):/g, '<span class="tag-highlight">$1</span><span class="operator-highlight">:</span>');
    
    // Highlight standalone field names without operators
    const standaloneFieldRegex = /\b(status|name|url|tags|start_time|end_time|duration)\b(?![=!><:])/g;
    html = html.replace(standaloneFieldRegex, '<span class="tag-highlight">$1</span>');
    
    // Highlight quoted strings (but only actual quotes, not field values)
    html = highlightQuotedStrings(html);
    
    // Update content without losing focus
    element.innerHTML = html;
    
    // Restore cursor position
    placeCursorAtOffset(element, caretOffset);
}

// Helper function to highlight quoted strings
function highlightQuotedStrings(html) {
    // Use DOM parsing approach instead of string manipulation
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;
    
    // Process text nodes only (to avoid modifying existing HTML)
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const nodesToReplace = [];
    let currentNode;
    
    // First pass: collect all text nodes that need processing
    while (currentNode = walker.nextNode()) {
        const text = currentNode.nodeValue;
        if (text.includes('"') || text.includes("'")) {
            nodesToReplace.push(currentNode);
        }
    }
    
    // Second pass: replace text nodes with processed versions
    nodesToReplace.forEach(node => {
        const text = node.nodeValue;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        // Process quotes one character at a time
        let inDoubleQuote = false;
        let inSingleQuote = false;
        let quoteStartIndex = -1;
        let quoteChar = null;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Handle double quotes
            if (char === '"' && !inSingleQuote) {
                if (!inDoubleQuote) {
                    // Start of double quoted section
                    if (i > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, i)));
                    }
                    fragment.appendChild(document.createTextNode('"'));
                    inDoubleQuote = true;
                    quoteStartIndex = i + 1;
                    quoteChar = '"';
                } else {
                    // End of double quoted section
                    const quoteContent = text.substring(quoteStartIndex, i);
                    const span = document.createElement('span');
                    span.className = 'quoted-highlight';
                    span.textContent = quoteContent;
                    fragment.appendChild(span);
                    fragment.appendChild(document.createTextNode('"'));
                    inDoubleQuote = false;
                    lastIndex = i + 1;
                }
            }
            // Handle single quotes
            else if (char === "'" && !inDoubleQuote) {
                if (!inSingleQuote) {
                    // Start of single quoted section
                    if (i > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, i)));
                    }
                    fragment.appendChild(document.createTextNode("'"));
                    inSingleQuote = true;
                    quoteStartIndex = i + 1;
                    quoteChar = "'";
                } else {
                    // End of single quoted section
                    const quoteContent = text.substring(quoteStartIndex, i);
                    const span = document.createElement('span');
                    span.className = 'quoted-highlight';
                    span.textContent = quoteContent;
                    fragment.appendChild(span);
                    fragment.appendChild(document.createTextNode("'"));
                    inSingleQuote = false;
                    lastIndex = i + 1;
                }
            }
        }
        
        // Add any remaining text
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        // Replace the original node with our processed fragment
        node.parentNode.replaceChild(fragment, node);
    });
    
    // Return the processed HTML
    return container.innerHTML;
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

// Replace the dropdown autocomplete with ghost text prediction
function showAutocomplete(text, container) {
    // Hide the dropdown container - we won't be using it
        if (container) container.style.display = 'none';
    
    const richInput = document.getElementById('richSearchInput');
    const plainInput = document.getElementById('searchQuery');
    
    if (!text || !richInput) return;
    
    // Create or get the ghost overlay element
    let ghostOverlay = document.getElementById('ghostOverlay');
    if (!ghostOverlay) {
        // Create ghost overlay if it doesn't exist
        ghostOverlay = document.createElement('div');
        ghostOverlay.id = 'ghostOverlay';
        ghostOverlay.className = 'ghost-overlay';
        richInput.parentNode.appendChild(ghostOverlay);
    }
    
    // Always update the position when showing autocomplete
    // This ensures it stays aligned with the input as the window changes
    ghostOverlay.style.position = 'absolute';
    ghostOverlay.style.top = '0';
    ghostOverlay.style.left = '0';
    ghostOverlay.style.width = '100%';
    ghostOverlay.style.height = '100%';
    ghostOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
    
    // Determine current input context
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // Get current position and text up to cursor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(richInput);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretPos = preCaretRange.toString().length;
    
    const textUpToCursor = text.substring(0, caretPos);
    const textAfterCursor = text.substring(caretPos);
    
    // Find the logical operator position (for AND/OR)
    const lastAndPos = textUpToCursor.lastIndexOf(' AND ');
    const lastOrPos = textUpToCursor.lastIndexOf(' OR ');
    const lastLogicalPos = Math.max(lastAndPos, lastOrPos);
    
    // Find the last space or operator to determine current token
    let lastSpacePos = textUpToCursor.lastIndexOf(' ');
    const lastEqualPos = textUpToCursor.lastIndexOf('=');
    const lastNotEqualPos = textUpToCursor.lastIndexOf('!=');
    const lastGreaterPos = textUpToCursor.lastIndexOf('>');
    const lastLessPos = textUpToCursor.lastIndexOf('<');
    
    // If we're right after a logical operator, adjust lastSpacePos
    if (lastLogicalPos > -1 && lastLogicalPos + 5 >= lastSpacePos) { // 5 = length of " AND " or " OR "
        // We're in a logical operator context, adjust to after the operator
        lastSpacePos = lastLogicalPos + (textUpToCursor.substring(lastLogicalPos).indexOf(' ', 4) > -1 ? 
            lastLogicalPos + textUpToCursor.substring(lastLogicalPos).indexOf(' ', 4) : 
            lastSpacePos);
    }
    
    const lastOperatorPos = Math.max(lastEqualPos, lastNotEqualPos, lastGreaterPos, lastLessPos);
    const tokenStartPos = Math.max(lastSpacePos, lastOperatorPos);
    
    const currentToken = tokenStartPos === -1 
        ? textUpToCursor 
        : textUpToCursor.substring(tokenStartPos + 1);
    
    // Check if we're in a quoted string
    const inQuote = (
        (textUpToCursor.lastIndexOf('"') > tokenStartPos && textUpToCursor.split('"').length % 2 === 0) ||
        (textUpToCursor.lastIndexOf("'") > tokenStartPos && textUpToCursor.split("'").length % 2 === 0)
    );
    
    if (inQuote) {
        // Don't show suggestions inside quoted strings
        ghostOverlay.innerHTML = '';
        return;
    }
    
    // Three main cases:
    // 1. Empty or just starting a new token (suggest field names)
    // 2. Typing a field name (suggest matching fields)
    // 3. After a field+operator (suggest values)
    // 4. After AND/OR (suggest field names)
    
    let suggestion = '';
    
    // Check if we're after a logical operator
    const logicalOpMatch = textUpToCursor.match(/\b(AND|OR)\s*$/i);
    if (logicalOpMatch || 
        (lastLogicalPos > -1 && lastSpacePos > lastLogicalPos && !textUpToCursor.substring(lastSpacePos + 1).includes('='))) {
        // After AND/OR, suggest a field
        const fieldSuggestions = suggestions
            .map(s => s.field)
            .filter(f => f.toLowerCase().startsWith(currentToken.toLowerCase()));
        
        if (fieldSuggestions.length === 1) {
            suggestion = fieldSuggestions[0].substring(currentToken.length);
        }
    }
    // Check if we're typing a field name (no operator yet)
    else if (!currentToken.includes('=') && !currentToken.includes('>') && !currentToken.includes('<')) {
        // Suggest field names (without appending an operator)
        const fieldSuggestions = suggestions
            .map(s => s.field)
            .filter(f => f.toLowerCase().startsWith(currentToken.toLowerCase()));
        
        if (fieldSuggestions.length === 1) {
            suggestion = fieldSuggestions[0].substring(currentToken.length);
        }
    }
    // Check if we're after a field+operator
    else {
        const fieldOpMatch = currentToken.match(/^(\w+)([=!><]+)(.*)$/);
        if (fieldOpMatch) {
            const [_, field, operator, value] = fieldOpMatch;
            
            // Find matching suggestions for this field
            const fieldSuggestion = suggestions.find(
                s => s.field.toLowerCase() === field.toLowerCase()
            );
            
            if (fieldSuggestion && fieldSuggestion.values.length > 0) {
                const valueSuggestions = fieldSuggestion.values
                    .filter(v => v.toLowerCase().startsWith(value.toLowerCase()));
                
                if (valueSuggestions.length === 1) {
                    suggestion = valueSuggestions[0].substring(value.length);
                }
            }
        }
    }
    
    // Render the ghost text
    if (suggestion) {
        console.log("Showing suggestion:", suggestion);
        // Format the display with current text + ghost suggestion
        ghostOverlay.innerHTML = `
            <div class="ghost-content">
                <span class="ghost-typed">${escapeHtml(textUpToCursor)}</span><span class="ghost-suggestion">${escapeHtml(suggestion)}</span><span class="ghost-typed">${escapeHtml(textAfterCursor)}</span>
            </div>
        `;
        
        // Store the suggestion for use by tab completion handler
        ghostOverlay.dataset.suggestion = suggestion;
    } else {
        // No suggestion to show
        ghostOverlay.innerHTML = '';
        delete ghostOverlay.dataset.suggestion;
    }
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Handle tab completion for ghost text
function handleGhostTextCompletion(e) {
    if (e.key === 'Tab') {
        const ghostOverlay = document.getElementById('ghostOverlay');
        if (ghostOverlay && ghostOverlay.dataset.suggestion) {
            e.preventDefault(); // Prevent tabbing to next element
            
            // Get the suggestion and apply it
            const suggestion = ghostOverlay.dataset.suggestion;
            const richInput = document.getElementById('richSearchInput');
            const plainInput = document.getElementById('searchQuery');
            
            // Get current caret position
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(richInput);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            const caretPos = preCaretRange.toString().length;
            
            // Insert the suggestion at the caret position
            const newText = richInput.innerText.substring(0, caretPos) + 
                           suggestion + 
                           richInput.innerText.substring(caretPos);
            
            richInput.innerText = newText;
            plainInput.value = newText;
            
            // Re-highlight the syntax
            highlightTags(richInput);
            
            // Position caret after the inserted suggestion
            placeCursorAtOffset(richInput, caretPos + suggestion.length);
            
            // Clear the ghost overlay
            ghostOverlay.innerHTML = '';
            delete ghostOverlay.dataset.suggestion;
            
            // Show new suggestions after completion
            setTimeout(() => {
                showAutocomplete(richInput.innerText);
            }, 10);
        }
    }
}

// Function to show initial filter suggestions when the search field is focused
function showInitialSuggestions(container) {
    if (!container) return;
    
    // Clear existing content
        container.innerHTML = `
            <div class="autocomplete-help">
                Press <kbd>Tab</kbd> to complete, <kbd>↑</kbd><kbd>↓</kbd> to navigate
            </div>
        `;
        
    // Show initial suggestions for common filters
        let firstItem = true;
        
    // Show one example from each filter type
    suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item' + (firstItem ? ' selected' : '');
            firstItem = false;
            
        // Just show the field name with default = operator for simplicity
            div.innerHTML = `
            <span class="autocomplete-field">${suggestion.field}</span><span class="autocomplete-operator">=</span>
                <div class="autocomplete-description">${suggestion.description}</div>
            `;
            
            div.addEventListener('click', () => {
                const richInput = document.getElementById('richSearchInput');
                const plainInput = document.getElementById('searchQuery');
                
                // Insert suggestion
            plainInput.value = `${suggestion.field}=`;
            richInput.innerText = `${suggestion.field}=`;
            
            // Re-highlight tags
                highlightTags(richInput);
                
            // Focus and position cursor at end
                richInput.focus();
            placeCursorAtOffset(richInput, `${suggestion.field}=`.length);
                
                container.style.display = 'none';
            });
            
            container.appendChild(div);
        });
        
    // Display the container
        container.style.display = 'block';
}

// Parse the search query into individual filters
function parseSearchQuery(query) {
    if (!query || !query.trim()) return [];
    
    const filters = [];
    let currentLogicalOperator = 'AND'; // Default operator for the first condition only
    let expectingLogicalOperator = false; // Flag to track if we expect a logical operator
    
    // Tokenize the query into parts, preserving quoted strings
    const tokens = tokenizeQuery(query);
    
    console.log("Tokenized query:", tokens); // For debugging
    
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        
        // Check if this token is a logical operator
        if (token.toUpperCase() === 'AND' || token.toUpperCase() === 'OR') {
            currentLogicalOperator = token.toUpperCase();
            expectingLogicalOperator = false;
            i++;
            continue;
        }
        
        // If we're expecting a logical operator but didn't get one, the syntax is invalid
        if (expectingLogicalOperator) {
            console.error("Missing logical operator between conditions");
            return []; // Return empty filters to show all results
        }
        
        // Look for field=value pattern
        if (i + 2 < tokens.length) {
            const field = token.toLowerCase(); // Make field names case-insensitive
            const operator = tokens[i + 1];
            const value = tokens[i + 2];
            
            // Validate field, operator, and value
            if (isValidField(field) && isValidOperator(operator)) {
                // Add to filters
                filters.push({
                    field: field,
                    operator: operator,
                    value: value,
                    logicalOperator: currentLogicalOperator,
                    exact: isQuoted(value) // Flag if this was an exact (quoted) match
                });
                
                i += 3; // Move past field, operator, and value
                
                // After finding a complete condition, we expect a logical operator next
                if (i < tokens.length) {
                    expectingLogicalOperator = true;
                }
                continue;
            }
        }
        
        // If we couldn't parse a valid filter, skip this token
        i++;
    }
    
    console.log("Parsed filters:", filters); // For debugging
    return filters;
}

// Helper function to check if a string was originally quoted
function isQuoted(str) {
    return (
        (str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))
    );
}

// Helper function to remove quotes from a string if present
function removeQuotes(str) {
    if (isQuoted(str)) {
        return str.substring(1, str.length - 1);
    }
    return str;
}

// Helper function to check if a field name is valid
function isValidField(field) {
    return [
        'status', 'name', 'url', 'tags', 
        'start_time', 'end_time', 'duration'
    ].includes(field.toLowerCase());
}

// Helper function to check if an operator is valid
function isValidOperator(op) {
    return ['=', '!=', '>', '<', ':'].includes(op);
}

// Tokenize a query string, preserving quoted sections
function tokenizeQuery(query) {
    const tokens = [];
    let currentToken = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    // Normalize logical operators with spaces for easier parsing
    query = query.replace(/\b(AND|OR)\b/gi, ' $1 ');
    
    for (let i = 0; i < query.length; i++) {
        const char = query[i];
        
        // Handle quotes
        if (char === "'" && !inDoubleQuote) {
            if (inSingleQuote) {
                // End of quoted section
                currentToken += char;
                tokens.push(currentToken);
                currentToken = '';
                inSingleQuote = false;
    } else {
                // Start of quoted section
                // If we have accumulated text, push it as a token first
                if (currentToken.trim()) {
                    tokens.push(currentToken.trim());
                }
                currentToken = char;
                inSingleQuote = true;
            }
            continue;
        }
        
        if (char === '"' && !inSingleQuote) {
            if (inDoubleQuote) {
                // End of quoted section
                currentToken += char;
                tokens.push(currentToken);
                currentToken = '';
                inDoubleQuote = false;
            } else {
                // Start of quoted section
                // If we have accumulated text, push it as a token first
                if (currentToken.trim()) {
                    tokens.push(currentToken.trim());
                }
                currentToken = char;
                inDoubleQuote = true;
            }
            continue;
        }
        
        // Handle spaces (only tokenize on space if not in quotes)
        if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
            if (currentToken.trim()) {
                tokens.push(currentToken.trim());
            }
            currentToken = '';
            continue;
        }
        
        // Special handling for operators if not in quotes
        if (!inSingleQuote && !inDoubleQuote) {
            // Special case for !=
            if (char === '!' && i + 1 < query.length && query[i + 1] === '=') {
                if (currentToken.trim()) {
                    tokens.push(currentToken.trim());
                }
                tokens.push('!=');
                currentToken = '';
                i++; // Skip the next character (=)
                continue;
            }
            
            // Special case for =, >, <, :
            if (['=', '>', '<', ':'].includes(char)) {
                if (currentToken.trim()) {
                    tokens.push(currentToken.trim());
                }
                tokens.push(char);
                currentToken = '';
                continue;
            }
        }
        
        // For all other characters, just add to current token
        currentToken += char;
    }
    
    // Add the last token if any
    if (currentToken.trim()) {
        tokens.push(currentToken.trim());
    }
    
    console.log("Tokenized query:", tokens); // For debugging
    return tokens;
}

// Perform search on the log data
function performSearch(query) {
    const logRows = document.querySelectorAll('#logResults tr.log-row');
    const resultCount = document.getElementById('resultCount');
    let visibleRows = 0;
    
    try {
    if (!query.trim()) {
        // If no query, show all rows
        logRows.forEach(row => {
            row.style.display = '';
            visibleRows++;
        });
    } else {
        // Parse the query for filters
        const filters = parseSearchQuery(query);
        
            // If the parser returned empty filters due to syntax error (missing AND/OR)
            const needsAnd = query.match(/\b(status|name|url|tags|start_time|end_time|duration)\b.+\b(status|name|url|tags|start_time|end_time|duration)\b/i) 
                          && !query.match(/\b(AND|OR)\b/i);
            
            if (filters.length === 0 && needsAnd) {
                console.error("Syntax error: Missing AND/OR between conditions");
                
                // Use the built-in notification system instead of alert
                if (window.showNotification) {
                    window.showNotification("Syntax Error", "error", 3000);
                } else {
                    // Fallback to alert if notification system isn't available
                    alert("Syntax Error");
                }
                
                // Show all rows to avoid confusion
                logRows.forEach(row => {
                    row.style.display = '';
                    visibleRows++;
                });
            } else {
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
    }
    
        // Update result count
    if (resultCount) {
        resultCount.textContent = visibleRows;
    }
    } catch (error) {
        console.error("Search error:", error);
        
        // Show error notification
        if (window.showNotification) {
            window.showNotification("Search error: " + error.message, "error");
        }
        
        // Show all rows on error
        logRows.forEach(row => {
            row.style.display = '';
            visibleRows++;
        });
        
        if (resultCount) {
            resultCount.textContent = visibleRows;
        }
    }
}

// Check if a row matches all the provided filters
function matchesFilters(row, filters) {
    if (filters.length === 0) return true;
    
    // Group filters by logical operator
    const andFilters = [];
    const orFilters = [];
    
    // First filter is always treated as AND
    let currentOperator = 'AND';
    
    // Separate filters into AND and OR groups
    filters.forEach(filter => {
        // The logical operator belongs to the PREVIOUS filter
        // and determines how THIS filter relates to the previous ones
        if (filter.logicalOperator === 'OR') {
            orFilters.push(filter);
        } else {
            // Default to AND
            andFilters.push(filter);
        }
    });
    
    // If there are OR filters, the row matches if ANY of the OR filters match
    // or if ALL of the AND filters match
    let orMatches = orFilters.length === 0 ? false : orFilters.some(filter => filterMatches(row, filter));
    
    // For AND filters, ALL must match
    let andMatches = andFilters.length === 0 ? true : andFilters.every(filter => filterMatches(row, filter));
    
    // Return true if either condition is met
    return orMatches || andMatches;
}

// Helper function to check if a single filter matches a row
function filterMatches(row, filter) {
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
            // Clean the filter value (remove quotes if present)
            const filterValue = removeQuotes(filter.value);
            
            // Handle date format YYYY-MM-DD
            if (filterValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // For start_time, set time to start of day (00:00:00)
                // For end_time, set time to end of day (23:59:59)
                const filterDate = new Date(filterValue);
                if (isNaN(filterDate.getTime())) {
                    console.warn('Invalid date format in filter:', filterValue);
                    return false;
                }
                
                // Get the date parts for comparison
                const filterDateStr = filterDate.toISOString().split('T')[0];
                
                // Apply different operators
                if (filter.operator === '=' && rowDateStr !== filterDateStr) return false;
                if (filter.operator === '!=' && rowDateStr === filterDateStr) return false;
                if (filter.operator === '>' && rowDateStr <= filterDateStr) return false;
                if (filter.operator === '<' && rowDateStr >= filterDateStr) return false;
            } else {
                console.warn('Invalid date format in filter:', filterValue);
                return false;
            }
        } catch (e) {
            console.warn('Error parsing date:', e);
            return false;
        }
        
        // This filter passed
        return true;
    }
    
    // Special handling for duration filter
    if (filter.field === 'duration') {
        const durationCell = row.cells[6]; // Duration is in column 6
        
        if (!durationCell) return false;
        
        const durationText = durationCell.textContent.trim();
        const durationSeconds = parseDurationToSeconds(durationText);
        
        // Clean the filter value (remove quotes if present)
        const filterValue = removeQuotes(filter.value);
        const filterSeconds = parseDurationToSeconds(filterValue);
        
        if (durationSeconds === null || filterSeconds === null) return false;
        
        // Compare duration based on operator
        if (filter.operator === '=' && durationSeconds !== filterSeconds) return false;
        if (filter.operator === '!=' && durationSeconds === filterSeconds) return false;
        if (filter.operator === '>' && durationSeconds <= filterSeconds) return false;
        if (filter.operator === '<' && durationSeconds >= filterSeconds) return false;
        
        // This filter passed
        return true;
    }
    
        const value = getRowValue(row, filter.field);
        
        if (value === null) {
            return false; // Field not found
        }
    
    // Clean the filter value (remove quotes if present)
    const filterValue = removeQuotes(filter.value);
        
        // Apply the appropriate comparison based on operator
        if (filter.operator === '=') {
        if (filter.exact) {
            // For exact match (quoted), do a case-insensitive exact match
            return value.toString().toLowerCase() === filterValue.toLowerCase();
        } else {
            // For regular match, do a case-insensitive substring match
            return value.toString().toLowerCase().includes(filterValue.toLowerCase());
        }
    } else if (filter.operator === '!=') {
        if (filter.exact) {
            // For exact not-match (quoted), check if not an exact match
            return value.toString().toLowerCase() !== filterValue.toLowerCase();
        } else {
            // For regular not-match, check that value doesn't contain the filter value
            return !value.toString().toLowerCase().includes(filterValue.toLowerCase());
            }
        } else if (filter.operator === '>') {
            // For greater than
        return parseFilterValue(value) > parseFilterValue(filterValue);
        } else if (filter.operator === '<') {
            // For less than
        return parseFilterValue(value) < parseFilterValue(filterValue);
    } else if (filter.operator === ':') {
        // Legacy colon operator - same as equals
        return value.toString().toLowerCase().includes(filterValue.toLowerCase());
    }
    
    return false; // Unknown operator
}

// Helper function to parse duration text to seconds
function parseDurationToSeconds(durationText) {
    if (!durationText) return null;
    
    // Normalize the input - convert to lowercase and trim whitespace
    const text = durationText.toLowerCase().trim();
    
    // Handle simple formats
    // Format: "5s" (seconds)
    if (/^\d+s$/.test(text)) {
        return parseInt(text.replace('s', ''));
    }
    
    // Format: "5m" (minutes)
    if (/^\d+m$/.test(text)) {
        return parseInt(text.replace('m', '')) * 60;
    }
    
    // Format: "5h" (hours)
    if (/^\d+h$/.test(text)) {
        return parseInt(text.replace('h', '')) * 3600;
    }
    
    // Format: "5d" (days)
    if (/^\d+d$/.test(text)) {
        return parseInt(text.replace('d', '')) * 86400;
    }
    
    // Handle combined formats
    let totalSeconds = 0;
    
    // Format: "5m 30s" (minutes and seconds)
    const minuteSecondMatch = text.match(/(\d+)m\s+(\d+)s/);
    if (minuteSecondMatch) {
        const minutes = parseInt(minuteSecondMatch[1]);
        const seconds = parseInt(minuteSecondMatch[2]);
        return minutes * 60 + seconds;
    }
    
    // Format: "1h 30m" (hours and minutes)
    const hourMinuteMatch = text.match(/(\d+)h\s+(\d+)m/);
    if (hourMinuteMatch) {
        const hours = parseInt(hourMinuteMatch[1]);
        const minutes = parseInt(hourMinuteMatch[2]);
        return hours * 3600 + minutes * 60;
    }
    
    // Format: "1d 2h" (days and hours)
    const dayHourMatch = text.match(/(\d+)d\s+(\d+)h/);
    if (dayHourMatch) {
        const days = parseInt(dayHourMatch[1]);
        const hours = parseInt(dayHourMatch[2]);
        return days * 86400 + hours * 3600;
    }
    
    // Format: "1h 5m 30s" (hours, minutes, and seconds)
    const hourMinuteSecondMatch = text.match(/(\d+)h\s+(\d+)m\s+(\d+)s/);
    if (hourMinuteSecondMatch) {
        const hours = parseInt(hourMinuteSecondMatch[1]);
        const minutes = parseInt(hourMinuteSecondMatch[2]);
        const seconds = parseInt(hourMinuteSecondMatch[3]);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // Format: "1d 5h 30m" (days, hours, and minutes)
    const dayHourMinuteMatch = text.match(/(\d+)d\s+(\d+)h\s+(\d+)m/);
    if (dayHourMinuteMatch) {
        const days = parseInt(dayHourMinuteMatch[1]);
        const hours = parseInt(dayHourMinuteMatch[2]);
        const minutes = parseInt(dayHourMinuteMatch[3]);
        return days * 86400 + hours * 3600 + minutes * 60;
    }
    
    // Parse text like "2 minutes", "1 hour 30 minutes", etc.
    if (text.includes('second') || text.includes('minute') || text.includes('hour') || text.includes('day')) {
        // Extract numbers and units
        const parts = text.match(/(\d+)\s*(second|minute|hour|day)s?/g);
        if (parts) {
            parts.forEach(part => {
                const [_, value, unit] = part.match(/(\d+)\s*(second|minute|hour|day)s?/);
                const numValue = parseInt(value);
                
                if (unit === 'second') totalSeconds += numValue;
                else if (unit === 'minute') totalSeconds += numValue * 60;
                else if (unit === 'hour') totalSeconds += numValue * 3600;
                else if (unit === 'day') totalSeconds += numValue * 86400;
            });
            return totalSeconds;
        }
    }
    
    // Try to handle numeric values (assume seconds)
    const numericValue = parseFloat(text);
    if (!isNaN(numericValue)) {
        return numericValue;
    }
    
    return null; // Unknown format
}

// Get the value from a row for a specific field
function getRowValue(row, field) {
    // Map field names to column indices
    const fieldMap = {
        'status': 0,
        'name': 1,
        'url': 2,
        'tags': 3,
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
        if (field === 'tags') {
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
    const tagField = suggestions.find(s => s.field === 'tags');
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
    // Convert duration strings to seconds for comparison using the more robust parser
    const secondsA = parseDurationToSeconds(a);
    const secondsB = parseDurationToSeconds(b);

    // Handle cases where parsing might fail (though parseDurationToSeconds returns null)
    const valA = secondsA === null ? 0 : secondsA;
    const valB = secondsB === null ? 0 : secondsB;

    return ascending ? valA - valB : valB - valA;
}

// Initialize clear button functionality
function initClearButton() {
    const clearBtn = document.getElementById('clearBtn');
    const richSearchInput = document.getElementById('richSearchInput');
    const searchQuery = document.getElementById('searchQuery');
    
    if (clearBtn && richSearchInput && searchQuery) {
        clearBtn.addEventListener('click', function() {
            // Clear the search inputs
            richSearchInput.innerText = '';
            searchQuery.value = '';
            
            // Show all results
            performSearch('');
            
            // Reset the highlight
            highlightTags(richSearchInput);
            
            // Focus back on the input
            richSearchInput.focus();
        });
    }
}
