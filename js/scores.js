// DCI Scores Page JavaScript

let eventsData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 9;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Events Page Loaded');
    
    // Initialize page
    initializeFilters();
    loadEventsData();
    setupEventListeners();
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
                Event: `${row.City}${row.State ? ', ' + row.State : ''}`, // Simple event name based on location
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
        const date = new Date(event.Date);
        return date.getFullYear();
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
}

function applyFilters() {
    const yearFilter = document.getElementById('year-filter').value;
    const eventSearch = document.getElementById('event-search').value.toLowerCase();
    
    filteredData = eventsData.filter(event => {
        const year = new Date(event.Date).getFullYear().toString();
        const eventName = event.Event.toLowerCase();
        const location = event.Location.toLowerCase();
        
        return (!yearFilter || year === yearFilter) &&
               (!eventSearch || eventName.includes(eventSearch) || location.includes(eventSearch));
    });
    
    currentPage = 1;
    displayEvents();
    updatePagination();
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
        
        return `
            <tr>
                <td>${event.Circuit || 'DCI'}</td>
                <td>${formatDate(event.Date)}</td>
                <td class="score-cell">${event.CorpsCount}</td>
                <td><strong>${event.Event}</strong></td>
                <td>${event.Location}</td>
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
