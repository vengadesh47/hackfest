require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const claimRoutes = require('./routes/claimRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/voice', voiceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ClaimPilot API is running' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files in production
const frontendBuildPath = path.join(__dirname, '..', 'claimpilot-frontend', 'dist');
app.use(express.static(frontendBuildPath));

// Catch-all: serve frontend index.html for any non-API routes (SPA support)
app.get('*path', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Error handler (must be last middleware)
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB first, then start server
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
