// DCI Corps Page JavaScript

let corpsData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 9;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Corps Page Loaded');
    
    // Initialize page
    initializeFilters();
    loadCorpsData();
    setupEventListeners();
});

function initializeFilters() {
    // Clear any existing filter options (except the default "All" options)
    const classFilter = document.getElementById('class-filter');
    
    // Clear class filter options except the first one
    while (classFilter.children.length > 1) {
        classFilter.removeChild(classFilter.lastChild);
    }
}

async function loadCorpsData() {
    const tbody = document.getElementById('scores-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-message"><i class="fas fa-spinner fa-spin"></i><br>Loading corps data...</td></tr>';
    
    let jsonFiles = [];
    
    try {
        // Try to get list of files from directory listing first (works locally)
        const response = await fetch('../data/corps/');
        
        if (response.ok) {
            const html = await response.text();
            
            // Parse HTML to extract .json file links
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = Array.from(doc.querySelectorAll('a')).map(a => a.href);
            jsonFiles = links
                .filter(link => link.endsWith('.json') && !link.endsWith('index.json'))
                .map(link => link.split('/').pop());
            
            console.log('Discovered JSON files from directory listing:', jsonFiles);
        } else {
            throw new Error('Directory listing not available');
        }
    } catch (error) {
        console.log('Directory listing failed, falling back to index.json:', error.message);
        
        // Fallback: Load from index.json (works on GitHub Pages)
        try {
            const indexResponse = await fetch('../data/corps/index.json');
            const indexData = await indexResponse.json();
            jsonFiles = indexData.files;
            console.log('Loaded JSON files from index.json:', jsonFiles);
        } catch (indexError) {
            console.error('Failed to load index.json:', indexError);
            tbody.innerHTML = '<tr><td colspan="8" class="error-message">Failed to load corps data</td></tr>';
            return;
        }
    }
    
    // If directory listing succeeded but found no files, use fallback
    if (jsonFiles.length === 0) {
        console.log('No files found in directory listing, falling back to index.json');
        try {
            const indexResponse = await fetch('../data/corps/index.json');
            const indexData = await indexResponse.json();
            jsonFiles = indexData.files;
            console.log('Loaded JSON files from index.json:', jsonFiles);
        } catch (indexError) {
            console.error('Failed to load index.json:', indexError);
            tbody.innerHTML = '<tr><td colspan="8" class="error-message">Failed to load corps data</td></tr>';
            return;
        }
    }
    
    try {
        const corpsPromises = jsonFiles.map(file => loadCorpsFile(file));
        const corpsResults = await Promise.all(corpsPromises);
        
        // Filter out any failed loads
        corpsData = corpsResults.filter(result => result !== null);
        filteredData = [...corpsData];
        populateClassFilter();
        displayCorps();
        updatePagination();
    } catch (error) {
        console.error('Error loading corps data:', error);
        // Display sample data if loading fails
        loadSampleCorpsData();
    }
}

async function discoverCorpsFiles() {
    const existingFiles = [];
    
    // Try a brute force approach - test sequential numbers and see what exists
    let foundCount = 0;
    let consecutiveMisses = 0;
    
    for (let i = 0; i < 10000; i++) {
        try {
            const response = await fetch(`../data/corps/${i}.json`, { method: 'HEAD' });
            if (response.ok) {
                existingFiles.push(`${i}.json`);
                foundCount++;
                consecutiveMisses = 0;
            } else {
                consecutiveMisses++;
                // If we miss too many in a row, break out
                if (consecutiveMisses > 100) break;
            }
        } catch (error) {
            consecutiveMisses++;
            if (consecutiveMisses > 100) break;
        }
    }
    
    console.log(`Brute force discovered ${existingFiles.length} corps files:`, existingFiles);
    return existingFiles;
}

async function loadCorpsFile(filename) {
    try {
        const response = await fetch(`../data/corps/${filename}`);
        if (response.ok) {
            const corpsInfo = await response.json();
            // Extract corps name from filename (remove .json extension and decode any URL encoding)
            const corpsName = decodeURIComponent(filename.replace('.json', ''));
            return {
                name: corpsName,
                ...corpsInfo
            };
        } else {
            console.error(`Failed to load ${filename}`);
            return null;
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return null;
    }
}

function loadSampleCorpsData() {
    // Sample data in case the JSON files fail to load
    corpsData = [
        {
            name: 'Colts',
            location: [{ city: 'Dubuque', state: 'IA', year: '1963-Present' }],
            formerNames: ['Colt .45\'s', 'Colt .45', 'Dubuque Junior Dukes', 'Legionnaires'],
            championships: [{ circuit: 'N/A', year: 'N/A', score: 'N/A', showTitle: 'N/A' }],
            website: 'https://colts.org',
            currentClass: 'DCI World Class',
            historicClasses: [
                { circuit: 'DCI', years: '1973-1991', className: 'Open Class' },
                { circuit: 'DCI', years: '1992-2007', className: 'Division I' },
                { circuit: 'DCI', years: '2008-Present', className: 'World Class' }
            ],
            shows: []
        }
    ];
    filteredData = [...corpsData];
    populateClassFilter();
    displayCorps();
    updatePagination();
}

function populateClassFilter() {
    const classFilter = document.getElementById('class-filter');
    
    // Extract unique classes from the loaded corps data
    const allClasses = new Set();
    
    corpsData.forEach(corps => {
        // Add currentClass if it exists
        if (corps.currentClass && corps.currentClass.trim()) {
            allClasses.add(corps.currentClass.trim());
        }
        
        // Add classes from historicClasses if they exist
        if (corps.historicClasses && Array.isArray(corps.historicClasses)) {
            corps.historicClasses.forEach(historic => {
                if (historic.className && historic.className.trim()) {
                    allClasses.add(historic.className.trim());
                }
            });
        }
    });
    
    // Convert to sorted array and add options
    const sortedClasses = Array.from(allClasses).sort();
    sortedClasses.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classFilter.appendChild(option);
    });
}

function displayCorps() {
    const tbody = document.getElementById('scores-tbody');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-results">No corps found matching your criteria.</td></tr>';
    } else {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageData.map(corps => createCorpsRow(corps)).join('');
    }
    
    // Update map if currently in map view
    const mapView = document.getElementById('map-view');
    if (mapView && mapView.style.display !== 'none' && map) {
        loadCorpsOnMap();
    }
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

function createCorpsRow(corps) {
    const location = getMostRecentLocation(corps.location);
    const locationText = location ? `${location.city}, ${location.state}` : 'Unknown';
    const yearsActive = calculateYearsActive(corps);
    
    // Find the most recent show
    let mostRecentShow = 'No shows listed';
    if (corps.shows && corps.shows.length > 0) {
        const validShows = corps.shows.filter(show => show.year && show.showTitle && show.showTitle.trim() !== '');
        if (validShows.length > 0) {
            const mostRecent = validShows.reduce((latest, current) => {
                return current.year > latest.year ? current : latest;
            });
            mostRecentShow = mostRecent.showTitle;
        }
    }
    
    // Check for championships
    const hasChampionships = corps.championships && 
        corps.championships.length > 0 && 
        corps.championships[0].year !== 'N/A';
    
    const championshipsText = hasChampionships ? 
        `${corps.championships.length} Title${corps.championships.length > 1 ? 's' : ''}` : 
        'None';
    
    // Fix website URL to ensure it has proper protocol
    let websiteUrl = '';
    if (corps.website) {
        websiteUrl = corps.website.trim();
        if (!websiteUrl.match(/^https?:\/\//)) {
            websiteUrl = 'https://' + websiteUrl;
        }
    }
    
    const websiteLink = corps.website ? 
        `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" onclick="event.preventDefault(); event.stopPropagation(); window.open('${websiteUrl}', '_blank');">Visit Website</a>` : 
        'None Listed';
    
    return `
        <tr class="corps-row" onclick="viewCorpsDetails('${corps.name}')">
            <td class="corps-name">${corps.name}</td>
            <td class="corps-class">${corps.currentClass || 'Unknown'}</td>
            <td class="corps-location">${locationText}</td>
            <td class="corps-years">${yearsActive}</td>
            <td class="corps-recent-show" title="${mostRecentShow}">${mostRecentShow}</td>
            <td class="corps-championships">${championshipsText}</td>
            <td class="corps-website" onclick="event.stopPropagation()">${websiteLink}</td>
            <td class="corps-details">
                <button class="details-btn" onclick="event.stopPropagation(); viewCorpsDetails('${corps.name}')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        </tr>
    `;
}

function viewCorpsDetails(corpsName) {
    // Navigate to the corps details page
    window.location.href = `corps-details.html?corps=${encodeURIComponent(corpsName)}`;
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('corps-search');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter dropdown
    const classFilter = document.getElementById('class-filter');
    classFilter.addEventListener('change', handleFilters);
    
    // Pagination buttons
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.addEventListener('click', previousPage);
    nextBtn.addEventListener('click', nextPage);
    
    // View selector buttons
    const tableViewBtn = document.getElementById('table-view-btn');
    const mapViewBtn = document.getElementById('map-view-btn');
    
    if (tableViewBtn) {
        tableViewBtn.addEventListener('click', () => switchView('table'));
    }
    if (mapViewBtn) {
        mapViewBtn.addEventListener('click', () => switchView('map'));
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('corps-search').value.toLowerCase();
    applyFilters(searchTerm);
}

function handleFilters() {
    const searchTerm = document.getElementById('corps-search').value.toLowerCase();
    applyFilters(searchTerm);
}

function applyFilters(searchTerm = '') {
    const classFilter = document.getElementById('class-filter').value;
    
    filteredData = corpsData.filter(corps => {
        // Search filter
        const matchesSearch = !searchTerm || 
            corps.name.toLowerCase().includes(searchTerm) ||
            (corps.location && corps.location.some(loc => 
                loc.city.toLowerCase().includes(searchTerm) || 
                loc.state.toLowerCase().includes(searchTerm)
            )) ||
            (corps.formerNames && corps.formerNames.some(name => 
                name.toLowerCase().includes(searchTerm)
            ));
        
        // Class filter - check both currentClass and historicClasses
        let matchesClass = !classFilter;
        if (classFilter) {
            // Check current class
            matchesClass = corps.currentClass === classFilter;
            
            // If not found in current class, check historic classes
            if (!matchesClass && corps.historicClasses && Array.isArray(corps.historicClasses)) {
                matchesClass = corps.historicClasses.some(historic => 
                    historic.className === classFilter
                );
            }
        }
        
        return matchesSearch && matchesClass;
    });
    
    currentPage = 1; // Reset to first page when filtering
    displayCorps();
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayCorps();
        updatePagination();
        scrollToTop();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayCorps();
        updatePagination();
        scrollToTop();
    }
}

function scrollToTop() {
    const header = document.querySelector('.scores-header');
    header.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Map functionality
let map = null;
let markers = [];

function switchView(viewType) {
    const tableView = document.getElementById('table-view');
    const mapView = document.getElementById('map-view');
    const tableBtn = document.getElementById('table-view-btn');
    const mapBtn = document.getElementById('map-view-btn');
    
    if (viewType === 'table') {
        tableView.style.display = 'block';
        mapView.style.display = 'none';
        tableBtn.classList.add('active');
        mapBtn.classList.remove('active');
    } else if (viewType === 'map') {
        tableView.style.display = 'none';
        mapView.style.display = 'block';
        tableBtn.classList.remove('active');
        mapBtn.classList.add('active');
        
        // Initialize map if not already done
        if (!map) {
            initializeMap();
        }
        // Refresh map to ensure proper display
        setTimeout(() => {
            if (map) {
                map.resize();
                loadCorpsOnMap();
            }
        }, 100);
    }
}

function initializeMap() {
    console.log('initializeMap called');
    const mapContainer = document.getElementById('corps-map');
    if (!mapContainer) {
        console.log('Map container not found');
        return;
    }
    
    console.log('Map container found, setting up Mapbox');
    
    // Set Mapbox access token
    mapboxgl.accessToken = 'pk.eyJ1IjoiZ2V0aG9yaXpvbnRhbDYzIiwiYSI6ImNsYnF5Z253NDBxMG0zcHBrcGw0NWRycXIifQ.g_S98Y2E-ocVnEQhvC5tqw';
    
    try {
        // Create Mapbox map with a working dark style and mercator projection
        map = new mapboxgl.Map({
            container: 'corps-map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-98.5795, 39.8283],
            zoom: 3.6,
            projection: 'mercator'
        });
        
        console.log('Mapbox map created');
        
        // Load corps when map is ready
        map.on('load', function() {
            console.log('Map loaded successfully');
            loadCorpsOnMap();
        });
        
        map.on('error', function(e) {
            console.error('Map error:', e);
        });
        
    } catch (error) {
        console.error('Error creating map:', error);
    }
}

function getClassColor(corps) {
    const currentClass = corps.currentClass || '';
    
    // Define color mapping for different class types
    if (currentClass.includes('World Class') || currentClass.includes('Division I')) {
        return '#FF0000'; // Red for World Class
    } else if (currentClass.includes('Open Class') || currentClass.includes('Division II') || currentClass.includes('Division III')) {
        return '#0000FF'; // Blue for Open Class
    } else if (currentClass.includes('All Age') || currentClass.includes('Class A')) {
        return '#FF8800'; // Orange for All Age
    } else if (currentClass.includes('Inactive')) {
        return '#888888'; // Grey for Inactive
    }
    
    return '#888888'; // Grey for other/unknown
}

function generateMapLegend(corpsToShow) {
    const legendContainer = document.getElementById('legend-items');
    if (!legendContainer) return;
    
    // Get unique classes from the corps being shown
    const uniqueClasses = new Set();
    corpsToShow.forEach(corps => {
        if (corps.currentClass && corps.currentClass.trim()) {
            uniqueClasses.add(corps.currentClass.trim());
        }
    });
    
    // Clear existing legend
    legendContainer.innerHTML = '';
    
    // Sort classes and create legend items
    const sortedClasses = Array.from(uniqueClasses).sort();
    sortedClasses.forEach(className => {
        const color = getClassColor({ currentClass: className });
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'legend-color';
        colorDiv.style.backgroundColor = color;
        
        const span = document.createElement('span');
        span.textContent = className;
        
        legendItem.appendChild(colorDiv);
        legendItem.appendChild(span);
        legendContainer.appendChild(legendItem);
    });
}

function loadCorpsOnMap() {
    if (!map || !map.isStyleLoaded()) {
        console.log('Map or style not ready, retrying...');
        setTimeout(loadCorpsOnMap, 100);
        return;
    }
    
    // Clear existing sources and layers
    if (map.getSource('corps-data')) {
        if (map.getLayer('corps-count-labels')) {
            map.removeLayer('corps-count-labels');
        }
        if (map.getLayer('corps-single-markers')) {
            map.removeLayer('corps-single-markers');
        }
        if (map.getLayer('corps-multi-markers')) {
            map.removeLayer('corps-multi-markers');
        }
        map.removeSource('corps-data');
    }
    
    // Clean up new separate sources if they exist
    if (map.getSource('corps-single-source')) {
        map.removeSource('corps-single-source');
    }
    if (map.getSource('corps-multi-source')) {
        map.removeSource('corps-multi-source');
    }
    
    // Use filtered data if available, otherwise use all corps data
    const corpsToShow = filteredData.length > 0 ? filteredData : corpsData;
    
    // Generate dynamic legend based on corps being shown
    generateMapLegend(corpsToShow);
    
    // Group corps by location (city, state)
    const locationGroups = new Map();
    const features = [];
    let processedCount = 0;
    
    // First, group corps by location
    corpsToShow.forEach(corps => {
        const location = getMostRecentLocation(corps.location || []);
        if (location && location.city && location.state) {
            const locationKey = `${location.city}, ${location.state}`;
            if (!locationGroups.has(locationKey)) {
                locationGroups.set(locationKey, {
                    city: location.city,
                    state: location.state,
                    corps: []
                });
            }
            locationGroups.get(locationKey).corps.push(corps);
        }
    });
    
    // Process each location group
    const totalLocations = locationGroups.size;
    
    locationGroups.forEach((locationData, locationKey) => {
        getCoordinates(locationData.city, locationData.state).then(coords => {
            if (coords) {
                const corpsCount = locationData.corps.length;
                
                if (corpsCount === 1) {
                    // Single corps - use regular circle marker
                    const singleCorps = locationData.corps[0];
                    const color = getClassColor(singleCorps);
                    
                    features.push({
                        type: 'Feature',
                        properties: {
                            city: locationData.city,
                            state: locationData.state,
                            corpsCount: 1,
                            corps: [{ 
                                name: singleCorps.name,
                                currentClass: singleCorps.currentClass || 'Unknown',
                                yearsActive: calculateYearsActive(singleCorps)
                            }],
                            color: color,
                            isMultiple: false,
                            markerId: `single-${locationData.city}-${locationData.state}`
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [coords.lng, coords.lat]
                        }
                    });
                } else {
                    // Multiple corps - create pie chart marker
                    const corpsWithClasses = locationData.corps.map(c => ({
                        name: c.name,
                        currentClass: c.currentClass || 'Unknown',
                        yearsActive: calculateYearsActive(c),
                        color: getClassColor(c)
                    }));
                    
                    // Create pie chart canvas
                    const canvas = document.createElement('canvas');
                    const size = 24;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate class distribution
                    const classCount = {};
                    corpsWithClasses.forEach(corps => {
                        const className = corps.currentClass;
                        if (!classCount[className]) {
                            classCount[className] = { count: 0, color: corps.color, corps: [] };
                        }
                        classCount[className].count++;
                        classCount[className].corps.push(corps);
                    });
                    
                    // Draw pie chart
                    const centerX = size / 2;
                    const centerY = size / 2;
                    const radius = (size / 2) - 2;
                    let currentAngle = 0;
                    
                    Object.entries(classCount).forEach(([className, data]) => {
                        const sliceAngle = (data.count / corpsCount) * 2 * Math.PI;
                        
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                        ctx.closePath();
                        ctx.fillStyle = data.color;
                        ctx.fill();
                        
                        currentAngle += sliceAngle;
                    });
                    
                    // Add white border
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Convert canvas to data URL
                    const imageUrl = canvas.toDataURL();
                    const markerId = `multi-${locationData.city}-${locationData.state}`;
                    
                    // Add image to map
                    if (!map.hasImage(markerId)) {
                        const img = new Image();
                        img.onload = () => {
                            map.addImage(markerId, img);
                        };
                        img.src = imageUrl;
                    }
                    
                    features.push({
                        type: 'Feature',
                        properties: {
                            city: locationData.city,
                            state: locationData.state,
                            corpsCount: corpsCount,
                            corps: corpsWithClasses,
                            color: corpsWithClasses[0].color, // Fallback color
                            isMultiple: true,
                            markerId: markerId,
                            classDistribution: classCount
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [coords.lng, coords.lat]
                        }
                    });
                }
            }
            
            processedCount++;
            if (processedCount === totalLocations) {
                // Add all markers at once
                map.addSource('corps-data', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: features
                    }
                });
                
                // Add circle markers for single corps
                map.addLayer({
                    id: 'corps-single-markers',
                    type: 'circle',
                    source: 'corps-data',
                    filter: ['==', ['get', 'isMultiple'], false],
                    paint: {
                        'circle-radius': 8,
                        'circle-color': ['get', 'color'],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    }
                });
                
                // Add custom image markers for multiple corps (pie charts)
                map.addLayer({
                    id: 'corps-multi-markers',
                    type: 'symbol',
                    source: 'corps-data',
                    filter: ['==', ['get', 'isMultiple'], true],
                    layout: {
                        'icon-image': ['get', 'markerId'],
                        'icon-size': 1,
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true
                    }
                });
                
                // Add text labels for multiple corps locations
                map.addLayer({
                    id: 'corps-count-labels',
                    type: 'symbol',
                    source: 'corps-data',
                    filter: ['>', ['get', 'corpsCount'], 1],
                    layout: {
                        'text-field': ['get', 'corpsCount'],
                        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                        'text-size': 10,
                        'text-offset': [0, 0],
                        'text-anchor': 'center'
                    },
                    paint: {
                        'text-color': '#ffffff',
                        'text-halo-color': '#000000',
                        'text-halo-width': 1
                    }
                });
                
                // Add click popup for both single and multi markers
                const addClickHandler = (layerId) => {
                    map.on('click', layerId, (e) => {
                        const props = e.features[0].properties;
                        const corps = JSON.parse(props.corps);
                        
                        let popupContent = `
                            <div class="map-tooltip">
                                <style>
                                    .map-tooltip {
                                        color: #fff;
                                        font-family: 'Orbitron', 'Bahnschrift', Arial, sans-serif;
                                        background: #1a1a1a;
                                        border: 2px solid #EA6020;
                                        border-radius: 8px;
                                        padding: 15px;
                                        min-width: 220px;
                                        max-width: 300px;
                                    }
                                    .tooltip-header {
                                        color: #EA6020;
                                        font-size: 16px;
                                        font-weight: 600;
                                        margin-bottom: 12px;
                                        text-align: center;
                                        border-bottom: 1px solid #333;
                                        padding-bottom: 8px;
                                    }
                                    .corps-entry {
                                        background: transparent;
                                        border-radius: 6px;
                                        padding: 12px;
                                        margin-bottom: 10px;
                                        border-left: 3px solid #EA6020;
                                    }
                                    .corps-entry:last-child {
                                        margin-bottom: 0;
                                    }
                                    .corps-row {
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;
                                        margin-bottom: 4px;
                                    }
                                    .corps-title {
                                        color: #fff;
                                        font-size: 14px;
                                        font-weight: 600;
                                        flex: 1;
                                    }
                                    .corps-info {
                                        color: #ccc;
                                        font-size: 12px;
                                    }
                                    .info-btn {
                                        background: #EA6020;
                                        color: #fff;
                                        border: none;
                                        width: 20px;
                                        height: 20px;
                                        border-radius: 50%;
                                        font-size: 10px;
                                        font-weight: bold;
                                        cursor: pointer;
                                        transition: background 0.2s ease;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        margin-left: 10px;
                                        flex-shrink: 0;
                                    }
                                    .info-btn:hover {
                                        background: #F49B6A;
                                    }
                                    .class-summary {
                                        background: #2a2a2a;
                                        border-radius: 4px;
                                        padding: 8px;
                                        margin-bottom: 10px;
                                        font-size: 11px;
                                        text-align: center;
                                    }
                                    .class-dot {
                                        display: inline-block;
                                        width: 8px;
                                        height: 8px;
                                        border-radius: 50%;
                                        margin-right: 6px;
                                        vertical-align: middle;
                                    }
                                </style>
                                <div class="tooltip-header">${props.city}, ${props.state}</div>
                        `;
                        
                        if (props.corpsCount === 1) {
                            const singleCorps = corps[0];
                            popupContent += `
                                <div class="corps-entry">
                                    <div class="corps-row">
                                        <div class="corps-title">${singleCorps.name}</div>
                                        <button class="info-btn" onclick="viewCorpsDetails('${singleCorps.name}')" title="View Details">
                                            i
                                        </button>
                                    </div>
                                    <div class="corps-info">${singleCorps.currentClass}</div>
                                </div>
                            `;
                        } else {
                            // Show class breakdown for multiple corps
                            if (props.classDistribution) {
                                const classData = JSON.parse(props.classDistribution);
                                popupContent += `
                                    <div class="class-summary">
                                `;
                                
                                Object.entries(classData).forEach(([className, data]) => {
                                    popupContent += `
                                        <span class="class-dot" style="background-color: ${data.color};"></span>${className}: ${data.count}
                                    `;
                                });
                                
                                popupContent += `</div>`;
                            }
                            
                            popupContent += `
                                <div>
                            `;
                            
                            corps.forEach(c => {
                                popupContent += `
                                    <div class="corps-entry">
                                        <div class="corps-row">
                                            <div class="corps-title">${c.name}</div>
                                            <button class="info-btn" onclick="viewCorpsDetails('${c.name}')" title="View Details">
                                                i
                                            </button>
                                        </div>
                                        <div class="corps-info">${c.currentClass}</div>
                                    </div>
                                `;
                            });
                            
                            popupContent += `
                                </div>
                            `;
                        }
                        
                        popupContent += `</div>`;
                        
                        new mapboxgl.Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(popupContent)
                            .addTo(map);
                    });
                    
                    // Change cursor on hover
                    map.on('mouseenter', layerId, () => {
                        map.getCanvas().style.cursor = 'pointer';
                    });
                    
                    map.on('mouseleave', layerId, () => {
                        map.getCanvas().style.cursor = '';
                    });
                };
                
                addClickHandler('corps-single-markers');
                addClickHandler('corps-multi-markers');
            }
        });
    });
}

// Simple geocoding function using approximate coordinates
// In a production environment, you'd use a proper geocoding service
async function getCoordinates(city, state) {
    // Basic coordinates for common drum corps cities
    const cityCoords = {
        // Major drum corps cities with approximate coordinates
        'Blue Springs': { lat: 39.0169, lng: -94.2816 }, // Missouri
        'Boston': { lat: 42.3601, lng: -71.0589 },
        'Santa Clara': { lat: 37.3541, lng: -121.9552 },
        'Madison': { lat: 43.0731, lng: -89.4012 },
        'Canton': { lat: 40.7989, lng: -81.3781 },
        'Allentown': { lat: 40.6084, lng: -75.4902 },
        'Concord': { lat: 37.9780, lng: -122.0311 },
        'Bloomington': { lat: 40.4842, lng: -88.9937 },
        'Broken Arrow': { lat: 36.0526, lng: -95.7969 },
        'Cedar Falls': { lat: 42.5348, lng: -92.4453 },
        'Rockford': { lat: 42.2711, lng: -89.0940 },
        'Omaha': { lat: 41.2565, lng: -95.9345 },
        'Dayton': { lat: 39.7589, lng: -84.1916 },
        'Riverside': { lat: 33.9533, lng: -117.3962 },
        'Jacksonville': { lat: 30.3322, lng: -81.6557 },
        'Indianapolis': { lat: 39.7684, lng: -86.1581 },
        'Chicago': { lat: 41.8781, lng: -87.6298 },
        'Philadelphia': { lat: 39.9526, lng: -75.1652 },
        'New York': { lat: 40.7128, lng: -74.0060 },
        'Los Angeles': { lat: 34.0522, lng: -118.2437 },
        'Houston': { lat: 29.7604, lng: -95.3698 },
        'Phoenix': { lat: 33.4484, lng: -112.0740 },
        'San Antonio': { lat: 29.4241, lng: -98.4936 },
        'San Diego': { lat: 32.7157, lng: -117.1611 },
        'Dallas': { lat: 32.7767, lng: -96.7970 },
        'Austin': { lat: 30.2672, lng: -97.7431 },
        'Fort Worth': { lat: 32.7555, lng: -97.3308 },
        'Charlotte': { lat: 35.2271, lng: -80.8431 },
        'Denver': { lat: 39.7392, lng: -104.9903 },
        'Seattle': { lat: 47.6062, lng: -122.3321 },
        'Portland': { lat: 45.5152, lng: -122.6784 },
        'Las Vegas': { lat: 36.1699, lng: -115.1398 },
        'Atlanta': { lat: 33.7490, lng: -84.3880 },
        'Miami': { lat: 25.7617, lng: -80.1918 },
        'Tampa': { lat: 27.9506, lng: -82.4572 },
        'Orlando': { lat: 28.5383, lng: -81.3792 },
        'Nashville': { lat: 36.1627, lng: -86.7816 },
        'Memphis': { lat: 35.1495, lng: -90.0490 },
        'Louisville': { lat: 38.2527, lng: -85.7585 },
        'Cincinnati': { lat: 39.1031, lng: -84.5120 },
        'Cleveland': { lat: 41.4993, lng: -81.6944 },
        'Detroit': { lat: 42.3314, lng: -83.0458 },
        'Milwaukee': { lat: 43.0389, lng: -87.9065 },
        'Minneapolis': { lat: 44.9778, lng: -93.2650 },
        'St. Louis': { lat: 38.6270, lng: -90.1994 },
        'Kansas City': { lat: 39.0997, lng: -94.5786 },
        'Oklahoma City': { lat: 35.4676, lng: -97.5164 },
        'Tulsa': { lat: 36.1540, lng: -95.9928 },
        // Additional drum corps cities
        'Fort Mill': { lat: 35.0065, lng: -80.9434 }, // Carolina Crown
        'Dubuque': { lat: 42.5006, lng: -90.6648 }, // Colts
        'Casper': { lat: 42.8666, lng: -106.3131 }, // Troopers
        'North Canton': { lat: 40.8759, lng: -81.4023 }, // Bluecoats
        'Garfield': { lat: 40.8815, lng: -74.1135 }, // Cadets
        'Sacramento': { lat: 38.5816, lng: -121.4944 }, // Mandarins
        'Diamond Bar': { lat: 34.0286, lng: -117.8103 }, // Pacific Crest
        'Rosemont': { lat: 41.9959, lng: -87.8595 }, // Cavaliers
        'La Crosse': { lat: 43.8014, lng: -91.2396 }, // Blue Stars
        'Tempe': { lat: 33.4255, lng: -111.9400 }, // Academy
        'Anaheim': { lat: 33.8366, lng: -117.9143 }, // Anaheim Kingsmen
        'Erie': { lat: 42.1292, lng: -80.0851 }, // Cadets
        'Berlin': { lat: 39.7912, lng: -75.1318 }, // Jersey Surf (NJ)
        'Atco': { lat: 39.7695, lng: -74.8865 }, // Jersey Surf
        'Mount Holly': { lat: 39.9923, lng: -74.7879 }, // Jersey Surf
        'Edinburg': { lat: 26.3017, lng: -98.1633 }, // Genesis
        'Camden County': { lat: 39.8048, lng: -75.0178 }, // Jersey Surf
        'Delaware County': { lat: 39.8334, lng: -75.3976 }, // Crossmen
        'City of Industry': { lat: 34.0192, lng: -117.9598 }, // Pacific Crest
        'Rio Grande Valley': { lat: 26.2034, lng: -98.2300 }, // Genesis
        // Additional smaller cities
        'Hawthorne': { lat: 33.9164, lng: -118.3526 }, // California - Gold
        'Oceanside': { lat: 33.1959, lng: -117.3795 }, // California - Gold
        'Richardson': { lat: 32.9483, lng: -96.7299 }, // Texas
        'Plano': { lat: 33.0198, lng: -96.6989 }, // Texas
        'Frisco': { lat: 33.1507, lng: -96.8236 }, // Texas
        'Allen': { lat: 33.1031, lng: -96.6706 }, // Texas
        'McKinney': { lat: 33.1972, lng: -96.6397 }, // Texas
        'Mesquite': { lat: 32.7668, lng: -96.5992 }, // Texas
        'Garland': { lat: 32.9126, lng: -96.6389 }, // Texas
        'Irving': { lat: 32.8140, lng: -96.9489 }, // Texas
        'Grand Prairie': { lat: 32.7460, lng: -96.9978 }, // Texas
        'Carrollton': { lat: 32.9537, lng: -96.8903 }, // Texas
        'Denton': { lat: 33.2148, lng: -97.1331 }, // Texas
        'Lewisville': { lat: 33.0462, lng: -96.9942 }, // Texas
        'Round Rock': { lat: 30.5083, lng: -97.6789 }, // Texas
        'Sugar Land': { lat: 29.6196, lng: -95.6349 }, // Texas
        'The Woodlands': { lat: 30.1588, lng: -95.4613 }, // Texas
        'Katy': { lat: 29.7858, lng: -95.8244 }, // Texas
        'Pearland': { lat: 29.5638, lng: -95.2861 }, // Texas
        'Pasadena': { lat: 29.6911, lng: -95.2091 }, // Texas (Houston area)
        'Missouri City': { lat: 29.6186, lng: -95.5377 }, // Texas
        'Waco': { lat: 31.5494, lng: -97.1467 }, // Texas
        'Tyler': { lat: 32.3513, lng: -95.3011 }, // Texas
        'College Station': { lat: 30.6280, lng: -96.3344 }, // Texas
        'Beaumont': { lat: 30.0803, lng: -94.1266 }, // Texas
        'Killeen': { lat: 31.1171, lng: -97.7278 }, // Texas
        'Temple': { lat: 31.0982, lng: -97.3428 }, // Texas
        'Bryan': { lat: 30.6744, lng: -96.3700 }, // Texas
        'Pasadena': { lat: 34.1478, lng: -118.1445 }, // California (LA area)
        'Glendale': { lat: 34.1425, lng: -118.2551 }, // California
        'Burbank': { lat: 34.1808, lng: -118.3090 }, // California
        'Torrance': { lat: 33.8358, lng: -118.3406 }, // California
        'Irvine': { lat: 33.6846, lng: -117.8265 }, // California
        'Huntington Beach': { lat: 33.6606, lng: -118.0000 }, // California
        'Newport Beach': { lat: 33.6189, lng: -117.9289 }, // California
        'Costa Mesa': { lat: 33.6411, lng: -117.9187 }, // California
        'Fountain Valley': { lat: 33.7092, lng: -117.9537 }, // California
        'Westminster': { lat: 33.7514, lng: -117.9940 }, // California
        'Garden Grove': { lat: 33.7739, lng: -117.9415 }, // California
        'Santa Ana': { lat: 33.7455, lng: -117.8677 }, // California
        'Orange': { lat: 33.7879, lng: -117.8531 }, // California
        'Fullerton': { lat: 33.8704, lng: -117.9242 }, // California
        'Brea': { lat: 33.9169, lng: -117.9000 }, // California
        'La Habra': { lat: 33.9319, lng: -117.9462 }, // California
        'Cerritos': { lat: 33.8583, lng: -118.0648 }, // California
        'Norwalk': { lat: 33.9022, lng: -118.0817 }, // California
        'Downey': { lat: 33.9401, lng: -118.1326 }, // California
        'Whittier': { lat: 33.9792, lng: -118.0328 } // California
    };
    
    // Return coordinates if we have them
    if (cityCoords[city]) {
        return cityCoords[city];
    }
    
    // Try using free Nominatim geocoding service for unknown cities
    try {
        const encodedCity = encodeURIComponent(city);
        const encodedState = encodeURIComponent(state);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedCity},${encodedState},USA&limit=1`);
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                console.log(`Geocoded ${city}, ${state}:`, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        }
    } catch (error) {
        console.warn(`Failed to geocode ${city}, ${state}:`, error);
    }
    
    // If geocoding fails, return null
    console.warn(`No coordinates found for ${city}, ${state}`);
    return null;
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
