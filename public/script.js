// public/script.js
const socket = io();

// --- ELEMENTS ---
const urlInput = document.getElementById('url-input');
const monitorBtn = document.getElementById('monitor-btn');
const dashboard = document.getElementById('dashboard');
const statusPanel = document.getElementById('current-status');
const targetPanel = document.getElementById('current-target');
const responsePanel = document.getElementById('response-time');
const logsDiv = document.getElementById('logs');
const alertDiv = document.getElementById('anomaly-alert');
const ctx = document.getElementById('response-chart').getContext('2d');

// --- CHART SETUP ---
const responseChart = new Chart(ctx, {
    type: 'line', data: { labels: [], datasets: [{ label: 'Response Time (ms)', data: [], borderColor: '#00b894', backgroundColor: 'rgba(0, 184, 148, 0.2)', borderWidth: 2, fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, animation: { duration: 0 }, plugins: { legend: { display: false } } }
});

// --- BUTTONS ---
monitorBtn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a website URL!');
        return;
    }
    // Automatically add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
        urlInput.value = url;
    }

    // Clear old data
    logsDiv.innerHTML = '';
    responseChart.data.labels = [];
    responseChart.data.datasets[0].data = [];
    responseChart.update();

    // Server ko batao ki nayi duty shuru
    fetch('/api/start-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });

    dashboard.classList.remove('hidden');
    targetPanel.querySelector('p').textContent = url;
});

// --- SOCKET LISTENERS ---
socket.on('newCheck', (checks) => {
    const latestCheck = checks[checks.length - 1];

    // 1. Status Panel Update
    statusPanel.querySelector('p').textContent = latestCheck.status;
    statusPanel.className = `status-box ${latestCheck.status.toLowerCase()}`;
    responsePanel.querySelector('p').textContent = `${latestCheck.responseTimeMs} ms`;

    // 2. Event Feed Update
    checks.forEach(check => {
        const logEl = document.createElement('div');
        logEl.classList.add('log-entry', check.status.toLowerCase());
        logEl.textContent = `[${new Date(check.timestamp).toLocaleTimeString()}] [${check.status}] ${check.message}`;
        logsDiv.prepend(logEl);
    });

    // 3. Graph Update
    const chartData = responseChart.data;
    checks.forEach(check => {
        chartData.labels.push(new Date(check.timestamp).toLocaleTimeString());
        chartData.datasets[0].data.push(check.responseTimeMs);
        if (chartData.labels.length > 20) {
            chartData.labels.shift();
            chartData.datasets[0].data.shift();
        }
    });
    responseChart.update();
});

socket.on('anomaly', (data) => {
    alertDiv.textContent = `CRITICAL ALERT: ${data.message}`;
    alertDiv.classList.remove('hidden');
    setTimeout(() => alertDiv.classList.add('hidden'), 8000);
});