const apiUrl = 'https://api.thrill2.top';
let autoRefreshInterval;

// Utility functions
const formatTimestamp = timestamp => {
    if (!timestamp) return 'Unknown time';
    
    try {
        let date;
        
        // Handle the API format "YYYY-MM-DD HH:MM:SS" as UTC
        if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
            // Parse as UTC and convert to EDT/EST
            date = new Date(timestamp + ' UTC');
        } else if (typeof timestamp === 'string') {
            // Try parsing as ISO string first, then as a number
            date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                // Try parsing as unix timestamp (seconds)
                const numericTimestamp = parseInt(timestamp);
                if (!isNaN(numericTimestamp)) {
                    date = new Date(numericTimestamp * 1000);
                }
            }
        } else if (typeof timestamp === 'number') {
            // Handle unix timestamp (seconds or milliseconds)
            date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
        } else {
            date = new Date(timestamp);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        // Format in EDT/EST timezone
        return date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.warn('Error formatting timestamp:', timestamp, error);
        return 'Invalid date';
    }
};

const formatEventData = event => ({
    timestamp: formatTimestamp(event.ts_utc || event.timestamp),
    outcome: event.outcome || 'Unknown',
    details: event.outcome || 'Event'
});
const updateLastRefreshed = () => {
    document.getElementById('last-updated').textContent = new Date().toLocaleString();
};

function updateElement(elementId, content, isLoading = false) {
    const element = document.getElementById(elementId);
    element.innerHTML = content;
    element.classList.toggle('loading', isLoading);
}

function showLoading(elementId) {
    updateElement(elementId, '<div class="loading-spinner">⏳ Loading...</div>', true);
}

function showError(elementId, message) {
    updateElement(elementId, `<div class="error">❌ ${message}</div>`);
}

// API connection check
async function checkApiConnection() {
    const statusElement = document.getElementById('api-status');
    if (!statusElement) return;
    
    try {
        statusElement.textContent = 'Checking...';
        statusElement.className = 'api-status checking';
        
        const response = await fetch(`${apiUrl}/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        statusElement.textContent = `Connected: ${data.message || 'API Online'}`;
        statusElement.className = 'api-status connected';
    } catch (error) {
        console.error('API connection failed:', error);
        statusElement.textContent = 'API Disconnected';
        statusElement.className = 'api-status disconnected';
    }
}

// API functions
async function fetchLatestEvent() {
    showLoading('latest-event');
    try {
        const response = await fetch(`${apiUrl}/latest`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        console.log('Latest event data:', data); // Debug log
        const formatted = formatEventData(data);
        
        updateElement('latest-event', `
            <div class="event-card latest">
                <div class="event-outcome outcome-${formatted.outcome.toLowerCase().replace(/\s+/g, '-')}">${formatted.outcome}</div>
                <div class="event-time">${formatted.timestamp}</div>
                <div class="event-details">${formatted.details}</div>
            </div>
        `);
    } catch (error) {
        console.error('Error fetching latest event:', error);
        showError('latest-event', 'Failed to fetch latest event');
    }
}

async function fetchEvents(limit = 50) {
    showLoading('events-list');
    try {
        const response = await fetch(`${apiUrl}/events?limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        console.log('Events data:', data); // Debug log
        
        if (data.length === 0) {
            updateElement('events-list', '<div class="no-data">No events found</div>');
        } else {
            const eventsHtml = data.map(event => {
                const formatted = formatEventData(event);
                return `
                    <div class="event-item">
                        <span class="event-outcome outcome-${formatted.outcome.toLowerCase().replace(/\s+/g, '-')}">${formatted.outcome}</span>
                        <span class="event-details">${formatted.details}</span>
                        <span class="event-time">${formatted.timestamp}</span>
                    </div>
                `;
            }).join('');
            
            updateElement('events-list', `<div class="events-container">${eventsHtml}</div>`);
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        showError('events-list', 'Failed to fetch events');
    }
}

async function fetchStats() {
    showLoading('stats-data');
    try {
        const response = await fetch(`${apiUrl}/stats`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        
        const statsHtml = Object.entries(data).map(([outcome, count]) => `
            <div class="stat-item">
                <span class="stat-outcome outcome-${outcome.toLowerCase()}">${outcome}</span>
                <span class="stat-count">${count}</span>
            </div>
        `).join('');
        
        updateElement('stats-data', `<div class="stats-container">${statsHtml}</div>`);
    } catch (error) {
        console.error('Error fetching stats:', error);
        showError('stats-data', 'Failed to fetch statistics');
    }
}

// Refresh functions
async function refreshAllData() {
    const limit = document.getElementById('event-limit').value;
    await Promise.all([
        checkApiConnection(),
        fetchLatestEvent(),
        fetchEvents(parseInt(limit)),
        fetchStats()
    ]);
    updateLastRefreshed();
}

function setupAutoRefresh() {
    const checkbox = document.getElementById('auto-refresh');
    
    const toggleAutoRefresh = () => {
        if (checkbox.checked) {
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(refreshAllData, 30000);
        } else if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    };
    
    checkbox.addEventListener('change', toggleAutoRefresh);
    toggleAutoRefresh(); // Initialize based on default state
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkApiConnection();
    refreshAllData();
    document.getElementById('refresh-btn').addEventListener('click', refreshAllData);
    document.getElementById('event-limit').addEventListener('change', e => {
        fetchEvents(parseInt(e.target.value));
    });
    setupAutoRefresh();
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
});