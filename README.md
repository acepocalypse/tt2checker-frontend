# HTML FastAPI Project - Top Thrill 2 Launch History

A modern web application that provides real-time monitoring of Cedar Point's Top Thrill 2 roller coaster launch history. The application features a responsive design, auto-refresh capabilities, and comprehensive statistics tracking.

## Features

- 🎢 **Real-time Event Monitoring** - View the latest launch events as they happen
- 📊 **Live Statistics** - Track success rates and event counts by outcome
- 🔄 **Auto-refresh** - Automatic data updates every 30 seconds (toggleable)
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- ⚡ **Fast Loading** - Optimized performance with modern web standards
- 🎨 **Modern UI** - Clean, professional interface with intuitive navigation

## Project Structure

```
html-fastapi-project/
├── src/
│   ├── index.html              # Main HTML document
│   ├── styles/
│   │   └── main.css           # Modern CSS styling
│   └── scripts/
│       └── app.js             # Enhanced JavaScript functionality
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Active FastAPI backend running on Google Cloud Compute

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd html-fastapi-project
   ```

2. **Update API configuration:**
   - Open `src/scripts/app.js`
   - Update the `apiUrl` variable with your FastAPI instance URL

3. **Serve the application:**
   - For development: Open `src/index.html` directly in your browser
   - For production: Use a web server (see deployment section)

## Deployment

### Netlify Deployment

1. **Connect your repository:**
   - Create a new site from Git in Netlify
   - Connect your GitHub/GitLab repository

2. **Configure build settings:**
   - Build command: Leave empty (static site)
   - Publish directory: `src`
   - Node version: Not required

3. **Deploy:**
   - Click "Deploy site"
   - Your site will be available at `https://your-site-name.netlify.app`

### Alternative Deployment Options

- **GitHub Pages:** Push to `gh-pages` branch
- **Vercel:** Connect repository and deploy
- **AWS S3:** Upload `src/` contents to S3 bucket with static hosting

## API Integration

The application integrates with a FastAPI backend that provides:

### Endpoints Used
- `GET /latest` - Fetch the most recent launch event
- `GET /events?limit={n}` - Fetch recent events (10-100 items)
- `GET /stats` - Get event statistics by outcome type
- `GET /healthz` - API health check

### Data Format
Events are expected in the following format:
```json
{
  "timestamp": "2023-12-01T10:30:00Z",
  "outcome": "success|failure|maintenance",
  "details": "Additional event information"
}
```

## Features in Detail

### Auto-refresh System
- Automatically updates data every 30 seconds
- Can be toggled on/off via checkbox
- Provides visual feedback during updates

### Event Display
- **Latest Event:** Prominently displayed with outcome status
- **Event List:** Configurable limit (10-100 events)
- **Color Coding:** Visual status indicators for different outcomes

### Statistics Dashboard
- Real-time counts for each event outcome type
- Visual breakdown of success/failure rates
- Updates automatically with new data

### Responsive Design
- Mobile-first approach
- Adapts to different screen sizes
- Touch-friendly interface on mobile devices

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Implements efficient data loading
- Uses modern JavaScript features (async/await)
- Optimized CSS with minimal reflows
- Automatic cleanup of intervals on page unload

## Troubleshooting

### Common Issues

**Data not loading:**
- Check browser console for errors
- Verify API URL is correct and accessible
- Ensure CORS is properly configured on the backend

**Auto-refresh not working:**
- Check if checkbox is enabled
- Verify no JavaScript errors in console
- Ensure page remains active (not in background tab)

**Styling issues:**
- Clear browser cache
- Check that `styles/main.css` is accessible
- Verify no conflicting CSS rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For issues and questions:
- Check the browser console for error messages
- Verify API connectivity
- Review the troubleshooting section above