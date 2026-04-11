const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
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


app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));


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


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'learnexus-backend' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Learnexus Backend running on port ${PORT}`);
  if (process.env.ENABLE_GHOST_STUDENT !== 'false') {
    const { startGhostStudentWorker } = require('./workers/ghostStudent');
    startGhostStudentWorker();
  }
});
