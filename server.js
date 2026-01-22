const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware للتعامل مع الملفات الثابتة
app.use(express.static('public'));

// إعدادات CORS
io.engine.on("headers", (headers, req) => {
  headers["Access-Control-Allow-Origin"] = "*";
  headers["Access-Control-Allow-Methods"] = "GET,POST";
});

// صفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// صفحة 404
app.use((req, res) => {
  res.status(404).send('<h1>404 - الصفحة غير موجودة</h1>');
});

// إدارة المستخدمين
let users = {};

// Socket.io events
io.on('connection', (socket) => {
  console.log('✅ مستخدم جديد متصل:', socket.id);
  
  // تسجيل المستخدم
  socket.on('register', (username) => {
    users[socket.id] = username || 'مجهول';
    io.emit('user count', Object.keys(users).length);
    io.emit('chat message', {
      type: 'system',
      message: `🌟 ${users[socket.id]} انضم للشات!`,
      time: new Date().toLocaleTimeString('ar-SA')
    });
  });

  // استقبال الرسائل
  socket.on('chat message', (data) => {
    const username = users[socket.id] || 'مجهول';
    io.emit('chat message', {
      type: 'user',
      user: username,
      message: data.message,
      time: new Date().toLocaleTimeString('ar-SA')
    });
  });

  // مؤشر الكتابة
  socket.on('typing', () => {
    const username = users[socket.id] || 'مجهول';
    socket.broadcast.emit('typing', username);
  });

  // توقف الكتابة
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing');
  });

  // قطع الاتصال
  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      delete users[socket.id];
      io.emit('user count', Object.keys(users).length);
      io.emit('chat message', {
        type: 'system',
        message: `👋 ${username} غادر الشات`,
        time: new Date().toLocaleTimeString('ar-SA')
      });
    }
    console.log('❌ مستخدم انقطع:', socket.id);
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت: ${PORT}`);
  console.log(`🌍 افتح: http://localhost:${PORT}`);
});
