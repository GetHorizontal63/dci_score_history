// Statistics Page JavaScript

let corpsLogoMap = {};
let availableCorps = [];
let allShowsData = [];
let currentChart = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting initialization');
    
    // Check if basic elements exist
    const corpsSelect = document.getElementById('corpsSelect');
    const loadingContainer = document.querySelector('.loading-container');
    const statsContent = document.querySelector('.stats-content');
    
    console.log('Elements check:', {
        corpsSelect: !!corpsSelect,
        loadingContainer: !!loadingContainer,
        statsContent: !!statsContent
    });
    
    if (!corpsSelect) {
        console.error('CRITICAL: corpsSelect element not found!');
        return;
    }
    
    initializePage();
});

async function initializePage() {
    try {
        console.log('Initializing Statistics page...');
        showLoading(true);
        
        await loadCorpsLogos();
        console.log(`Loaded ${availableCorps.length} corps`);
        
        populateCorpsDropdown();
        console.log('Corps dropdown populated');
        
        await loadAllData();
        console.log(`Loaded ${allShowsData.length} total shows`);
        
        setupEventListeners();
        console.log('Event listeners set up');
        
        // Hide loading and show initial state
        showLoading(false);
        console.log('Statistics page initialized successfully');
        
        // Make sure stats content is hidden initially
        showContent(false);
        
    } catch (error) {
        console.error('Error initializing statistics page:', error);
        showError(`Initialization failed: ${error.message}`);
    }
}

async function loadCorpsLogos() {
    try {
        console.log('Loading corps logos...');
        const response = await fetch('../assets/corps_logos/logo_dictionary.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('Logo CSV text length:', csvText.length);
        
        const lines = csvText.trim().split('\n');
        
        // Parse header to find column indices
        const headers = lines[0].split(',').map(h => h.trim());
        console.log('Logo headers found:', headers); // Debug log
        
        const corpsNameIndex = headers.indexOf('corps');
        const logoFileIndex = headers.indexOf('logo'); 
        const liveIndex = headers.indexOf('live');
        
        console.log('Column indices:', { corpsNameIndex, logoFileIndex, liveIndex }); // Debug log
        console.log('Total lines in CSV:', lines.length); // Debug log
        
        if (corpsNameIndex === -1 || logoFileIndex === -1 || liveIndex === -1) {
            console.error('Required columns not found in CSV. Headers:', headers);
            return;
        }
        
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
            const isLive = liveIndex !== -1 ? liveValue.toLowerCase() === 'true' : true;
            
            if (corpsName && isLive) {
                // Only add corps that are marked as live
                availableCorps.push(corpsName);
                
                // Only add to logo map if logo file exists
                if (logoFile) {
                    corpsLogoMap[corpsName] = logoFile;
                }
            }
        }
        
        // Sort alphabetically (case-insensitive)
        availableCorps.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        console.log('Live corps loaded for statistics:', availableCorps.length);
        console.log('All available corps:', availableCorps); // Debug log to see full list
        
    } catch (error) {
        console.error('Error loading corps logos:', error);
    }
}

function populateCorpsDropdown() {
    const corpsSelect = document.getElementById('corpsSelect');
    corpsSelect.innerHTML = '<option value="">Select a corps...</option>';
    
    // Sort the available corps alphabetically before populating
    const sortedCorps = [...availableCorps].sort((a, b) => a.localeCompare(b));
    
    sortedCorps.forEach(corps => {
        const option = document.createElement('option');
        option.value = corps;
        option.textContent = corps;
        corpsSelect.appendChild(option);
    });
}

async function loadAllData() {
    try {
        console.log('Loading score data from year files...');
        allShowsData = []; // Reset data array
        
        // Get list of available years (1964-2024, excluding 2020)
        const availableYears = [];
        for (let year = 1964; year <= 2024; year++) {
            if (year !== 2020) { // Skip 2020 due to COVID
                availableYears.push(year);
            }
        }
        
        console.log(`Loading data for ${availableYears.length} years...`);
        
        // Load data from each year file
        for (const year of availableYears) {
            try {
                const response = await fetch(`../data/years/${year}_dci_data.csv`);
                if (!response.ok) {
                    console.warn(`Could not load data for year ${year}: ${response.status}`);
                    continue;
                }
                
                const csvText = await response.text();
                const lines = csvText.trim().split('\n');
                
                if (lines.length <= 1) {
                    console.warn(`No data found for year ${year}`);
                    continue;
                }
                
                // Headers: Date,City,State,Place,Corps,Class,Score,Year
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                const dateIndex = headers.indexOf('Date');
                const cityIndex = headers.indexOf('City');
                const stateIndex = headers.indexOf('State');
                const placeIndex = headers.indexOf('Place');
                const corpsIndex = headers.indexOf('Corps');
                const classIndex = headers.indexOf('Class');
                const scoreIndex = headers.indexOf('Score');
                const yearIndex = headers.indexOf('Year');
                
                if (corpsIndex === -1 || scoreIndex === -1 || yearIndex === -1) {
                    console.warn(`Required columns not found in ${year} data. Headers:`, headers);
                    continue;
                }
                
                // Process each show
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
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
                    values.push(current.trim());

                    const show = {
                        Corps: values[corpsIndex] || '',
                        Total_Score: values[scoreIndex] || '',
                        Year: parseInt(values[yearIndex]) || year,
                        Date: values[dateIndex] || '',
                        Placement: values[placeIndex] || '',
                        City: values[cityIndex] || '',
                        State: values[stateIndex] || '',
                        Class: values[classIndex] || '',
                        Location: `${values[cityIndex] || ''}, ${values[stateIndex] || ''}`.replace(', ', ', ').replace(/^, |, $/, '')
                    };

                    if (show.Corps && show.Total_Score) {
                        allShowsData.push(show);
                    }
                }
                
                console.log(`Loaded ${lines.length - 1} shows for year ${year}`);
                
            } catch (error) {
                console.warn(`Error loading data for year ${year}:`, error);
            }
        }

        console.log(`Successfully loaded ${allShowsData.length} total shows for analysis`);
        console.log('Sample shows:', allShowsData.slice(0, 3));
        
    } catch (error) {
        console.error('Error loading score data:', error);
        throw error;
    }
}

function setupEventListeners() {
    const corpsSelect = document.getElementById('corpsSelect');

    corpsSelect.addEventListener('change', () => {
        const selectedCorps = corpsSelect.value;
        console.log('Corps selected:', selectedCorps);
        
        if (selectedCorps) {
            console.log('Starting analysis for:', selectedCorps);
            performAnalysis();
        } else {
            console.log('No corps selected, hiding content');
            // Hide content when no corps selected
            showContent(false);
        }
    });
}

async function performAnalysis() {
    const corpsSelect = document.getElementById('corpsSelect');
    const selectedCorps = corpsSelect.value;

    if (!selectedCorps) {
        showContent(false);
        return;
    }

    showLoading(true);

    try {
        await generateStatistics(selectedCorps);
        showContent(true);
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to generate statistics');
    } finally {
        showLoading(false);
    }
}

async function generateStatistics(corps) {
    console.log(`Generating statistics for: ${corps}`);
    console.log(`Total shows available: ${allShowsData.length}`);
    
    // Filter shows for selected corps (all years)
    const corpsShows = allShowsData.filter(show => show.Corps === corps);
    console.log(`Found ${corpsShows.length} shows for ${corps}`);

    if (corpsShows.length === 0) {
        console.error(`No shows found for ${corps}`);
        console.log('Available corps in data:', [...new Set(allShowsData.map(show => show.Corps))].slice(0, 10));
        throw new Error(`No shows found for ${corps}`);
    }

    // Calculate statistics across all years
    const stats = calculateCorpsStatistics(corpsShows, corps);
    console.log('Calculated stats:', stats);
    
    // Update UI
    updateCorpsProfile(corps, stats);
    updateQuickStats(stats);
    updateChart(corpsShows, corps);
    updateDataTable(corpsShows);
}

function calculateCorpsStatistics(shows, corps) {
    const scores = shows.map(show => parseFloat(show.Total_Score)).filter(score => !isNaN(score));
    const placements = shows.map(show => parseInt(show.Placement)).filter(place => !isNaN(place));
    
    // Get unique years
    const years = [...new Set(shows.map(show => show.Year))].sort((a, b) => a - b);
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const yearsActive = years.length;

    const stats = {
        totalShows: shows.length,
        yearsActive: yearsActive,
        yearRange: yearsActive > 1 ? `${firstYear}-${lastYear}` : firstYear.toString(),
        avgScore: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        highScore: scores.length ? Math.max(...scores) : 0,
        lowScore: scores.length ? Math.min(...scores) : 0,
        avgPlacement: placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length) : 0,
        bestPlacement: placements.length ? Math.min(...placements) : 0,
        improvement: 0
    };

    // Calculate overall improvement (first year avg vs last year avg)
    if (years.length >= 2) {
        const firstYearShows = shows.filter(show => show.Year === firstYear);
        const lastYearShows = shows.filter(show => show.Year === lastYear);
        
        const firstYearScores = firstYearShows.map(show => parseFloat(show.Total_Score)).filter(score => !isNaN(score));
        const lastYearScores = lastYearShows.map(show => parseFloat(show.Total_Score)).filter(score => !isNaN(score));
        
        if (firstYearScores.length > 0 && lastYearScores.length > 0) {
            const firstYearAvg = firstYearScores.reduce((a, b) => a + b, 0) / firstYearScores.length;
            const lastYearAvg = lastYearScores.reduce((a, b) => a + b, 0) / lastYearScores.length;
            stats.improvement = lastYearAvg - firstYearAvg;
        }
    }

    return stats;
}

function updateCorpsProfile(corps, stats) {
    // Update logo
    const logoImg = document.querySelector('.corps-logo-large');
    const logoFile = corpsLogoMap[corps];
    if (logoFile && logoImg) {
        logoImg.src = `../assets/corps_logos/${logoFile}`;
        logoImg.alt = `${corps} logo`;
    }

    // Update corps name and subtitle
    const corpsName = document.querySelector('.corps-name-large');
    const corpsSubtitle = document.querySelector('.corps-subtitle');
    
    if (corpsName) corpsName.textContent = corps;
    if (corpsSubtitle) corpsSubtitle.textContent = `Complete Performance History`;
}

function updateQuickStats(stats) {
    const statElements = {
        'total-shows': stats.totalShows,
        'avg-score': stats.avgScore.toFixed(2),
        'high-score': stats.highScore.toFixed(2),
        'best-placement': stats.bestPlacement || 'N/A',
        'improvement': stats.improvement > 0 ? `+${stats.improvement.toFixed(2)}` : stats.improvement.toFixed(2),
        'avg-placement': stats.avgPlacement.toFixed(1)
    };

    Object.entries(statElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    // Add trend styling to improvement
    const improvementElement = document.getElementById('improvement');
    if (improvementElement) {
        improvementElement.className = 'stat-number';
        if (stats.improvement > 0) {
            improvementElement.classList.add('positive-trend');
        } else if (stats.improvement < 0) {
            improvementElement.classList.add('negative-trend');
        } else {
            improvementElement.classList.add('neutral-trend');
        }
    }
}

function updateChart(shows, corps) {
    const ctx = document.getElementById('scoreTrendChart');
    if (!ctx) return;

    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
    }

    // Group shows by year and calculate yearly averages
    const yearlyData = {};
    shows.forEach(show => {
        const year = show.Year;
        if (!yearlyData[year]) {
            yearlyData[year] = {
                scores: [],
                placements: [],
                shows: []
            };
        }
        
        const score = parseFloat(show.Total_Score);
        const placement = parseInt(show.Placement);
        
        if (!isNaN(score)) yearlyData[year].scores.push(score);
        if (!isNaN(placement)) yearlyData[year].placements.push(placement);
        yearlyData[year].shows.push(show);
    });

    const years = Object.keys(yearlyData).sort((a, b) => a - b);
    const avgScores = years.map(year => {
        const scores = yearlyData[year].scores;
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    
    const avgPlacements = years.map(year => {
        const placements = yearlyData[year].placements;
        return placements.length > 0 ? placements.reduce((a, b) => a + b, 0) / placements.length : 0;
    });

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Average Score',
                    data: avgScores,
                    borderColor: '#EA6020',
                    backgroundColor: 'rgba(234, 96, 32, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Average Placement',
                    data: avgPlacements,
                    borderColor: '#F49B6A',
                    backgroundColor: 'rgba(244, 155, 106, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${corps} - Historical Performance`,
                    color: '#ffffff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cccccc',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Year',
                        color: '#cccccc'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: '#EA6020',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(234, 96, 32, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Average Score',
                        color: '#EA6020'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    reverse: true,
                    ticks: {
                        color: '#F49B6A',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    title: {
                        display: true,
                        text: 'Average Placement',
                        color: '#F49B6A'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6,
                    borderWidth: 2
                }
            }
        }
    });
}

function updateDataTable(shows) {
    const tableBody = document.querySelector('#showsTable tbody');
    if (!tableBody) return;

    // Sort shows by date and year
    const sortedShows = shows.sort((a, b) => {
        // Create comparable date strings
        const dateA = a.Date && a.Year ? `${a.Year}-${a.Date.replace('/', '-')}` : a.Date;
        const dateB = b.Date && b.Year ? `${b.Year}-${b.Date.replace('/', '-')}` : b.Date;
        
        // Parse the dates properly
        let parsedDateA, parsedDateB;
        
        if (a.Date && a.Year && a.Date.includes('/')) {
            const [month, day] = a.Date.split('/');
            parsedDateA = new Date(a.Year, parseInt(month) - 1, parseInt(day));
        } else {
            parsedDateA = new Date(a.Date);
        }
        
        if (b.Date && b.Year && b.Date.includes('/')) {
            const [month, day] = b.Date.split('/');
            parsedDateB = new Date(b.Year, parseInt(month) - 1, parseInt(day));
        } else {
            parsedDateB = new Date(b.Date);
        }
        
        return parsedDateA - parsedDateB;
    });

    tableBody.innerHTML = '';

    sortedShows.forEach((show, index) => {
        const row = document.createElement('tr');
        
        // Handle date formatting - dates in year files are MM/DD format
        let formattedDate = show.Date;
        if (show.Date && show.Year) {
            // If date is in MM/DD format, add the year
            if (show.Date.length <= 5 && show.Date.includes('/')) {
                formattedDate = `${show.Date}/${show.Year}`;
            }
        }
        
        // Calculate trend
        let trendClass = 'neutral-trend';
        let trendText = '-';
        
        if (index > 0) {
            const prevScore = parseFloat(sortedShows[index - 1].Total_Score);
            const currentScore = parseFloat(show.Total_Score);
            
            if (!isNaN(prevScore) && !isNaN(currentScore)) {
                const diff = currentScore - prevScore;
                if (diff > 0) {
                    trendClass = 'positive-trend';
                    trendText = `+${diff.toFixed(2)}`;
                } else if (diff < 0) {
                    trendClass = 'negative-trend';
                    trendText = diff.toFixed(2);
                } else {
                    trendText = '0.00';
                }
            }
        }

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${show.Location || 'N/A'}</td>
            <td>${parseFloat(show.Total_Score).toFixed(2)}</td>
            <td>${show.Placement || 'N/A'}</td>
            <td class="${trendClass}">${trendText}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function showLoading(show) {
    const loadingContainer = document.querySelector('.loading-container');
    const statsContent = document.querySelector('.stats-content');
    
    if (loadingContainer) {
        loadingContainer.style.display = show ? 'block' : 'none';
    }
    
    if (statsContent) {
        statsContent.style.display = show ? 'none' : 'block';
    }
}

function showContent(show = true) {
    const loadingContainer = document.querySelector('.loading-container');
    const statsContent = document.querySelector('.stats-content');
    
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    
    if (statsContent) {
        statsContent.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    const loadingContainer = document.querySelector('.loading-container');
    const statsContent = document.querySelector('.stats-content');
    
    if (loadingContainer) {
        loadingContainer.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error: ${message}</p>
        `;
        loadingContainer.style.display = 'block';
    }
    
    if (statsContent) {
        statsContent.style.display = 'none';
    }
}