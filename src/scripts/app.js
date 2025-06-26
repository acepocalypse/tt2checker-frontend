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
        
        // Get today's date in Eastern Time - more robust approach
        const now = new Date();
        const easternFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayEastern = easternFormatter.format(now); // Returns YYYY-MM-DD format
        
        console.log(`Looking for events on Eastern date: ${todayEastern}`);
        console.log(`Current Eastern time: ${now.toLocaleString('en-US', {timeZone: 'America/New_York'})}`);
        
        // Filter for today's events
        const todayEvents = data.filter(event => {
            try {
                if (event.ts_utc && typeof event.ts_utc === 'string') {
                    // Handle the API format "YYYY-MM-DD HH:MM:SS"
                    const datePart = event.ts_utc.split(' ')[0]; // Get just the date part
                    
                    // Convert UTC timestamp to Eastern date
                    const utcDateTime = event.ts_utc.replace(' ', 'T') + 'Z';
                    const utcDate = new Date(utcDateTime);
                    
                    if (!isNaN(utcDate.getTime())) {
                        const easternEventDate = new Intl.DateTimeFormat('en-CA', {
                            timeZone: 'America/New_York',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).format(utcDate);
                        
                        console.log(`Event UTC: ${event.ts_utc} -> Eastern date: ${easternEventDate}`);
                        return easternEventDate === todayEastern;
                    }
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
                        const easternEventDate = new Intl.DateTimeFormat('en-CA', {
                            timeZone: 'America/New_York',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).format(eventDate);
                        
                        console.log(`Event timestamp: ${event.timestamp} -> Eastern date: ${easternEventDate}`);
                        return easternEventDate === todayEastern;
                    }
                }
                
                return false;
            } catch (err) {
                console.warn('Error processing event date:', err, event);
                return false;
            }
        });
        
        console.log(`Found ${todayEvents.length} events for today (${todayEastern})`);
        
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

// Fun Facts functions
function calculateTimeSince(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
        let eventDate;
        
        if (typeof timestamp === 'string') {
            if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                const isoFormat = timestamp.replace(' ', 'T') + 'Z';
                eventDate = new Date(isoFormat);
            } else {
                eventDate = new Date(timestamp);
            }
        } else {
            eventDate = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
        }
        
        if (isNaN(eventDate.getTime())) return 'Unknown';
        
        const now = new Date();
        const diffMs = now - eventDate;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}m`;
        } else {
            return 'Just now';
        }
    } catch (error) {
        console.warn('Error calculating time since:', error);
        return 'Unknown';
    }
}

function findFirstLaunchToday(events) {
    // Get today's date in Eastern Time
    const now = new Date();
    const todayEastern = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);
    
    // Filter for today's events and find the earliest
    const todayEvents = events.filter(event => {
        try {
            let eventDate;
            
            if (event.ts_utc && typeof event.ts_utc === 'string') {
                const utcDateTime = event.ts_utc.replace(' ', 'T') + 'Z';
                eventDate = new Date(utcDateTime);
            } else if (event.timestamp) {
                eventDate = new Date(typeof event.timestamp === 'number' 
                    ? (event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000)
                    : event.timestamp);
            } else {
                return false;
            }
            
            if (isNaN(eventDate.getTime())) return false;
            
            const easternEventDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(eventDate);
            
            return easternEventDate === todayEastern;
        } catch (err) {
            return false;
        }
    });
    
    if (todayEvents.length === 0) return null;
    
    // Sort by timestamp and get the earliest
    const firstEvent = todayEvents.sort((a, b) => {
        const timeA = a.ts_utc || a.timestamp;
        const timeB = b.ts_utc || b.timestamp;
        
        if (typeof timeA === 'string' && typeof timeB === 'string') {
            return timeA.localeCompare(timeB);
        }
        
        const dateA = new Date(timeA);
        const dateB = new Date(timeB);
        return dateA - dateB;
    })[0];
    
    return firstEvent;
}

async function updateFunFacts() {
    try {
        // Get latest event for time since last launch
        const latestResponse = await fetch(`${apiUrl}/latest`);
        if (latestResponse.ok) {
            const latestEvent = await latestResponse.json();
            const timeSince = calculateTimeSince(latestEvent.ts_utc || latestEvent.timestamp);
            document.getElementById('time-since-last').textContent = timeSince;
        } else {
            document.getElementById('time-since-last').textContent = 'Unknown';
        }
        
        // Get all events for other stats
        const eventsResponse = await fetch(`${apiUrl}/events?limit=1000`);
        if (eventsResponse.ok) {
            const events = await eventsResponse.json();
            
            // Find first launch today
            const firstLaunch = findFirstLaunchToday(events);
            if (firstLaunch) {
                const firstLaunchTime = formatTimestamp(firstLaunch.ts_utc || firstLaunch.timestamp);
                // Extract just the time part
                const timeMatch = firstLaunchTime.match(/(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
                document.getElementById('first-launch-time').textContent = timeMatch ? timeMatch[1] : 'Unknown';
            } else {
                document.getElementById('first-launch-time').textContent = 'None today';
            }
            
            // Total launches
            document.getElementById('total-launches').textContent = events.length.toLocaleString();
        } else {
            document.getElementById('first-launch-time').textContent = 'Unknown';
            document.getElementById('total-launches').textContent = 'Unknown';
        }
    } catch (error) {
        console.error('Error updating fun facts:', error);
        document.getElementById('time-since-last').textContent = 'Error';
        document.getElementById('first-launch-time').textContent = 'Error';
        document.getElementById('total-launches').textContent = 'Error';
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
        fetchTodayRunStats(),
        updateFunFacts()
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
    // Update fun facts every minute for the "time since" counter
    setInterval(updateFunFacts, 60000);
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