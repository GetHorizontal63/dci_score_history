// Records page JavaScript functionality

// Records data for each circuit
const recordsData = {
    DCI: [
        { 
            category: "Highest Score Ever", 
            holder: "Blue Devils", 
            detail: "99.125", 
            year: "2019",
            location: "Indianapolis, IN"
        },
        { 
            category: "Longest Win Streak", 
            holder: "Cadets", 
            detail: "64 consecutive wins", 
            year: "1983-1987",
            location: "Various Locations"
        },
        { 
            category: "Longest Championship Streak", 
            holder: "Blue Devils", 
            detail: "4 consecutive titles", 
            year: "2013-2016",
            location: "Indianapolis, IN"
        },
        { 
            category: "Longest Medal Streak", 
            holder: "Santa Clara Vanguard", 
            detail: "15 consecutive top-3 finishes", 
            year: "1973-1987",
            location: "Various Locations"
        },
        { 
            category: "Longest Finalist Streak", 
            holder: "Blue Devils", 
            detail: "42 consecutive finals appearances", 
            year: "1975-2016",
            location: "Various Locations"
        },
        { 
            category: "Highest Score by 1st Place", 
            holder: "Blue Devils", 
            detail: "99.125", 
            year: "2019",
            location: "Indianapolis, IN"
        },
        { 
            category: "Highest Score by 2nd Place", 
            holder: "Santa Clara Vanguard", 
            detail: "97.825", 
            year: "2019",
            location: "Indianapolis, IN"
        },
        { 
            category: "Lowest Score by 1st Place", 
            holder: "Blue Devils", 
            detail: "87.10", 
            year: "1976",
            location: "Philadelphia, PA"
        },
        { 
            category: "Most Consecutive Caption Wins", 
            holder: "Phantom Regiment", 
            detail: "12 consecutive Visual Performance wins", 
            year: "1996-2008",
            location: "Various Locations"
        },
        { 
            category: "Lowest Placement to Win Caption", 
            holder: "Spirit of JSU", 
            detail: "22nd place - Visual Performance", 
            year: "2019",
            location: "Indianapolis, IN"
        }
    ],
    DCA: [
        { 
            category: "Highest Score Ever", 
            holder: "Reading Buccaneers", 
            detail: "95.100", 
            year: "2023",
            location: "Rochester, NY"
        },
        { 
            category: "Longest Championship Streak", 
            holder: "Reading Buccaneers", 
            detail: "3 consecutive titles", 
            year: "2019, 2021, 2023-2024",
            location: "Rochester, NY"
        },
        { 
            category: "Longest Medal Streak", 
            holder: "Reading Buccaneers", 
            detail: "8 consecutive top-3 finishes", 
            year: "2017-2024",
            location: "Various Locations"
        },
        { 
            category: "Most Caption Wins", 
            holder: "Reading Buccaneers", 
            detail: "Visual Performance specialty", 
            year: "2015-2024",
            location: "Various Locations"
        }
    ],
    VFW: [
        { 
            category: "Highest Score Ever", 
            holder: "Anaheim Kingsmen", 
            detail: "91.90", 
            year: "1971",
            location: "Philadelphia, PA"
        },
        { 
            category: "Most Championships", 
            holder: "27th Lancers", 
            detail: "2 VFW National Championships", 
            year: "1968, 1969",
            location: "Various Locations"
        },
        { 
            category: "Final Championship", 
            holder: "Anaheim Kingsmen", 
            detail: "Last VFW National Champions", 
            year: "1971",
            location: "Philadelphia, PA"
        }
    ],
    CYO: [
        { 
            category: "Highest Score Ever", 
            holder: "Holy Name Cadets", 
            detail: "84.60", 
            year: "1964",
            location: "New York, NY"
        },
        { 
            category: "Most Championships", 
            holder: "Holy Name Cadets", 
            detail: "3 CYO National Championships", 
            year: "1960, 1962, 1964",
            location: "Various Locations"
        },
        { 
            category: "Longest Streak", 
            holder: "Holy Name Cadets", 
            detail: "3 consecutive finals appearances", 
            year: "1962-1964",
            location: "Various Locations"
        }
    ],
    AL: [
        { 
            category: "Highest Score Ever", 
            holder: "Blessed Sacrament Golden Knights", 
            detail: "85.10", 
            year: "1966",
            location: "Chicago, IL"
        },
        { 
            category: "Most Championships", 
            holder: "Blessed Sacrament Golden Knights", 
            detail: "3 American Legion Championships", 
            year: "1962, 1964, 1966",
            location: "Various Locations"
        },
        { 
            category: "Final Championship", 
            holder: "Blessed Sacrament Golden Knights", 
            detail: "Last American Legion Champions", 
            year: "1966",
            location: "Chicago, IL"
        }
    ]
};

// Circuit full names for display
const circuitNames = {
    DCI: "DCI Championship Records",
    DCA: "DCA Championship Records", 
    VFW: "VFW National Championship Records",
    CYO: "CYO National Championship Records",
    AL: "American Legion Championship Records"
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
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
    title.textContent = circuitNames[circuit];
    
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
                <div class="name">${record.holder}</div>
                <div class="score">${record.detail}</div>
            </div>
            <div class="card-runner-up">
                <div class="label">Year</div>
                <div class="name">${record.year}</div>
                <div class="score">${record.location}</div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // If no records, show message
    if (records.length === 0) {
        const message = document.createElement('div');
        message.style.cssText = 'text-align: center; color: #888888; font-style: italic; grid-column: 1 / -1; padding: 40px;';
        message.textContent = `No records available for ${circuit}`;
        container.appendChild(message);
    }
}
