// Score+ Analytics JavaScript

let allData = [];
let filteredData = [];
let chart = null;
let corpsLogos = {};
let corpsAliasMap = {};

// Function to normalize corps names using alias mapping
function normalizeCorpsName(corpsName) {
    return corpsAliasMap[corpsName] || corpsName;
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializePage();
    
    // Load data
    loadAllData();
});

function initializePage() {
    // Hide chart initially
    document.getElementById('score-plus-chart').style.display = 'none';
    document.getElementById('chart-loading').style.display = 'block';
    
    // Load data and setup search interface
    loadAllData();
}

async function loadCorpsLogos() {
    try {
        const response = await fetch('../assets/corps_logos/logo_dictionary.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        // Parse header to find column indices
        const headers = lines[0].split(',').map(h => h.trim());
        const corpsNameIndex = headers.indexOf('corps');
        const logoFileIndex = headers.indexOf('logo');
        const liveIndex = headers.indexOf('live');
        const aliasIndex = headers.indexOf('current_alias');
        
        console.log('Loading corps logos...');
        const logoPromises = [];
        
        // Process ALL lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
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
            values.push(current.trim());
            
            const corpsName = values[corpsNameIndex] || '';
            const logoFile = values[logoFileIndex] || '';
            const liveValue = values[liveIndex] || '';
            const aliasValue = aliasIndex !== -1 ? (values[aliasIndex] || '').trim() : '';
            const isLive = liveIndex !== -1 ? liveValue.toLowerCase() === 'true' : true;
            
            if (corpsName && logoFile && isLive) {
                // Store alias mapping if present
                if (aliasValue) {
                    corpsAliasMap[corpsName] = aliasValue;
                }
                
                const logoPromise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        console.log(`Loaded logo for ${corpsName}: ${logoFile}.png`);
                        
                        // Create a small canvas to resize the image
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 20;
                        canvas.height = 20;
                        ctx.drawImage(img, 0, 0, 20, 20);
                        
                        corpsLogos[corpsName.trim()] = canvas;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load logo for ${corpsName}: ${logoFile}.png`);
                        resolve(); // Don't reject, just continue without this logo
                    };
                    img.src = `../assets/corps_logos/${logoFile}.png`;
                });
                logoPromises.push(logoPromise);
            }
        }
        
        // Wait for all logos to load
        await Promise.all(logoPromises);
        console.log(`Corps logos loaded: ${Object.keys(corpsLogos).length} logos`);
        console.log('Corps alias mappings:', corpsAliasMap);
    } catch (error) {
        console.error('Error loading corps logos:', error);
    }
}

async function loadAllData() {
    try {
        console.log('Starting data load...');
        
        // Load corps logos first
        await loadCorpsLogos();
        
        allData = []; // Reset the array
        
        // Get list of available years from file structure
        const years = await getAvailableYears();
        console.log('Available years:', years);
        
        // Load data for all years
        let loadedYears = 0;
        for (const year of years) {
            try {
                console.log(`Attempting to load data for year: ${year}`);
                const response = await fetch(`../data/years/${year}_dci_data.csv`);
                if (response.ok) {
                    const csvText = await response.text();
                    const yearData = parseCSV(csvText);
                    console.log(`Loaded ${yearData.length} records for ${year}`);
                    allData = allData.concat(yearData);
                    loadedYears++;
                } else {
                    console.warn(`Failed to load ${year} data: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Error loading ${year} data:`, error);
            }
        }
        
        console.log(`Total data loaded: ${allData.length} records from ${loadedYears} years`);
        
        // Populate search interface
        if (allData.length > 0) {
            populateCorpsSearch();
            setupSearchInterface();
        } else {
            console.error('No data was loaded');
            showError('No data was loaded. Please check that the data files are accessible.');
        }
        hideLoading();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data. Please refresh the page.');
    }
}

async function getAvailableYears() {
    const years = [];
    
    // Try years from 1964 to current year and check which files exist
    const currentYear = new Date().getFullYear();
    
    for (let year = 1964; year <= currentYear; year++) {
        try {
            const response = await fetch(`../data/years/${year}_dci_data.csv`, { method: 'HEAD' });
            if (response.ok) {
                years.push(year);
                console.log(`Found data file for year: ${year}`);
            }
        } catch (error) {
            // File doesn't exist, skip silently
        }
    }
    
    console.log(`Found ${years.length} years with available data:`, years);
    return years.sort((a, b) => b - a); // Return in descending order
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
            
            // Convert score to number and add parsed date
            if (row.Score) {
                row.ScoreNum = parseFloat(row.Score);
            }
            if (row.Date && row.Year) {
                row.DateObj = parseEventDate(row.Date, row.Year);
            }
            
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

function parseEventDate(dateStr, year) {
    // Convert MM/DD format to full date
    const [month, day] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

let availableCorpsYears = [];
let selectedCorpsYears = [];

function populateCorpsSearch() {
    console.log('populateCorpsSearch called, allData length:', allData.length);
    
    // Get all unique corps-year combinations, normalizing corps names
    const corpsYearCombos = allData.map(row => {
        const normalizedCorps = normalizeCorpsName(row.Corps);
        return `${normalizedCorps} (${row.Year})`;
    }).filter(combo => combo && !combo.includes('undefined'));
    
    availableCorpsYears = [...new Set(corpsYearCombos)];
    
    // Sort by year descending, then by corps name
    availableCorpsYears.sort((a, b) => {
        const yearA = a.match(/\((\d{4})\)$/)?.[1] || '0';
        const yearB = b.match(/\((\d{4})\)$/)?.[1] || '0';
        if (yearA !== yearB) {
            return yearB - yearA; // Year descending
        }
        return a.localeCompare(b); // Corps name ascending
    });
    
    console.log('Available corps-year combinations:', availableCorpsYears.length);
    updateAvailableCorpsList();
    
    // Load default selections
    loadDefaultSelections();
}

function setupSearchInterface() {
    const searchInput = document.getElementById('corps-search');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        updateAvailableCorpsList(searchTerm);
    });
    
    // Setup cross-class toggle
    const crossClassToggle = document.getElementById('cross-class-toggle');
    const toggleLabel = document.getElementById('toggle-label');
    
    crossClassToggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        toggleLabel.textContent = isChecked ? 'Across All Classes' : 'Within Same Class';
        
        // Recalculate if we have selected corps
        if (selectedCorpsYears.length > 0) {
            generateChart();
        }
    });
}

function updateAvailableCorpsList(searchTerm = '') {
    const availableList = document.getElementById('available-corps');
    
    // Filter corps-years based on search term and remove already selected
    const filteredCorps = availableCorpsYears.filter(combo => {
        const matchesSearch = searchTerm === '' || combo.toLowerCase().includes(searchTerm);
        const notSelected = !selectedCorpsYears.includes(combo);
        return matchesSearch && notSelected;
    });
    
    availableList.innerHTML = '';
    
    filteredCorps.forEach(combo => {
        const item = document.createElement('div');
        item.className = 'corps-item';
        item.textContent = combo;
        item.addEventListener('click', () => selectCorps(combo));
        availableList.appendChild(item);
    });
}

function selectCorps(combo) {
    if (!selectedCorpsYears.includes(combo)) {
        if (selectedCorpsYears.length >= 10) {
            alert('Maximum 10 corps-year combinations can be selected.');
            return;
        }
        
        selectedCorpsYears.push(combo);
        updateSelectedCorpsList();
        updateAvailableCorpsList(); // Refresh to remove selected item
        
        // Clear search input
        document.getElementById('corps-search').value = '';
        
        // Generate chart
        generateChart();
    }
}

function removeCorps(combo) {
    selectedCorpsYears = selectedCorpsYears.filter(c => c !== combo);
    updateSelectedCorpsList();
    updateAvailableCorpsList(); // Refresh to add back removed item
    generateChart();
}

function updateSelectedCorpsList() {
    const selectedList = document.getElementById('selected-corps');
    
    selectedList.innerHTML = '';
    
    selectedCorpsYears.forEach(combo => {
        const item = document.createElement('div');
        item.className = 'corps-item selected';
        item.textContent = combo;
        item.addEventListener('click', () => removeCorps(combo));
        selectedList.appendChild(item);
    });
}

function loadDefaultSelections() {
    const defaultSelections = [
        'Blue Devils (2014)',
        'Bluecoats (2016)', 
        'Vanguard (2018)',
        'Carolina Crown (2013)',
        'Phantom Regiment (2008)'
    ];
    
    // Only add defaults that exist in available data
    defaultSelections.forEach(combo => {
        if (availableCorpsYears.includes(combo) && !selectedCorpsYears.includes(combo)) {
            selectedCorpsYears.push(combo);
        }
    });
    
    // Update UI and generate chart
    updateSelectedCorpsList();
    updateAvailableCorpsList();
    
    if (selectedCorpsYears.length > 0) {
        generateChart();
    }
}

async function generateChart() {
    if (selectedCorpsYears.length === 0) {
        clearChart();
        return;
    }

    showLoading();

    // Filter data to only selected corps-years, using normalized corps names
    filteredData = allData.filter(row => {
        const normalizedCorps = normalizeCorpsName(row.Corps);
        const combo = `${normalizedCorps} (${row.Year})`;
        return selectedCorpsYears.includes(combo) && row.ScoreNum && row.DateObj;
    });

    if (filteredData.length === 0) {
        showError('No data found for the selected corps-years.');
        return;
    }

    // For Score+ calculation, we need all data for each year/class combination
    const allRelevantData = allData.filter(row => {
        // Get unique year/class combinations from filtered data
        const relevantYearClasses = [...new Set(filteredData.map(r => `${r.Year}-${r.Class}`))];
        const rowYearClass = `${row.Year}-${row.Class}`;
        return relevantYearClasses.includes(rowYearClass) && row.ScoreNum && row.DateObj;
    });

    // Calculate Score+ values using all relevant data for proper averages
    calculateScorePlus(allRelevantData);

    // Generate chart
    await createLineChart();

    hideLoading();
}

function clearChart() {
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    document.getElementById('score-plus-chart').style.display = 'none';
    document.getElementById('chart-loading').style.display = 'block';
    document.getElementById('chart-loading').innerHTML = `
        <i class="fas fa-chart-line"></i>
        <p>Select corps-year combinations to view Score+ analysis</p>
    `;
}

function calculateScorePlus(allYearClassData) {
    const crossClassMode = document.getElementById('cross-class-toggle').checked;
    
    if (crossClassMode) {
        // Calculate across all classes - group by year only, using ALL available scores
        const yearGroups = {};
        
        allYearClassData.forEach(row => {
            const key = row.Year;
            if (!yearGroups[key]) {
                yearGroups[key] = [];
            }
            yearGroups[key].push(row);
        });
        
        // Calculate averages for each year using ALL scores from that season
        const yearAverages = {};
        Object.keys(yearGroups).forEach(year => {
            const yearData = yearGroups[year];
            const scores = yearData.map(row => row.ScoreNum);
            yearAverages[year] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        // Apply Score+ calculation to filtered data using year averages (all classes)
        filteredData.forEach(row => {
            const avgScore = yearAverages[row.Year];
            if (avgScore) {
                row.ScorePlus = (row.ScoreNum / avgScore) * 100;
            }
        });
    } else {
        // Calculate within same class only - group by year and class, using only same class scores
        const yearClassGroups = {};
        
        allYearClassData.forEach(row => {
            const key = `${row.Year}-${row.Class}`;
            if (!yearClassGroups[key]) {
                yearClassGroups[key] = [];
            }
            yearClassGroups[key].push(row);
        });
        
        // Calculate averages for each year/class group using only corps with same class designation
        const yearClassAverages = {};
        Object.keys(yearClassGroups).forEach(groupKey => {
            const groupData = yearClassGroups[groupKey];
            const scores = groupData.map(row => row.ScoreNum);
            yearClassAverages[groupKey] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        // Apply Score+ calculation to filtered data using year/class averages (same class only)
        filteredData.forEach(row => {
            const key = `${row.Year}-${row.Class}`;
            const avgScore = yearClassAverages[key];
            if (avgScore) {
                row.ScorePlus = (row.ScoreNum / avgScore) * 100;
            }
        });
    }
}

function createLineChart() {
    const classOptions = document.getElementById('class-options');
    const classes = [...new Set(yearData.map(row => row.Class))].filter(c => c).sort();
    
    classOptions.innerHTML = '';
    
    classes.forEach(className => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.innerHTML = `
            <input type="checkbox" id="class-${className.replace(/\s+/g, '-')}" value="${className}">
            <label for="class-${className.replace(/\s+/g, '-')}">${className}</label>
        `;
        
        const checkbox = option.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', onClassSelectionChange);
        
        classOptions.appendChild(option);
    });
    
    updateClassSelectedText();
}

function onClassSelectionChange() {
    updateClassSelectedText();
    onClassChange();
}

function updateClassSelectedText() {
    const checkboxes = document.querySelectorAll('#class-options input[type="checkbox"]:checked');
    const selectedText = document.getElementById('class-selected-text');
    
    if (checkboxes.length === 0) {
        selectedText.textContent = 'Select Classes...';
    } else if (checkboxes.length === 1) {
        selectedText.textContent = checkboxes[0].value;
    } else {
        selectedText.textContent = `${checkboxes.length} Classes Selected`;
    }
}

function getSelectedClass() {
    const checkboxes = document.querySelectorAll('#class-options input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function clearClassDropdown() {
    document.getElementById('class-options').innerHTML = '';
    document.getElementById('class-selected-text').textContent = 'Select Classes...';
}

function onClassChange() {
    const selectedYears = getSelectedYear();
    const selectedClasses = getSelectedClass();
    
    if (selectedYears.length > 0 && selectedClasses.length > 0) {
        // Filter data and populate corps dropdown (but don't auto-select anything)
        const classData = allData.filter(row => 
            selectedYears.includes(row.Year) && selectedClasses.includes(row.Class)
        );
        populateCorpsDropdown(classData);
        
        // Generate chart with current selections
        generateChart();
    } else {
        clearCorpsDropdown();
        clearChart();
    }
}

function onCorpsChange() {
    const selectedYears = getSelectedYear();
    const selectedClasses = getSelectedClass();
    
    if (selectedYears.length > 0 && selectedClasses.length > 0) {
        // Auto-generate chart when corps selection changes
        generateChart();
    }
}

function populateCorpsDropdown(classData) {
    const corpsOptions = document.getElementById('corps-options');
    const corps = [...new Set(classData.map(row => row.Corps))].filter(c => c).sort();
    
    corpsOptions.innerHTML = '';
    
    corps.forEach(corpsName => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.innerHTML = `
            <input type="checkbox" id="corps-${corpsName.replace(/\s+/g, '-')}" value="${corpsName}">
            <label for="corps-${corpsName.replace(/\s+/g, '-')}">${corpsName}</label>
        `;
        
        const checkbox = option.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', onCorpsSelectionChange);
        
        corpsOptions.appendChild(option);
    });
    
    updateCorpsSelectedText();
}

function closeAllDropdowns() {
    // Close all dropdown menus and remove active states
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.classList.remove('active');
    });
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('active');
    });
}

function setupYearDropdown() {
    const toggle = document.getElementById('year-dropdown-toggle');
    const menu = document.getElementById('year-dropdown-menu');
    
    // Toggle dropdown
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Check if this dropdown is currently open
        const isCurrentlyOpen = toggle.classList.contains('active');
        
        // Close all dropdowns first
        closeAllDropdowns();
        
        // If it wasn't open before, open it now
        if (!isCurrentlyOpen) {
            toggle.classList.add('active');
            menu.classList.add('active');
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function setupClassDropdown() {
    const toggle = document.getElementById('class-dropdown-toggle');
    const menu = document.getElementById('class-dropdown-menu');
    
    // Toggle dropdown
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Check if this dropdown is currently open
        const isCurrentlyOpen = toggle.classList.contains('active');
        
        // Close all dropdowns first
        closeAllDropdowns();
        
        // If it wasn't open before, open it now
        if (!isCurrentlyOpen) {
            toggle.classList.add('active');
            menu.classList.add('active');
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function setupCorpsDropdown() {
    const toggle = document.getElementById('corps-dropdown-toggle');
    const menu = document.getElementById('corps-dropdown-menu');
    
    // Toggle dropdown
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Check if this dropdown is currently open
        const isCurrentlyOpen = toggle.classList.contains('active');
        
        // Close all dropdowns first
        closeAllDropdowns();
        
        // If it wasn't open before, open it now
        if (!isCurrentlyOpen) {
            toggle.classList.add('active');
            menu.classList.add('active');
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function onCorpsSelectionChange() {
    updateCorpsSelectedText();
    onCorpsChange();
}

function updateCorpsSelectedText() {
    const checkboxes = document.querySelectorAll('#corps-options input[type="checkbox"]:checked');
    const selectedText = document.getElementById('corps-selected-text');
    
    if (checkboxes.length === 0) {
        selectedText.textContent = 'Select Corps...';
    } else if (checkboxes.length === 1) {
        selectedText.textContent = checkboxes[0].value;
    } else {
        selectedText.textContent = `${checkboxes.length} Corps Selected`;
    }
}

function getSelectedCorps() {
    const checkboxes = document.querySelectorAll('#corps-options input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function clearCorpsDropdown() {
    document.getElementById('corps-options').innerHTML = '';
    document.getElementById('corps-selected-text').textContent = 'Select Corps...';
}

function calculateScorePlus(allYearClassData) {
    const crossClassMode = document.getElementById('cross-class-toggle').checked;
    
    if (crossClassMode) {
        // Calculate across all classes - group by year only, using ALL available scores
        const yearGroups = {};
        
        allYearClassData.forEach(row => {
            const key = row.Year;
            if (!yearGroups[key]) {
                yearGroups[key] = [];
            }
            yearGroups[key].push(row);
        });
        
        // Calculate averages for each year using ALL scores from that season
        const yearAverages = {};
        Object.keys(yearGroups).forEach(year => {
            const yearData = yearGroups[year];
            const scores = yearData.map(row => row.ScoreNum);
            yearAverages[year] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        // Apply Score+ calculation to filtered data using year averages (all classes)
        filteredData.forEach(row => {
            const avgScore = yearAverages[row.Year];
            if (avgScore) {
                row.ScorePlus = (row.ScoreNum / avgScore) * 100;
            }
        });
    } else {
        // Calculate within same class only - group by year and class, using only same class scores
        const yearClassGroups = {};
        
        allYearClassData.forEach(row => {
            const key = `${row.Year}-${row.Class}`;
            if (!yearClassGroups[key]) {
                yearClassGroups[key] = [];
            }
            yearClassGroups[key].push(row);
        });
        
        // Calculate averages for each year/class group using only corps with same class designation
        const yearClassAverages = {};
        Object.keys(yearClassGroups).forEach(groupKey => {
            const groupData = yearClassGroups[groupKey];
            const scores = groupData.map(row => row.ScoreNum);
            yearClassAverages[groupKey] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        // Apply Score+ calculation to filtered data using year/class averages (same class only)
        filteredData.forEach(row => {
            const key = `${row.Year}-${row.Class}`;
            const avgScore = yearClassAverages[key];
            if (avgScore) {
                row.ScorePlus = (row.ScoreNum / avgScore) * 100;
            }
        });
    }
}

async function createLineChart() {
    const chartCanvas = document.getElementById('score-plus-chart');
    const ctx = chartCanvas.getContext('2d');
    
    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }
    
    // For multiple seasons, we need a different x-axis approach
    // Calculate days from season end for each year separately
    const seasonsByYear = {};
    filteredData.forEach(row => {
        if (!seasonsByYear[row.Year]) {
            seasonsByYear[row.Year] = [];
        }
        seasonsByYear[row.Year].push(row);
    });
    
    // Get true season end dates using ALL data (not just filtered)
    const trueSeasonEndsByYear = {};
    for (const year of Object.keys(seasonsByYear)) {
        // Get all data for this year (including entries without scores)
        const allYearData = allData.filter(row => row.Year == year && row.DateObj);
        if (allYearData.length > 0) {
            // Determine the most common class for this year in the filtered data
            const yearFilteredData = seasonsByYear[year];
            const classCounts = {};
            yearFilteredData.forEach(row => {
                classCounts[row.Class] = (classCounts[row.Class] || 0) + 1;
            });
            const mostCommonClass = Object.keys(classCounts).reduce((a, b) => 
                classCounts[a] > classCounts[b] ? a : b
            );
            
            trueSeasonEndsByYear[year] = await getSeasonEndDate(allYearData, year, mostCommonClass);
        }
    }
    
    // Calculate days from season end for each year using true season end dates
    Object.keys(seasonsByYear).forEach(year => {
        const yearData = seasonsByYear[year];
        const seasonEnd = trueSeasonEndsByYear[year];
        if (seasonEnd) {
            yearData.forEach(row => {
                const diffTime = seasonEnd - row.DateObj;
                row.DaysFromEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            });
        }
    });
    
    // Sort by days from end
    filteredData.sort((a, b) => b.DaysFromEnd - a.DaysFromEnd);
    
    // Group by corps-season combination
    const corpsSeasonData = groupByCorpsAndSeason(filteredData);
    
    // Calculate chart bounds
    const allScorePlus = filteredData.map(row => row.ScorePlus);
    const median = calculateMedian(allScorePlus);
    const minScore = Math.min(...allScorePlus);
    const maxScore = Math.max(...allScorePlus);
    
    const yMin = minScore - (median * 0.03);
    const yMax = maxScore + (median * 0.03);
    
    // Create datasets for corps-season combinations
    const datasets = createCorpsSeasonDatasets(corpsSeasonData);
    
    // Create chart
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Days from Season End',
                        color: '#EA6020',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: '#444444'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    title: {
                        display: true,
                        text: 'Score+',
                        color: '#EA6020',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: '#444444'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(42, 42, 42, 0.95)',
                    titleColor: '#F49B6A',
                    bodyColor: '#ffffff',
                    borderColor: '#EA6020',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            const dataset = context[0].dataset;
                            return dataset.corpsName || dataset.label;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            const daysFromEnd = context.parsed.x;
                            return [
                                `Score+: ${value.toFixed(2)}`,
                                `Days from Season End: ${daysFromEnd}`
                            ];
                        }
                    }
                }
            }
        }
    });
    
    // Show chart
    document.getElementById('chart-loading').style.display = 'none';
    chartCanvas.style.display = 'block';
}

async function getSeasonEndDate(data, year, classType) {
    try {
        // Load the end of season data
        const response = await fetch('../data/end_of_season.json');
        if (!response.ok) {
            console.warn('Could not load end_of_season.json, falling back to data calculation');
            return getSeasonEndDateFromData(data);
        }
        
        const endOfSeasonData = await response.json();
        const yearData = endOfSeasonData.end_of_season[year];
        
        if (!yearData) {
            console.warn(`No end of season data for year ${year}, falling back to data calculation`);
            return getSeasonEndDateFromData(data);
        }
        
        // Find the matching class entry
        const classEntry = yearData.find(entry => entry.class === classType);
        
        if (!classEntry || !classEntry.last_day_of_season) {
            console.warn(`No end of season data for ${year} ${classType}, falling back to data calculation`);
            return getSeasonEndDateFromData(data);
        }
        
        // Parse the date string (format: "8/9/2025")
        const [month, day, fullYear] = classEntry.last_day_of_season.split('/').map(num => parseInt(num));
        return new Date(fullYear, month - 1, day); // month is 0-indexed
        
    } catch (error) {
        console.error('Error loading end of season data:', error);
        return getSeasonEndDateFromData(data);
    }
}

function getSeasonEndDateFromData(data) {
    // Fallback: Find the actual maximum (latest) date in the data
    let maxDate = data[0].DateObj;
    
    data.forEach(row => {
        if (row.DateObj > maxDate) {
            maxDate = row.DateObj;
        }
    });
    
    return maxDate;
}

function groupByCorps(data) {
    const grouped = {};
    data.forEach(row => {
        const normalizedCorps = normalizeCorpsName(row.Corps);
        if (!grouped[normalizedCorps]) {
            grouped[normalizedCorps] = [];
        }
        grouped[normalizedCorps].push(row);
    });
    return grouped;
}

function groupByCorpsAndSeason(data) {
    const grouped = {};
    data.forEach(row => {
        const normalizedCorps = normalizeCorpsName(row.Corps);
        const key = `${normalizedCorps} (${row.Year})`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(row);
    });
    return grouped;
}

function createChartDatasets(corpsData) {
    const colors = ['#EA6020', '#F49B6A', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688'];
    const datasets = [];
    
    Object.keys(corpsData).forEach((corps, index) => {
        const color = colors[index % colors.length];
        const data = corpsData[corps].map(row => ({
            x: row.DaysFromEnd,
            y: row.ScorePlus
        }));
        
        datasets.push({
            label: corps,
            data: data,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6
        });
    });
    
    return datasets;
}

function createCorpsSeasonDatasets(corpsSeasonData) {
    const colors = ['#EA6020', '#F49B6A', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688', '#795548', '#607D8B'];
    const datasets = [];
    
    // Get unique years and assign colors to them
    const years = [...new Set(Object.keys(corpsSeasonData).map(key => {
        // Extract year from "Corps Name (YYYY)" format
        const match = key.match(/\((\d{4})\)$/);
        return match ? match[1] : null;
    }))].filter(year => year !== null).sort();
    
    const yearColorMap = {};
    years.forEach((year, index) => {
        yearColorMap[year] = colors[index % colors.length];
    });
    
    // Create separate datasets for each corps-season, but group in legend by year
    const yearDatasets = {};
    
    Object.keys(corpsSeasonData).forEach((corpsSeasonKey) => {
        // Extract year from corps-season key
        const yearMatch = corpsSeasonKey.match(/\((\d{4})\)$/);
        const year = yearMatch ? yearMatch[1] : 'Unknown';
        const color = year ? yearColorMap[year] : colors[0];
        
        // Extract corps name from "Corps Name (YYYY)" format
        const corpsName = corpsSeasonKey.replace(/\s*\(\d{4}\)$/, '');
        
        const data = corpsSeasonData[corpsSeasonKey].map(row => ({
            x: row.DaysFromEnd,
            y: row.ScorePlus
        }));
        
        // Get logo for this corps
        const logo = corpsLogos[corpsName];
        console.log(`Looking for logo for corps: "${corpsName}", found:`, logo ? 'YES' : 'NO');
        
        const dataset = {
            label: year, // Use year as label for legend grouping
            data: data,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 0, // Hide default circles
            pointHoverRadius: 6,
            corpsName: corpsSeasonKey // Store original name for tooltips
        };
        
        // If we have a logo for this corps, use custom point style
        if (logo) {
            dataset.pointStyle = logo;
            dataset.pointRadius = 3; // Very small logo size
            dataset.pointHoverRadius = 4;
        } else {
            // Fallback to circles if no logo found
            dataset.pointRadius = 2;
            dataset.pointHoverRadius = 4;
        }
        
        // Group datasets by year for legend purposes
        if (!yearDatasets[year]) {
            yearDatasets[year] = [];
        }
        
        yearDatasets[year].push(dataset);
    });
    
    // Flatten the datasets while maintaining year grouping in legend
    Object.keys(yearDatasets).sort().forEach(year => {
        yearDatasets[year].forEach(dataset => {
            datasets.push(dataset);
        });
    });
    
    return datasets;
}

function calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function showLoading() {
    document.getElementById('chart-loading').style.display = 'block';
    document.getElementById('score-plus-chart').style.display = 'none';
}

function hideLoading() {
    document.getElementById('chart-loading').style.display = 'none';
    document.getElementById('score-plus-chart').style.display = 'block';
}

function showError(message) {
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    document.getElementById('score-plus-chart').style.display = 'none';
    document.getElementById('chart-loading').style.display = 'block';
    document.getElementById('chart-loading').innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p style="color: #ff6b6b;">${message}</p>
    `;
}
