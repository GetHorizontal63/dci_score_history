// Event Details Page JavaScript

let eventData = [];
let eventInfo = {};

document.addEventListener('DOMContentLoaded', function() {
    // Get event parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    eventInfo = {
        date: urlParams.get('date'),
        city: urlParams.get('city'),
        state: urlParams.get('state'),
        year: urlParams.get('year')
    };
    
    // Setup back button
    setupBackButton();
    
    // Load event data
    loadEventData();
});

function setupBackButton() {
    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
        window.location.href = 'scores.html';
    });
}

async function loadEventData() {
    try {
        // Update page title
        updateEventHeader();
        
        // Load the corresponding year's data file
        const response = await fetch(`../data/years/${eventInfo.year}_dci_data.csv`);
        if (response.ok) {
            const csvText = await response.text();
            const allEventData = parseCSV(csvText);
            
            // Filter data for this specific event
            eventData = filterEventData(allEventData);
            
            if (eventData.length > 0) {
                displayEventResults();
            } else {
                displayNoResults();
            }
        } else {
            throw new Error(`Failed to load ${eventInfo.year} data`);
        }
    } catch (error) {
        displayError(error.message);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });
            data.push(row);
        }
    }
    
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function filterEventData(allData) {
    // Convert date format from YYYY-MM-DD to MM/DD
    const dateParts = eventInfo.date.split('-');
    const month = dateParts[1];
    const day = dateParts[2];
    const dateString = `${month}/${day}`;
    
    const filteredData = allData.filter(row => {
        const rowDate = (row.Date || '').trim();
        const rowCity = (row.City || '').trim();
        const rowState = (row.State || '').trim(); 
        const rowYear = (row.Year || '').trim();
        
        const eventCity = (eventInfo.city || '').trim();
        const eventState = (eventInfo.state || '').trim();
        const eventYear = (eventInfo.year || '').trim();
        
        return rowDate === dateString && 
               rowCity === eventCity && 
               rowState === eventState && 
               rowYear === eventYear;
    });
    
    return filteredData;
}

function updateEventHeader() {
    const title = document.getElementById('event-title');
    const subtitle = document.getElementById('event-subtitle');
    
    // Format date directly from string without Date object to avoid timezone issues
    const dateParts = eventInfo.date.split('-');
    const year = dateParts[0];
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const formattedDate = `${monthNames[month - 1]} ${day}, ${year}`;
    
    title.textContent = `${eventInfo.city}, ${eventInfo.state}`;
    subtitle.textContent = `${formattedDate} • ${eventInfo.year} Season`;
}

function displayEventResults() {
    const resultsContainer = document.getElementById('event-results');
    
    if (eventData.length === 0) {
        displayNoResults();
        return;
    }
    
    // Get unique classes from the event data
    const uniqueClasses = [...new Set(eventData.map(row => row.Class || 'Unknown Class'))];
    
    // Group data by class
    const classesByData = {};
    uniqueClasses.forEach(className => {
        classesByData[className] = eventData.filter(row => (row.Class || 'Unknown Class') === className);
    });
    
    // Sort each class by placement
    Object.keys(classesByData).forEach(className => {
        classesByData[className].sort((a, b) => {
            const placeA = parseInt(a.Place) || 999;
            const placeB = parseInt(b.Place) || 999;
            return placeA - placeB;
        });
    });
    
    // Create tables for each class (sorted alphabetically)
    const classNames = Object.keys(classesByData).sort();
    resultsContainer.innerHTML = classNames.map(className => {
        const classData = classesByData[className];
        return createClassTable(className, classData);
    }).join('');
}

function createClassTable(className, classData) {
    // Sort by place to ensure proper order for calculations
    const sortedData = classData.sort((a, b) => parseInt(a.Place) - parseInt(b.Place));
    
    const rows = sortedData.map((row, index) => {
        const place = parseInt(row.Place) || 0;
        const score = parseFloat(row.Score) || 0;
        
        let placementClass = '';
        if (place === 1) placementClass = 'placement-1';
        else if (place === 2) placementClass = 'placement-2';
        else if (place === 3) placementClass = 'placement-3';
        
        // Calculate Point Diff (difference from corps ranked immediately ahead)
        let pointDiff = '';
        if (place > 1 && index > 0) {
            const prevScore = parseFloat(sortedData[index - 1].Score) || 0;
            pointDiff = (prevScore - score).toFixed(2);
        }
        
        // Calculate Lead Point Diff (difference from 1st place)
        let leadPointDiff = '';
        if (place > 1 && sortedData.length > 0) {
            const firstPlaceScore = parseFloat(sortedData[0].Score) || 0;
            leadPointDiff = (firstPlaceScore - score).toFixed(2);
        }
        
        return `
            <tr>
                <td class="placement-cell ${placementClass}">${place}</td>
                <td><strong>${row.Corps}</strong></td>
                <td class="score-cell">${score.toFixed(2)}</td>
                <td class="diff-cell">${pointDiff}</td>
                <td class="diff-cell">${leadPointDiff}</td>
            </tr>
        `;
    }).join('');
    
    return `
        <div class="class-section">
            <h2 class="class-title">${className}</h2>
            <div class="scores-content">
                <div class="scores-table-container">
                    <table class="scores-table">
                        <thead>
                            <tr>
                                <th>Place</th>
                                <th>Corps</th>
                                <th>Score</th>
                                <th>Point Diff</th>
                                <th>Lead Point Diff</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function displayNoResults() {
    const resultsContainer = document.getElementById('event-results');
    resultsContainer.innerHTML = `
        <div class="no-results">
            <h2>No Results Found</h2>
            <p>No scoring data was found for this event. This may be because:</p>
            <ul>
                <li>The event data has not been entered yet</li>
                <li>The event was cancelled or postponed</li>
                <li>This was a non-competitive event</li>
            </ul>
        </div>
    `;
}

function displayError(message) {
    const resultsContainer = document.getElementById('event-results');
    resultsContainer.innerHTML = `
        <div class="error-message">
            <h2>Error Loading Event Data</h2>
            <p>${message}</p>
            <p>Please try again or contact support if the problem persists.</p>
        </div>
    `;
}
