// GitHub-style Updates Page JavaScript

let updatesData = [];
let filteredUpdates = [];
let roadmapData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Updates Page Loaded');
    
    // Initialize page
    loadUpdatesData();
    loadRoadmapData();
    setupEventListeners();
});

async function loadUpdatesData() {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" vector-effect="non-scaling-stroke"/>
                    <path d="M15 8a7.002 7.002 0 00-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
                </svg>
            </div>
            Loading activity...
        </div>
    `;
    
    try {
        const response = await fetch('../data/recent_updates.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        updatesData = await response.json();
        filteredUpdates = [...updatesData];
        
        // Sort by date (newest first) and then by id (highest first for same date)
        filteredUpdates.sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison === 0) {
                return b.id - a.id;
            }
            return dateComparison;
        });
        
        updateActivityStats();
        displayActivity();
        
    } catch (error) {
        console.error('Error loading updates data:', error);
        displayError('Failed to load activity. Please try again later.');
    }
}

async function loadRoadmapData() {
    const roadmapList = document.getElementById('roadmap-list');
    roadmapList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" vector-effect="non-scaling-stroke"/>
                    <path d="M15 8a7.002 7.002 0 00-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
                </svg>
            </div>
            Loading roadmap...
        </div>
    `;
    
    try {
        const response = await fetch('../data/road_map.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        roadmapData = await response.json();
        
        // Sort by priority (high first) and then by id
        roadmapData.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const priorityComparison = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
            if (priorityComparison === 0) {
                return a.id - b.id;
            }
            return priorityComparison;
        });
        
        displayRoadmap();
        
    } catch (error) {
        console.error('Error loading roadmap data:', error);
        displayRoadmapError('Failed to load roadmap. Please try again later.');
    }
}

function setupEventListeners() {
    const dateFilter = document.getElementById('date-filter');
    const typeFilter = document.getElementById('type-filter');
    
    dateFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    
    // Setup modal event listeners
    setupModalEventListeners();
}

function setupModalEventListeners() {
    const modal = document.getElementById('updateModal');
    const closeBtn = document.getElementById('closeUpdateModal');
    
    // Close modal when clicking the X
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

function applyFilters() {
    const dateFilter = document.getElementById('date-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    
    const today = new Date('2025-08-12');
    const startDate = new Date('2025-08-02');
    
    filteredUpdates = updatesData.filter(update => {
        const updateDate = new Date(update.date);
        
        let matchesDate = true;
        if (dateFilter === 'today') {
            matchesDate = updateDate.toDateString() === today.toDateString();
        } else if (dateFilter === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            matchesDate = updateDate >= weekAgo && updateDate <= today;
        } else if (dateFilter === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            matchesDate = updateDate >= monthAgo && updateDate <= today;
        } else if (dateFilter === 'all') {
            matchesDate = updateDate >= startDate && updateDate <= today;
        }
        // If no date filter selected, show all updates
        
        const matchesType = !typeFilter || update.type === typeFilter;
        return matchesDate && matchesType;
    });
    
    // Sort filtered results
    filteredUpdates.sort((a, b) => {
        const dateComparison = new Date(b.date) - new Date(a.date);
        if (dateComparison === 0) {
            return b.id - a.id;
        }
        return dateComparison;
    });
    
    updateActivityStats();
    displayActivity();
}

function updateActivityStats() {
    const totalUpdates = document.getElementById('total-updates');
    
    // Calculate recent updates (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentCount = filteredUpdates.filter(update => {
        const updateDate = new Date(update.date);
        return updateDate >= oneWeekAgo;
    }).length;
    
    totalUpdates.textContent = `${filteredUpdates.length} update${filteredUpdates.length !== 1 ? 's' : ''}`;
}

function displayActivity() {
    const activityList = document.getElementById('activity-list');
    
    if (filteredUpdates.length === 0) {
        displayEmptyState();
        return;
    }
    
    const activityHTML = filteredUpdates.map(update => createActivityHTML(update)).join('');
    activityList.innerHTML = activityHTML;
}

function displayRoadmap() {
    const roadmapList = document.getElementById('roadmap-list');
    
    if (roadmapData.length === 0) {
        displayRoadmapEmptyState();
        return;
    }
    
    const roadmapHTML = roadmapData.map(item => createRoadmapHTML(item)).join('');
    roadmapList.innerHTML = roadmapHTML;
}

function createActivityHTML(update) {
    const icon = getActivityIcon(update.type);
    const relativeTime = getRelativeTime(update.date);
    
    return `
        <div class="activity-item" data-id="${update.id}" style="cursor: pointer;" onclick="showUpdateModal(${update.id})">
            <div class="activity-icon ${update.type}">
                ${icon}
            </div>
            <div class="activity-content">
                <div class="activity-left">
                    <div class="activity-main">
                        <span class="activity-title">${escapeHtml(update.title)}</span>
                    </div>
                    <div class="activity-description">${escapeHtml(update.description)}</div>
                    <div class="activity-meta">
                        <div class="activity-date">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.75.75 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
                            </svg>
                            ${relativeTime}
                        </div>
                    </div>
                </div>
                <div class="activity-right">
                    <span class="activity-type">${formatUpdateType(update.type)}</span>
                    <span class="activity-priority ${update.priority}">${update.priority}</span>
                </div>
            </div>
        </div>
    `;
}

function createRoadmapHTML(item) {
    const icon = getRoadmapIcon(item.priority);
    
    return `
        <div class="roadmap-item" data-id="${item.id}" style="cursor: pointer;" onclick="showRoadmapModal(${item.id})">
            <div class="activity-icon ${item.priority}">
                ${icon}
            </div>
            <div class="activity-content">
                <div class="activity-left">
                    <div class="activity-main">
                        <span class="activity-title">${escapeHtml(item.title)}</span>
                    </div>
                    <div class="activity-description">${escapeHtml(item.description)}</div>
                    <div class="roadmap-timeline">Target: ${item.target_date}</div>
                </div>
                <div class="activity-right">
                    <span class="activity-type">${formatRoadmapType(item.type)}</span>
                    <span class="roadmap-status ${item.priority}">${item.priority}</span>
                </div>
            </div>
        </div>
    `;
}

function getActivityIcon(type) {
    switch (type) {
        case 'site_update':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/>
            </svg>`;
        case 'data_update':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-9ZM3 4v8h10V4H3Z"/>
                <path d="M4 6h8v1H4V6Zm0 2h8v1H4V8Zm0 2h8v1H4v-1Z"/>
            </svg>`;
        case 'feature_update':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
            </svg>`;
        default:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A16.126 16.126 0 0 1 1.75 16H1.75A1.75 1.75 0 0 1 0 14.25ZM1.5 1.75v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z"/>
            </svg>`;
    }
}

function getRoadmapIcon(priority) {
    switch (priority) {
        case 'high':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/>
            </svg>`;
        case 'medium':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.75.75 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
            </svg>`;
        case 'low':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>
            </svg>`;
        default:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>
            </svg>`;
    }
}

function formatUpdateType(type) {
    switch (type) {
        case 'site_update':
            return 'site';
        case 'data_update':
            return 'data';
        case 'feature_update':
            return 'feature';
        default:
            return 'update';
    }
}

function formatRoadmapType(type) {
    switch (type) {
        case 'data_update':
            return 'data';
        case 'feature':
            return 'feature';
        case 'platform':
            return 'platform';
        case 'content':
            return 'content';
        default:
            return 'item';
    }
}

function getRelativeTime(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInWeeks = Math.floor(diffInDays / 7);
        const diffInMonths = Math.floor(diffInDays / 30);
        
        if (diffInHours < 1) {
            return 'just now';
        } else if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        } else if (diffInDays < 7) {
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        } else if (diffInWeeks < 4) {
            return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
        } else if (diffInMonths < 12) {
            return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } catch (error) {
        return dateString;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayEmptyState() {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = `
        <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/>
            </svg>
            <h3>No activity found</h3>
            <p>There are no updates matching your current filter selection.</p>
        </div>
    `;
}

function displayRoadmapEmptyState() {
    const roadmapList = document.getElementById('roadmap-list');
    roadmapList.innerHTML = `
        <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.75.75 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
            </svg>
            <h3>No roadmap items</h3>
            <p>The roadmap is currently being planned.</p>
        </div>
    `;
}

function displayError(message) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = `
        <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z"/>
            </svg>
            <h3>Error Loading Activity</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

function displayRoadmapError(message) {
    const roadmapList = document.getElementById('roadmap-list');
    roadmapList.innerHTML = `
        <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z"/>
            </svg>
            <h3>Error Loading Roadmap</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

// Modal display functions
function showUpdateModal(updateId) {
    const update = updatesData.find(u => u.id === updateId);
    if (!update) return;
    
    const modal = document.getElementById('updateModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = update.title;
    
    const fullDate = new Date(update.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    modalContent.innerHTML = `
        <div class="update-detail-section">
            <span class="update-detail-label">Description</span>
            <div class="update-detail-content">${escapeHtml(update.description)}</div>
        </div>
        
        ${update.details ? `
        <div class="update-detail-section">
            <span class="update-detail-label">Details</span>
            <div class="update-detail-content">${escapeHtml(update.details)}</div>
        </div>
        ` : ''}
        
        ${update.changes ? `
        <div class="update-detail-section">
            <span class="update-detail-label">Changes Made</span>
            <div class="update-detail-content">${escapeHtml(update.changes)}</div>
        </div>
        ` : ''}
        
        <div class="update-detail-meta">
            <div class="update-meta-item">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.75.75 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
                </svg>
                <span>${fullDate}</span>
            </div>
            <div class="update-meta-item">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
                </svg>
                <span>${formatUpdateType(update.type)}</span>
            </div>
            <div class="update-meta-item">
                <span class="update-priority-badge ${update.priority}">${update.priority}</span>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function showRoadmapModal(itemId) {
    const item = roadmapData.find(r => r.id === itemId);
    if (!item) return;
    
    const modal = document.getElementById('updateModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = item.title;
    
    modalContent.innerHTML = `
        <div class="update-detail-section">
            <span class="update-detail-label">Description</span>
            <div class="update-detail-content">${escapeHtml(item.description)}</div>
        </div>
        
        ${item.details ? `
        <div class="update-detail-section">
            <span class="update-detail-label">Details</span>
            <div class="update-detail-content">${escapeHtml(item.details)}</div>
        </div>
        ` : ''}
        
        ${item.requirements ? `
        <div class="update-detail-section">
            <span class="update-detail-label">Requirements</span>
            <div class="update-detail-content">${escapeHtml(item.requirements)}</div>
        </div>
        ` : ''}
        
        <div class="update-detail-meta">
            <div class="update-meta-item">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.75 3h12.5c.966 0 1.75.784 1.75 1.75v6.5A1.75 1.75 0 0 1 14.25 13H1.75A1.75 1.75 0 0 1 0 11.25v-6.5C0 3.784.784 3 1.75 3ZM1.5 4.75v6.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-6.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z"/>
                    <path d="m8.75 6.85-2.5 1.5a.75.75 0 0 1-1-.65V6.5a.75.75 0 0 1 1-.65l2.5 1.5a.75.75 0 0 1 0 1.3Z"/>
                </svg>
                <span>Target: ${item.target_date}</span>
            </div>
            <div class="update-meta-item">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
                </svg>
                <span>${formatRoadmapType(item.type)}</span>
            </div>
            <div class="update-meta-item">
                <span class="update-priority-badge ${item.priority}">${item.priority}</span>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}
