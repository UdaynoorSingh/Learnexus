const bcrypt = require('bcryptjs');
bcrypt.compare('admin123', '$2a$10$xVqYLGQFGGXMR0r4GZ2hruTlYLBVMqCMGsHpJ16QRqE4sFMFx3bQO').then(console.log);
