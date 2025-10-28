// src/models/healthcheck.model.js
const mongoose = require('mongoose');

const healthCheckSchema = new mongoose.Schema({
    targetWebsite: { type: String, required: true },
    status: { type: String, enum: ['UP', 'DOWN', 'SLOW', 'ERROR'], required: true },
    statusCode: { type: Number },
    responseTimeMs: { type: Number },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const HealthCheck = mongoose.model('HealthCheck', healthCheckSchema);
module.exports = HealthCheck;