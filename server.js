const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ========== إعدادات الملفات ==========
const users = {};
const messageHistory = [];
const voiceMessages = new Map();

// تأكد من وجود مجلد التحميلات
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// CORS
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

// ========== Socket.io Events ==========
io.on('connection', (socket) => {
  console.log('✅ مستخدم جديد متصل:', socket.id);
  
  // ======== 1. تسجيل المستخدم ========
  socket.on('register user', (userData) => {
    const userId = socket.id;
    const newUser = {
      id: userId,
      username: userData.username || 'زائر',
      avatar: userData.avatar || '👤',
      avatarImage: userData.avatarImage || null,
      status: 'online',
      joinTime: new Date().toLocaleTimeString('ar-SA'),
      isMuted: false
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
  
  // ======== 2. تحديث الصورة الشخصية ========
  socket.on('update avatar', (imageData) => {
    const user = users[socket.id];
    if (user && imageData) {
      user.avatarImage = imageData;
      io.emit('users update', Object.values(users));
      socket.emit('avatar updated', true);
    }
  });
  
  // ======== 3. إرسال رسالة نصية ========
  socket.on('send message', (msgData) => {
    const user = users[socket.id];
    if (!user || user.isMuted) return;
    
    const message = {
      id: Date.now(),
      type: 'text',
      user: user.username,
      avatar: user.avatar,
      avatarImage: user.avatarImage,
      userId: user.id,
      text: msgData.text,
      time: new Date().toLocaleTimeString('ar-SA'),
      date: new Date().toLocaleDateString('ar-SA')
    };
    
    // حفظ الرسالة
    messageHistory.push(message);
    if (messageHistory.length > 1000) {
      messageHistory.shift();
    }
    
    // إرسال للجميع
    io.emit('new message', message);
    
    // إشعار صوتي
    socket.broadcast.emit('play sound', 'message');
    
    console.log(`💬 ${user.username}: ${msgData.text}`);
  });
  
  // ======== 4. إرسال ملف (صورة/فيديو) ========
  socket.on('send file', (fileData) => {
    const user = users[socket.id];
    if (!user || user.isMuted) return;
    
    const fileId = `file_${Date.now()}_${socket.id}`;
    
    const message = {
      id: Date.now(),
      type: 'file',
      fileId: fileId,
      user: user.username,
      avatar: user.avatar,
      avatarImage: user.avatarImage,
      userId: user.id,
      fileName: fileData.name,
      fileType: fileData.type,
      fileData: fileData.data,
      fileSize: fileData.size,
      time: new Date().toLocaleTimeString('ar-SA'),
      date: new Date().toLocaleDateString('ar-SA')
    };
    
    // حفظ الرسالة
    messageHistory.push(message);
    
    // إرسال للجميع
    io.emit('new message', message);
    
    // إشعار صوتي للملفات
    socket.broadcast.emit('play sound', 'file');
    
    console.log(`📁 ${user.username} أرسل ${fileData.type}`);
  });
  
  // ======== 5. إرسال رسالة صوتية ========
  socket.on('send voice', (voiceData) => {
    const user = users[socket.id];
    if (!user || user.isMuted) return;
    
    const voiceId = `voice_${Date.now()}_${socket.id}`;
    voiceMessages.set(voiceId, {
      data: voiceData.data,
      duration: voiceData.duration,
      userId: socket.id,
      timestamp: Date.now()
    });
    
    // تنظيف بعد 24 ساعة
    setTimeout(() => {
      voiceMessages.delete(voiceId);
    }, 24 * 60 * 60 * 1000);
    
    const message = {
      id: Date.now(),
      type: 'voice',
      voiceId: voiceId,
      user: user.username,
      avatar: user.avatar,
      avatarImage: user.avatarImage,
      userId: user.id,
      duration: voiceData.duration,
      time: new Date().toLocaleTimeString('ar-SA'),
      date: new Date().toLocaleDateString('ar-SA')
    };
    
    // حفظ الرسالة
    messageHistory.push(message);
    
    // إرسال للجميع
    io.emit('new message', message);
    
    // إشعار صوتي للرسائل الصوتية
    socket.broadcast.emit('play sound', 'voice');
    
    console.log(`🎤 ${user.username} أرسل رسالة صوتية`);
  });
  
  // ======== 6. طلب رسالة صوتية ========
  socket.on('get voice', (voiceId, callback) => {
    const voice = voiceMessages.get(voiceId);
    if (voice) {
      callback(voice);
    } else {
      callback(null);
    }
  });
  
  // ======== 7. الرد على رسالة ========
  socket.on('reply to message', (replyData) => {
    const user = users[socket.id];
    if (!user || user.isMuted) return;
    
    const message = {
      id: Date.now(),
      type: 'reply',
      user: user.username,
      avatar: user.avatar,
      avatarImage: user.avatarImage,
      userId: user.id,
      text: replyData.text,
      replyTo: replyData.replyTo,
      replyToUser: replyData.replyToUser,
      time: new Date().toLocaleTimeString('ar-SA'),
      date: new Date().toLocaleDateString('ar-SA')
    };
    
    // حفظ الرسالة
    messageHistory.push(message);
    
    // إرسال للجميع
    io.emit('new message', message);
    
    // إشعار صوتي للردود
    socket.broadcast.emit('play sound', 'reply');
    
    console.log(`↪️ ${user.username} رد على ${replyData.replyToUser}`);
  });
  
  // ======== 8. كتم مستخدم ========
  socket.on('mute user', (targetUserId) => {
    const user = users[socket.id];
    if (user && users[targetUserId]) {
      users[targetUserId].isMuted = true;
      io.emit('user muted', {
        userId: targetUserId,
        mutedBy: user.username
      });
    }
  });
  
  // ======== 9. إلغاء كتم مستخدم ========
  socket.on('unmute user', (targetUserId) => {
    const user = users[socket.id];
    if (user && users[targetUserId]) {
      users[targetUserId].isMuted = false;
      io.emit('user unmuted', targetUserId);
    }
  });
  
  // ======== 10. مؤشر الكتابة ========
  socket.on('typing', () => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit('user typing', user.username);
    }
  });
  
  // ======== 11. تحديث الملف الشخصي ========
  socket.on('update profile', (newData) => {
    const user = users[socket.id];
    if (user) {
      user.username = newData.username || user.username;
      io.emit('users update', Object.values(users));
    }
  });
  
  // ======== 12. عند قطع الاتصال ========
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      delete users[socket.id];
      io.emit('user left', user);
      io.emit('users update', Object.values(users));
      console.log(`❌ ${user.username} غادر الشات`);
    }
  });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت: ${PORT}`);
  console.log(`🌍 الموقع: https://arabic-chat.onrender.com`);
});
