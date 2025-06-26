const apiUrl = 'https://api.thrill2.top';
let autoRefreshInterval;

// Utility functions
const formatTimestamp = timestamp => new Date(timestamp).toLocaleString();
const formatEventData = event => ({
    timestamp: formatTimestamp(event.timestamp),
    outcome: event.outcome || 'Unknown',
    details: event.details || 'No additional details'
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
        const formatted = formatEventData(data);
        
        updateElement('latest-event', `
            <div class="event-card latest">
                <div class="event-outcome outcome-${formatted.outcome.toLowerCase()}">${formatted.outcome}</div>
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
        
        if (data.length === 0) {
            updateElement('events-list', '<div class="no-data">No events found</div>');
        } else {
            const eventsHtml = data.map(event => {
                const formatted = formatEventData(event);
                return `
                    <div class="event-item">
                        <span class="event-outcome outcome-${formatted.outcome.toLowerCase()}">${formatted.outcome}</span>
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