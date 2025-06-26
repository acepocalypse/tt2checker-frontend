const apiUrl = 'https://api.thrill2.top';
let autoRefreshInterval;

// Utility functions
const formatTimestamp = timestamp => {
    if (!timestamp) return 'Unknown time';
    
    try {
        let date;
        
        // First, standardize the input
        if (typeof timestamp === 'string') {
            // Handle the API format "YYYY-MM-DD HH:MM:SS" specially
            if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                // Replace space with 'T' for ISO format and add Z for UTC
                const isoFormat = timestamp.replace(' ', 'T') + 'Z';
                date = new Date(isoFormat);
            } else if (!isNaN(Number(timestamp))) {
                // If it's a numeric string, treat as unix timestamp
                const num = Number(timestamp);
                date = new Date(num > 1e12 ? num : num * 1000);
            } else {
                // Try direct parsing for ISO strings
                date = new Date(timestamp);
            }
        } else if (typeof timestamp === 'number') {
            // Handle unix timestamp (seconds or milliseconds)
            date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
        } else {
            date = new Date(timestamp);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        try {
            // Try full formatting with timezone first
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
        } catch (innerError) {
            // Fallback for browsers that don't support timeZone (like older mobile browsers)
            console.warn('Timezone conversion failed, using UTC:', innerError);
            
            // Simple offset conversion (approximation for EDT/EST)
            const offset = -4; // EDT, or -5 for EST
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const adjustedDate = new Date(utc + (3600000 * offset));
            
            return adjustedDate.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }
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

async function fetchTodayRunStats() {
    showLoading('run-counter');
    try {
        // Get today's events from the API
        const response = await fetch(`${apiUrl}/events?limit=1000`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        console.log('Fetched events for today stats:', data.length);
        
        // Get today's date in Eastern Time
        const now = new Date();
        const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const todayYear = easternTime.getFullYear();
        const todayMonth = easternTime.getMonth() + 1; // Make it 1-indexed for comparison
        const todayDate = easternTime.getDate();
        
        console.log(`Looking for events on: ${todayYear}-${todayMonth.toString().padStart(2, '0')}-${todayDate.toString().padStart(2, '0')}`);
        
        // Filter for today's events
        const todayEvents = data.filter(event => {
            try {
                if (event.ts_utc && typeof event.ts_utc === 'string') {
                    // Handle the API format "YYYY-MM-DD HH:MM:SS"
                    const datePart = event.ts_utc.split(' ')[0]; // Get just the date part
                    const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
                    
                    console.log(`Comparing event date ${year}-${month}-${day} with today ${todayYear}-${todayMonth}-${todayDate}`);
                    
                    return year === todayYear && month === todayMonth && day === todayDate;
                }
                
                if (event.timestamp) {
                    // Convert timestamp to Eastern Time for comparison
                    let eventDate;
                    if (typeof event.timestamp === 'number') {
                        eventDate = new Date(event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000);
                    } else {
                        eventDate = new Date(event.timestamp);
                    }
                    
                    if (!isNaN(eventDate.getTime())) {
                        const eventEastern = new Date(eventDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
                        return (
                            eventEastern.getFullYear() === todayYear &&
                            eventEastern.getMonth() + 1 === todayMonth &&
                            eventEastern.getDate() === todayDate
                        );
                    }
                }
                
                return false;
            } catch (err) {
                console.warn('Error processing event date:', err, event);
                return false;
            }
        });
        
        console.log(`Found ${todayEvents.length} events for today`);
        
        // Count total runs and successful runs
        const totalRuns = todayEvents.length;
        const successfulRuns = todayEvents.filter(event => 
            event.outcome && event.outcome.toLowerCase() === 'success'
        ).length;
        
        // Calculate success percentage
        const successRate = totalRuns > 0 
            ? Math.round((successfulRuns / totalRuns) * 100) 
            : 0;
        
        console.log(`Total runs: ${totalRuns}, Successful: ${successfulRuns}, Rate: ${successRate}%`);
        
        // Update the counter elements
        updateElement('run-counter', `
            <div class="counter-grid">
                <div class="counter-item">
                    <span class="counter-label">Runs Today:</span>
                    <span class="counter-value" id="runs-today">${totalRuns}</span>
                </div>
                <div class="counter-item">
                    <span class="counter-label">Success Rate:</span>
                    <span class="counter-value" id="success-rate">${successRate}%</span>
                </div>
            </div>
        `);
    } catch (error) {
        console.error('Error fetching today\'s run stats:', error);
        showError('run-counter', 'Failed to fetch today\'s run statistics');
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
        fetchStats(),
        fetchTodayRunStats()
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