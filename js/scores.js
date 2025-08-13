// DCI Scores Page JavaScript

let eventsData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 9;
let currentView = 'table';
let currentCalendarDate = new Date();

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Events Page Loaded');
    
    // Initialize page
    initializeFilters();
    loadEventsData();
    setupEventListeners();
    setupViewToggle();
    setupModalEventListeners();
});

function initializeFilters() {
    // Clear any existing filter options (except the default "All" options)
    const yearFilter = document.getElementById('year-filter');
    
    // Clear year filter options except the first one
    while (yearFilter.children.length > 1) {
        yearFilter.removeChild(yearFilter.lastChild);
    }
}

async function loadEventsData() {
    const tbody = document.getElementById('scores-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Loading events data...</td></tr>';
    
    try {
        // Load from the master shows list CSV file
        const response = await fetch('../data/shows/master_shows_list.csv');
        if (response.ok) {
            const csvText = await response.text();
            eventsData = parseShowsCSV(csvText);
            filteredData = [...eventsData];
            populateYearFilter();
            displayEvents();
            updatePagination();
        } else {
            throw new Error('Failed to load events data');
        }
    } catch (error) {
        console.error('Error loading events data:', error);
        // Display sample data if CSV fails to load
        loadSampleEventData();
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(value => value.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

function parseShowsCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const events = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            // Better CSV parsing to handle quoted fields
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim()); // Add the last value
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            // Transform the row data to match our display format
            const event = {
                Circuit: 'DCI', // Default circuit
                Date: row.Date,
                Event: row.Event_Name || `${row.City}${row.State ? ', ' + row.State : ''}`, // Use Event_Name if available, fallback to location
                Event_Name: row.Event_Name, // Preserve original Event_Name for URL params
                Location: `${row.City}${row.State ? ', ' + row.State : ''}`, // Use City, State format
                CorpsCount: parseInt(row.Corps_Count) || 0,
                Winner: 'TBD', // Winner not available in this dataset
                Year: row.Year,
                Season: row.Year, // Use Year instead of Spring/Summer
                City: row.City,
                State: row.State
            };
            
            // Debug: Log the first few events to check Corps_Count
            if (events.length < 3) {
                console.log('Debug event:', event, 'Raw Corps_Count:', row.Corps_Count);
            }
            
            events.push(event);
        }
    }
    
    // Sort events by date (newest first)
    events.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    
    return events;
}

function processEventsFromScores(scoresData) {
    const eventsMap = new Map();
    
    // Group scores by event and date
    scoresData.forEach(score => {
        const eventKey = `${score.Date}-${score.Event}`;
        
        if (!eventsMap.has(eventKey)) {
            eventsMap.set(eventKey, {
                Date: score.Date,
                Event: score.Event,
                City: score.City || 'Unknown',
                State: score.State || '',
                Corps: [],
                Winner: ''
            });
        }
        
        const event = eventsMap.get(eventKey);
        event.Corps.push({
            name: score.Corps,
            placement: parseInt(score.Placement) || 999,
            totalScore: parseFloat(score['Total Score']) || 0
        });
    });
    
    // Process each event to find winner and sort corps
    const events = Array.from(eventsMap.values()).map(event => {
        // Sort corps by placement (lowest number = best placement)
        event.Corps.sort((a, b) => a.placement - b.placement);
        
        // Set winner (first place corps)
        event.Winner = event.Corps.length > 0 ? event.Corps[0].name : 'Unknown';
        
        // Format location
        event.Location = event.State ? `${event.City}, ${event.State}` : event.City;
        
        // Set corps count
        event.CorpsCount = event.Corps.length;
        
        return event;
    });
    
    // Sort events by date (newest first)
    events.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    
    return events;
}

function loadSampleEventData() {
    eventsData = [
        {
            Circuit: 'DCI',
            Date: '2024-08-10',
            Event: 'DCI World Championships Finals',
            Location: 'Indianapolis, IN',
            CorpsCount: 25,
            Winner: 'Blue Devils'
        },
        {
            Circuit: 'DCI',
            Date: '2024-08-09',
            Event: 'DCI World Championships Semifinals',
            Location: 'Indianapolis, IN',
            CorpsCount: 25,
            Winner: 'Blue Devils'
        },
        {
            Circuit: 'DCI',
            Date: '2024-08-08',
            Event: 'DCI World Championships Quarterfinals',
            Location: 'Indianapolis, IN',
            CorpsCount: 40,
            Winner: 'Blue Devils'
        },
        {
            Circuit: 'DCA',
            Date: '2024-07-27',
            Event: 'DCI Eastern Classic',
            Location: 'Allentown, PA',
            CorpsCount: 18,
            Winner: 'Carolina Crown'
        },
        {
            Circuit: 'DCI',
            Date: '2024-07-20',
            Event: 'DCI Summer Music Games',
            Location: 'Stanford, CA',
            CorpsCount: 22,
            Winner: 'Santa Clara Vanguard'
        }
    ];
    
    filteredData = [...eventsData];
    populateYearFilter();
    displayEvents();
    updatePagination();
}

function populateYearFilter() {
    const yearFilter = document.getElementById('year-filter');
    const years = [...new Set(eventsData.map(event => {
        // Parse date string directly to avoid timezone offset issues
        const parts = event.Date.split('-');
        return parseInt(parts[0]);
    }))].sort((a, b) => b - a);
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

function setupEventListeners() {
    const yearFilter = document.getElementById('year-filter');
    const eventSearch = document.getElementById('event-search');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    yearFilter.addEventListener('change', applyFilters);
    eventSearch.addEventListener('input', applyFilters);
    
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayEvents();
            updatePagination();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayEvents();
            updatePagination();
        }
    });
    
    // Calendar navigation
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const monthFilterDropdown = document.getElementById('month-filter');
    const gotoBtn = document.getElementById('goto-btn');
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => navigateMonth(1));
    if (monthFilterDropdown) monthFilterDropdown.addEventListener('change', handleMonthFilterChange);
    if (gotoBtn) gotoBtn.addEventListener('click', showGotoModal);
}

function setupViewToggle() {
    const tableBtn = document.getElementById('table-view-btn');
    const calendarBtn = document.getElementById('calendar-view-btn');
    
    if (tableBtn) tableBtn.addEventListener('click', () => switchView('table'));
    if (calendarBtn) calendarBtn.addEventListener('click', () => switchView('calendar'));
}

function switchView(view) {
    currentView = view;
    
    const tableViewBtn = document.getElementById('table-view-btn');
    const calendarViewBtn = document.getElementById('calendar-view-btn');
    const tableContainer = document.getElementById('table-view');
    const calendarContainer = document.getElementById('calendar-view');
    const yearFilter = document.getElementById('year-filter');
    const monthFilter = document.getElementById('month-filter');
    const eventSearch = document.getElementById('event-search');
    const pagination = document.querySelector('.scores-pagination');
    
    if (view === 'table') {
        if (tableViewBtn) tableViewBtn.classList.add('active');
        if (calendarViewBtn) calendarViewBtn.classList.remove('active');
        if (tableContainer) tableContainer.style.display = 'block';
        if (calendarContainer) calendarContainer.style.display = 'none';
        
        // Show all filters and pagination for table view
        if (yearFilter) yearFilter.style.display = 'inline-block';
        if (monthFilter) monthFilter.style.display = 'none';
        if (eventSearch) eventSearch.style.display = 'inline-block';
        if (pagination) pagination.style.display = 'flex';
        
        displayEvents();
    } else {
        if (tableViewBtn) tableViewBtn.classList.remove('active');
        if (calendarViewBtn) calendarViewBtn.classList.add('active');
        if (tableContainer) tableContainer.style.display = 'none';
        if (calendarContainer) calendarContainer.style.display = 'block';
        
        // Hide all filters and pagination for calendar view
        if (yearFilter) yearFilter.style.display = 'none';
        if (monthFilter) monthFilter.style.display = 'none';
        if (eventSearch) eventSearch.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
        
        displayCalendar();
    }
}

function navigateMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    displayCalendar();
}

function displayCalendar() {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const currentMonth = document.getElementById('calendar-title');
    if (currentMonth) {
        currentMonth.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    }
    
    // Add day headers - ALWAYS start with Sunday
    const weekdaysContainer = document.getElementById('calendar-weekdays');
    if (weekdaysContainer) {
        weekdaysContainer.innerHTML = '';
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            weekdaysContainer.appendChild(dayHeader);
        });
    }
    
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
    let startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Make sure Sunday is always column 0 (first column)
    // JavaScript getDay() already returns 0 for Sunday, 1 for Monday, etc.
    // So this should work correctly as-is
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'events-container';
        
        // Find events for this day
        const dayDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
        const dayEvents = getEventsForDate(dayDate);
        
        // Show max 2 events, with "view more" if there are more
        const maxVisible = 2;
        const visibleEvents = dayEvents.slice(0, maxVisible);
        
        visibleEvents.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';
            eventElement.textContent = event.Location || 'Unknown Location';
            eventElement.title = `${event.Event || 'Unknown Show'} - ${event.Location || 'Unknown Location'}`;
            eventsContainer.appendChild(eventElement);
        });
        
        // Add "view more" link if there are more than 2 events
        if (dayEvents.length > maxVisible) {
            const viewMoreElement = document.createElement('div');
            viewMoreElement.className = 'event-item view-more';
            viewMoreElement.textContent = `+${dayEvents.length - maxVisible} more`;
            viewMoreElement.style.cursor = 'pointer';
            viewMoreElement.style.fontStyle = 'italic';
            viewMoreElement.style.color = '#EA6020';
            viewMoreElement.addEventListener('click', () => showEventModal(dayDate, dayEvents));
            eventsContainer.appendChild(viewMoreElement);
        }
        
        dayElement.appendChild(eventsContainer);
        calendarGrid.appendChild(dayElement);
    }
}

function getEventsForDate(targetDate) {
    return filteredData.filter(event => {
        if (!event.Date) return false;
        
        // Parse date string directly to avoid timezone offset issues
        // event.Date format is YYYY-MM-DD
        const parts = event.Date.split('-');
        const eventYear = parseInt(parts[0]);
        const eventMonth = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
        const eventDay = parseInt(parts[2]);
        
        return eventYear === targetDate.getFullYear() &&
               eventMonth === targetDate.getMonth() &&
               eventDay === targetDate.getDate();
    });
}

function handleMonthFilterChange() {
    const monthFilter = document.getElementById('month-filter');
    const selectedValue = monthFilter.value;
    
    if (selectedValue && selectedValue !== '') {
        // Month filter uses 1-12, but Date constructor uses 0-11
        const monthIndex = parseInt(selectedValue) - 1;
        const currentYear = currentCalendarDate.getFullYear();
        currentCalendarDate = new Date(currentYear, monthIndex, 1);
        
        if (currentView === 'calendar') {
            displayCalendar();
        }
    }
}

function showEventModal(date, events) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalEventList = document.getElementById('modalEventList');
    
    // Format the date for the title
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    modalTitle.textContent = `Events on ${dateStr}`;
    
    // Clear previous content
    modalEventList.innerHTML = '';
    
    // Add all events
    events.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'modal-event-item';
        eventDiv.style.cursor = 'pointer';
        
        eventDiv.innerHTML = `
            <div class="modal-event-title">${event.Event || 'Unknown Event'}</div>
            <div class="modal-event-location">${event.Location || 'Unknown Location'}</div>
            <div class="modal-event-details">
                Circuit: ${event.Circuit || 'Unknown'} | 
                Corps Count: ${event.CorpsCount || 'Unknown'} | 
                Year: ${event.Year || 'Unknown'}
            </div>
        `;
        
        // Add click handler to navigate to event details with Event_Name
        eventDiv.addEventListener('click', () => {
            const eventParams = new URLSearchParams({
                date: event.Date,
                city: event.City,
                state: event.State,
                year: event.Year
            });
            
            // Add Event_Name to URL params if it's available
            if (event.Event_Name && event.Event_Name.trim() !== '') {
                eventParams.set('eventName', event.Event_Name);
            }
            
            window.location.href = `event-details.html?${eventParams.toString()}`;
        });
        
        modalEventList.appendChild(eventDiv);
    });
    
    // Show the modal
    modal.style.display = 'block';
}

function setupModalEventListeners() {
    const modal = document.getElementById('eventModal');
    const closeBtn = document.getElementById('closeModal');
    
    // Close modal when clicking the X
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close modal when pressing Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
    
    // Go To Modal listeners
    setupGotoModalListeners();
}

function setupGotoModalListeners() {
    const gotoModal = document.getElementById('gotoModal');
    const closeGotoBtn = document.getElementById('closeGotoModal');
    const gotoCancelBtn = document.getElementById('gotoCancel');
    const gotoConfirmBtn = document.getElementById('gotoConfirm');
    
    // Close goto modal
    if (closeGotoBtn) {
        closeGotoBtn.addEventListener('click', () => {
            gotoModal.style.display = 'none';
        });
    }
    
    if (gotoCancelBtn) {
        gotoCancelBtn.addEventListener('click', () => {
            gotoModal.style.display = 'none';
        });
    }
    
    // Confirm goto
    if (gotoConfirmBtn) {
        gotoConfirmBtn.addEventListener('click', handleGotoConfirm);
    }
    
    // Close goto modal when clicking outside
    gotoModal.addEventListener('click', (event) => {
        if (event.target === gotoModal) {
            gotoModal.style.display = 'none';
        }
    });
    
    // Close goto modal with Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && gotoModal.style.display === 'block') {
            gotoModal.style.display = 'none';
        }
    });
}

function showGotoModal() {
    const gotoModal = document.getElementById('gotoModal');
    const gotoMonth = document.getElementById('gotoMonth');
    const gotoYear = document.getElementById('gotoYear');
    
    // Set current month and year as default
    gotoMonth.value = currentCalendarDate.getMonth();
    
    // Populate year dropdown
    populateYearDropdown();
    gotoYear.value = currentCalendarDate.getFullYear();
    
    gotoModal.style.display = 'block';
}

function populateYearDropdown() {
    const gotoYear = document.getElementById('gotoYear');
    const currentYear = new Date().getFullYear();
    
    // Clear existing options
    gotoYear.innerHTML = '';
    
    // Add years from 1970 to current year + 5
    for (let year = 1970; year <= currentYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        gotoYear.appendChild(option);
    }
}

function handleGotoConfirm() {
    const gotoMonth = document.getElementById('gotoMonth');
    const gotoYear = document.getElementById('gotoYear');
    const gotoModal = document.getElementById('gotoModal');
    
    const selectedMonth = parseInt(gotoMonth.value);
    const selectedYear = parseInt(gotoYear.value);
    
    // Update calendar date
    currentCalendarDate = new Date(selectedYear, selectedMonth, 1);
    
    // Update calendar display
    if (currentView === 'calendar') {
        displayCalendar();
    }
    
    // Close modal
    gotoModal.style.display = 'none';
}

function applyFilters() {
    const yearFilter = document.getElementById('year-filter').value;
    const eventSearch = document.getElementById('event-search').value.toLowerCase();
    
    filteredData = eventsData.filter(event => {
        // Parse date string directly to avoid timezone offset issues
        const parts = event.Date.split('-');
        const year = parts[0];
        const eventName = event.Event.toLowerCase();
        const location = event.Location.toLowerCase();
        
        return (!yearFilter || year === yearFilter) &&
               (!eventSearch || eventName.includes(eventSearch) || location.includes(eventSearch));
    });
    
    currentPage = 1;
    
    if (currentView === 'table') {
        displayEvents();
        updatePagination();
    } else {
        displayCalendar();
    }
}

function displayEvents() {
    const tbody = document.getElementById('scores-tbody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No events found matching your criteria.</td></tr>';
        return;
    }
    
    tbody.innerHTML = pageData.map(event => {
        const eventParams = new URLSearchParams({
            date: event.Date,
            city: event.City,
            state: event.State,
            year: event.Year
        });
        
        // Add Event_Name if available to distinguish between multiple events on same day
        if (event.Event_Name && event.Event_Name.trim() !== '') {
            eventParams.set('eventName', event.Event_Name);
        }
        
        return `
            <tr>
                <td>${event.Circuit || 'DCI'}</td>
                <td>${formatDate(event.Date)}</td>
                <td class="score-cell">${event.CorpsCount}</td>
                <td><strong>${event.Location}</strong></td>
                <td>${event.Event}</td>
                <td class="placement-1"><strong>${event.Year || 'Unknown'}</strong></td>
                <td><a href="event-details.html?${eventParams.toString()}" class="details-btn">View</a></td>
            </tr>
        `;
    }).join('');
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function formatDate(dateString) {
    // Parse date string directly to avoid timezone offset issues
    // dateString format is YYYY-MM-DD
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(parts[2]);
    
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
