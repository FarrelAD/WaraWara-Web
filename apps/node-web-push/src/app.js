const path = require('node:path');
const cors = require('cors');
const express = require('express');
const { pushRouter } = require('./routes/push.routes.js');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Mount Push API routes
app.use('/api', pushRouter);

module.exports = { app };
