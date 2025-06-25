// This file contains JavaScript code that will make API calls to the FastAPI hosted on Google Cloud Compute.

const apiUrl = 'http://34.30.111.98:8000/'; // Replace with your FastAPI instance URL

async function fetchLatestEvent() {
    try {
        const response = await fetch(`${apiUrl}/latest`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        document.getElementById('latest-event').innerText = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error fetching latest event:', error);
        document.getElementById('latest-event').innerText = 'Failed to fetch latest event.';
    }
}

async function fetchEvents(limit = 100) {
    try {
        const response = await fetch(`${apiUrl}/events?limit=${limit}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const eventsList = document.getElementById('events-list');
        eventsList.innerHTML = '';
        data.forEach(event => {
            const listItem = document.createElement('li');
            listItem.innerText = JSON.stringify(event, null, 2);
            eventsList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        document.getElementById('events-list').innerText = 'Failed to fetch events.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchLatestEvent();
    fetchEvents();
});