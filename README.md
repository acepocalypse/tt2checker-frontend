# Top Thrill 2 Tracker

A web application that monitors Cedar Point's Top Thrill 2 roller coaster events.

## Features

- Real-time event monitoring
- Live statistics
- Auto-refresh (30s)
- Responsive design

## Project Structure

```
html-fastapi-project/
├── src/
│   ├── index.html
│   ├── styles/main.css
│   └── scripts/app.js
└── README.md
```

## Getting Started

1. Open `src/index.html` in a web browser
2. Update API URL in `src/scripts/app.js` if needed

## Deployment

Deploy the `src/` folder to any static hosting service:
- Netlify
- GitHub Pages
- Vercel

## API Endpoints

- `GET /latest` - Latest event
- `GET /events?limit={n}` - Recent events
- `GET /stats` - Statistics

## Browser Support

Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)