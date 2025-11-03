Real-time Website Health Monitor
A lightweight, full-stack monitoring tool that provides live uptime status, performance metrics, and intelligent alerting for any public website. Built with Node.js, MongoDB, and WebSockets.
What It Does
This application continuously monitors a target website and visualizes its health on a real-time dashboard.
Checks Uptime & Performance: Periodically pings a URL to track its status (UP, DOWN, SLOW) and measures the response time.
Visualizes Data: Displays the response time on a live-updating chart and lists all check events in a live log feed.
Detects Anomalies: Triggers a critical alert if the target website fails multiple consecutive checks, distinguishing a real outage from a temporary glitch.
Sends Instant Alerts: Dispatches a browser push notification the moment a critical anomaly is detected, ensuring immediate awareness.
Getting Started
1. Prerequisites
Node.js (v16+)
MongoDB (must be running locally or a cloud instance like Atlas)
Git
2. Quickstart
Follow these steps to run the project locally:
code
Bash
# Clone the repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# Install dependencies
npm install

# Create a .env file from the example
cp .env.example .env

# Generate VAPID keys for push notifications
npx web-push generate-vapid-keys

# 1. Update your new .env file with your MongoDB URI and the generated VAPID keys.
# 2. Start the server.

node src/app.js
The application will be running at http://localhost:3000.
How to Use It
Open http://localhost:3000 in your browser.
Enter a full website URL (e.g., https://google.com) and click "Start Monitoring".
Allow the browser's request for push notification permissions.
Observe the live dashboard. To test the alerting system, monitor a URL that is known to be down (e.g., https://thissitedoesnotexist.com).
