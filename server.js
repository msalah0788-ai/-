const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ========== الإعدادات ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = 'chat-secret-key-2024-change-in-production';

// ========== هياكل البيانات ==========
const users = new Map();           // جميع المستخدمين
const onlineUsers = new Map();     // المتصلين الآن
const rooms = new Map();           // الغرف
const messages = new Map();        // الرسائل
const privateMessages = new Map(); // الرسائل الخاصة
const goldTransactions = new Map(); // معاملات الذهب
const likes = new Map();           // الإعجابات
const mutes = new Map();           // المكتمين
const kicks = new Map();           // المطرودين
const purchases = new Map();       // عمليات الشراء
const systemLogs = [];             // سجل الأحداث (للمالك فقط)

// ========== الرتب والصلاحيات ==========
const ROLES = {
  OWNER: 'مالك',
  HONOR: 'اونر',
  ADMIN: 'ادمن',
  VIP: 'عضو مميز',
  MEMBER: 'عضو',
  GUEST: 'ضيف'
};

const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 6,
  [ROLES.HONOR]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.VIP]: 3,
  [ROLES.MEMBER]: 2,
  [ROLES.GUEST]: 1
};

const ROLE_COLORS = {
  [ROLES.OWNER]: '#FFD700',     // ذهبي
  [ROLES.HONOR]: '#FF6B6B',     // أحمر
  [ROLES.ADMIN]: '#8B5CF6',     // بنفسجي
  [ROLES.VIP]: '#10B981',       // أخضر
  [ROLES.MEMBER]: '#3B82F6',    // أزرق
  [ROLES.GUEST]: '#6B7280'      // رمادي
};

// ========== تهيئة النظام ==========
function initializeSystem() {
  console.log('🚀 جاري تهيئة النظام...');
  
  // إنشاء حساب المالك (محمد) - سري بيننا
  const ownerId = uuidv4();
  const ownerUsername = 'محمد';
  const ownerHashedPassword = bcrypt.hashSync('aumsalah079', 10);
  
  const ownerUser = {
    id: ownerId,
    username: ownerUsername,
    password: ownerHashedPassword,
    role: ROLES.OWNER,
    serial: 1, // الرقم التسلسلي 1 للمالك
    gender: 'ذكر',
    age: 25,
    country: 'السعودية',
    joinDate: new Date(),
    gold: 999999, // ذهب غير محدود
    points: 0,
    avatar: 'default_owner.png',
    profileSong: null,
    nameColor: '#FFD700',
    profileBg: 'gold_bg.jpg',
    profileGlow: true,
    frameAnimation: 'gold_frame.gif',
    isOnline: false,
    socketId: null,
    lastSeen: new Date(),
    likesReceived: 0,
    likesGiven: [],
    goldReceived: 0,
    goldSent: 0
  };
  
  users.set(ownerUsername.toLowerCase(), ownerUser);
  console.log(`✅ تم إنشاء حساب المالك: ${ownerUsername}`);
  
  // إنشاء غرف افتراضية
  const defaultRooms = [
    {
      id: 'general',
      name: 'العمومية',
      description: 'الغرفة الرئيسية للجميع',
      color: '#3B82F6',
      messages: [],
      users: new Set()
    },
    {
      id: 'games',
      name: 'الألعاب',
      description: 'مناقشة الألعاب والمنافسات',
      color: '#10B981',
      messages: [],
      users: new Set()
    },
    {
      id: 'friends',
      name: 'التعارف',
      description: 'التعارف وبناء الصداقات',
      color: '#8B5CF6',
      messages: [],
      users: new Set()
    }
  ];
  
  defaultRooms.forEach(room => {
    rooms.set(room.id, room);
  });
  
  console.log('✅ تم تهيئة النظام بنجاح');
}

// ========== دوال المساعدة ==========
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      serial: user.serial
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'الوصول مرفوض' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'التوكن غير صالح' });
    req.user = user;
    next();
  });
}

function canPerformAction(actorRole, targetRole, actionType) {
  const actorLevel = ROLE_HIERARCHY[actorRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  
  if (actionType === 'mute' || actionType === 'kick') {
    // المالك يقدر على الكل
    if (actorRole === ROLES.OWNER) return true;
    
    // الاونر ما يقدر على المالك
    if (actorRole === ROLES.HONOR && targetRole === ROLES.OWNER) return false;
    
    // الاونر يقدر على الادمن فما دون
    if (actorRole === ROLES.HONOR && targetLevel <= ROLE_HIERARCHY[ROLES.ADMIN]) return true;
    
    // الادمن يقدر على العضو المميز فما دون
    if (actorRole === ROLES.ADMIN && targetLevel <= ROLE_HIERARCHY[ROLES.VIP]) return true;
    
    // العضو المميز والعضو والضيف ما عندهم صلاحية
    return false;
  }
  
  if (actionType === 'delete_message') {
    // المالك يقدر يحذف رسائل الكل
    if (actorRole === ROLES.OWNER) return true;
    
    // الاونر يقدر يحذف رسائل الكل ما عدا المالك
    if (actorRole === ROLES.HONOR && targetRole !== ROLES.OWNER) return true;
    
    // الادمن يقدر يحذف رسائل العضو المميز فما دون
    if (actorRole === ROLES.ADMIN && targetLevel <= ROLE_HIERARCHY[ROLES.VIP]) return true;
    
    return false;
  }
  
  return false;
}

function logSystemEvent(event) {
  const logEntry = {
    id: uuidv4(),
    timestamp: new Date(),
    ...event
  };
  
  systemLogs.push(logEntry);
  
  // الاحتفاظ بآخر 1000 حدث فقط
  if (systemLogs.length > 1000) {
    systemLogs.shift();
  }
}

function generateSerialNumber() {
  // نبحث عن آخر رقم تسلسلي
  let maxSerial = 1;
  users.forEach(user => {
    if (user.serial > maxSerial) {
      maxSerial = user.serial;
    }
  });
  return maxSerial + 1;
}

// ========== Routes الأساسية ==========

// الصفحة الرئيسية (تسجيل الدخول)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحة الشات (محمية بالتوكن)
app.get('/chat', (req, res) => {
  // التحقق من وجود توكن في query string
  const token = req.query.token;
  
  if (!token) {
    // إذا ما في توكن، ارجع لصفحة تسجيل الدخول
    return res.redirect('/');
  }
  
  // التحقق من صحة التوكن
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // إذا التوكن صالح، ارسل صفحة الشات
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } catch (err) {
    // إذا التوكن غير صالح، ارجع لصفحة تسجيل الدخول
    res.redirect('/');
  }
});

// API لتحميل بيانات المستخدم للشات
app.get('/api/chat-data', authenticateToken, (req, res) => {
  try {
    const username = req.user.username.toLowerCase();
    const user = users.get(username);
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // الحصول على بيانات الغرف
    const roomsData = Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      color: room.color,
      userCount: room.users.size
    }));
    
    // الحصول على قائمة المتصلين من كل الغرف
    const allOnlineUsers = Array.from(users.values())
      .filter(u => u.isOnline)
      .map(u => ({
        username: u.username,
        role: u.role,
        serial: u.serial,
        avatar: u.avatar,
        nameColor: u.nameColor,
        points: u.points,
        gold: u.gold
      }));
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        serial: user.serial,
        gender: user.gender,
        age: user.age,
        country: user.country,
        gold: user.gold,
        points: user.points,
        avatar: user.avatar,
        nameColor: user.nameColor,
        profileBg: user.profileBg,
        profileGlow: user.profileGlow,
        frameAnimation: user.frameAnimation,
        joinDate: user.joinDate,
        likesReceived: user.likesReceived
      },
      rooms: roomsData,
      onlineUsers: allOnlineUsers,
      token: generateToken(user) // توليد توكن جديد للـ socket
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات الشات:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// ========== API Routes (المتبقية كما هي) ==========

// 1. تسجيل الدخول للأعضاء
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    
    const userKey = username.toLowerCase();
    const user = users.get(userKey);
    
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم غير موجود' });
    }
    
    // حساب المالك - دخول مباشر بالسري
    if (username === 'محمد' && password === 'aumsalah079') {
      const token = generateToken(user);
      
      return res.json({
        success: true,
        token,
        redirectUrl: `/chat?token=${token}`, // إضافة redirect URL
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          serial: user.serial,
          gender: user.gender,
          age: user.age,
          country: user.country,
          gold: user.gold,
          points: user.points,
          avatar: user.avatar,
          nameColor: user.nameColor,
          profileBg: user.profileBg,
          profileGlow: user.profileGlow,
          frameAnimation: user.frameAnimation,
          joinDate: user.joinDate
        }
      });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    
    user.lastSeen = new Date();
    users.set(userKey, user);
    
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      redirectUrl: `/chat?token=${token}`, // إضافة redirect URL
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        serial: user.serial,
        gender: user.gender,
        age: user.age,
        country: user.country,
        gold: user.gold,
        points: user.points,
        avatar: user.avatar,
        nameColor: user.nameColor,
        profileBg: user.profileBg,
        profileGlow: user.profileGlow,
        frameAnimation: user.frameAnimation,
        joinDate: user.joinDate
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 2. إنشاء حساب جديد
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, gender, age } = req.body;
    
    // التحقق من البيانات
    if (!username || !password || !gender || !age) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    if (username.length < 3 || username.length > 14) {
      return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 3 و 14 حرف' });
    }
    
    if (password.length < 3 || password.length > 14) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون بين 3 و 14 حرف' });
    }
    
    if (age < 1 || age > 99) {
      return res.status(400).json({ error: 'العمر يجب أن يكون بين 1 و 99' });
    }
    
    if (!['ذكر', 'أنثى'].includes(gender)) {
      return res.status(400).json({ error: 'الجنس غير صالح' });
    }
    
    const userKey = username.toLowerCase();
    
    // التحقق من عدم تكرار الاسم
    if (users.has(userKey)) {
      return res.status(400).json({ error: 'اسم المستخدم محجوز' });
    }
    
    // كلمة المرور لا تساوي اسم المستخدم
    if (password.toLowerCase() === username.toLowerCase()) {
      return res.status(400).json({ error: 'كلمة المرور لا يجب أن تكون مثل اسم المستخدم' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const serial = generateSerialNumber();
    
    const newUser = {
      id: userId,
      username: username.trim(),
      password: hashedPassword,
      role: ROLES.MEMBER, // العضوية الأساسية
      serial,
      gender,
      age: parseInt(age),
      country: 'غير محدد',
      joinDate: new Date(),
      gold: 0, // يبدأ بصفر ذهب
      points: 0,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3B82F6&color=fff`,
      profileSong: null,
      nameColor: '#000000',
      profileBg: null,
      profileGlow: false,
      frameAnimation: null,
      isOnline: false,
      socketId: null,
      lastSeen: new Date(),
      likesReceived: 0,
      likesGiven: [],
      goldReceived: 0,
      goldSent: 0
    };
    
    users.set(userKey, newUser);
    
    // تسجيل الحدث
    logSystemEvent({
      type: 'REGISTER',
      actor: 'النظام',
      target: username,
      details: 'إنشاء حساب جديد'
    });
    
    const token = generateToken(newUser);
    
    res.json({
      success: true,
      token,
      redirectUrl: `/chat?token=${token}`, // إضافة redirect URL
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        serial: newUser.serial,
        gender: newUser.gender,
        age: newUser.age,
        country: newUser.country,
        gold: newUser.gold,
        points: newUser.points,
        avatar: newUser.avatar,
        nameColor: newUser.nameColor,
        profileBg: newUser.profileBg,
        profileGlow: newUser.profileGlow,
        frameAnimation: newUser.frameAnimation,
        joinDate: newUser.joinDate
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الحساب:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 3. تسجيل زائر
app.post('/api/register-guest', async (req, res) => {
  try {
    const { username, gender, age } = req.body;
    
    // التحقق من البيانات
    if (!username || !gender || !age) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    if (username.length < 3 || username.length > 14) {
      return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 3 و 14 حرف' });
    }
    
    if (age < 1 || age > 99) {
      return res.status(400).json({ error: 'العمر يجب أن يكون بين 1 و 99' });
    }
    
    if (!['ذكر', 'أنثى'].includes(gender)) {
      return res.status(400).json({ error: 'الجنس غير صالح' });
    }
    
    const userKey = username.toLowerCase();
    
    // التحقق من عدم تكرار الاسم
    if (users.has(userKey)) {
      return res.status(400).json({ error: 'اسم المستخدم محجوز' });
    }
    
    const userId = uuidv4();
    const serial = generateSerialNumber();
    
    const guestUser = {
      id: userId,
      username: username.trim(),
      password: null, // الزائر ما عنده كلمة سر
      role: ROLES.GUEST,
      serial,
      gender,
      age: parseInt(age),
      country: 'غير محدد',
      joinDate: new Date(),
      gold: 0,
      points: 0,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6B7280&color=fff`,
      profileSong: null,
      nameColor: '#6B7280',
      profileBg: null,
      profileGlow: false,
      frameAnimation: null,
      isOnline: false,
      socketId: null,
      lastSeen: new Date(),
      likesReceived: 0,
      likesGiven: [],
      goldReceived: 0,
      goldSent: 0
    };
    
    users.set(userKey, guestUser);
    
    const token = generateToken(guestUser);
    
    res.json({
      success: true,
      token,
      redirectUrl: `/chat?token=${token}`, // إضافة redirect URL
      user: {
        id: guestUser.id,
        username: guestUser.username,
        role: guestUser.role,
        serial: guestUser.serial,
        gender: guestUser.gender,
        age: guestUser.age,
        country: guestUser.country,
        gold: guestUser.gold,
        points: guestUser.points,
        avatar: guestUser.avatar,
        nameColor: guestUser.nameColor,
        profileBg: guestUser.profileBg,
        profileGlow: guestUser.profileGlow,
        frameAnimation: guestUser.frameAnimation,
        joinDate: guestUser.joinDate
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الزائر:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// ... باقي الـ APIs تبقى كما هي بدون تغيير (من 4 إلى 15)

// ========== Socket.IO Handling ==========
io.on('connection', (socket) => {
  console.log('🔗 مستخدم جديد متصل:', socket.id);
  
  // الانضمام لغرفة
  socket.on('joinRoom', async ({ token, roomId }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const username = decoded.username.toLowerCase();
      const user = users.get(username);
      
      if (!user) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      // التحقق من الطرد
      const isKicked = Array.from(kicks.values()).some(kick => 
        kick.target === user.username && 
        (kick.duration === 'forever' || (kick.expiry && new Date(kick.expiry) > new Date()))
      );
      
      if (isKicked) {
        socket.emit('kicked', { message: 'أنت مطرود حالياً ولا يمكنك الدخول' });
        return;
      }
      
      // تحديث حالة الاتصال
      user.isOnline = true;
      user.socketId = socket.id;
      user.lastSeen = new Date();
      users.set(username, user);
      onlineUsers.set(socket.id, user);
      
      socket.user = user;
      socket.join(roomId);
      socket.currentRoom = roomId;
      
      const room = rooms.get(roomId);
      if (room) {
        room.users.add(user.username);
        
        // إرسال رسالة دخول
        const joinMessage = {
          id: uuidv4(),
          type: 'system',
          content: `${user.username} انضم للغرفة`,
          timestamp: new Date(),
          roomId: roomId
        };
        
        room.messages.push(joinMessage);
        
        // إرسال تأثير دخول حسب الرتبة
        const joinEffects = {
          [ROLES.OWNER]: { type: 'gold', message: 'المالك دخل الغرفة! 👑' },
          [ROLES.HONOR]: { type: 'fire', message: 'الاونر دخل الغرفة! 🔥' },
          [ROLES.ADMIN]: { type: 'sparkle', message: 'الادمن دخل الغرفة! ✨' },
          [ROLES.VIP]: { type: 'vip', message: 'العضو المميز دخل الغرفة! ⭐' },
          [ROLES.MEMBER]: { type: 'normal', message: '' },
          [ROLES.GUEST]: { type: 'normal', message: '' }
        };
        
        const effect = joinEffects[user.role];
        if (effect.message) {
          io.to(roomId).emit('joinEffect', {
            username: user.username,
            effect: effect.type,
            message: effect.message
          });
        }
        
        // تحديث قائمة المستخدمين
        const roomUsers = Array.from(room.users).map(u => {
          const userObj = users.get(u.toLowerCase());
          return userObj ? {
            username: userObj.username,
            role: userObj.role,
            serial: userObj.serial,
            isOnline: userObj.isOnline,
            avatar: userObj.avatar,
            nameColor: userObj.nameColor,
            points: userObj.points,
            gold: userObj.gold
          } : null;
        }).filter(Boolean);
        
        // إرسال البيانات للمستخدم
        socket.emit('roomJoined', {
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            color: room.color
          },
          users: roomUsers.sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]),
          messages: room.messages.slice(-100)
        });
        
        // تحديث القوائم للجميع
        io.emit('onlineUsersUpdate', {
          roomId,
          users: roomUsers
        });
      }
      
    } catch (error) {
      console.error('❌ خطأ في الانضمام للغرفة:', error);
      socket.emit('error', { message: 'خطأ في المصادقة' });
    }
  });
  
  // إرسال رسالة
  socket.on('sendMessage', ({ token, roomId, content, replyTo }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const username = decoded.username.toLowerCase();
      const user = users.get(username);
      
      if (!user) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      // التحقق من الكتم
      const isMuted = Array.from(mutes.values()).some(mute => 
        mute.target === user.username && 
        (mute.duration === 'forever' || (mute.expiry && new Date(mute.expiry) > new Date()))
      );
      
      if (isMuted) {
        socket.emit('muted', { message: 'أنت مكتم حالياً ولا يمكنك الكتابة' });
        return;
      }
      
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'الغرفة غير موجودة' });
        return;
      }
      
      const messageId = uuidv4();
      const newMessage = {
        id: messageId,
        type: 'text',
        content,
        sender: user.username,
        senderRole: user.role,
        senderSerial: user.serial,
        senderColor: user.nameColor,
        senderAvatar: user.avatar,
        replyTo: replyTo,
        timestamp: new Date(),
        roomId,
        pointsAwarded: true
      };
      
      // زيادة نقاط التفاعل
      user.points += 1;
      users.set(username, user);
      
      room.messages.push(newMessage);
      
      // إرسال الرسالة للجميع
      io.to(roomId).emit('newMessage', newMessage);
      
      // تحديث قائمة المتفاعلين
      updateActiveList();
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
    }
  });
  
  // ... باقي Socket events تبقى كما هي
  
  // قطع الاتصال
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    
    if (user) {
      console.log('🔌 مستخدم انقطع:', user.username);
      
      user.isOnline = false;
      user.socketId = null;
      user.lastSeen = new Date();
      users.set(user.username.toLowerCase(), user);
      onlineUsers.delete(socket.id);
      
      // تحديث جميع الغرف
      rooms.forEach(room => {
        if (room.users.has(user.username)) {
          room.users.delete(user.username);
          
          // رسالة خروج
          const leaveMessage = {
            id: uuidv4(),
            type: 'system',
            content: `${user.username} غادر الغرفة`,
            timestamp: new Date(),
            roomId: room.id
          };
          
          room.messages.push(leaveMessage);
          io.to(room.id).emit('newMessage', leaveMessage);
          
          // تحديث قائمة المستخدمين
          const roomUsers = Array.from(room.users).map(u => {
            const userObj = users.get(u.toLowerCase());
            return userObj ? {
              username: userObj.username,
              role: userObj.role,
              isOnline: userObj.isOnline,
              avatar: userObj.avatar
            } : null;
          }).filter(Boolean);
          
          io.to(room.id).emit('onlineUsersUpdate', {
            roomId: room.id,
            users: roomUsers
          });
        }
      });
      
      // تحديث القوائم
      io.emit('userOffline', {
        username: user.username,
        role: user.role
      });
    }
  });
});

// ========== تشغيل السيرفر ==========
initializeSystem();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`🌐 افتح http://localhost:${PORT} في المتصفح`);
  console.log(`🔑 حساب المالك: محمد - كلمة السر: aumsalah079`);
  console.log(`🔒 هذا السري بيننا فقط`);
  console.log(`📁 ملفات static موجودة في: ${path.join(__dirname, 'public')}`);
});
