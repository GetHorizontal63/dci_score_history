// DCI Standings Page JavaScript

let allData = [];
let logoDictionary = {};
let availableYears = [];
let availableDates = {};
let availableClasses = {};
let corpsAliasMap = {};
let availableCorpsFiles = new Set();

// Function to normalize corps names using alias mapping
function normalizeCorpsName(corpsName) {
    return corpsAliasMap[corpsName] || corpsName;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Standings Page Loaded');
    
    // Initialize page
    loadLogoDictionary();
    loadAvailableCorpsFiles();
    loadAvailableYears();
    setupEventListeners();
    
    // Auto-load most recent data
    setTimeout(initializeWithCurrentData, 500);
});

async function loadLogoDictionary() {
    try {
        const response = await fetch('../assets/corps_logos/logo_dictionary.csv');
        if (response.ok) {
            const csvText = await response.text();
            parseLogoDictionary(csvText);
        }
    } catch (error) {
        console.error('Error loading logo dictionary:', error);
    }
}

function parseLogoDictionary(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const aliasIndex = headers.indexOf('current_alias');
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 2) {
                const corps = values[0].trim();
                const logo = values[1].trim();
                const live = values[2] && values[2].trim().toLowerCase() === 'true';
                const aliasValue = aliasIndex !== -1 && values[aliasIndex] ? values[aliasIndex].trim() : '';
                
                if (corps && logo && live) {
                    logoDictionary[corps] = logo;
                    
                    // If this corps has an alias, store the mapping
                    if (aliasValue) {
                        corpsAliasMap[corps] = aliasValue;
                    }
                }
            }
        }
    }
    console.log('Loaded logo dictionary:', Object.keys(logoDictionary).length, 'corps');
}

async function loadAvailableCorpsFiles() {
    try {
        // Load from index.json instead of hardcoding
        const response = await fetch('../data/corps/index.json');
        if (response.ok) {
            const index = await response.json();
            if (index.files && Array.isArray(index.files)) {
                // Remove .json extension and add to set
                index.files.forEach(filename => {
                    if (filename.endsWith('.json') && filename !== 'index.json') {
                        const corpsName = filename.replace('.json', '');
                        availableCorpsFiles.add(corpsName);
                        // Also add normalized versions for matching
                        const normalized = normalizeCorpsName(corpsName);
                        if (normalized !== corpsName) {
                            availableCorpsFiles.add(normalized);
                        }
                    }
                });
            }
        } else {
            console.warn('Could not load corps index file');
        }
        
        console.log('Loaded', availableCorpsFiles.size, 'available corps files');
    } catch (error) {
        console.error('Error loading available corps files:', error);
    }
}

async function loadAvailableYears() {
    try {
        // Get years from 2000 to current year (2025)
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 2000; year--) {
            years.push(year);
        }
        
        availableYears = years;
        populateYearFilter();
    } catch (error) {
        console.error('Error loading available years:', error);
    }
}

function populateYearFilter() {
    const yearFilter = document.getElementById('year-filter');
    yearFilter.innerHTML = '<option value="">Select Year</option>';
    
    availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('year-filter').addEventListener('change', onYearChange);
    document.getElementById('date-filter').addEventListener('change', onFilterChange);
    document.getElementById('class-filter').addEventListener('change', onFilterChange);
    document.getElementById('generate-standings').addEventListener('click', generateStandings);
}

async function initializeWithCurrentData() {
    const currentYear = new Date().getFullYear();
    
    // Set year to current year (2025)
    const yearFilter = document.getElementById('year-filter');
    yearFilter.value = currentYear;
    
    // Load data for current year
    await onYearChange();
    
    // Set class to World Class if available
    const classFilter = document.getElementById('class-filter');
    if (availableClasses.includes('World Class')) {
        classFilter.value = 'World Class';
    }
    
    // Auto-generate standings
    setTimeout(generateStandings, 100);
}

async function onYearChange() {
    const selectedYear = document.getElementById('year-filter').value;
    const dateFilter = document.getElementById('date-filter');
    const classFilter = document.getElementById('class-filter');
    
    // Reset dependent filters
    dateFilter.innerHTML = '<option value="">Latest Available</option>';
    classFilter.innerHTML = '<option value="">All Classes</option>';
    
    if (!selectedYear) {
        updateSelectedInfo();
        return;
    }
    
    try {
        // Load data for selected year
        const response = await fetch(`../data/years/${selectedYear}_dci_data.csv`);
        if (response.ok) {
            const csvText = await response.text();
            allData = parseCSV(csvText);
            
            // Extract unique dates and classes
            extractDatesAndClasses();
            populateDateFilter();
            populateClassFilter();
            
            // Auto-generate standings if this is from dropdown change (not initial load)
            if (selectedYear && document.getElementById('year-filter').value === selectedYear) {
                setTimeout(autoGenerateStandings, 100);
            }
        } else {
            console.error(`No data available for year ${selectedYear}`);
            allData = [];
        }
    } catch (error) {
        console.error('Error loading year data:', error);
        allData = [];
    }
}

function onFilterChange() {
    // Auto-generate standings when filters change
    setTimeout(autoGenerateStandings, 100);
}

function autoGenerateStandings() {
    const selectedYear = document.getElementById('year-filter').value;
    if (selectedYear && allData.length > 0) {
        generateStandings();
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                data.push(row);
            }
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
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function extractDatesAndClasses() {
    const dates = new Set();
    const classes = new Set();
    
    allData.forEach(row => {
        if (row.Date) dates.add(row.Date);
        if (row.Class) classes.add(row.Class);
    });
    
    availableDates = Array.from(dates).sort((a, b) => {
        // Sort dates in descending order (newest first)
        const dateA = new Date('2000/' + a);
        const dateB = new Date('2000/' + b);
        return dateB - dateA;
    });
    
    availableClasses = Array.from(classes).sort();
}

function populateDateFilter() {
    const dateFilter = document.getElementById('date-filter');
    dateFilter.innerHTML = '<option value="">Latest Available</option>';
    
    availableDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDateForDisplay(date);
        dateFilter.appendChild(option);
    });
}

function isDCIClass(corpsClass, year) {
    const yearInt = parseInt(year);
    
    if (yearInt >= 2008) {
        // 2008 and higher: Open Class or World Class
        return corpsClass === 'Open Class' || corpsClass === 'World Class';
    } else if (yearInt >= 1991) {
        // 1991-2007: Division I, Division II, or Division III
        return corpsClass === 'Division I' || corpsClass === 'Division II' || corpsClass === 'Division III';
    } else {
        // 1990 and prior: Open Class, A Class, A60 Class, All-Girl Class
        return corpsClass === 'Open Class' || corpsClass === 'A Class' || 
               corpsClass === 'A60 Class' || corpsClass === 'All-Girl Class';
    }
}

function isAllAgeClass(corpsClass) {
    // Check if class contains "All-Age" or "DCA" 
    return corpsClass && (corpsClass.includes('All-Age') || corpsClass.includes('DCA'));
}

function populateClassFilter() {
    const classFilter = document.getElementById('class-filter');
    classFilter.innerHTML = '<option value="">All Classes</option>';
    
    // Add DCI option
    const dciOption = document.createElement('option');
    dciOption.value = 'DCI';
    dciOption.textContent = 'DCI';
    classFilter.appendChild(dciOption);
    
    // Add All-Age option
    const allAgeOption = document.createElement('option');
    allAgeOption.value = 'All-Age';
    allAgeOption.textContent = 'All-Age';
    classFilter.appendChild(allAgeOption);
    
    availableClasses.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classFilter.appendChild(option);
    });
}

function formatDateForDisplay(dateString) {
    // Convert MM/DD to Month DD format
    const [month, day] = dateString.split('/');
    const date = new Date(2000, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

async function generateStandings() {
    const selectedYear = document.getElementById('year-filter').value;
    
    if (!selectedYear) {
        alert('Please select a year first.');
        return;
    }
    
    const generateBtn = document.getElementById('generate-standings');
    const tbody = document.getElementById('standings-tbody');
    
    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
        tbody.innerHTML = '<tr><td colspan="9" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Calculating standings...</td></tr>';    try {
        const selectedDate = document.getElementById('date-filter').value;
        const selectedClass = document.getElementById('class-filter').value;
        
        // Filter data based on selections
        let filteredData = [...allData];
        
        // Filter by date (up to and including selected date, or all if no date selected)
        if (selectedDate) {
            filteredData = filteredData.filter(row => {
                const rowDate = new Date('2000/' + row.Date);
                const filterDate = new Date('2000/' + selectedDate);
                return rowDate <= filterDate;
            });
        }
        
        // Filter by class
        if (selectedClass) {
            if (selectedClass === 'DCI') {
                // Apply DCI filtering based on year
                filteredData = filteredData.filter(row => isDCIClass(row.Class, selectedYear));
            } else if (selectedClass === 'All-Age') {
                // Apply All-Age filtering
                filteredData = filteredData.filter(row => isAllAgeClass(row.Class));
            } else {
                filteredData = filteredData.filter(row => row.Class === selectedClass);
            }
        }
        
        // Calculate standings
        const standings = calculateStandings(filteredData, selectedYear, selectedClass);
        
        // Display standings
        displayStandings(standings);
        
    } catch (error) {
        console.error('Error generating standings:', error);
        tbody.innerHTML = '<tr><td colspan="9" class="error-message"><i class="fas fa-exclamation-triangle"></i><br>Error generating standings. Please try again.</td></tr>';
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

function calculateStandings(data, year, classFilter) {
    // Group data by corps, consolidating aliased corps
    const corpsByName = {};
    
    data.forEach(row => {
        const originalCorps = row.Corps;
        const normalizedCorps = normalizeCorpsName(originalCorps); // Use the normalized name
        const score = parseFloat(row.Score);
        const date = row.Date;

        if (!originalCorps || isNaN(score)) return;

        if (!corpsByName[normalizedCorps]) {
            corpsByName[normalizedCorps] = [];
        }

        corpsByName[normalizedCorps].push({
            score: score,
            date: date,
            dateObj: new Date('2000/' + date)
        });
    });

    // Calculate standings for each corps
    const standings = [];

    Object.keys(corpsByName).forEach(corps => {
        const performances = corpsByName[corps];

        // Sort by date (newest first)
        performances.sort((a, b) => b.dateObj - a.dateObj);

        if (performances.length === 0) return;

        const mostRecentScore = performances[0].score;
        const mostRecentScorePlus = calculateScorePlus(mostRecentScore, year, classFilter, data);        // Calculate averages
        const last3Scores = performances.slice(0, 3).map(p => p.score);
        const last5Scores = performances.slice(0, 5).map(p => p.score);
        
        const avgLast3 = last3Scores.length > 0 ? 
            last3Scores.reduce((sum, score) => sum + score, 0) / last3Scores.length : 0;
        const avgLast5 = last5Scores.length > 0 ? 
            last5Scores.reduce((sum, score) => sum + score, 0) / last5Scores.length : 0;
        
        standings.push({
            corps: corps,
            mostRecentScore: mostRecentScore,
            mostRecentScorePlus: mostRecentScorePlus,
            avgLast3: avgLast3,
            avgLast5: avgLast5,
            performanceCount: performances.length
        });
    });
    
    // Sort by most recent score (descending)
    standings.sort((a, b) => b.mostRecentScore - a.mostRecentScore);
    
    // Add rank and calculate point differences based on most recent score
    standings.forEach((standing, index) => {
        standing.rank = index + 1;
        
        // Point difference to next corps up (N/A for 1st place)
        if (index > 0) {
            standing.pointDiff = standings[index - 1].mostRecentScore - standing.mostRecentScore;
        }
        
        // Leader point difference (N/A for 1st place)
        if (index > 0) {
            standing.leaderPointDiff = standings[0].mostRecentScore - standing.mostRecentScore;
        }
        
        // Point difference to 12th place (N/A for 1st-12th place)
        if (standings.length >= 12 && index > 11) {
            standing.twelfthPointDiff = standings[11].mostRecentScore - standing.mostRecentScore;
        }
    });
    
    return standings;
}

function calculateScorePlus(score, year, classFilter, allFilteredData) {
    // Debug logging
    console.log('Score+ calculation inputs:', { score, year, classFilter, dataLength: allFilteredData.length });
    
    // Validate inputs
    if (!score || isNaN(score)) {
        console.log('Invalid score:', score);
        return 0;
    }
    
    if (!year) {
        console.log('Invalid year:', year);
        return score;
    }
    
    // Use ERA+ style calculation - compare against ALL scores for the season
    const seasonData = allFilteredData.filter(row => 
        row.Year == year  // Use == instead of === for flexible comparison
    );
    
    console.log('Season data found:', seasonData.length, 'records for year', year);
    
    if (seasonData.length === 0) {
        console.log('No season data found for year:', year);
        return score;
    }
    
    const allSeasonScores = seasonData.map(row => {
        const scoreNum = parseFloat(row.Score);
        return scoreNum;
    }).filter(s => !isNaN(s)); // Remove any NaN values
    
    console.log('Valid scores found:', allSeasonScores.length, 'scores:', allSeasonScores.slice(0, 5));
    
    if (allSeasonScores.length === 0) {
        console.log('No valid scores found');
        return score;
    }
    
    const seasonAverage = allSeasonScores.reduce((sum, score) => sum + score, 0) / allSeasonScores.length;
    console.log('Season average:', seasonAverage);
    
    if (seasonAverage === 0 || isNaN(seasonAverage)) {
        console.log('Invalid season average:', seasonAverage);
        return score;
    }
    
    // Score+ = (Individual Score / Season Average) * 100
    const scorePlus = (score / seasonAverage) * 100;
    console.log('Score+ result:', scorePlus);
    
    return scorePlus;
}

function displayStandings(standings) {
    const tbody = document.getElementById('standings-tbody');
    
    if (standings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-message"><i class="fas fa-search"></i><br>No data found for the selected criteria.</td></tr>';
        return;
    }
    
    tbody.innerHTML = standings.map((standing, index) => {
        const logo = getCorpsLogo(standing.corps);
        const rankClass = standing.rank <= 3 ? `rank-${standing.rank}` : '';
        const cutoffClass = standing.rank === 12 ? 'cutoff-line' : '';
        const corpsNameElement = createCorpsNameElement(standing.corps);
        
        return `
            <tr class="${cutoffClass}">
                <td class="rank-cell ${rankClass}">${standing.rank}</td>
                <td>
                    <div class="corps-cell">
                        <div class="corps-logo">
                            ${logo ? `<img src="../assets/corps_logos/${logo}.png" alt="${standing.corps}" onerror="this.style.display='none'">` : ''}
                        </div>
                        ${corpsNameElement}
                    </div>
                </td>
                <td class="score-cell">${standing.mostRecentScore.toFixed(2)}</td>
                <td class="score-plus-cell">${standing.mostRecentScorePlus.toFixed(2)}</td>
                <td class="avg-score-cell">${standing.avgLast3.toFixed(2)}</td>
                <td class="avg-score-cell">${standing.avgLast5.toFixed(2)}</td>
                <td class="diff-cell">${standing.pointDiff ? standing.pointDiff.toFixed(2) : '—'}</td>
                <td class="leader-diff-cell">${standing.leaderPointDiff ? standing.leaderPointDiff.toFixed(2) : '—'}</td>
                <td class="twelfth-diff-cell">${standing.twelfthPointDiff ? standing.twelfthPointDiff.toFixed(2) : '—'}</td>
            </tr>
        `;
    }).join('');
}

function getCorpsLogo(corpsName) {
    // Direct match first
    if (logoDictionary[corpsName]) {
        return logoDictionary[corpsName];
    }
    
    // Try variations for common corps name differences
    const variations = [
        corpsName.replace(/\s+/g, ''), // Remove spaces
        corpsName.replace(/\s+/g, ' '), // Normalize spaces
        corpsName.toLowerCase(),
        corpsName.toUpperCase()
    ];
    
    for (const variation of variations) {
        if (logoDictionary[variation]) {
            return logoDictionary[variation];
        }
    }
    
    return null;
}

function createCorpsNameElement(corpsName) {
    const normalizedName = normalizeCorpsName(corpsName);
    
    // Check if we have a JSON file for this corps
    // Try exact match first, then variations
    let hasJsonFile = false;
    let fileNameToUse = corpsName;
    
    if (availableCorpsFiles.has(corpsName)) {
        hasJsonFile = true;
        fileNameToUse = corpsName;
    } else if (availableCorpsFiles.has(normalizedName)) {
        hasJsonFile = true;
        fileNameToUse = normalizedName;
    } else {
        // Try some common variations
        const variations = [
            corpsName.replace(/^Reading /, ''), // "Reading Buccaneers" -> "Buccaneers"
            corpsName.replace(/^Seattle /, ''), // "Seattle Cascades" -> "Cascades"
            corpsName.replace(/ Regiment$/, ''), // Remove "Regiment" suffix
            corpsName.replace(/ Cadets$/, ''), // Remove "Cadets" suffix
            corpsName + ' Regiment', // Add "Regiment" suffix
            corpsName + ' Cadets', // Add "Cadets" suffix
        ];
        
        for (const variation of variations) {
            if (availableCorpsFiles.has(variation)) {
                hasJsonFile = true;
                fileNameToUse = variation;
                break;
            }
        }
    }
    
    // Debug logging
    console.log(`Corps: "${corpsName}" -> hasJsonFile: ${hasJsonFile}, fileNameToUse: "${fileNameToUse}"`);
    
    if (hasJsonFile) {
        return `<a href="corps-details.html?corps=${encodeURIComponent(fileNameToUse)}" class="corps-name-link">${corpsName}</a>`;
    } else {
        return `<span class="corps-name">${corpsName}</span>`;
    }
}
