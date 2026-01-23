const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// إعداد Socket.io مع تحسينات
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000, // زيادة وقت المهلة
  pingInterval: 25000
});

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// إعداد JSON للطلبات
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تخزين المستخدمين والرسائل
const users = new Map();
const messageHistory = [];

// صفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحة الدردشة
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// API للحصول على معلومات السيرفر
app.get('/api/info', (req, res) => {
  res.json({
    status: 'online',
    users: users.size,
    messages: messageHistory.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`✅ مستخدم متصل: ${socket.id}`);
  
  // تعيين اسم افتراضي للمستخدم
  const defaultUsername = `مستخدم_${socket.id.substring(0, 5)}`;
  
  // تخزين بيانات المستخدم
  users.set(socket.id, {
    id: socket.id,
    username: defaultUsername,
    joinedAt: new Date(),
    lastActivity: new Date()
  });
  
  // ترحيب بالمستخدم الجديد
  socket.emit('welcome', {
    message: `🎉 مرحباً بك في شاتي!`,
    username: defaultUsername,
    userId: socket.id,
    onlineUsers: Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username
    }))
  });
  
  // إرسال سجل الرسائل للمستخدم الجديد
  if (messageHistory.length > 0) {
    socket.emit('message history', messageHistory.slice(-50)); // آخر 50 رسالة
  }
  
  // إعلام الآخرين بمستخدم جديد
  socket.broadcast.emit('user joined', {
    username: defaultUsername,
    userId: socket.id,
    time: new Date().toLocaleTimeString(),
    onlineCount: users.size
  });
  
  // تحديث عدد المستخدمين للجميع
  io.emit('users update', {
    count: users.size,
    users: Array.from(users.values()).map(u => u.username)
  });
  
  // استقبال رسالة جديدة
  socket.on('chat message', (data) => {
    const user = users.get(socket.id);
    if (!user || !data || !data.message) return;
    
    // تنظيف وتأمين الرسالة
    const cleanMessage = data.message.toString().trim().substring(0, 1000);
    if (!cleanMessage) return;
    
    // تحديث آخر نشاط
    user.lastActivity = new Date();
    
    // إنشاء كائن الرسالة
    const messageObj = {
      id: Date.now() + socket.id,
      userId: socket.id,
      username: user.username,
      message: cleanMessage,
      timestamp: new Date().toLocaleTimeString(),
      fullTime: new Date().toLocaleString(),
      type: 'message'
    };
    
    // حفظ في السجل (الحد الأقصى 1000 رسالة)
    messageHistory.push(messageObj);
    if (messageHistory.length > 1000) {
      messageHistory.shift();
    }
    
    console.log(`💬 ${user.username}: ${cleanMessage}`);
    
    // إرسال للجميع
    io.emit('chat message', messageObj);
  });
  
  // تغيير اسم المستخدم
  socket.on('change username', (newUsername) => {
    const user = users.get(socket.id);
    if (!user || !newUsername || newUsername.trim().length < 2) return;
    
    const cleanUsername = newUsername.toString().trim().substring(0, 20);
    const oldUsername = user.username;
    user.username = cleanUsername;
    
    io.emit('username changed', {
      userId: socket.id,
      oldUsername: oldUsername,
      newUsername: cleanUsername,
      time: new Date().toLocaleTimeString()
    });
  });
  
  // طلب معلومات المستخدم
  socket.on('get user info', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.emit('user info', {
        id: user.id,
        username: user.username,
        joinedAt: user.joinedAt.toLocaleString(),
        connectionTime: Math.floor((new Date() - user.joinedAt) / 1000)
      });
    }
  });
  
  // إرسال رسالة خاصة (PM)
  socket.on('private message', (data) => {
    if (!data.to || !data.message) return;
    
    const sender = users.get(socket.id);
    const receiverSocket = Array.from(users.keys())
      .find(id => users.get(id).username === data.to);
    
    if (receiverSocket && sender) {
      io.to(receiverSocket).emit('private message', {
        from: sender.username,
        message: data.message,
        timestamp: new Date().toLocaleTimeString()
      });
      
      socket.emit('private message sent', {
        to: data.to,
        message: data.message
      });
    }
  });
  
  // ping/pong للحفاظ على الاتصال
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
  
  // فصل المستخدم
  socket.on('disconnect', (reason) => {
    const user = users.get(socket.id);
    console.log(`❌ مستخدم انقطع: ${socket.id} - السبب: ${reason}`);
    
    if (user) {
      // إعلام الآخرين
      socket.broadcast.emit('user left', {
        username: user.username,
        userId: socket.id,
        time: new Date().toLocaleTimeString(),
        onlineCount: users.size - 1
      });
      
      // حذف من القائمة
      users.delete(socket.id);
      
      // تحديث عدد المستخدمين
      io.emit('users update', {
        count: users.size,
        users: Array.from(users.values()).map(u => u.username)
      });
    }
  });
  
  // معالجة الأخطاء
  socket.on('error', (error) => {
    console.error(`❌ خطأ في السوكت ${socket.id}:`, error);
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
  console.log(`📁 الملفات الثابتة من: ${path.join(__dirname, 'public')}`);
  console.log(`⏰ الوقت: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));
});
