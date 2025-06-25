// This file contains JavaScript code that will make API calls to the FastAPI hosted on Google Cloud Compute.

const apiUrl = 'http://34.30.111.98:8000'; // Replace with your FastAPI instance URL
let autoRefreshInterval;

// Utility functions
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function formatEventData(event) {
    return {
        timestamp: formatTimestamp(event.timestamp),
        outcome: event.outcome || 'Unknown',
        details: event.details || 'No additional details'
    };
}

function updateLastRefreshed() {
    document.getElementById('last-updated').textContent = new Date().toLocaleString();
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="error">❌ ${message}</div>`;
    element.classList.remove('loading');
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = '<div class="loading-spinner">⏳ Loading...</div>';
    element.classList.add('loading');
}

// API functions
async function fetchLatestEvent() {
    showLoading('latest-event');
    try {
        const response = await fetch(`${apiUrl}/latest`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        const formatted = formatEventData(data);
        
        document.getElementById('latest-event').innerHTML = `
            <div class="event-card latest">
                <div class="event-outcome outcome-${formatted.outcome.toLowerCase()}">${formatted.outcome}</div>
                <div class="event-time">${formatted.timestamp}</div>
                <div class="event-details">${formatted.details}</div>
            </div>
        `;
        document.getElementById('latest-event').classList.remove('loading');
    } catch (error) {
        console.error('Error fetching latest event:', error);
        showError('latest-event', 'Failed to fetch latest event');
    }
}

async function fetchEvents(limit = 50) {
    showLoading('events-list');
    try {
        const response = await fetch(`${apiUrl}/events?limit=${limit}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.length === 0) {
            document.getElementById('events-list').innerHTML = '<div class="no-data">No events found</div>';
        } else {
            const eventsHtml = data.map(event => {
                const formatted = formatEventData(event);
                return `
                    <div class="event-item">
                        <span class="event-outcome outcome-${formatted.outcome.toLowerCase()}">${formatted.outcome}</span>
                        <span class="event-time">${formatted.timestamp}</span>
                        <span class="event-details">${formatted.details}</span>
                    </div>
                `;
            }).join('');
            
            document.getElementById('events-list').innerHTML = `<div class="events-container">${eventsHtml}</div>`;
        }
        document.getElementById('events-list').classList.remove('loading');
    } catch (error) {
        console.error('Error fetching events:', error);
        showError('events-list', 'Failed to fetch events');
    }
}

async function fetchStats() {
    showLoading('stats-data');
    try {
        const response = await fetch(`${apiUrl}/stats`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        const statsHtml = Object.entries(data).map(([outcome, count]) => `
            <div class="stat-item">
                <span class="stat-outcome outcome-${outcome.toLowerCase()}">${outcome}</span>
                <span class="stat-count">${count}</span>
            </div>
        `).join('');
        
        document.getElementById('stats-data').innerHTML = `<div class="stats-container">${statsHtml}</div>`;
        document.getElementById('stats-data').classList.remove('loading');
    } catch (error) {
        console.error('Error fetching stats:', error);
        showError('stats-data', 'Failed to fetch statistics');
    }
}

async function refreshAllData() {
    const limit = document.getElementById('event-limit').value;
    await Promise.all([
        fetchLatestEvent(),
        fetchEvents(parseInt(limit)),
        fetchStats()
    ]);
    updateLastRefreshed();
}

function setupAutoRefresh() {
    const checkbox = document.getElementById('auto-refresh');
    
    function startAutoRefresh() {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(refreshAllData, 30000); // 30 seconds
    }
    
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
    
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
    
    // Start auto-refresh if checkbox is checked by default
    if (checkbox.checked) {
        startAutoRefresh();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial data load
    refreshAllData();
    
    // Setup event listeners
    document.getElementById('refresh-btn').addEventListener('click', refreshAllData);
    document.getElementById('event-limit').addEventListener('change', (e) => {
        fetchEvents(parseInt(e.target.value));
    });
    
    // Setup auto-refresh
    setupAutoRefresh();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});