// Score+ Page JavaScript - Clean Version

let allData = [];
let filteredData = [];
let chart = null;
let corpsLogos = {};

let availableCorpsYears = [];
let selectedCorpsYears = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializePage);

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
        const csv = await response.text();
        const lines = csv.split('\n');
        
        console.log('Loading corps logos...');
        const logoPromises = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [corps, logoFile] = line.split(',');
                if (corps && logoFile) {
                    const logoPromise = new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            console.log(`Loaded logo for ${corps}: ${logoFile}.png`);
                            
                            // Create a small canvas to resize the image
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 12;
                            canvas.height = 12;
                            ctx.drawImage(img, 0, 0, 20, 20);
                            
                            corpsLogos[corps.trim()] = canvas;
                            resolve();
                        };
                        img.onerror = () => {
                            console.warn(`Failed to load logo for ${corps}: ${logoFile}.png`);
                            resolve(); // Don't reject, just continue without this logo
                        };
                        img.src = `../assets/corps_logos/${logoFile}.png`;
                    });
                    logoPromises.push(logoPromise);
                }
            }
        }
        
        // Wait for all logos to load
        await Promise.all(logoPromises);
        console.log(`Corps logos loaded: ${Object.keys(corpsLogos).length} logos`);
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
    // Return years based on actual files available, not just a range
    const years = [];
    
    // Define the known available years from your file structure
    const availableYears = [
        2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012,
        2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000,
        1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990,
        1989, 1988, 1987, 1986, 1985, 1984, 1983, 1982, 1981, 1980,
        1979, 1978, 1977, 1976, 1975, 1974, 1973, 1972, 1971
    ];
    
    return availableYears;
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = parseCSVLine(line);
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                
                // Convert score to number and parse date
                row.ScoreNum = parseFloat(row.Score);
                if (row.Date && row.Year) {
                    row.DateObj = parseEventDate(row.Date, row.Year);
                }
                
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

function populateCorpsSearch() {
    console.log('populateCorpsSearch called, allData length:', allData.length);
    
    // Get all unique corps-year combinations
    availableCorpsYears = [...new Set(allData.map(row => `${row.Corps} (${row.Year})`))].filter(combo => combo && !combo.includes('undefined'));
    
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
}

function setupSearchInterface() {
    const searchInput = document.getElementById('corps-search');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        updateAvailableCorpsList(searchTerm);
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

function generateChart() {
    if (selectedCorpsYears.length === 0) {
        clearChart();
        return;
    }

    showLoading();

    // Filter data to only selected corps-years
    filteredData = allData.filter(row => {
        const combo = `${row.Corps} (${row.Year})`;
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
    createLineChart();

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
    // Group ALL year/class data for proper average calculation
    const yearClassGroups = {};
    
    allYearClassData.forEach(row => {
        const key = `${row.Year}-${row.Class}`;
        if (!yearClassGroups[key]) {
            yearClassGroups[key] = [];
        }
        yearClassGroups[key].push(row);
    });
    
    // Calculate averages for each year/class group using ALL data
    const yearClassAverages = {};
    Object.keys(yearClassGroups).forEach(groupKey => {
        const groupData = yearClassGroups[groupKey];
        const scores = groupData.map(row => row.ScoreNum);
        yearClassAverages[groupKey] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });
    
    // Apply Score+ calculation to ONLY the filtered (selected) data
    filteredData.forEach(row => {
        const key = `${row.Year}-${row.Class}`;
        const avgScore = yearClassAverages[key];
        if (avgScore) {
            row.ScorePlus = (row.ScoreNum / avgScore) * 100;
        }
    });
}

function createLineChart() {
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
    
    // Calculate days from season end for each year
    Object.keys(seasonsByYear).forEach(year => {
        const yearData = seasonsByYear[year];
        const seasonEnd = getSeasonEndDate(yearData);
        yearData.forEach(row => {
            const diffTime = seasonEnd - row.DateObj;
            row.DaysFromEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });
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

function getSeasonEndDate(data) {
    // Find the date closest to December 1st of the selected year
    const year = parseInt(data[0].Year);
    const december1st = new Date(year, 11, 1); // December 1st
    
    let closestDate = data[0].DateObj;
    let minDiff = Math.abs(december1st - closestDate);
    
    data.forEach(row => {
        const diff = Math.abs(december1st - row.DateObj);
        if (diff < minDiff) {
            minDiff = diff;
            closestDate = row.DateObj;
        }
    });
    
    return closestDate;
}

function groupByCorpsAndSeason(data) {
    const grouped = {};
    data.forEach(row => {
        const key = `${row.Corps} (${row.Year})`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(row);
    });
    return grouped;
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
