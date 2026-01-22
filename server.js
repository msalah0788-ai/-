const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// إعدادات
const users = {};
let messageHistory = [];

// Middleware
app.use(express.static('public'));

// CORS
io.engine.on("headers", (headers, req) => {
  headers["Access-Control-Allow-Origin"] = "*";
});

// صفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// صفحة 404
app.use((req, res) => {
  res.status(404).send('<h1>404 - الصفحة غير موجودة</h1>');
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('✅ مستخدم جديد متصل:', socket.id);
  
  // ======== تسجيل المستخدم الجديد ========
  socket.on('register user', (userData) => {
    const userId = socket.id;
    const newUser = {
      id: userId,
      username: userData.username || 'زائر',
      avatar: userData.avatar || '👤',
      status: 'online',
      joinTime: new Date().toLocaleTimeString('ar-SA')
    };
    
    users[userId] = newUser;
    
    // إرسال ترحيب
    socket.emit('welcome', {
      message: `مرحباً ${newUser.username}!`,
      users: Object.values(users),
      history: messageHistory.slice(-50)
    });
    
    // إعلام الجميع بمستخدم جديد
    socket.broadcast.emit('user joined', newUser);
    io.emit('users update', Object.values(users));
    
    console.log(`✅ ${newUser.username} انضم للشات`);
  });
  
  // ======== تحديث حالة الكتابة ========
  socket.on('typing', () => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit('user typing', user.username);
    }
  });
  
  // ======== إرسال رسالة ========
  socket.on('send message', (msgData) => {
    const user = users[socket.id];
    if (!user) return;
    
    const message = {
      id: Date.now(),
      user: user.username,
      avatar: user.avatar,
      userId: user.id,
      text: msgData.text,
      time: new Date().toLocaleTimeString('ar-SA'),
      date: new Date().toLocaleDateString('ar-SA'),
      type: 'message'
    };
    
    // حفظ الرسالة
    messageHistory.push(message);
    if (messageHistory.length > 1000) {
      messageHistory = messageHistory.slice(-500);
    }
    
    // إرسال للجميع
    io.emit('new message', message);
    console.log(`💬 ${user.username}: ${msgData.text}`);
  });
  
  // ======== تحديث الملف الشخصي ========
  socket.on('update profile', (newData) => {
    const user = users[socket.id];
    if (user) {
      user.username = newData.username || user.username;
      user.avatar = newData.avatar || user.avatar;
      io.emit('users update', Object.values(users));
    }
  });
  
  // ======== عند قطع الاتصال ========
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      delete users[socket.id];
      io.emit('user left', user);
      io.emit('users update', Object.values(users));
      io.emit('chat message', {
        type: 'system',
        message: `👋 ${user.username} غادر الشات`,
        time: new Date().toLocaleTimeString('ar-SA')
      });
      console.log(`❌ ${user.username} غادر الشات`);
    }
  });
}); // نهاية io.on('connection')

// تشغيل السيرفر
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت: ${PORT}`);
  console.log(`🌍 افتح: http://localhost:${PORT}`);
});
