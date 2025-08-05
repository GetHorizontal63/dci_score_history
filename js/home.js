// DCI Home page JavaScript

let recentUpdates = [];
let currentUpdateIndex = 0;
let slides = [];
let currentSlideIndex = 0;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Home Page Loaded');
    
    // Initialize slideshow
    initializeSlideshow();
    
    // Load recent updates
    loadRecentUpdates();
    
    // Initialize search functionality
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            this.parentElement.style.borderColor = '#ff6b35';
        });
        
        searchInput.addEventListener('blur', function() {
            this.parentElement.style.borderColor = '#444444';
        });
    }
    
    // Add hover effects to cards
    const heroCards = document.querySelectorAll('.hero-card');
    heroCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = this.classList.contains('featured') 
                ? 'scale(1.08) translateY(-5px)' 
                : 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = this.classList.contains('featured') 
                ? 'scale(1.05)' 
                : 'translateY(0)';
        });
    });
    
    // Updates navigation
    const prevBtn = document.getElementById('prev-update');
    const nextBtn = document.getElementById('next-update');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentUpdateIndex = (currentUpdateIndex - 1 + recentUpdates.length) % recentUpdates.length;
            displayCurrentUpdate();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentUpdateIndex = (currentUpdateIndex + 1) % recentUpdates.length;
            displayCurrentUpdate();
        });
    }
    
    // View all updates button
    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            window.location.href = 'html/updates.html';
        });
    }
    
    // Auto-cycle through updates every 8 seconds
    setInterval(() => {
        if (recentUpdates.length > 1) {
            currentUpdateIndex = (currentUpdateIndex + 1) % recentUpdates.length;
            displayCurrentUpdate();
        }
    }, 8000);
});

async function loadRecentUpdates() {
    try {
        const response = await fetch('../data/recent_updates.json');
        if (response.ok) {
            recentUpdates = await response.json();
            // Sort by date (newest first)
            recentUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));
            displayCurrentUpdate();
        } else {
            throw new Error('Failed to load updates');
        }
    } catch (error) {
        console.error('Error loading recent updates:', error);
        const updateText = document.getElementById('current-update');
        if (updateText) {
            updateText.textContent = 'Welcome to DCI Analytics - Your source for drum corps data';
        }
    }
}

function displayCurrentUpdate() {
    const updateText = document.getElementById('current-update');
    if (updateText && recentUpdates.length > 0) {
        const update = recentUpdates[currentUpdateIndex];
        const updateDate = new Date(update.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        updateText.textContent = `${updateDate}: ${update.title} - ${update.description}`;
    }
}

function initializeSlideshow() {
    slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        // Start slideshow - change every 5 seconds
        setInterval(nextSlide, 5000);
    }
}

function nextSlide() {
    if (slides.length === 0) return;
    
    // Remove active class from current slide
    slides[currentSlideIndex].classList.remove('active');
    
    // Move to next slide
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    
    // Add active class to new slide
    slides[currentSlideIndex].classList.add('active');
}
