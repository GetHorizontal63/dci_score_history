// DCI Corps Details JavaScript

let corpsData = null;
let corpsName = '';
let allScoreData = [];
let liveCorpsList = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Corps Details Page Loaded');
    
    // Get corps name from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    corpsName = urlParams.get('corps') || 'Colts';
    
    // Initialize page
    loadCorpsData();
    setupEventListeners();
});

async function loadLiveCorpsList() {
    try {
        const response = await fetch('../assets/corps_logos/logo_dictionary.csv');
        if (response.ok) {
            const csvText = await response.text();
            liveCorpsList = parseLogoDictionary(csvText);
            console.log('Loaded live corps list:', liveCorpsList.length, 'corps');
        }
    } catch (error) {
        console.error('Error loading live corps list:', error);
    }
}

function parseLogoDictionary(csvText) {
    const lines = csvText.split('\n');
    const corps = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (line) {
            const [corpsName, logo, live, currentAlias] = line.split(',');
            if (live === 'true') {
                corps.push({
                    name: corpsName,
                    logo: logo,
                    alias: currentAlias || corpsName
                });
            }
        }
    }
    return corps;
}

function getMostRecentLocation(locations) {
    if (!locations || locations.length === 0) return null;
    
    // Find the location with the most recent year
    let mostRecent = locations[0];
    let mostRecentYear = 0;
    
    for (const location of locations) {
        if (!location.year) continue;
        
        let year = 0;
        
        // Handle different year formats
        if (typeof location.year === 'number') {
            year = location.year;
        } else if (typeof location.year === 'string') {
            if (location.year === "Present" || location.year.includes("Present")) {
                year = new Date().getFullYear(); // Current year
            } else {
                // Handle ranges like "2007-Present" or "1996-2007"
                const yearMatch = location.year.match(/(\d{4})-?(?:Present|(\d{4}))?/);
                if (yearMatch) {
                    if (location.year.includes("Present")) {
                        year = new Date().getFullYear(); // Current year for "Present"
                    } else if (yearMatch[2]) {
                        year = parseInt(yearMatch[2]); // End year of range
                    } else {
                        year = parseInt(yearMatch[1]); // Single year or start year
                    }
                } else {
                    // Try to extract any 4-digit year
                    const simpleYear = location.year.match(/(\d{4})/);
                    if (simpleYear) {
                        year = parseInt(simpleYear[1]);
                    }
                }
            }
        }
        
        if (year > mostRecentYear) {
            mostRecentYear = year;
            mostRecent = location;
        }
    }
    
    return mostRecent;
}

function calculateYearsActive(corps) {
    let activeRanges = [];
    
    // Collect all location-based ranges
    if (corps.location && corps.location.length > 0) {
        for (const location of corps.location) {
            if (!location.year) continue;
            
            if (typeof location.year === 'number') {
                activeRanges.push({ start: location.year, end: location.year, isPresent: false });
            } else if (typeof location.year === 'string') {
                // Handle semicolon-separated ranges like "1972-1982; 1984-Present"
                const rangeParts = location.year.split(';').map(part => part.trim());
                
                for (const rangePart of rangeParts) {
                    let startYear = null;
                    let endYear = null;
                    let isPresent = false;
                    
                    if (rangePart.includes('Present')) {
                        isPresent = true;
                        // Extract start year from ranges like "1984-Present"
                        const match = rangePart.match(/(\d{4})-?Present/);
                        if (match) {
                            startYear = parseInt(match[1]);
                            endYear = new Date().getFullYear();
                        }
                    } else {
                        // Handle ranges like "1972-1982" or single years
                        const yearMatch = rangePart.match(/(\d{4})(?:-(\d{4}))?/);
                        if (yearMatch) {
                            startYear = parseInt(yearMatch[1]);
                            endYear = yearMatch[2] ? parseInt(yearMatch[2]) : startYear;
                        }
                    }
                    
                    if (startYear !== null && endYear !== null) {
                        activeRanges.push({ start: startYear, end: endYear, isPresent: isPresent });
                    }
                }
            }
        }
    }
    
    // Sort ranges by start year
    activeRanges.sort((a, b) => a.start - b.start);
    
    // Merge consecutive/overlapping ranges (but preserve intentional gaps marked with semicolons)
    let mergedRanges = [];
    for (const range of activeRanges) {
        if (mergedRanges.length === 0) {
            mergedRanges.push({ ...range });
        } else {
            const lastRange = mergedRanges[mergedRanges.length - 1];
            // If ranges are consecutive or overlapping, merge them
            if (range.start <= lastRange.end + 1) {
                lastRange.end = Math.max(lastRange.end, range.end);
                if (range.isPresent) lastRange.isPresent = true;
            } else {
                // There's a gap - keep as separate range
                mergedRanges.push({ ...range });
            }
        }
    }
    
    // Format the result
    if (mergedRanges.length === 0) {
        return 'Unknown';
    } else {
        return mergedRanges.map(range => {
            if (range.isPresent) {
                return `${range.start}-Present`;
            } else if (range.start === range.end) {
                return range.start.toString();
            } else {
                return `${range.start}-${range.end}`;
            }
        }).join('; ');
    }
}

async function loadCorpsData() {
    try {
        // Show loading state
        showLoadingState();
        
        // Load corps data
        const response = await fetch(`../data/corps/${corpsName}.json`);
        if (response.ok) {
            corpsData = await response.json();
            corpsData.name = corpsName;
            
            // Update page content
            updatePageTitle();
            updateInfobox();
            updateShowHistory();
            updateChampionshipHistory();
            updateScoreStatistics();
            
            // Load score data for this corps (this will also update matchup history)
            loadScoreData();
        } else {
            showErrorState('Corps data not found');
        }
    } catch (error) {
        console.error('Error loading corps data:', error);
        showErrorState('Failed to load corps data');
    }
}

function showLoadingState() {
    // Show loading in tables
    document.getElementById('show-history-tbody').innerHTML = '<tr><td colspan="4" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Loading data...</td></tr>';
    document.getElementById('score-history-tbody').innerHTML = '<tr><td colspan="5" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Loading data...</td></tr>';
    document.getElementById('championship-history-tbody').innerHTML = '<tr><td colspan="4" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Loading championship history...</td></tr>';
    document.getElementById('caption-awards-tbody').innerHTML = '<tr><td colspan="2" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Loading caption awards...</td></tr>';
}

function showErrorState(message) {
    document.getElementById('show-history-tbody').innerHTML = `<tr><td colspan="4" class="loading-message">${message}</td></tr>`;
    document.getElementById('score-history-tbody').innerHTML = `<tr><td colspan="5" class="loading-message">${message}</td></tr>`;
    document.getElementById('championship-history-tbody').innerHTML = `<tr><td colspan="4" class="loading-message">${message}</td></tr>`;
    document.getElementById('caption-awards-tbody').innerHTML = `<tr><td colspan="2" class="loading-message">${message}</td></tr>`;
}

function updatePageTitle() {
    document.title = `${corpsName} - Corps Details - Drum Corps International`;
    document.getElementById('page-title').content = `${corpsName} - Corps Details - Drum Corps International`;
}

function updateInfobox() {
    document.getElementById('infobox-title').textContent = corpsName;
    document.getElementById('infobox-name').textContent = corpsName;
    
    // Location
    const location = getMostRecentLocation(corpsData.location);
    const locationText = location ? `${location.city}, ${location.state}` : 'Unknown';
    document.getElementById('infobox-location').textContent = locationText;
    
    // Year Founded - extract earliest year from all location entries
    let yearFounded = 'Unknown';
    if (corpsData.location && corpsData.location.length > 0) {
        let earliestYear = null;
        
        // Check all location entries for years
        corpsData.location.forEach(loc => {
            if (loc.year) {
                // Extract year from various formats like "1975", "1975-1980", "1975-Present", etc.
                const yearMatch = loc.year.match(/(\d{4})/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[1]);
                    if (!earliestYear || year < earliestYear) {
                        earliestYear = year;
                    }
                }
            }
        });
        
        if (earliestYear) {
            yearFounded = earliestYear.toString();
        }
    } else if (corpsData.shows && corpsData.shows.length > 0) {
        // Fallback to earliest show year if no location data
        const validShows = corpsData.shows.filter(show => show.year && typeof show.year === 'number');
        if (validShows.length > 0) {
            yearFounded = Math.min(...validShows.map(show => show.year)).toString();
        }
    }
    document.getElementById('infobox-founded').textContent = yearFounded;
    
    // Current Class
    document.getElementById('infobox-class').textContent = corpsData.currentClass || 'Unknown';
    
    // Standard deviation and score from shows
    let standardDeviation = 'N/A';
    let bestScore = 'N/A';
    
    if (corpsData.shows && corpsData.shows.length > 0) {
        // Find standard deviation from valid scores
        const validScores = corpsData.shows.filter(show => show.score && typeof show.score === 'number');
        if (validScores.length > 1) {
            const scores = validScores.map(show => show.score);
            const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
            standardDeviation = Math.sqrt(variance).toFixed(3);
        }
        
        // Find best score
        if (validScores.length > 0) {
            bestScore = Math.max(...validScores.map(show => show.score)).toFixed(3);
        }
    }
    
    document.getElementById('infobox-standard-deviation').textContent = standardDeviation;
    document.getElementById('infobox-best-score').textContent = bestScore;
    
    // Website
    const websiteElement = document.getElementById('infobox-website');
    if (corpsData.website) {
        // Ensure the URL has a protocol (http:// or https://)
        let websiteUrl = corpsData.website.trim();
        
        // Force external URL by ensuring it has a protocol
        if (!websiteUrl.match(/^https?:\/\//)) {
            websiteUrl = 'https://' + websiteUrl;
        }
        
        // Clear the element and create a proper link element
        websiteElement.innerHTML = '';
        const linkElement = document.createElement('a');
        linkElement.href = websiteUrl;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.textContent = 'Visit Website';
        
        // Force absolute external navigation
        linkElement.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.open(websiteUrl, '_blank');
        });
        
        websiteElement.appendChild(linkElement);
    } else {
        websiteElement.textContent = 'None Listed';
    }
    
    // Former Names
    const formerNames = corpsData.formerNames && corpsData.formerNames.length > 0 && corpsData.formerNames[0] !== 'N/A' 
        ? corpsData.formerNames.join(', ') 
        : 'None';
    document.getElementById('infobox-former-names').textContent = formerNames;
}

function updateShowHistory() {
    const tbody = document.getElementById('show-history-tbody');
    
    if (!corpsData.shows || corpsData.shows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-message">No show history available</td></tr>';
        return;
    }
    
    // Sort shows by year (newest first)
    const sortedShows = [...corpsData.shows].sort((a, b) => b.year - a.year);
    
    // Check if any placement contains an asterisk or double asterisk
    const hasDoubleAsteriskPlacements = sortedShows.some(show => 
        show.placement && show.placement.includes('**')
    );
    const hasAsteriskPlacements = sortedShows.some(show => 
        show.placement && show.placement.includes('*') && !show.placement.includes('**')
    );
    
    tbody.innerHTML = sortedShows.map(show => {
        const placement = show.placement || 'N/A';
        const score = show.score ? show.score.toFixed(3) : 'N/A';
        const repertoire = show.repertoire || show.showTitle || 'N/A';
        const showTitle = show.showTitle || 'N/A';
        
        // Create show title with tooltip if repertoire is available
        const showTitleWithTooltip = repertoire && repertoire !== 'N/A' && repertoire !== showTitle ?
            `<span class="show-title-tooltip">
                ${showTitle}
                <span class="tooltip-content">${repertoire}</span>
            </span>` :
            showTitle;
        
        // Style placement based on ranking (only for top DCI classes)
        const placementStyled = getStyledPlacement(placement, show.year, corpsData);
        
        return `
            <tr>
                <td>${show.year}</td>
                <td>${showTitleWithTooltip}</td>
                <td>${placementStyled}</td>
                <td>${score}</td>
            </tr>
        `;
    }).join('');
    
    // Add notes if needed
    const showHistorySection = tbody.closest('section') || tbody.closest('.section') || tbody.parentElement;
    let existingAsteriskNote = showHistorySection.querySelector('.asterisk-note');
    let existingDoubleAsteriskNote = showHistorySection.querySelector('.double-asterisk-note');
    
    // Handle single asterisk note
    if (hasAsteriskPlacements && !existingAsteriskNote) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'asterisk-note';
        noteDiv.style.cssText = 'margin-top: 15px; padding: 10px; background-color: #2a2a2a; border-left: 4px solid #EA6020; border-radius: 6px; font-style: italic; color: #cccccc; font-size: 14px;';
        noteDiv.textContent = 'Prior to 2011, Open Class/Division II & III competed in their own Championship Series separate from the World Class/Division I groups.';
        showHistorySection.appendChild(noteDiv);
    } else if (!hasAsteriskPlacements && existingAsteriskNote) {
        existingAsteriskNote.remove();
    }
    
    // Handle double asterisk note
    if (hasDoubleAsteriskPlacements && !existingDoubleAsteriskNote) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'double-asterisk-note';
        noteDiv.style.cssText = 'margin-top: 15px; padding: 10px; background-color: #2a2a2a; border-left: 4px solid #EA6020; border-radius: 6px; font-style: italic; color: #cccccc; font-size: 14px;';
        noteDiv.textContent = 'This corps qualified for World Class Semifinals because an International Class group ranked inside the top 25.';
        showHistorySection.appendChild(noteDiv);
    } else if (!hasDoubleAsteriskPlacements && existingDoubleAsteriskNote) {
        existingDoubleAsteriskNote.remove();
    }
}

function updateChampionshipHistory() {
    const championshipSection = document.getElementById('championship-history-section');
    const championshipTbody = document.getElementById('championship-history-tbody');
    const captionTbody = document.getElementById('caption-awards-tbody');
    const captionContainer = captionTbody.closest('.scores-table-container');
    
    // Check if we have any valid championship data
    const hasChampionships = corpsData.championships && 
        corpsData.championships.length > 0 && 
        !(corpsData.championships.length === 1 && corpsData.championships[0].year === 'N/A');
    
    const validChampionships = hasChampionships ? 
        corpsData.championships.filter(champ => champ.year !== 'N/A') : [];
    
    // Check if we have any valid caption awards data
    const hasCaptionAwards = corpsData.captionAwards && 
        corpsData.captionAwards.length > 0;
    
    // If no data at all, hide the entire section
    if (!hasChampionships && !hasCaptionAwards) {
        championshipSection.style.display = 'none';
        return;
    }
    
    // Show the section
    championshipSection.style.display = 'block';
    
    // Handle Championships table
    if (!hasChampionships || validChampionships.length === 0) {
        // Hide the championships table container
        championshipTbody.closest('.scores-table-container').style.display = 'none';
    } else {
        // Show the championships table and populate it
        championshipTbody.closest('.scores-table-container').style.display = 'block';
        
        // Sort championships by year (newest first)
        const sortedChampionships = [...validChampionships]
            .sort((a, b) => parseInt(b.year) - parseInt(a.year));
        
        championshipTbody.innerHTML = sortedChampionships.map(championship => {
            const year = championship.year;
            const circuit = championship.circuit || 'DCI';
            const showTitle = championship.showTitle || 'N/A';
            const score = championship.score ? championship.score.toFixed(3) : 'N/A';
            
            return `
                <tr>
                    <td>${year}</td>
                    <td>${circuit}</td>
                    <td>${showTitle}</td>
                    <td>${score}</td>
                </tr>
            `;
        }).join('');
    }
    
    // Handle Caption Awards table
    if (!hasCaptionAwards) {
        // Hide the caption awards container
        captionContainer.style.display = 'none';
    } else {
        // Show the caption awards table and populate it
        captionContainer.style.display = 'block';
        
        captionTbody.innerHTML = corpsData.captionAwards.map(award => {
            const caption = award.caption || 'Unknown Caption';
            const years = award.years && award.years.length > 0 
                ? award.years.sort((a, b) => b - a).join(', ') 
                : 'N/A';
            
            return `
                <tr>
                    <td>${caption}</td>
                    <td>${years}</td>
                </tr>
            `;
        }).join('');
    }
}

async function loadScoreData() {
    try {
        // Clear existing data
        allScoreData = [];
        
        // Load all available years of score data
        const years = await getAvailableYears();
        
        for (const year of years) {
            try {
                const response = await fetch(`../data/years/${year}_dci_data.csv`);
                if (response.ok) {
                    const csvText = await response.text();
                    const yearData = parseCSVData(csvText, year);
                    allScoreData.push(...yearData);
                } else {
                    console.warn(`No data file found for ${year} (${response.status})`);
                }
            } catch (error) {
                console.warn(`Could not load data for ${year}:`, error.message);
            }
        }
        
        // Filter data for current corps
        const corpsScoreData = allScoreData.filter(record => 
            record.corps.toLowerCase() === corpsName.toLowerCase()
        );
        
        // Update the show history table
        updateShowHistoryTable(corpsScoreData);
        
        // Update statistics and chart
        updateScoreStatisticsFromCSV(corpsScoreData);
        
        // Update most competed against infobox
        await updateMostCompetedAgainst(corpsScoreData);
        
        // Update matchup history table
        updateMatchupHistory();
        
    } catch (error) {
        console.error('Error loading score data:', error);
        document.getElementById('score-history-tbody').innerHTML = 
            '<tr><td colspan="5" class="error-message">Error loading score data</td></tr>';
    }
}

async function getAvailableYears() {
    // List of years that actually have CSV files
    const availableYears = [
        1964, 1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972, 1973, 1974, 1975,
        1976, 1977, 1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987,
        1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999,
        2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011,
        2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025
    ];
    
    return availableYears;
}

function parseCSVData(csvText, year) {
    const lines = csvText.split('\n');
    const records = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const [date, city, state, place, corps, class_, score, csvYear] = line.split(',');
            
            if (corps && score && !isNaN(parseFloat(score))) {
                records.push({
                    date: date,
                    city: city,
                    state: state,
                    place: parseInt(place) || null,
                    corps: corps,
                    class: class_,
                    score: parseFloat(score),
                    year: parseInt(csvYear) || year
                });
            }
        }
    }
    
    return records;
}

function updateShowHistoryTable(scoreData) {
    const tbody = document.getElementById('score-history-tbody');
    
    if (!scoreData || scoreData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No score data available for this corps</td></tr>';
        return;
    }
    
    // Sort by year descending, then by date descending
    scoreData.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return new Date(`${a.date}/${a.year}`) < new Date(`${b.date}/${b.year}`) ? 1 : -1;
    });
    
    tbody.innerHTML = '';
    
    scoreData.forEach(record => {
        const row = document.createElement('tr');
        
        // Format date
        const formattedDate = `${record.date}/${record.year}`;
        
        // Format location
        const location = `${record.city}, ${record.state}`;
        
        // Format placement with styling
        const placementText = record.place ? `${record.place}${getOrdinalSuffix(record.place)}` : 'N/A';
        
        row.innerHTML = `
            <td style="text-align: center;">${formattedDate}</td>
            <td style="text-align: center;">${location}</td>
            <td style="text-align: center;" class="placement-cell" data-placement="${record.place || ''}">${placementText}</td>
            <td style="text-align: center;">${record.score.toFixed(3)}</td>
            <td style="text-align: center;">${record.class || 'N/A'}</td>
        `;
        
        // Apply placement styling (only for top DCI classes)
        if (record.place && wasInTopDCIClass(record.year, corpsData)) {
            const placementCell = row.querySelector('.placement-cell');
            if (record.place === 1) {
                placementCell.style.color = '#FFD700';
                placementCell.style.fontWeight = 'bold';
            } else if (record.place === 2) {
                placementCell.style.color = '#C0C0C0';
                placementCell.style.fontWeight = 'bold';
            } else if (record.place === 3) {
                placementCell.style.color = '#CD7F32';
                placementCell.style.fontWeight = 'bold';
            } else if (record.place <= 12) {
                placementCell.style.color = '#EA6020';
            }
        }
        
        tbody.appendChild(row);
    });
}

function updateScoreStatisticsFromCSV(scoreData) {
    if (!scoreData || scoreData.length === 0) {
        document.getElementById('total-shows').textContent = '0';
        document.getElementById('avg-score').textContent = 'N/A';
        document.getElementById('best-score').textContent = 'N/A';
        document.getElementById('best-placement').textContent = 'N/A';
        return;
    }
    
    // Total shows
    document.getElementById('total-shows').textContent = scoreData.length;
    
    // Average score
    const avgScore = scoreData.reduce((sum, record) => sum + record.score, 0) / scoreData.length;
    document.getElementById('avg-score').textContent = avgScore.toFixed(2);
    
    // Best score
    const bestScore = Math.max(...scoreData.map(record => record.score));
    document.getElementById('best-score').textContent = bestScore.toFixed(3);
    
    // Standard deviation
    if (scoreData.length > 1) {
        const avgScore = scoreData.reduce((sum, record) => sum + record.score, 0) / scoreData.length;
        const variance = scoreData.reduce((sum, record) => sum + Math.pow(record.score - avgScore, 2), 0) / scoreData.length;
        const standardDeviation = Math.sqrt(variance);
        document.getElementById('standard-deviation').textContent = standardDeviation.toFixed(3);
    } else {
        document.getElementById('standard-deviation').textContent = 'N/A';
    }
    
    // Create score distribution chart with real data
    createScoreDistributionChartFromCSV(scoreData);
}

function updateScoreStatistics() {
    if (!corpsData.shows || corpsData.shows.length === 0) {
        document.getElementById('total-shows').textContent = '0';
        document.getElementById('avg-score').textContent = 'N/A';
        document.getElementById('best-score').textContent = 'N/A';
        document.getElementById('standard-deviation').textContent = 'N/A';
        return;
    }
    
    const validScores = corpsData.shows.filter(show => show.score && typeof show.score === 'number');
    const totalShows = corpsData.shows.length;
    
    document.getElementById('total-shows').textContent = totalShows;
    
    if (validScores.length > 0) {
        const avgScore = validScores.reduce((sum, show) => sum + show.score, 0) / validScores.length;
        const bestScore = Math.max(...validScores.map(show => show.score));
        
        document.getElementById('avg-score').textContent = avgScore.toFixed(2);
        document.getElementById('best-score').textContent = bestScore.toFixed(3);
    } else {
        document.getElementById('avg-score').textContent = 'N/A';
        document.getElementById('best-score').textContent = 'N/A';
    }
    
    // Standard deviation
    if (validScores.length > 1) {
        const avgScore = validScores.reduce((sum, show) => sum + show.score, 0) / validScores.length;
        const variance = validScores.reduce((sum, show) => sum + Math.pow(show.score - avgScore, 2), 0) / validScores.length;
        const standardDeviation = Math.sqrt(variance);
        document.getElementById('standard-deviation').textContent = standardDeviation.toFixed(3);
    } else {
        document.getElementById('standard-deviation').textContent = 'N/A';
    }
    
    // Create score distribution chart
    createScoreDistributionChart();
}

function createScoreDistributionChartFromCSV(scoreData) {
    const ctx = document.getElementById('score-distribution-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart('score-distribution-chart');
    if (existingChart) {
        existingChart.destroy();
    }
    
    if (!scoreData || scoreData.length === 0) {
        ctx.fillStyle = '#666666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No score data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // Create buckets from 40 to 100 in 5-point increments
    const buckets = [];
    const bucketCounts = [];
    for (let i = 40; i < 100; i += 5) {
        buckets.push(`${i}-${i + 4.99}`);
        bucketCounts.push(0);
    }
    
    // Count scores in each bucket
    scoreData.forEach(record => {
        const score = record.score;
        const bucketIndex = Math.floor((score - 40) / 5);
        if (bucketIndex >= 0 && bucketIndex < bucketCounts.length) {
            bucketCounts[bucketIndex]++;
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: buckets,
            datasets: [{
                label: 'Number of Scores',
                data: bucketCounts,
                backgroundColor: 'rgba(234, 96, 32, 0.6)',
                borderColor: 'rgba(234, 96, 32, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Score Distribution',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function createScoreDistributionChart() {
    const ctx = document.getElementById('score-distribution-chart').getContext('2d');
    
    if (!corpsData.shows) {
        ctx.fillStyle = '#666666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No score data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const validScores = corpsData.shows.filter(show => show.score && typeof show.score === 'number');
    
    if (validScores.length === 0) {
        ctx.fillStyle = '#666666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No valid scores available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // Create buckets from 40 to 100 in 5-point increments
    const buckets = [];
    const bucketCounts = [];
    for (let i = 40; i < 100; i += 5) {
        buckets.push(`${i}-${i + 4.99}`);
        bucketCounts.push(0);
    }
    
    // Count scores in each bucket
    validScores.forEach(show => {
        const score = show.score;
        const bucketIndex = Math.floor((score - 40) / 5);
        if (bucketIndex >= 0 && bucketIndex < bucketCounts.length) {
            bucketCounts[bucketIndex]++;
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: buckets,
            datasets: [{
                label: 'Number of Scores',
                data: bucketCounts,
                backgroundColor: 'rgba(234, 96, 32, 0.6)',
                borderColor: 'rgba(234, 96, 32, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Score Distribution',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff',
                        stepSize: 1
                    },
                    grid: {
                        color: '#444444'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: '#444444'
                    }
                }
            }
        }
    });
}

function updateMatchupHistory() {
    const tbody = document.getElementById('matchup-history-tbody');
    
    // If the table doesn't exist, just return
    if (!tbody) {
        return;
    }
    
    if (liveCorpsList.length === 0 || allScoreData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-message">Loading matchup data...</td></tr>';
        return;
    }
    
    // Calculate head-to-head records using real score data
    const matchups = calculateHeadToHeadRecords();
    
    if (matchups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No head-to-head data available</td></tr>';
        return;
    }
    
    // Sort by number of meetings (descending), then by win percentage
    matchups.sort((a, b) => {
        if (a.meetings !== b.meetings) return b.meetings - a.meetings;
        return b.winPct - a.winPct;
    });
    
    tbody.innerHTML = matchups.map(matchup => {
        const winPctClass = matchup.winPct > 50 ? 'positive' : matchup.winPct < 50 ? 'negative' : 'neutral';
        const marginPrefix = matchup.avgMargin > 0 ? '+' : '';
        
        return `
            <tr>
                <td>${matchup.opponent}</td>
                <td>${matchup.meetings}</td>
                <td>${matchup.wins}</td>
                <td>${matchup.losses}</td>
                <td><span class="win-percentage ${winPctClass}">${matchup.winPct.toFixed(1)}%</span></td>
                <td>${marginPrefix}${matchup.avgMargin.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

function calculateHeadToHeadRecords() {
    // Get all competitions where the current corps competed
    const corpsCompetitions = allScoreData.filter(record => 
        record.corps.toLowerCase() === corpsName.toLowerCase()
    );
    
    // Group by date/location to find competitions
    const competitionGroups = {};
    corpsCompetitions.forEach(record => {
        const key = `${record.date}_${record.city}_${record.state}_${record.year}`;
        if (!competitionGroups[key]) {
            competitionGroups[key] = [];
        }
        competitionGroups[key].push(record);
    });
    
    // For each competition, find all other corps that competed
    const headToHeadData = {};
    
    Object.values(competitionGroups).forEach(competition => {
        const competitionKey = `${competition[0].date}_${competition[0].city}_${competition[0].state}_${competition[0].year}`;
        
        // Get all corps that competed on the same date/location
        const allCompetitors = allScoreData.filter(record => 
            `${record.date}_${record.city}_${record.state}_${record.year}` === competitionKey
        );
        
        const ourRecord = competition[0]; // Our corps' record for this competition
        
        allCompetitors.forEach(opponentRecord => {
            if (opponentRecord.corps.toLowerCase() !== corpsName.toLowerCase()) {
                const opponentName = opponentRecord.corps;
                
                if (!headToHeadData[opponentName]) {
                    headToHeadData[opponentName] = {
                        meetings: 0,
                        wins: 0,
                        losses: 0,
                        scoreMargins: []
                    };
                }
                
                headToHeadData[opponentName].meetings++;
                
                // Only compare scores if both are valid numbers
                if (ourRecord.score !== null && opponentRecord.score !== null && 
                    !isNaN(ourRecord.score) && !isNaN(opponentRecord.score)) {
                    
                    // Compare scores - higher score wins
                    if (parseFloat(ourRecord.score) > parseFloat(opponentRecord.score)) {
                        headToHeadData[opponentName].wins++;
                    } else if (parseFloat(ourRecord.score) < parseFloat(opponentRecord.score)) {
                        headToHeadData[opponentName].losses++;
                    }
                    // Note: ties are not explicitly counted, but meetings - wins - losses = ties
                    
                    // Calculate score margin (our score - their score)
                    const margin = ourRecord.score - opponentRecord.score;
                    headToHeadData[opponentName].scoreMargins.push(margin);
                }
            }
        });
    });
    
    // Convert to array format with calculated statistics
    const matchups = [];
    
    for (const [opponent, data] of Object.entries(headToHeadData)) {
        if (data.meetings >= 3) { // Only include if they've met at least 3 times
            const decidedGames = data.wins + data.losses; // Games with valid scores
            const ties = data.meetings - decidedGames; // Games without valid scores or actual ties
            const winPct = decidedGames > 0 ? (data.wins / decidedGames * 100) : 0;
            const avgMargin = data.scoreMargins.length > 0 ? 
                data.scoreMargins.reduce((sum, margin) => sum + margin, 0) / data.scoreMargins.length : 0;
            
            matchups.push({
                opponent: opponent,
                meetings: data.meetings,
                wins: data.wins,
                losses: data.losses,
                ties: ties,
                winPct: winPct,
                avgMargin: avgMargin
            });
        }
    }
    
    return matchups;
}

function setupEventListeners() {
    // No event listeners needed currently
}

function handleOpponentSearch() {
    const searchTerm = document.getElementById('opponent-search').value.toLowerCase();
    const rows = document.querySelectorAll('#matchup-history-tbody tr');
    
    rows.forEach(row => {
        const opponentName = row.cells[0].textContent.toLowerCase();
        if (opponentName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function getStyledPlacement(placement, year, corpsData) {
    if (!placement || placement === 'N/A' || 
        placement === 'Did not attend World Championships' || 
        placement === 'No scored competitions' || 
        placement === 'Season canceled due to the COVID-19 pandemic') {
        return `<span class="placement-other">${placement}</span>`;
    }
    
    // Check if corps was in top DCI class for this year
    const isTopDCIClass = wasInTopDCIClass(year, corpsData);
    
    // Extract numeric placement
    const match = placement.match(/(\d+)/);
    if (!match) {
        return `<span class="placement-other">${placement}</span>`;
    }
    
    const numericPlacement = parseInt(match[1]);
    
    // Only apply colors if corps was in top DCI class
    if (isTopDCIClass) {
        if (numericPlacement === 1) {
            return `<span class="placement-1st">${placement}</span>`;
        } else if (numericPlacement === 2) {
            return `<span class="placement-2nd">${placement}</span>`;
        } else if (numericPlacement === 3) {
            return `<span class="placement-3rd">${placement}</span>`;
        } else if (numericPlacement <= 12) {
            return `<span class="placement-top12">${placement}</span>`;
        } else {
            return `<span class="placement-other">${placement}</span>`;
        }
    } else {
        // No color styling for non-top DCI classes
        return `<span class="placement-other">${placement}</span>`;
    }
}

function wasInTopDCIClass(year, corpsData) {
    if (!corpsData.historicClasses || !year) return false;
    
    console.log(`Checking year ${year} for corps`, corpsData.historicClasses);
    
    for (const classInfo of corpsData.historicClasses) {
        if (classInfo.circuit !== 'DCI') continue;
        
        // Check if this class info covers the given year
        if (classInfo.years) {
            const yearRange = classInfo.years.toLowerCase();
            
            // Handle different year formats
            let startYear = null;
            let endYear = null;
            let isPresent = false;
            
            if (yearRange.includes('present')) {
                isPresent = true;
                const match = yearRange.match(/(\d{4})-?present/);
                if (match) {
                    startYear = parseInt(match[1]);
                    endYear = new Date().getFullYear();
                }
            } else {
                const yearMatch = yearRange.match(/(\d{4})(?:-(\d{4}))?/);
                if (yearMatch) {
                    startYear = parseInt(yearMatch[1]);
                    endYear = yearMatch[2] ? parseInt(yearMatch[2]) : startYear;
                }
            }
            
            console.log(`Checking range ${startYear}-${endYear} for class ${classInfo.className}`);
            
            // Check if the given year falls within this range
            if (startYear && endYear && year >= startYear && year <= endYear) {
                const className = classInfo.className.toLowerCase();
                console.log(`Year ${year} matches range, class: ${className}`);
                
                // Check if it's a top DCI class - ONLY these specific cases
                if (className === 'world class' || 
                    (className === 'division i' && year >= 1992 && year <= 2007) || 
                    (className === 'open class' && year >= 1972 && year <= 1991)) {
                    console.log(`Year ${year} is in top DCI class: ${className}`);
                    return true;
                } else {
                    console.log(`Year ${year} is NOT in top DCI class: ${className}`);
                }
            }
        }
    }
    
    console.log(`Year ${year} - not in any top DCI class`);
    return false;
}

async function updateMostCompetedAgainst(corpsScoreData) {
    // Get live corps names from logo dictionary
    let liveCorpsNames = [];
    try {
        const response = await fetch('../assets/corps_logos/logo_dictionary.csv');
        if (response.ok) {
            const csvText = await response.text();
            const lines = csvText.split('\n');
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const parts = line.split(',');
                    if (parts.length >= 3 && parts[2] === 'true') {
                        liveCorpsNames.push(parts[0]);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading live corps:', error);
        return;
    }
    
    if (liveCorpsNames.length === 0) {
        console.error('No live corps found!');
        return;
    }
    
    // Track matchups against live corps
    const matchupCounts = {};
    
    // For each of our corps' competitions
    corpsScoreData.forEach((ourRecord, index) => {
        // Find all other corps in same competition from allScoreData
        const othersInSameComp = allScoreData.filter(record => 
            record.date === ourRecord.date &&
            record.city === ourRecord.city &&
            record.state === ourRecord.state &&
            record.year === ourRecord.year &&
            record.corps !== corpsName
        );

        // Count matchups with live corps only
        othersInSameComp.forEach(otherRecord => {
            if (liveCorpsNames.includes(otherRecord.corps)) {
                if (!matchupCounts[otherRecord.corps]) {
                    matchupCounts[otherRecord.corps] = { wins: 0, losses: 0, ties: 0, total: 0 };
                }
                
                matchupCounts[otherRecord.corps].total++;
                
                // Use SCORES not placements to determine wins/losses
                if (ourRecord.score !== null && otherRecord.score !== null && 
                    !isNaN(ourRecord.score) && !isNaN(otherRecord.score)) {
                    if (parseFloat(ourRecord.score) > parseFloat(otherRecord.score)) {
                        matchupCounts[otherRecord.corps].wins++;
                    } else if (parseFloat(ourRecord.score) < parseFloat(otherRecord.score)) {
                        matchupCounts[otherRecord.corps].losses++;
                    } else {
                        matchupCounts[otherRecord.corps].ties++;
                    }
                }
            }
        });
    });
    
    // Get top 3 by total matchups
    const top3 = Object.entries(matchupCounts)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 3);
    
    // Update display
    for (let i = 0; i < 3; i++) {
        const nameEl = document.getElementById(`most-competed-name-${i + 1}`);
        const recordEl = document.getElementById(`most-competed-record-${i + 1}`);
        
        if (i < top3.length) {
            const [corpsName, record] = top3[i];
            nameEl.textContent = corpsName;
            recordEl.textContent = `${record.wins}-${record.losses}-${record.ties} (${record.total})`;
        } else {
            nameEl.textContent = '-';
            recordEl.textContent = '-';
        }
    }
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) return 'st';
    if (j == 2 && k != 12) return 'nd';
    if (j == 3 && k != 13) return 'rd';
    return 'th';
}

// Utility function for debouncing search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
