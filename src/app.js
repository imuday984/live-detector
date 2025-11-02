// src/app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const webpush = require('web-push'); // <-- Naya auzaar
const HealthCheck = require('./models/healthcheck.model.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Ye Render ke secret environment variable se aayega
const MONGO_URI = process.env.MONGO_URI; 

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
mongoose.connect(MONGO_URI).then(() => console.log('Successfully connected to MongoDB...'));

// --- PUSH NOTIFICATION SETUP ---
// Apne Notepad se keys yahan daal
const publicVapidKey = 'BMy1WKMwzIHKf7NifOuRsvFrTfJLlaR0ErQZpXTRp_fJh_AKBV_sjg1mXpEV7Vm3UBcbpMgfrZDB5l7bRPmXBfw'; 
const privateVapidKey = 'yqqBPPwajUge8_LWX2MoG4FVN3ipHHHp8zHyU-EiWV4';
let pushSubscription = null; // Browser ki details yahan save hogi
webpush.setVapidDetails('mailto:udayvardhan.998@gmail.com', publicVapidKey, privateVapidKey);

// Endpoint jo browser ko public key dega
app.get('/vapid-public-key', (req, res) => res.send(publicVapidKey));

// Endpoint jahan browser apni subscription details bhejega
app.post('/subscribe', (req, res) => {
    pushSubscription = req.body;
    res.status(201).json({});
    console.log("Browser subscribed for push notifications.");
});

// Naya function jo notification bhejega
async function sendPushNotification(targetUrl) {
    if (!pushSubscription) {
        console.log("No browser subscribed, skipping push notification.");
        return;
    }
    const payload = JSON.stringify({ 
        title: '🚨 CRITICAL ALERT', 
        body: `Website ${targetUrl} is consistently DOWN!` 
    });
    try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log("Push notification sent successfully.");
    } catch (error) { 
        console.error("Error sending push notification:", error.message); 
    }
}

// BAAKI SAARE API aur LOGIC (start-monitoring, polling, etc.) SAME RAHENGE
// SIRF Anomaly waale block mein SMS ki jagah Push Notification use karenge.

let currentTarget = null, checkInterval = null, lastCheckedTimestamp = new Date();

app.post('/api/start-monitoring', (req, res) => {
    const { url } = req.body; if (!url) return res.status(400).send({ error: 'URL is required' });
    console.log(`New monitoring request for: ${url}`);
    currentTarget = url; if (checkInterval) clearInterval(checkInterval);
    checkWebsite(); checkInterval = setInterval(checkWebsite, 15000);
    res.send({ status: `Monitoring started for ${url}` });
});

async function checkWebsite() {
    if (!currentTarget) return;
    const startTime = Date.now(); let healthData = { targetWebsite: currentTarget }; const SLOW_THRESHOLD_MS = 1500;
    try {
        const response = await axios.get(currentTarget, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        healthData = { ...healthData, statusCode: response.status, responseTimeMs: responseTime };
        if (responseTime > SLOW_THRESHOLD_MS) { healthData.status = 'SLOW'; healthData.message = `Website is UP but SLOW. Response Time: ${responseTime}ms`; }
        else { healthData.status = 'UP'; healthData.message = `Website is running smoothly. Response Time: ${responseTime}ms`; }
    } catch (error) { healthData = { ...healthData, status: 'DOWN', message: `Website is DOWN. Error: ${error.code}`, responseTimeMs: Date.now() - startTime }; }
    await HealthCheck.create(healthData);
}

setInterval(async () => {
    if (!currentTarget) return;
    try {
        const newChecks = await HealthCheck.find({ timestamp: { $gt: lastCheckedTimestamp }, targetWebsite: currentTarget }).sort({ timestamp: 1 });
        if (newChecks.length > 0) {
            io.emit('newCheck', newChecks);
            const lastThreeChecks = await HealthCheck.find({ targetWebsite: currentTarget }).sort({ timestamp: -1 }).limit(3);
            if (lastThreeChecks.length === 3 && lastThreeChecks.every(c => c.status === 'DOWN')) {
                io.emit('anomaly', { message: `Website ${currentTarget} is consistently DOWN!` });
                sendPushNotification(currentTarget); // <-- Dekh, yahan change kiya
            }
            lastCheckedTimestamp = newChecks[newChecks.length - 1].timestamp;
        }
    } catch (e) {}
}, 2000);

io.on('connection', (socket) => console.log('A user connected to the dashboard.'));
server.listen(3000, () => console.log(`Website Bodyguard is ready on port 3000...`));