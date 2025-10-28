// src/app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const HealthCheck = require('./models/healthcheck.model.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
mongoose.connect(MONGO_URI).then(() => console.log('Successfully connected to MongoDB...'));

// --- GLOBAL VARIABLES ---
let currentTarget = null;
let checkInterval = null;

// --- BODYGUARD'S CORE LOGIC ---
async function checkWebsite() {
    if (!currentTarget) return;

    const startTime = Date.now();
    let healthData = { targetWebsite: currentTarget };
    const SLOW_THRESHOLD_MS = 1500;

    try {
        const response = await axios.get(currentTarget, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        healthData = { ...healthData, statusCode: response.status, responseTimeMs: responseTime };
        if (responseTime > SLOW_THRESHOLD_MS) {
            healthData.status = 'SLOW'; healthData.message = `Website is UP but SLOW. Response Time: ${responseTime}ms`;
        } else {
            healthData.status = 'UP'; healthData.message = `Website is running smoothly. Response Time: ${responseTime}ms`;
        }
    } catch (error) {
        healthData = { ...healthData, status: 'DOWN', message: `Website is DOWN. Error: ${error.code}`, responseTimeMs: Date.now() - startTime };
    }
    await HealthCheck.create(healthData);
}

// --- API TO START MONITORING ---
app.post('/api/start-monitoring', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send({ error: 'URL is required' });

    console.log(`New monitoring request for: ${url}`);
    currentTarget = url;
    if (checkInterval) clearInterval(checkInterval);
    checkWebsite();
    checkInterval = setInterval(checkWebsite, 15000);
    res.send({ status: `Monitoring started for ${url}` });
});

// --- JUGAAD POLLING & ANOMALY DETECTION ---
let lastCheckedTimestamp = new Date();
setInterval(async () => {
    if (!currentTarget) return;
    try {
        const newChecks = await HealthCheck.find({ timestamp: { $gt: lastCheckedTimestamp }, targetWebsite: currentTarget }).sort({ timestamp: 1 });
        if (newChecks.length > 0) {
            io.emit('newCheck', newChecks);

            const lastThreeChecks = await HealthCheck.find({ targetWebsite: currentTarget }).sort({ timestamp: -1 }).limit(3);
            if (lastThreeChecks.length === 3 && lastThreeChecks.every(c => c.status === 'DOWN')) {
                io.emit('anomaly', { message: `Website ${currentTarget} is consistently DOWN!` });
            }

            lastCheckedTimestamp = newChecks[newChecks.length - 1].timestamp;
        }
    } catch (e) {}
}, 2000);


io.on('connection', (socket) => console.log('A user connected to the dashboard.'));
server.listen(3000, () => console.log(`Website Bodyguard is ready on port 3000...`));