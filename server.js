const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// تمكين CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ملف بيانات المستخدمين
const USERS_FILE = 'users.json';

// تحميل أو إنشاء بيانات المستخدمين
let usersData = {};
if (fs.existsSync(USERS_FILE)) {
  try {
    usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    console.error('خطأ في قراءة ملف المستخدمين:', error);
    usersData = {};
  }
}

// حفظ بيانات المستخدمين
function saveUsersData() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8');
  } catch (error) {
    console.error('خطأ في حفظ ملف المستخدمين:', error);
  }
}

// تهيئة المالك إذا لم يكن موجوداً
if (!usersData['محمد']) {
  usersData['محمد'] = {
    password: 'aumsalah079',
    gender: 'ذكر',
    age: 30,
    role: 'مالك',
    joinDate: new Date().toISOString(),
    interaction: 1500,
    profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=محمد&backgroundColor=FFD700',
    profileColor: '#FFD700',
    coverPhoto: '',
    serial: 1,
    friends: [],
    friendRequests: [],
    bio: 'مالك ومؤسس الشات',
    status: 'نشط',
    privateChatEnabled: true,
    title: 'المؤسس',
    isOnline: false,
    lastSeen: new Date().toISOString()
  };
  saveUsersData();
}

// المستخدمون المتصلون حالياً
const connectedUsers = new Map();
const onlineUsers = {};

// مسارات API
app.post('/api/check-username', (req, res) => {
  const { username } = req.body;
  const exists = !!usersData[username];
  res.json({ exists });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (usersData[username] && usersData[username].password === password) {
    // تحديث حالة الاتصال
    usersData[username].isOnline = true;
    usersData[username].lastSeen = new Date().toISOString();
    saveUsersData();
    
    res.json({
      success: true,
      user: {
        username,
        role: usersData[username].role,
        gender: usersData[username].gender,
        profilePic: usersData[username].profilePic,
        profileColor: usersData[username].profileColor,
        serial: usersData[username].serial,
        age: usersData[username].age,
        interaction: usersData[username].interaction,
        bio: usersData[username].bio
      }
    });
  } else {
    res.json({ success: false, message: 'اسم المستخدم أو كلمة السر غير صحيحة' });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password, gender, age } = req.body;
  
  // التحقق من الشروط
  if (usersData[username]) {
    res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
    return;
  }
  
  if (username.length < 3) {
    res.json({ success: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    return;
  }
  
  if (password.length < 4) {
    res.json({ success: false, message: 'كلمة السر يجب أن تكون 4 أحرف على الأقل' });
    return;
  }
  
  if (age < 13 || age > 100) {
    res.json({ success: false, message: 'العمر يجب أن يكون بين 13 و 100 سنة' });
    return;
  }
  
  // إنشاء رقم تسلسلي
  const serial = Object.keys(usersData).length + 1;
  
  // إنشاء صورة بروفايل
  const profilePic = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=${gender === 'أنثى' ? 'FF69B4' : '1E90FF'}`;
  
  // إنشاء المستخدم
  usersData[username] = {
    password,
    gender,
    age: parseInt(age),
    role: 'عضو',
    joinDate: new Date().toISOString(),
    interaction: 0,
    profilePic,
    profileColor: gender === 'أنثى' ? '#FF69B4' : '#1E90FF',
    coverPhoto: '',
    serial,
    friends: [],
    friendRequests: [],
    bio: 'مرحباً! أنا جديد هنا.',
    status: 'نشط',
    privateChatEnabled: true,
    title: '',
    isOnline: true,
    lastSeen: new Date().toISOString()
  };
  
  saveUsersData();
  
  res.json({
    success: true,
    user: {
      username,
      role: 'عضو',
      gender,
      profilePic,
      profileColor: usersData[username].profileColor,
      serial,
      age: usersData[username].age,
      interaction: 0,
      bio: usersData[username].bio
    }
  });
});

app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  
  if (usersData[username]) {
    const { password, ...userInfo } = usersData[username];
    res.json({ success: true, user: userInfo });
  } else {
    res.json({ success: false, message: 'المستخدم غير موجود' });
  }
});

app.get('/api/all-users', (req, res) => {
  const usersArray = Object.keys(usersData).map(username => {
    const { password, ...userInfo } = usersData[username];
    return { username, ...userInfo };
  });
  
  res.json({ success: true, users: usersArray });
});

app.post('/api/update-profile', (req, res) => {
  const { username, updates } = req.body;
  
  if (usersData[username]) {
    Object.keys(updates).forEach(key => {
      if (key !== 'password' && key !== 'serial' && key !== 'role') {
        usersData[username][key] = updates[key];
      }
    });
    saveUsersData();
    res.json({ success: true, message: 'تم تحديث البروفايل' });
  } else {
    res.json({ success: false, message: 'المستخدم غير موجود' });
  }
});

app.post('/api/update-role', (req, res) => {
  const { adminUsername, targetUsername, newRole } = req.body;
  
  if (!usersData[adminUsername] || !usersData[targetUsername]) {
    return res.json({ success: false, message: 'المستخدم غير موجود' });
  }
  
  const adminRole = usersData[adminUsername].role;
  const targetRole = usersData[targetUsername].role;
  
  // صلاحيات المالك
  if (adminRole === 'مالك') {
    usersData[targetUsername].role = newRole;
    
    // تحديث لون البروفايل حسب الرتبة
    const roleColors = {
      'مالك': '#FFD700',
      'وزير': '#9d4edd',
      'وزيرة': '#9d4edd',
      'عضو مميز': '#4cc9f0',
      'عضو': '#1E90FF',
      'زائر': '#6c757d'
    };
    
    if (roleColors[newRole]) {
      usersData[targetUsername].profileColor = roleColors[newRole];
    }
    
    saveUsersData();
    
    // إرسال تحديث للمستخدم المتصل
    const targetSocket = connectedUsers.get(targetUsername);
    if (targetSocket) {
      io.to(targetSocket).emit('role-updated', { newRole });
    }
    
    res.json({ success: true, message: `تم تحديث رتبة ${targetUsername} إلى ${newRole}` });
  } else {
    res.json({ success: false, message: 'ليس لديك صلاحية لتغيير الرتب' });
  }
});

// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// جميع المسارات الأخرى تذهب للصفحة الرئيسية
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log('مستخدم جديد متصل:', socket.id);

  socket.on('user-join', (userData) => {
    const { username } = userData;
    
    // تخزين اتصال المستخدم
    connectedUsers.set(username, socket.id);
    onlineUsers[username] = {
      ...userData,
      socketId: socket.id,
      joinTime: new Date().toISOString()
    };
    
    // تحديث حالة الاتصال في قاعدة البيانات
    if (usersData[username]) {
      usersData[username].isOnline = true;
      usersData[username].lastSeen = new Date().toISOString();
      saveUsersData();
    }
    
    // إشعار الجميع بدخول المستخدم
    socket.broadcast.emit('user-joined', {
      username,
      role: userData.role,
      profilePic: userData.profilePic
    });
    
    // إرسال قائمة المتصلين للجميع
    io.emit('online-users-updated', Object.values(onlineUsers));
    
    // إرسال ترحيب للمستخدم الجديد
    socket.emit('welcome', {
      message: `مرحباً ${username}! تم الاتصال بنجاح.`,
      users: Object.values(onlineUsers)
    });
  });

  socket.on('send-message', (messageData) => {
    const { username, text, room = 'general' } = messageData;
    
    if (!username || !text) return;
    
    const message = {
      id: Date.now(),
      username,
      text,
      room,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userInfo: onlineUsers[username] || usersData[username] || { role: 'زائر', gender: 'ذكر' }
    };
    
    // زيادة التفاعل إذا كان المستخدم مسجلاً
    if (usersData[username] && text.length >= 4) {
      usersData[username].interaction += 1;
      saveUsersData();
    }
    
    // إرسال الرسالة للغرفة
    io.emit('new-message', message);
    
    // التحقق من المنشنات
    const mentionMatch = text.match(/@(\w+)/g);
    if (mentionMatch) {
      mentionMatch.forEach(mention => {
        const mentionedUser = mention.substring(1);
        if (onlineUsers[mentionedUser]) {
          const userSocket = connectedUsers.get(mentionedUser);
          if (userSocket) {
            io.to(userSocket).emit('mentioned', {
              by: username,
              message: text
            });
          }
        }
      });
    }
  });

  socket.on('typing', (data) => {
    const { username, isTyping, room = 'general' } = data;
    if (username) {
      socket.broadcast.to(room).emit('user-typing', {
        username,
        isTyping
      });
    }
  });

  socket.on('disconnect', () => {
    // البحث عن المستخدم المتصل بهذا السوكيت
    let disconnectedUser = null;
    
    for (const [username, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUser = username;
        break;
      }
    }
    
    if (disconnectedUser) {
      // تحديث حالة الاتصال
      if (usersData[disconnectedUser]) {
        usersData[disconnectedUser].isOnline = false;
        usersData[disconnectedUser].lastSeen = new Date().toISOString();
        saveUsersData();
      }
      
      // إزالة من القوائم
      connectedUsers.delete(disconnectedUser);
      delete onlineUsers[disconnectedUser];
      
      // إعلام الجميع بخروج المستخدم
      io.emit('user-left', {
        username: disconnectedUser
      });
      
      // تحديث قائمة المتصلين
      io.emit('online-users-updated', Object.values(onlineUsers));
      
      console.log(`المستخدم ${disconnectedUser} انقطع`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
});
