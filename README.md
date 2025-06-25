# HTML FastAPI Project

This project is a simple web application that interacts with a FastAPI backend hosted on Google Cloud Compute. It fetches launch history data and displays it on a web page.

## Project Structure

```
html-fastapi-project
├── src
│   ├── index.html        # Main HTML document
│   └── scripts
│       └── app.js       # JavaScript for fetching data from FastAPI
└── README.md             # Project documentation
```

## Getting Started

To set up and run this project locally, follow these steps:

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd html-fastapi-project
   ```

2. **Open `src/index.html` in your web browser.**

3. **Ensure that the FastAPI backend is running on Google Cloud Compute.** Update the API endpoint in `src/scripts/app.js` to point to your FastAPI instance.

## Deployment

To deploy this project on Netlify:

1. Create a new site from Git in your Netlify dashboard.
2. Connect your Git repository.
3. Set the build command to `npm run build` if you have a build step (not necessary for this simple project).
4. Set the publish directory to `src`.
5. Click on "Deploy site".

## API Endpoints

The FastAPI backend provides the following endpoints:

- `GET /latest`: Fetch the most recent event.
- `GET /events?limit=100`: Fetch the last N events (default 100, max 1000).
- `GET /stats`: Get a count of each outcome.
- `GET /healthz`: Check the health of the API.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.