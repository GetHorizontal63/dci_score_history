// Head to Head Analysis JavaScript - Clean Implementation

// Configuration
const CONFIG = {
    // Maximum days from end of season to include data (0 = up to current date for active season)
    MAX_DAYS_FROM_SEASON_END: 0,
    // Whether to filter out entries without valid scores
    REQUIRE_VALID_SCORES: true
};

let corpsLogoMap = {};
let availableCorps = [];
let corpsAliasMap = {};

// Function to normalize corps names using alias mapping
function normalizeCorpsName(corpsName) {
    return corpsAliasMap[corpsName] || corpsName;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function initializePage() {
    try {
        console.log('Initializing Head to Head page...');
        await loadCorpsLogos();
        populateCorpsDropdowns();
        await populateYearFilter();
        
        // Set default comparison: Blue Devils vs Phantom Regiment in 2007
        setDefaultComparison();
        
        // Initialize history section event handlers
        setupHistoryEventHandlers();
        
        console.log('Page initialized successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

function setDefaultComparison() {
    // Set the dropdowns to Blue Devils and Phantom Regiment
    const corps1Select = document.getElementById('corps1Select');
    const corps2Select = document.getElementById('corps2Select');
    const yearFilter = document.getElementById('yearFilter');
    
    // Set corps selections
    corps1Select.value = 'Blue Devils';
    corps2Select.value = 'Phantom Regiment';
    yearFilter.value = '2008';
    
    // Automatically perform the comparison
    setTimeout(() => {
        performComparison();
    }, 500); // Small delay to ensure everything is loaded
}

async function loadCorpsLogos() {
    try {
        const response = await fetch('../assets/corps_logos/logo_dictionary.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        // Parse header to find column indices
        const headers = lines[0].split(',').map(h => h.trim());
        console.log('Headers found:', headers); // Debug log
        
        const corpsNameIndex = headers.indexOf('corps') !== -1 ? headers.indexOf('corps') : 0;
        const logoFileIndex = headers.indexOf('logo') !== -1 ? headers.indexOf('logo') : 1;
        const liveIndex = headers.indexOf('live') !== -1 ? headers.indexOf('live') : -1;
        const aliasIndex = headers.indexOf('current_alias');
        
        console.log('Column indices:', { corpsNameIndex, logoFileIndex, liveIndex, aliasIndex }); // Debug log
        console.log('Total lines in CSV:', lines.length); // Debug log
        
        // Process ALL lines, not just a subset
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            // Split on comma but handle potential issues
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
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
            
            const corpsName = values[corpsNameIndex] || '';
            const logoFile = values[logoFileIndex] || '';
            const liveValue = values[liveIndex] || '';
            const aliasValue = aliasIndex !== -1 ? (values[aliasIndex] || '').trim() : '';
            const isLive = liveIndex !== -1 ? liveValue.toLowerCase() === 'true' : true;
            
            // Debug log for Star of Indiana specifically
            if (corpsName && corpsName.toLowerCase().includes('star of indiana')) {
                console.log('Found Star of Indiana:', { corpsName, logoFile, liveValue, isLive, line: i, values });
            }
            
            if (corpsName && isLive) {
                // If this corps has an alias, map it but don't add to dropdown
                if (aliasValue) {
                    corpsAliasMap[corpsName] = aliasValue;
                    // Also add to logo map for the original name
                    if (logoFile) {
                        corpsLogoMap[corpsName] = logoFile;
                    }
                } else {
                    // Only add corps that are marked as live AND don't have an alias
                    availableCorps.push(corpsName);
                    
                    // Only add to logo map if logo file exists
                    if (logoFile) {
                        corpsLogoMap[corpsName] = logoFile;
                    }
                }
            }
        }
        
        // Sort alphabetically (case-insensitive)
        availableCorps.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        console.log('Live corps loaded:', availableCorps.length);
        console.log('All available corps:', availableCorps); // Debug log to see full list
        console.log('Corps alias mappings:', corpsAliasMap); // Debug log to see alias mappings
        console.log('Sample logo mappings:', Object.entries(corpsLogoMap).slice(0, 5));
        console.log('Corps alias mappings:', corpsAliasMap); // Debug log to see alias mappings
        
        // Check if Star of Indiana is in the list
        const starOfIndiana = availableCorps.find(corps => corps.toLowerCase().includes('star of indiana'));
        if (starOfIndiana) {
            console.log('Star of Indiana found in available corps:', starOfIndiana);
        } else {
            console.log('Star of Indiana NOT found in available corps');
        }
        
    } catch (error) {
        console.error('Error loading corps logos:', error);
    }
}

function populateCorpsDropdowns() {
    const corps1Select = document.getElementById('corps1Select');
    const corps2Select = document.getElementById('corps2Select');
    
    corps1Select.innerHTML = '<option value="">Select First Corps</option>';
    corps2Select.innerHTML = '<option value="">Select Second Corps</option>';
    
    // Sort the available corps alphabetically before populating
    const sortedCorps = [...availableCorps].sort((a, b) => a.localeCompare(b));
    
    sortedCorps.forEach(corps => {
        const option1 = document.createElement('option');
        option1.value = corps;
        option1.textContent = corps;
        corps1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = corps;
        option2.textContent = corps;
        corps2Select.appendChild(option2);
    });
}

async function populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    
    const years = await getAvailableYears();
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

async function getAvailableYears() {
    const years = [];
    const currentYear = new Date().getFullYear();
    
    for (let year = 1964; year <= currentYear; year++) {
        try {
            const response = await fetch(`../data/years/${year}_dci_data.csv`, { method: 'HEAD' });
            if (response.ok) {
                years.push(year);
            }
        } catch (error) {
            // File doesn't exist, skip
        }
    }
    
    return years.sort((a, b) => b - a);
}

async function performComparison() {
    const corps1 = document.getElementById('corps1Select').value;
    const corps2 = document.getElementById('corps2Select').value;
    const yearFilter = document.getElementById('yearFilter').value;
    
    if (!corps1 || !corps2) {
        alert('Please select both corps to compare');
        return;
    }
    
    if (corps1 === corps2) {
        alert('Please select two different corps');
        return;
    }
    
    console.log(`Comparing ${corps1} vs ${corps2}`);
    
    // Show loading
    showLoading();
    
    try {
        // Load data for both corps
        const corps1Data = await loadCorpsData(corps1, yearFilter);
        const corps2Data = await loadCorpsData(corps2, yearFilter);
        
        // Check for "Did Not Compete" scenarios
        const corps1DidNotCompete = corps1Data.length === 0;
        const corps2DidNotCompete = corps2Data.length === 0;
        
        // Find head-to-head matchups
        const matchups = findHeadToHeadMatchups(corps1Data, corps2Data, corps1, corps2);
        
        // Check for "Did Not Meet" scenario (both have data but no common shows)
        const didNotMeet = !corps1DidNotCompete && !corps2DidNotCompete && matchups.length === 0;
        
        // Display results with status flags
        displayResults(corps1, corps2, matchups, corps1Data, corps2Data, {
            corps1DidNotCompete,
            corps2DidNotCompete,
            didNotMeet
        });
        
    } catch (error) {
        console.error('Error performing comparison:', error);
        hideLoading();
    }
}

function showLoading() {
    const resultsDiv = document.getElementById('comparisonResults');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #EA6020;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px;"></i>
            <h3>Loading Comparison Data...</h3>
        </div>
    `;
}

function hideLoading() {
    const resultsDiv = document.getElementById('comparisonResults');
    resultsDiv.style.display = 'none';
}

async function loadCorpsData(corpsName, yearFilter) {
    const corpsData = [];
    const years = yearFilter === 'all' ? await getAvailableYears() : [parseInt(yearFilter)];
    
    console.log(`Loading data for ${corpsName}, years:`, years);
    
    for (const year of years) {
        try {
            const response = await fetch(`../data/years/${year}_dci_data.csv`);
            if (response.ok) {
                const csvText = await response.text();
                const yearData = parseCSVData(csvText, year);
                // Filter for the specific corps, including any aliased corps
                const corpsYearData = yearData.filter(row => {
                    const normalizedCorpsName = normalizeCorpsName(row.corpsName);
                    return normalizedCorpsName === corpsName || row.corpsName === corpsName;
                });
                
                // Apply date filtering with configurable maxDaysFromEnd
                const filteredData = await filterDataByDateRange(corpsYearData, year, CONFIG.MAX_DAYS_FROM_SEASON_END);
                
                console.log(`Year ${year}: Found ${filteredData.length} records for ${corpsName} out of ${yearData.length} total (after date filtering)`);
                corpsData.push(...filteredData);
            }
        } catch (error) {
            console.error(`Error loading data for ${year}:`, error);
        }
    }
    
    console.log(`Total records loaded for ${corpsName}:`, corpsData.length);
    return corpsData;
}

function parseCSVData(csvText, year) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        
        // Normalize column names for easier access
        row.corpsName = row.Corps || row.corpsName || '';
        row.date = row.Date || row.date || '';
        row.event = row.City || row.event || '';
        row.score = row.Score || row.score || '';
        
        // Parse score as number
        if (row.score && !isNaN(parseFloat(row.score))) {
            row.scoreValue = parseFloat(row.score);
        }
        
        row.year = year;
        data.push(row);
    }
    
    return data;
}

// Function to get the effective end date for filtering by finding max date in data
async function getSeasonEndDate(year) {
    try {
        const response = await fetch(`../data/years/${year}_dci_data.csv`);
        if (!response.ok) return null;
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const dateIndex = headers.findIndex(h => h.toLowerCase() === 'date');
        
        if (dateIndex === -1) return null;
        
        let maxDate = null;
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const dateStr = values[dateIndex]?.trim();
            
            if (dateStr) {
                try {
                    const [month, day] = dateStr.split('/').map(num => parseInt(num));
                    const rowDate = new Date(year, month - 1, day);
                    
                    if (!maxDate || rowDate > maxDate) {
                        maxDate = rowDate;
                    }
                } catch (error) {
                    // Skip invalid dates
                }
            }
        }
        
        return maxDate;
    } catch (error) {
        console.error('Error finding season end date:', error);
        return null;
    }
}

// Function to filter corps data by date range
async function filterDataByDateRange(data, year, maxDaysFromEnd = 0) {
    const seasonEndDate = await getSeasonEndDate(year);
    
    // If no season end date (past years), return all data
    if (!seasonEndDate) {
        return data;
    }
    
    // Calculate the cutoff date (maxDaysFromEnd before season end)
    const cutoffDate = new Date(seasonEndDate);
    cutoffDate.setDate(cutoffDate.getDate() - maxDaysFromEnd);
    
    return data.filter(row => {
        // Skip entries without valid scores if configured to do so
        if (CONFIG.REQUIRE_VALID_SCORES && (!row.scoreValue || row.scoreValue <= 0)) {
            return false;
        }
        
        // Parse the date from the row
        const dateStr = row.Date || row.date;
        if (!dateStr) return false;
        
        try {
            // Parse MM/DD format and add the year
            const [month, day] = dateStr.split('/').map(num => parseInt(num));
            const rowDate = new Date(year, month - 1, day); // month is 0-indexed
            
            // Only include dates up to the cutoff
            return rowDate <= cutoffDate;
        } catch (error) {
            console.warn('Error parsing date:', dateStr, error);
            return false;
        }
    });
}

function findHeadToHeadMatchups(corps1Data, corps2Data, corps1Name, corps2Name) {
    const matchups = [];
    
    // Filter out entries without valid scores if configured to do so
    const validCorps1Data = CONFIG.REQUIRE_VALID_SCORES ? 
        corps1Data.filter(row => row.scoreValue && row.scoreValue > 0) : corps1Data;
    const validCorps2Data = CONFIG.REQUIRE_VALID_SCORES ? 
        corps2Data.filter(row => row.scoreValue && row.scoreValue > 0) : corps2Data;
    
    validCorps1Data.forEach(c1Row => {
        validCorps2Data.forEach(c2Row => {
            // Check if they competed on the same date in the same city and same year
            const c1Date = c1Row.Date || c1Row.date;
            const c2Date = c2Row.Date || c2Row.date;
            const c1City = c1Row.City || c1Row.city;
            const c2City = c2Row.City || c2Row.city;
            
            if (c1Date === c2Date && c1City === c2City && c1Row.year === c2Row.year) {
                const matchup = {
                    date: c1Date,
                    event: `${c1City || ''}, ${c1Row.State || c1Row.state || ''}`.trim().replace(/,$/, ''),
                    year: c1Row.year,
                    corps1Score: c1Row.scoreValue || 0,
                    corps2Score: c2Row.scoreValue || 0,
                    corps1Name: corps1Name,
                    corps2Name: corps2Name
                };
                
                // Determine winner and difference
                if (matchup.corps1Score > matchup.corps2Score) {
                    matchup.winner = corps1Name;
                    matchup.difference = matchup.corps1Score - matchup.corps2Score;
                } else if (matchup.corps2Score > matchup.corps1Score) {
                    matchup.winner = corps2Name;
                    matchup.difference = matchup.corps2Score - matchup.corps1Score;
                } else {
                    matchup.winner = 'Tie';
                    matchup.difference = 0;
                }
                
                matchups.push(matchup);
            }
        });
    });
    
    // Sort by year and date (most recent first)
    return matchups.sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year; // Sort by year descending
        }
        // If same year, sort by date
        return new Date(b.date + '/' + b.year) - new Date(a.date + '/' + a.year);
    });
}

function displayResults(corps1, corps2, matchups, corps1Data, corps2Data, status = {}) {
    const resultsDiv = document.getElementById('comparisonResults');
    
    // Extract status flags
    const { corps1DidNotCompete, corps2DidNotCompete, didNotMeet } = status;
    
    // Calculate statistics
    const corps1Wins = matchups.filter(m => m.winner === corps1).length;
    const corps2Wins = matchups.filter(m => m.winner === corps2).length;
    const ties = matchups.filter(m => m.winner === 'Tie').length;
    
    const corps1Scores = corps1Data.filter(d => d.scoreValue).map(d => d.scoreValue);
    const corps2Scores = corps2Data.filter(d => d.scoreValue).map(d => d.scoreValue);
    
    // Calculate average victory margins - handle "Did Not Compete" cases
    const corps1Victories = matchups.filter(m => m.winner === corps1);
    const corps2Victories = matchups.filter(m => m.winner === corps2);
    
    const corps1AvgMargin = corps1DidNotCompete ? 'Did Not Compete' : 
                           (corps1Victories.length > 0 ? (corps1Victories.reduce((sum, m) => sum + m.difference, 0) / corps1Victories.length).toFixed(2) : '0.00');
    const corps2AvgMargin = corps2DidNotCompete ? 'Did Not Compete' : 
                           (corps2Victories.length > 0 ? (corps2Victories.reduce((sum, m) => sum + m.difference, 0) / corps2Victories.length).toFixed(2) : '0.00');
    
    const corps1HighScore = corps1DidNotCompete ? 'Did Not Compete' : 
                           (corps1Scores.length > 0 ? Math.max(...corps1Scores).toFixed(2) : '0.00');
    const corps2HighScore = corps2DidNotCompete ? 'Did Not Compete' : 
                           (corps2Scores.length > 0 ? Math.max(...corps2Scores).toFixed(2) : '0.00');
    
    // Find first victory for each corps
    const corps1FirstVictory = corps1DidNotCompete ? null : (corps1Victories.length > 0 ? corps1Victories[corps1Victories.length - 1] : null);
    const corps2FirstVictory = corps2DidNotCompete ? null : (corps2Victories.length > 0 ? corps2Victories[corps2Victories.length - 1] : null);
    
    // Determine first victory display text
    const corps1FirstVictoryText = corps1DidNotCompete ? 'Did Not Compete' : 
                                   (corps1FirstVictory ? `${corps1FirstVictory.date}/${corps1FirstVictory.year}` : 'Never');
    const corps2FirstVictoryText = corps2DidNotCompete ? 'Did Not Compete' : 
                                   (corps2FirstVictory ? `${corps2FirstVictory.date}/${corps2FirstVictory.year}` : 'Never');
    
    // Find last victory for each corps - handle "Did Not Compete" cases
    const corps1LastVictory = corps1DidNotCompete ? null : (corps1Victories.length > 0 ? corps1Victories[0] : null);
    const corps2LastVictory = corps2DidNotCompete ? null : (corps2Victories.length > 0 ? corps2Victories[0] : null);
    
    // Determine last victory display text
    const corps1LastVictoryText = corps1DidNotCompete ? 'Did Not Compete' : 
                                  (corps1LastVictory ? `${corps1LastVictory.date}/${corps1LastVictory.year} - ${corps1LastVictory.event}` : 'Never');
    const corps2LastVictoryText = corps2DidNotCompete ? 'Did Not Compete' : 
                                  (corps2LastVictory ? `${corps2LastVictory.date}/${corps2LastVictory.year} - ${corps2LastVictory.event}` : 'Never');
    
    // Determine center display text
    let centerDisplayText = '';
    if (corps1DidNotCompete || corps2DidNotCompete) {
        centerDisplayText = 'Insufficient Data';
    } else if (didNotMeet) {
        centerDisplayText = 'Did Not Meet';
    } else {
        centerDisplayText = `${matchups.length} meetings<br>${corps1Wins} - ${corps2Wins}${ties > 0 ? ` - ${ties}` : ''}`;
    }
    
    // Get logo filenames or use default
    const corps1Logo = corpsLogoMap[corps1] ? `${corpsLogoMap[corps1]}.png` : 'DCI-logo.svg';
    const corps2Logo = corpsLogoMap[corps2] ? `${corpsLogoMap[corps2]}.png` : 'DCI-logo.svg';
    
    // Create the results HTML
    resultsDiv.innerHTML = `
        <div class="h2h-main-card">
            <div class="corps-matchup" style="position: relative;">
                <!-- Background logos -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1;">
                    <div style="position: absolute; left: 20%; top: 50%; transform: translate(-50%, -50%); width: 300px; height: 300px; background-image: url('../assets/corps_logos/${corps1Logo}'); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.2;"></div>
                    <div style="position: absolute; right: 20%; top: 50%; transform: translate(50%, -50%); width: 300px; height: 300px; background-image: url('../assets/corps_logos/${corps2Logo}'); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.2;"></div>
                </div>
                
                <!-- View History Button -->
                <button onclick="showMatchupHistory('${corps1}', '${corps2}')" style="position: absolute; bottom: 15px; right: 15px; z-index: 3; background: rgba(234, 96, 32, 0.9); color: white; border: none; padding: 10px 15px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(234, 96, 32, 1)'" onmouseout="this.style.background='rgba(234, 96, 32, 0.9)'">
                    View History
                </button>
                
                <div class="corps-side corps-left" style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; padding: 40px 20px; min-height: 200px; background: linear-gradient(135deg, rgba(234, 96, 32, 0.1), rgba(26, 26, 26, 0.9)); border-radius: 12px 0 0 12px;">
                    <div class="corps-info" style="text-align: center; color: #ffffff;">
                        <div class="corps-name" style="font-size: 28px; font-weight: bold; margin-bottom: 8px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);">${corps1}</div>
                        <div class="corps-record" style="font-size: 16px; color: #EA6020; font-weight: 600;">${corps1Data.length} performances</div>
                    </div>
                </div>
                
                <div class="matchup-center" style="position: relative; z-index: 2;">
                    <div class="h2h-title">HEAD-TO-HEAD</div>
                    <div class="matchup-stats">
                        <div class="games-played">${matchups.length} meetings</div>
                        <div class="win-loss-record">${corps1Wins} - ${corps2Wins}${ties > 0 ? ` - ${ties}` : ''}</div>
                    </div>
                </div>
                
                <div class="corps-side corps-right" style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; padding: 40px 20px; min-height: 200px; background: linear-gradient(135deg, rgba(244, 155, 106, 0.1), rgba(26, 26, 26, 0.9)); border-radius: 0 12px 12px 0;">
                    <div class="corps-info" style="text-align: center; color: #ffffff;">
                        <div class="corps-name" style="font-size: 28px; font-weight: bold; margin-bottom: 8px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);">${corps2}</div>
                        <div class="corps-record" style="font-size: 16px; color: #F49B6A; font-weight: 600;">${corps2Data.length} performances</div>
                    </div>
                </div>
            </div>
            
            <div class="comparative-stats">
                <div class="stat-row">
                    <div class="stat-value left">${corps1AvgMargin}</div>
                    <div class="stat-label">AVG VICTORY MARGIN</div>
                    <div class="stat-value right">${corps2AvgMargin}</div>
                </div>
                <div class="stat-row">
                    <div class="stat-value left">${corps1HighScore}</div>
                    <div class="stat-label">HIGH SCORE</div>
                    <div class="stat-value right">${corps2HighScore}</div>
                </div>
                <div class="stat-row">
                    <div class="stat-value left">${corps1LastVictory ? `${corps1LastVictory.date}/${corps1LastVictory.year} - ${corps1LastVictory.event}` : 'Never'}</div>
                    <div class="stat-label">LAST VICTORY</div>
                    <div class="stat-value right">${corps2LastVictory ? `${corps2LastVictory.date}/${corps2LastVictory.year} - ${corps2LastVictory.event}` : 'Never'}</div>
                </div>
            </div>
        </div>
        
        <div id="historySection" style="display: none;">
            <!-- History will be inserted here when button is clicked -->
        </div>
    `;
    
    // Store matchups data for history view
    window.currentMatchups = matchups;
    
    // Update static DOM elements if they exist
    const corps1FirstVictoryElement = document.getElementById('corps1FirstVictory');
    const corps2FirstVictoryElement = document.getElementById('corps2FirstVictory');
    const corps1HighScoreElement = document.getElementById('corps1HighScore');
    const corps2HighScoreElement = document.getElementById('corps2HighScore');
    
    if (corps1FirstVictoryElement && corps2FirstVictoryElement) {
        corps1FirstVictoryElement.textContent = corps1FirstVictoryText;
        corps2FirstVictoryElement.textContent = corps2FirstVictoryText;
    }
    
    if (corps1HighScoreElement && corps2HighScoreElement) {
        corps1HighScoreElement.textContent = corps1HighScore;
        corps2HighScoreElement.textContent = corps2HighScore;
    }
    
    // Results are displayed - no auto-scroll to maintain user position
}

function showMatchupHistory(corps1, corps2) {
    const matchups = window.currentMatchups || [];
    
    if (matchups.length === 0) {
        alert('No head-to-head matchups found between these corps.');
        return;
    }

    // Hide the main overview section
    document.querySelector('.scores-main').style.display = 'none';
    
    // Show the history section
    const historyMain = document.querySelector('.history-main');
    historyMain.style.display = 'block';
    
    // Update title and subtitle
    document.getElementById('historyTitle').textContent = `Matchup History`;
    document.getElementById('historySubtitle').textContent = `${corps1} vs ${corps2} • ${matchups.length} meetings`;
    
    // Set headers
    document.getElementById('historyCorps1Header').textContent = corps1;
    document.getElementById('historyCorps2Header').textContent = corps2;
    
    // Store the matchups globally for filtering
    window.allHistoryMatchups = matchups;
    window.currentHistoryCorps = { corps1, corps2 };
    
    // Populate filters
    populateHistoryFilters(matchups);
    
    // Display the matchups
    displayHistoryMatchups(matchups);
    
    // History displayed - no auto-scroll to maintain user position
}

function populateHistoryFilters(matchups) {
    // Populate year filter
    const yearFilter = document.getElementById('historyYearFilter');
    const years = [...new Set(matchups.map(m => m.year))].sort((a, b) => b - a);
    
    yearFilter.innerHTML = '<option value="">All Years</option>';
    years.forEach(year => {
        yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
    });
    
    // Populate winner filter
    const winnerFilter = document.getElementById('historyWinnerFilter');
    const { corps1, corps2 } = window.currentHistoryCorps;
    winnerFilter.innerHTML = `
        <option value="">All Winners</option>
        <option value="${corps1}">${corps1}</option>
        <option value="${corps2}">${corps2}</option>
        <option value="Tie">Tie</option>
    `;
    
    // Add event listeners for filters
    yearFilter.addEventListener('change', filterHistoryMatchups);
    winnerFilter.addEventListener('change', filterHistoryMatchups);
    document.getElementById('historyMarginFilter').addEventListener('input', filterHistoryMatchups);
}

function filterHistoryMatchups() {
    const yearFilter = document.getElementById('historyYearFilter').value;
    const winnerFilter = document.getElementById('historyWinnerFilter').value;
    const marginFilter = parseFloat(document.getElementById('historyMarginFilter').value) || 0;
    
    let filteredMatchups = window.allHistoryMatchups || [];
    
    // Apply filters
    if (yearFilter) {
        filteredMatchups = filteredMatchups.filter(m => m.year.toString() === yearFilter);
    }
    
    if (winnerFilter) {
        filteredMatchups = filteredMatchups.filter(m => m.winner === winnerFilter);
    }
    
    if (marginFilter > 0) {
        filteredMatchups = filteredMatchups.filter(m => m.difference >= marginFilter);
    }
    
    // Update the display
    displayHistoryMatchups(filteredMatchups);
}

let currentHistoryPage = 1;
const historyItemsPerPage = 20;

function displayHistoryMatchups(matchups) {
    const tableBody = document.getElementById('historyDetailTableBody');
    const { corps1, corps2 } = window.currentHistoryCorps;
    
    // Calculate pagination
    const totalPages = Math.ceil(matchups.length / historyItemsPerPage);
    const startIndex = (currentHistoryPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    const paginatedMatchups = matchups.slice(startIndex, endIndex);
    
    // Generate table rows
    tableBody.innerHTML = paginatedMatchups.map(matchup => `
        <tr class="${matchup.winner !== 'Tie' ? 'winner-row' : ''}">
            <td>${matchup.date}/${matchup.year}</td>
            <td>${matchup.event}</td>
            <td class="${matchup.winner === corps1 ? 'winner-cell' : ''}">${matchup.corps1Score.toFixed(2)}</td>
            <td class="${matchup.winner === corps2 ? 'winner-cell' : ''}">${matchup.corps2Score.toFixed(2)}</td>
            <td>${matchup.difference.toFixed(2)}</td>
            <td class="winner-cell">${matchup.winner}</td>
        </tr>
    `).join('');
    
    // Update pagination info
    document.getElementById('historyPageInfo').textContent = `Page ${currentHistoryPage} of ${totalPages || 1} (${matchups.length} results)`;
    
    // Update pagination buttons
    document.getElementById('historyPrevPage').disabled = currentHistoryPage <= 1;
    document.getElementById('historyNextPage').disabled = currentHistoryPage >= totalPages;
    
    // Store current filtered matchups for pagination
    window.currentFilteredMatchups = matchups;
}

function hideMatchupHistory() {
    // Hide the history section
    document.querySelector('.history-main').style.display = 'none';
    
    // Show the main overview section
    document.querySelector('.scores-main').style.display = 'block';
    
    // Reset pagination
    currentHistoryPage = 1;
    
    // Clear filters
    document.getElementById('historyYearFilter').value = '';
    document.getElementById('historyWinnerFilter').value = '';
    document.getElementById('historyMarginFilter').value = '';
    
    // Back to overview - no auto-scroll to maintain user position
}

// Setup event handlers for history section
function setupHistoryEventHandlers() {
    // Add event listener for back button
    document.getElementById('backToOverviewBtn').addEventListener('click', hideMatchupHistory);
    
    // Add pagination event listeners
    document.getElementById('historyPrevPage').addEventListener('click', function() {
        if (currentHistoryPage > 1) {
            currentHistoryPage--;
            displayHistoryMatchups(window.currentFilteredMatchups || []);
        }
    });
    
    document.getElementById('historyNextPage').addEventListener('click', function() {
        const totalPages = Math.ceil((window.currentFilteredMatchups || []).length / historyItemsPerPage);
        if (currentHistoryPage < totalPages) {
            currentHistoryPage++;
            displayHistoryMatchups(window.currentFilteredMatchups || []);
        }
    });
}