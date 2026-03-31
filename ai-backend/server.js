const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/ai', require('./routes/aiRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'learnexus-ai-backend' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🤖 Learnexus AI Backend running on port ${PORT}`);
});
