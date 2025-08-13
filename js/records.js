// Records page JavaScript functionality

// Global variables to store loaded data
let recordsData = {};
let circuitNames = {};

// Load records data from JSON files
async function loadRecordsData() {
    try {
        // Load the records index to get available circuits
        const indexResponse = await fetch('../data/records/records_index.json');
        const index = await indexResponse.json();
        
        // Load data for each circuit
        for (const circuit of index.circuits) {
            if (circuit.active) {
                const response = await fetch(`../data/records/${circuit.file}`);
                const data = await response.json();
                
                // Combine regular records with top scores as a special record
                let combinedRecords = [...data.records];
                
                // Add top scores as a special record card if we have top scores data
                if (data.topScores && data.topScores.length > 0) {
                    const topScoresDetail = formatTopScoresFromData(data.topScores);
                    const topScoresRecord = {
                        category: "Top 10 Scores Ever",
                        holder: "Historical Leaderboard", 
                        detail: topScoresDetail,
                        year: "All Years",
                        location: "Various Locations"
                    };
                    // Replace the third record (index 2) with top scores
                    combinedRecords[2] = topScoresRecord;
                }
                
                recordsData[circuit.code] = combinedRecords;
                circuitNames[circuit.code] = data.circuitName + " Records";
            }
        }
    } catch (error) {
        console.error('Error loading records data:', error);
        // Fallback to empty data
        recordsData = { DCI: [], DCA: [], VFW: [], CYO: [], AL: [] };
        circuitNames = {
            DCI: "DCI Championship Records",
            DCA: "DCA Championship Records",
            VFW: "VFW National Championship Records",
            CYO: "CYO National Championship Records",
            AL: "American Legion Championship Records"
        };
    }
}

// Format top scores from existing topScores data
function formatTopScoresFromData(topScores) {
    // Group by rank to handle ties
    const groupedByRank = {};
    topScores.forEach(score => {
        if (!groupedByRank[score.rank]) {
            groupedByRank[score.rank] = [];
        }
        groupedByRank[score.rank].push(score);
    });
    
    const formattedLines = [];
    Object.keys(groupedByRank).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rank => {
        const scores = groupedByRank[rank];
        if (scores.length === 1) {
            const s = scores[0];
            formattedLines.push(`${rank}. ${s.score} - ${s.corps} (${s.year})`);
        } else {
            const corpsYears = scores.map(s => `${s.corps} (${s.year})`).join(' & ');
            formattedLines.push(`${rank}. ${scores[0].score} - ${corpsYears}`);
        }
    });
    
    return formattedLines.join('\n');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    await loadRecordsData();
    setupTabs();
    displayRecords('DCI');
});

// Setup tab functionality
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get the circuit and display records
            const circuit = this.dataset.circuit;
            displayRecords(circuit);
        });
    });
}

// Display records for selected circuit
function displayRecords(circuit) {
    const title = document.getElementById('circuit-title');
    const container = document.getElementById('records-cards-container');
    
    // Update title
    title.textContent = circuitNames[circuit] || `${circuit} Records`;
    
    // Clear existing cards
    container.innerHTML = '';
    
    // Get records for the circuit
    const records = recordsData[circuit] || [];
    
    // Create cards
    records.forEach((record, index) => {
        const card = document.createElement('div');
        card.className = 'record-card';
        
        // Add tall class for positions 3 and 4 (0-indexed: 2, 3)
        if (index === 2 || index === 3) {
            card.className += ' tall';
        }
        
        card.innerHTML = `
            <div class="card-year">${record.category}</div>
            <div class="card-champion">
                <div class="label">Record Holder</div>
                <div class="name ${record.category === 'Top 10 Scores Ever' ? 'top-scores-list' : ''}">${record.holder}</div>
                <div class="score ${record.category === 'Top 10 Scores Ever' ? 'top-scores-detail' : ''}">${record.detail}</div>
            </div>
            ${record.category === 'Top 10 Scores Ever' ? '' : `<div class="card-runner-up">
                <div class="label">Year</div>
                <div class="name">${record.year}</div>
                <div class="score">${record.location}</div>
            </div>`}
        `;
        
        container.appendChild(card);
    });
    
    // If no records, show message
    if (records.length === 0) {
        showNoDataMessage(container, circuit, 'records');
    }
}

// Show no data message
function showNoDataMessage(container, circuit, dataType) {
    const message = document.createElement('div');
    message.style.cssText = 'text-align: center; color: #888888; font-style: italic; grid-column: 1 / -1; padding: 40px;';
    message.textContent = `No ${dataType} available for ${circuit}`;
    container.appendChild(message);
}
