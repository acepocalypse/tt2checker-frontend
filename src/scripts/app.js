const apiUrl = 'https://api.thrill2.top';
let autoRefreshInterval;

// Utility functions
const formatTimestamp = timestamp => {
    if (!timestamp) return 'Unknown time';
    
    try {
        let date;
        
        // First, standardize the input
        if (typeof timestamp === 'string') {
            // Handle Unix timestamp strings (like "1751029244.14846")
            if (!isNaN(Number(timestamp))) {
                const num = Number(timestamp);
                // Convert to milliseconds if needed (Unix timestamps are in seconds)
                date = new Date(num * 1000);
            } else if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                // Handle the legacy API format "YYYY-MM-DD HH:MM:SS"
                const isoFormat = timestamp.replace(' ', 'T') + 'Z';
                date = new Date(isoFormat);
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
    timestamp: formatTimestamp(event.ts || event.ts_utc || event.timestamp),
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

async function fetchQueueData() {
    try {
        const response = await fetch(`${apiUrl}/queue`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching queue data:', error);
        return [];
    }
}

function findClosestQueueStatus(eventTimestamp, queueData) {
    if (!queueData || queueData.length === 0) return null;
    
    // Convert event timestamp to number for comparison
    let eventTime;
    if (typeof eventTimestamp === 'string') {
        eventTime = !isNaN(Number(eventTimestamp)) ? Number(eventTimestamp) : new Date(eventTimestamp).getTime() / 1000;
    } else {
        eventTime = eventTimestamp > 1e12 ? eventTimestamp / 1000 : eventTimestamp;
    }
    
    // Find the queue entry with timestamp closest to but before the event
    let closestQueue = null;
    let smallestDiff = Infinity;
    
    for (const queue of queueData) {
        const queueTime = queue.ts;
        const timeDiff = Math.abs(eventTime - queueTime);
        
        // Prefer queue data that's before or very close to the event time
        if (timeDiff < smallestDiff && queueTime <= eventTime + 300) { // Allow 5 min tolerance
            smallestDiff = timeDiff;
            closestQueue = queue;
        }
    }
    
    return closestQueue;
}

async function fetchEvents(limit = 50) {
    showLoading('events-list');
    try {
        const [eventsResponse, queueData] = await Promise.all([
            fetch(`${apiUrl}/events?limit=${limit}`),
            fetchQueueData()
        ]);
        
        if (!eventsResponse.ok) throw new Error(`HTTP ${eventsResponse.status}: ${eventsResponse.statusText}`);
        
        const data = await eventsResponse.json();
        console.log('Events data:', data);
        console.log('Queue data:', queueData);
        
        if (data.length === 0) {
            updateElement('events-list', '<div class="no-data">No events found</div>');
        } else {
            const eventsHtml = data.map(event => {
                const formatted = formatEventData(event);
                const queueStatus = findClosestQueueStatus(event.ts || event.ts_utc || event.timestamp, queueData);
                
                let queueHtml = '';
                if (queueStatus) {
                    const isOpen = queueStatus.is_open === 1;
                    const statusText = isOpen ? 'Open' : 'Closed';
                    const waitText = isOpen && queueStatus.wait_time ? `${queueStatus.wait_time} min` : '';
                    
                    queueHtml = `
                        <div class="queue-status">
                            <span class="queue-open-status ${isOpen ? 'open' : 'closed'}">${statusText}</span>
                            ${waitText ? `<span class="queue-wait-time">${waitText}</span>` : ''}
                        </div>
                    `;
                }
                
                return `
                    <div class="event-item">
                        <span class="event-outcome outcome-${formatted.outcome.toLowerCase().replace(/\s+/g, '-')}">${formatted.outcome}</span>
                        <div class="event-details">
                            <span class="event-time">${formatted.timestamp}</span>
                            ${queueHtml}
                        </div>
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
        const response = await fetch(`${apiUrl}/events?limit=1000`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        console.log('Fetched events for today stats:', data.length);
        
        // Get today's date in Eastern Time
        const now = new Date();
        const timeZone = "America/New_York";
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayEastern = formatter.format(now); // YYYY-MM-DD format
        
        console.log(`Looking for events on Eastern date: ${todayEastern}`);
        
        // Filter for today's events using Eastern Time dates
        const todayEvents = data.filter(event => {
            try {
                if (!event) return false;
                
                const timestamp = event.ts || event.ts_utc || event.timestamp;
                if (!timestamp) return false;
                
                let eventDate;
                if (typeof timestamp === 'string') {
                    if (!isNaN(Number(timestamp))) {
                        // Handle Unix timestamp strings (like "1751029244.14846")
                        const num = Number(timestamp);
                        eventDate = new Date(num * 1000);
                    } else if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                        // Handle "YYYY-MM-DD HH:MM:SS" format (assume UTC)
                        const isoFormat = timestamp.replace(' ', 'T') + 'Z';
                        eventDate = new Date(isoFormat);
                    } else {
                        eventDate = new Date(timestamp);
                    }
                } else if (typeof timestamp === 'number') {
                    eventDate = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
                }
                
                if (eventDate && !isNaN(eventDate.getTime())) {
                    // Convert event time to Eastern Time date string
                    const eventDateEastern = formatter.format(eventDate);
                    return eventDateEastern === todayEastern;
                }
                
                return false;
            } catch (err) {
                console.warn('Error processing event date:', err, event);
                return false;
            }
        });
        
        console.log(`Found ${todayEvents.length} events for today (${todayEastern} Eastern)`);
        
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
            // Handle Unix timestamp strings (like "1751029244.14846")
            if (!isNaN(Number(timestamp))) {
                const num = Number(timestamp);
                eventDate = new Date(num * 1000);
            } else if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
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
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        // Enhanced output format to include days when applicable
        if (diffDays > 0) {
            return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
        } else if (diffHours > 0) {
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
    if (!Array.isArray(events) || events.length === 0) {
        console.log('No events provided or empty array');
        return null;
    }
    
    // Get today's date in Eastern Time
    const now = new Date();
    const timeZone = "America/New_York";
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayEastern = formatter.format(now); // YYYY-MM-DD format
    
    console.log(`Looking for events matching today: ${todayEastern} (Eastern)`);
    
    // Filter events for today and convert timestamps to comparable format
    const todayEventsWithTimestamps = events.map(event => {
        try {
            if (!event) return null;
            
            const timestamp = event.ts || event.ts_utc || event.timestamp;
            if (!timestamp) {
                console.log('Event missing timestamp:', event);
                return null;
            }
            
            let eventDate;
            let numericTimestamp;
            
            if (typeof timestamp === 'string') {
                if (!isNaN(Number(timestamp))) {
                    // Handle Unix timestamp strings (like "1751029244.14846")
                    numericTimestamp = Number(timestamp);
                    eventDate = new Date(numericTimestamp * 1000);
                } else if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                    // Handle "YYYY-MM-DD HH:MM:SS" format (assume UTC)
                    const isoFormat = timestamp.replace(' ', 'T') + 'Z';
                    eventDate = new Date(isoFormat);
                    numericTimestamp = eventDate.getTime() / 1000;
                } else {
                    // Try direct parsing for other formats
                    eventDate = new Date(timestamp);
                    numericTimestamp = eventDate.getTime() / 1000;
                }
            } else if (typeof timestamp === 'number') {
                // Handle numeric timestamps
                numericTimestamp = timestamp > 1e12 ? timestamp / 1000 : timestamp;
                eventDate = new Date(numericTimestamp * 1000);
            }
            
            if (!eventDate || isNaN(eventDate.getTime())) {
                return null;
            }
            
            // Convert to Eastern Time for comparison
            const eventDateEastern = formatter.format(eventDate);
            
            if (eventDateEastern === todayEastern) {
                console.log(`Event matches today: ${timestamp} -> ${eventDate.toISOString()} (Eastern: ${eventDateEastern})`);
                return {
                    ...event,
                    numericTimestamp,
                    eventDate
                };
            }
            
            return null;
        } catch (err) {
            console.warn('Error processing event date in filter:', err, event);
            return null;
        }
    }).filter(event => event !== null);
    
    console.log(`Found ${todayEventsWithTimestamps.length} events for today (${todayEastern} Eastern)`);
    
    if (todayEventsWithTimestamps.length === 0) {
        console.log('No events found for today');
        return null;
    }
    
    // Sort by numeric timestamp (ascending - earliest first)
    try {
        const sortedEvents = todayEventsWithTimestamps.sort((a, b) => {
            const timeA = a.numericTimestamp;
            const timeB = b.numericTimestamp;
            console.log(`Comparing: ${timeA} (${a.eventDate.toISOString()}) vs ${timeB} (${b.eventDate.toISOString()})`);
            return timeA - timeB;
        });
        
        const firstEvent = sortedEvents[0];
        console.log(`First event today: ${firstEvent.numericTimestamp} -> ${firstEvent.eventDate.toISOString()}`);
        
        // Log all events for debugging
        sortedEvents.forEach((event, index) => {
            console.log(`Event ${index + 1}: ${event.numericTimestamp} -> ${event.eventDate.toISOString()}`);
        });
        
        return firstEvent;
    } catch (error) {
        console.error('Error sorting events:', error);
        return todayEventsWithTimestamps[0]; // Fallback to first event without sorting if error occurs
    }
}

async function updateFunFacts() {
    try {
        // Get latest event for time since last launch
        const latestResponse = await fetch(`${apiUrl}/latest`);
        if (latestResponse.ok) {
            const latestEvent = await latestResponse.json();
            const timeSince = calculateTimeSince(latestEvent.ts || latestEvent.ts_utc || latestEvent.timestamp);
            document.getElementById('time-since-last').textContent = timeSince || 'Just now';
        } else {
            document.getElementById('time-since-last').textContent = 'No data';
        }
        
        // Get all events for other stats
        const eventsResponse = await fetch(`${apiUrl}/events?limit=1000`);
        if (eventsResponse.ok) {
            const events = await eventsResponse.json();
            console.log(`Fetched ${events.length} events for fun facts`);
            
            // Find first launch today
            const firstLaunch = findFirstLaunchToday(events);
            if (firstLaunch) {
                const firstLaunchTime = formatTimestamp(firstLaunch.ts || firstLaunch.ts_utc || firstLaunch.timestamp);
                // Extract just the time part
                const timeMatch = firstLaunchTime.match(/(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
                document.getElementById('first-launch-time').textContent = timeMatch ? timeMatch[1] : 'Unknown';
                console.log(`First launch today at: ${timeMatch ? timeMatch[1] : 'Unknown'}`);
            } else {
                document.getElementById('first-launch-time').textContent = 'Not yet today';
                console.log('No launches found for today');
            }
            
            // Total launches
            document.getElementById('total-launches').textContent = events.length.toLocaleString();
            
            // Add success rate calculation - new after codebase sync
            const successfulLaunches = events.filter(event => 
                event.outcome && event.outcome.toLowerCase() === 'success'
            ).length;
            const successRate = events.length > 0 
                ? ((successfulLaunches / events.length) * 100).toFixed(1) 
                : '0';
            
            if (document.getElementById('all-time-success-rate')) {
                document.getElementById('all-time-success-rate').textContent = `${successRate}%`;
            }
        } else {
            document.getElementById('first-launch-time').textContent = 'No data';
            document.getElementById('total-launches').textContent = 'Unknown';
            if (document.getElementById('all-time-success-rate')) {
                document.getElementById('all-time-success-rate').textContent = 'Unknown';
            }
        }
    } catch (error) {
        console.error('Error updating fun facts:', error);
        document.getElementById('time-since-last').textContent = 'No data';
        document.getElementById('first-launch-time').textContent = 'No data';
        document.getElementById('total-launches').textContent = 'Error';
        if (document.getElementById('all-time-success-rate')) {
            document.getElementById('all-time-success-rate').textContent = 'Error';
        }
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