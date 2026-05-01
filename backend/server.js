const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();


function normalizeFrontendOriginEntry(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).origin;
    } catch {
      return null;
    }
  }
  const host = s.replace(/^\/+/, '');
  const isLocal = /^localhost\b/i.test(host) || /^127\.0\.0\.1\b/.test(host);
  try {
    return new URL(isLocal ? `http://${host}` : `https://${host}`).origin;
  } catch {
    return null;
  }
}

let allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(normalizeFrontendOriginEntry)
  .filter(Boolean);
if (allowedOrigins.length === 0) allowedOrigins = ['http://localhost:5173'];

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  callback(null, allowedOrigins.includes(origin));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(userId);
  });
});


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'learnexus-backend' });
});


app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/colleges', require('./routes/collegeRoutes'));
app.use('/api', require('./routes/academicRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/credits', require('./routes/creditRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/sessions', require('./routes/sessionsRoutes'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Learnexus Backend running on port ${PORT}`);
  if (process.env.ENABLE_GHOST_STUDENT !== 'false') {
    const { startGhostStudentWorker } = require('./workers/ghostStudent');
    startGhostStudentWorker();
  }
});
