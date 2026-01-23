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

// ========== API Routes ==========

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

// 4. التحقق من اسم المستخدم
app.post('/api/check-username', (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }
    
    const userKey = username.toLowerCase();
    const exists = users.has(userKey);
    
    res.json({
      available: !exists,
      message: exists ? 'اسم المستخدم محجوز' : 'اسم المستخدم متاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في التحقق:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 5. الحصول على معلومات المستخدم
app.get('/api/user/:username', authenticateToken, (req, res) => {
  try {
    const { username } = req.params;
    const userKey = username.toLowerCase();
    const user = users.get(userKey);
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // إخفاء المعلومات الحساسة
    const publicUser = {
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
      likesReceived: user.likesReceived,
      goldReceived: user.goldReceived,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    };
    
    res.json({ user: publicUser });
    
  } catch (error) {
    console.error('❌ خطأ في جلب معلومات المستخدم:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 6. تعديل البروفايل
app.post('/api/update-profile', authenticateToken, (req, res) => {
  try {
    const { nameColor, profileBg, profileGlow, frameAnimation, country } = req.body;
    const username = req.user.username.toLowerCase();
    const user = users.get(username);
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من الصلاحيات للتعديلات المتقدمة
    if (nameColor && ![ROLES.VIP, ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية لتلوين الاسم' });
    }
    
    if (profileBg && ![ROLES.VIP, ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية لوضع خلفية للبروفايل' });
    }
    
    if (profileGlow && ![ROLES.VIP, ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية للتوهج' });
    }
    
    if (frameAnimation && ![ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية لإطار الصورة المتحرك' });
    }
    
    // التحديثات المسموحة للجميع
    if (country) user.country = country;
    
    // التحديثات المشروطة بالرتبة
    if (nameColor && [ROLES.VIP, ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      user.nameColor = nameColor;
    }
    
    if (profileBg && [ROLES.VIP, ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      user.profileBg = profileBg;
    }
    
    if (profileGlow && [ROLES.VIP, ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      user.profileGlow = profileGlow;
    }
    
    if (frameAnimation && [ROLES.ADMIN, ROLES.HONOR, ROLES.OWNER].includes(user.role)) {
      user.frameAnimation = frameAnimation;
    }
    
    users.set(username, user);
    
    // توليد توكن جديد بالمعلومات المحدثة
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
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
    console.error('❌ خطأ في تحديث البروفايل:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 7. إعطاء لايك
app.post('/api/like', authenticateToken, (req, res) => {
  try {
    const { targetUsername } = req.body;
    const likerUsername = req.user.username.toLowerCase();
    const liker = users.get(likerUsername);
    
    if (!liker) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    const targetKey = targetUsername.toLowerCase();
    const targetUser = users.get(targetKey);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
    }
    
    if (likerUsername === targetKey) {
      return res.status(400).json({ error: 'لا يمكنك إعطاء لايك لنفسك' });
    }
    
    // التحقق إذا أعطى لايك من قبل
    if (liker.likesGiven.includes(targetUser.username)) {
      return res.status(400).json({ error: 'لقد أعطيت لايك لهذا المستخدم من قبل' });
    }
    
    // تحديث الإعجابات
    targetUser.likesReceived += 1;
    liker.likesGiven.push(targetUser.username);
    
    users.set(targetKey, targetUser);
    users.set(likerUsername, liker);
    
    // إرسال إشعار للمستخدم
    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('notification', {
        type: 'LIKE',
        from: liker.username,
        message: 'أعطاك إعجاباً'
      });
    }
    
    res.json({
      success: true,
      message: 'تم إعطاء الإعجاب بنجاح',
      likesCount: targetUser.likesReceived
    });
    
  } catch (error) {
    console.error('❌ خطأ في إعطاء لايك:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 8. إرسال ذهب (للمالك فقط)
app.post('/api/send-gold', authenticateToken, (req, res) => {
  try {
    const { targetUsername, amount } = req.body;
    const senderUsername = req.user.username.toLowerCase();
    const sender = users.get(senderUsername);
    
    if (!sender) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من الصلاحية (المالك فقط)
    if (sender.role !== ROLES.OWNER) {
      return res.status(403).json({ error: 'لا تملك صلاحية إرسال الذهب' });
    }
    
    const targetKey = targetUsername.toLowerCase();
    const targetUser = users.get(targetKey);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
    }
    
    if (senderUsername === targetKey) {
      return res.status(400).json({ error: 'لا يمكنك إرسال ذهب لنفسك' });
    }
    
    const goldAmount = parseInt(amount);
    if (isNaN(goldAmount) || goldAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ غير صالح' });
    }
    
    // المالك عنده ذهب غير محدود
    // إرسال الذهب للمستخدم المستهدف
    targetUser.gold += goldAmount;
    targetUser.goldReceived += goldAmount;
    sender.goldSent += goldAmount;
    
    users.set(targetKey, targetUser);
    users.set(senderUsername, sender);
    
    // تسجيل المعاملة
    const transactionId = uuidv4();
    const transaction = {
      id: transactionId,
      sender: sender.username,
      receiver: targetUser.username,
      amount: goldAmount,
      timestamp: new Date(),
      type: 'GOLD_TRANSFER'
    };
    
    goldTransactions.set(transactionId, transaction);
    
    // تسجيل الحدث في سجل النظام
    logSystemEvent({
      type: 'GOLD_SENT',
      actor: sender.username,
      target: targetUser.username,
      details: `إرسال ${goldAmount} ذهب`,
      amount: goldAmount
    });
    
    // إرسال إشعار للمستخدم
    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('notification', {
        type: 'GOLD',
        from: sender.username,
        amount: goldAmount,
        message: `أرسل لك ${goldAmount} ذهب`
      });
    }
    
    // تحديث قائمة الأثرياء للجميع
    updateRichList();
    
    res.json({
      success: true,
      message: `تم إرسال ${goldAmount} ذهب إلى ${targetUser.username}`,
      newBalance: targetUser.gold
    });
    
  } catch (error) {
    console.error('❌ خطأ في إرسال الذهب:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 9. شراء رتبة
app.post('/api/buy-role', authenticateToken, (req, res) => {
  try {
    const { targetRole } = req.body;
    const buyerUsername = req.user.username.toLowerCase();
    const buyer = users.get(buyerUsername);
    
    if (!buyer) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من الرتبة المطلوبة
    const rolePrices = {
      [ROLES.VIP]: 5000,
      [ROLES.ADMIN]: 20000
    };
    
    if (!rolePrices.hasOwnProperty(targetRole)) {
      return res.status(400).json({ error: 'الرتبة غير متاحة للشراء' });
    }
    
    const price = rolePrices[targetRole];
    
    // التحقق من الرصيد
    if (buyer.gold < price) {
      return res.status(400).json({ error: `رصيدك غير كافي. السعر: ${price} ذهب` });
    }
    
    // التحقق من الرتبة الحالية
    const currentLevel = ROLE_HIERARCHY[buyer.role];
    const targetLevel = ROLE_HIERARCHY[targetRole];
    
    if (targetLevel <= currentLevel) {
      return res.status(400).json({ error: 'لا يمكنك شراء رتبة أقل أو مساوية لرتبتك الحالية' });
    }
    
    // خصم الذهب
    buyer.gold -= price;
    buyer.role = targetRole;
    
    // إذا كان شراء رتبة ادمن، إضافة إطار متحرك
    if (targetRole === ROLES.ADMIN) {
      buyer.frameAnimation = 'admin_frame.gif';
    }
    
    // إذا كان شراء رتبة عضو مميز، إضافة خلفية وتوهج
    if (targetRole === ROLES.VIP) {
      buyer.profileBg = 'vip_bg.jpg';
      buyer.profileGlow = true;
    }
    
    users.set(buyerUsername, buyer);
    
    // تسجيل عملية الشراء
    const purchaseId = uuidv4();
    const purchase = {
      id: purchaseId,
      buyer: buyer.username,
      role: targetRole,
      price: price,
      timestamp: new Date()
    };
    
    purchases.set(purchaseId, purchase);
    
    // تسجيل الحدث
    logSystemEvent({
      type: 'ROLE_PURCHASE',
      actor: buyer.username,
      target: targetRole,
      details: `شراء رتبة ${targetRole} مقابل ${price} ذهب`,
      amount: price
    });
    
    // توليد توكن جديد
    const token = generateToken(buyer);
    
    // إرسال إشعار للجميع
    io.emit('roleUpdate', {
      username: buyer.username,
      newRole: targetRole,
      message: `${buyer.username} اشترى رتبة ${targetRole}`
    });
    
    res.json({
      success: true,
      token,
      message: `تم شراء رتبة ${targetRole} بنجاح`,
      newRole: buyer.role,
      newGold: buyer.gold,
      user: {
        id: buyer.id,
        username: buyer.username,
        role: buyer.role,
        serial: buyer.serial,
        gold: buyer.gold,
        points: buyer.points,
        nameColor: buyer.nameColor,
        profileBg: buyer.profileBg,
        profileGlow: buyer.profileGlow,
        frameAnimation: buyer.frameAnimation
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في شراء الرتبة:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 10. إهداء رتبة (للأونر والمالك فقط)
app.post('/api/gift-role', authenticateToken, (req, res) => {
  try {
    const { targetUsername, targetRole } = req.body;
    const gifterUsername = req.user.username.toLowerCase();
    const gifter = users.get(gifterUsername);
    
    if (!gifter) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من الصلاحية (الاونر والمالك فقط)
    if (![ROLES.HONOR, ROLES.OWNER].includes(gifter.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية إهداء الرتب' });
    }
    
    const targetKey = targetUsername.toLowerCase();
    const targetUser = users.get(targetKey);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
    }
    
    // التحقق من الرتبة المهداة
    const allowedGifts = {
      [ROLES.HONOR]: [ROLES.VIP, ROLES.ADMIN],
      [ROLES.OWNER]: [ROLES.VIP, ROLES.ADMIN, ROLES.HONOR]
    };
    
    if (!allowedGifts[gifter.role]?.includes(targetRole)) {
      return res.status(400).json({ error: 'لا يمكنك إهداء هذه الرتبة' });
    }
    
    // التحقق من التسلسل الهرمي
    if (ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY[targetUser.role]) {
      return res.status(400).json({ error: 'لا يمكن إهداء رتبة أقل أو مساوية لرتبته الحالية' });
    }
    
    // تحديث رتبة المستهدف
    const oldRole = targetUser.role;
    targetUser.role = targetRole;
    
    // إضافة المميزات حسب الرتبة
    if (targetRole === ROLES.ADMIN) {
      targetUser.frameAnimation = 'admin_frame.gif';
    } else if (targetRole === ROLES.VIP) {
      targetUser.profileBg = 'vip_bg.jpg';
      targetUser.profileGlow = true;
    }
    
    users.set(targetKey, targetUser);
    
    // تسجيل الحدث
    logSystemEvent({
      type: 'ROLE_GIFT',
      actor: gifter.username,
      target: targetUser.username,
      details: `إهداء رتبة ${targetRole}`,
      oldRole: oldRole,
      newRole: targetRole
    });
    
    // إرسال إشعار للمستخدم
    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('notification', {
        type: 'ROLE_GIFT',
        from: gifter.username,
        role: targetRole,
        message: `حصلت على رتبة ${targetRole} هدية من ${gifter.username}`
      });
    }
    
    // إعلام الجميع
    io.emit('roleUpdate', {
      username: targetUser.username,
      newRole: targetRole,
      message: `${gifter.username} أهدى رتبة ${targetRole} لـ ${targetUser.username}`
    });
    
    res.json({
      success: true,
      message: `تم إهداء رتبة ${targetRole} لـ ${targetUser.username}`
    });
    
  } catch (error) {
    console.error('❌ خطأ في إهداء الرتبة:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 11. كتم مستخدم
app.post('/api/mute', authenticateToken, (req, res) => {
  try {
    const { targetUsername, duration } = req.body;
    const muterUsername = req.user.username.toLowerCase();
    const muter = users.get(muterUsername);
    
    if (!muter) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    const targetKey = targetUsername.toLowerCase();
    const targetUser = users.get(targetKey);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
    }
    
    // التحقق من الصلاحية
    if (!canPerformAction(muter.role, targetUser.role, 'mute')) {
      return res.status(403).json({ error: 'لا تملك صلاحية كتم هذا المستخدم' });
    }
    
    const durationOptions = {
      '5m': 5 * 60 * 1000,        // 5 دقائق
      '1d': 24 * 60 * 60 * 1000,  // يوم
      'forever': null             // للأبد
    };
    
    if (!durationOptions.hasOwnProperty(duration)) {
      return res.status(400).json({ error: 'المدة غير صالحة' });
    }
    
    const muteId = uuidv4();
    const muteExpiry = duration === 'forever' ? null : new Date(Date.now() + durationOptions[duration]);
    
    const muteRecord = {
      id: muteId,
      muter: muter.username,
      target: targetUser.username,
      duration: duration,
      expiry: muteExpiry,
      timestamp: new Date()
    };
    
    mutes.set(muteId, muteRecord);
    
    // تسجيل الحدث
    logSystemEvent({
      type: 'MUTE',
      actor: muter.username,
      target: targetUser.username,
      details: `كتم لمدة ${duration}`,
      duration: duration
    });
    
    // إرسال إشعار للمستخدم المكتم
    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('muted', {
        muter: muter.username,
        duration: duration,
        expiry: muteExpiry,
        message: `تم كتمك من قبل ${muter.username} لمدة ${duration}`
      });
    }
    
    // إعلام الغرفة
    const room = rooms.get('general');
    if (room) {
      const systemMessage = {
        id: uuidv4(),
        type: 'system',
        content: `قام ${muter.username} بكتم ${targetUser.username} لمدة ${duration}`,
        timestamp: new Date(),
        roomId: 'general'
      };
      
      room.messages.push(systemMessage);
      io.to('general').emit('newMessage', systemMessage);
    }
    
    res.json({
      success: true,
      message: `تم كتم ${targetUser.username} لمدة ${duration}`,
      expiry: muteExpiry
    });
    
  } catch (error) {
    console.error('❌ خطأ في كتم المستخدم:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 12. طرد مستخدم
app.post('/api/kick', authenticateToken, (req, res) => {
  try {
    const { targetUsername, duration } = req.body;
    const kickerUsername = req.user.username.toLowerCase();
    const kicker = users.get(kickerUsername);
    
    if (!kicker) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    const targetKey = targetUsername.toLowerCase();
    const targetUser = users.get(targetKey);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
    }
    
    // التحقق من الصلاحية
    if (!canPerformAction(kicker.role, targetUser.role, 'kick')) {
      return res.status(403).json({ error: 'لا تملك صلاحية طرد هذا المستخدم' });
    }
    
    const durationOptions = {
      '5m': 5 * 60 * 1000,        // 5 دقائق
      '1d': 24 * 60 * 60 * 1000,  // يوم
      'forever': null             // للأبد
    };
    
    if (!durationOptions.hasOwnProperty(duration)) {
      return res.status(400).json({ error: 'المدة غير صالحة' });
    }
    
    const kickId = uuidv4();
    const kickExpiry = duration === 'forever' ? null : new Date(Date.now() + durationOptions[duration]);
    
    const kickRecord = {
      id: kickId,
      kicker: kicker.username,
      target: targetUser.username,
      duration: duration,
      expiry: kickExpiry,
      timestamp: new Date()
    };
    
    kicks.set(kickId, kickRecord);
    
    // تسجيل الحدث
    logSystemEvent({
      type: 'KICK',
      actor: kicker.username,
      target: targetUser.username,
      details: `طرد لمدة ${duration}`,
      duration: duration
    });
    
    // إرسال إشعار للمستخدم المطرود
    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('kicked', {
        kicker: kicker.username,
        duration: duration,
        expiry: kickExpiry,
        message: `تم طردك من قبل ${kicker.username} لمدة ${duration}`
      });
    }
    
    // إعلام الغرفة
    const room = rooms.get('general');
    if (room) {
      const systemMessage = {
        id: uuidv4(),
        type: 'system',
        content: `قام ${kicker.username} بطرد ${targetUser.username} لمدة ${duration}`,
        timestamp: new Date(),
        roomId: 'general'
      };
      
      room.messages.push(systemMessage);
      io.to('general').emit('newMessage', systemMessage);
    }
    
    res.json({
      success: true,
      message: `تم طرد ${targetUser.username} لمدة ${duration}`,
      expiry: kickExpiry
    });
    
  } catch (error) {
    console.error('❌ خطأ في طرد المستخدم:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 13. الحصول على القوائم
app.get('/api/lists', authenticateToken, (req, res) => {
  try {
    // قائمة الأثرياء (أكثر 3 ذهب)
    const richList = Array.from(users.values())
      .filter(user => user.gold > 0)
      .sort((a, b) => b.gold - a.gold)
      .slice(0, 3)
      .map(user => ({
        username: user.username,
        role: user.role,
        gold: user.gold,
        avatar: user.avatar,
        nameColor: user.nameColor
      }));
    
    // قائمة المتفاعلين (أكثر 3 نقاط)
    const activeList = Array.from(users.values())
      .filter(user => user.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map(user => ({
        username: user.username,
        role: user.role,
        points: user.points,
        avatar: user.avatar,
        nameColor: user.nameColor
      }));
    
    // قائمة المتصلين
    const onlineList = Array.from(users.values())
      .filter(user => user.isOnline)
      .sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role])
      .map(user => ({
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        nameColor: user.nameColor,
        serial: user.serial,
        points: user.points,
        gold: user.gold
      }));
    
    res.json({
      success: true,
      richList,
      activeList,
      onlineList
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب القوائم:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 14. سجل الأحداث (للمالك فقط)
app.get('/api/system-logs', authenticateToken, (req, res) => {
  try {
    const username = req.user.username.toLowerCase();
    const user = users.get(username);
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من الصلاحية (المالك فقط)
    if (user.role !== ROLES.OWNER) {
      return res.status(403).json({ error: 'لا تملك صلاحية الوصول لسجل الأحداث' });
    }
    
    res.json({
      success: true,
      logs: systemLogs.slice(-100).reverse() // آخر 100 حدث
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب سجل الأحداث:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 15. حذف رسالة
app.post('/api/delete-message', authenticateToken, (req, res) => {
  try {
    const { messageId, roomId } = req.body;
    const deleterUsername = req.user.username.toLowerCase();
    const deleter = users.get(deleterUsername);
    
    if (!deleter) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }
    
    // البحث عن الرسالة
    const messageIndex = room.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'الرسالة غير موجودة' });
    }
    
    const message = room.messages[messageIndex];
    const senderKey = message.sender.toLowerCase();
    const sender = users.get(senderKey);
    
    // التحقق من الصلاحية
    if (!canPerformAction(deleter.role, sender?.role || ROLES.GUEST, 'delete_message')) {
      return res.status(403).json({ error: 'لا تملك صلاحية حذف هذه الرسالة' });
    }
    
    // حذف الرسالة
    room.messages.splice(messageIndex, 1);
    
    // تسجيل الحدث
    logSystemEvent({
      type: 'DELETE_MESSAGE',
      actor: deleter.username,
      target: message.sender,
      details: `حذف رسالة في ${roomId}`,
      messageId: messageId
    });
    
    // إعلام الغرفة
    io.to(roomId).emit('messageDeleted', {
      messageId,
      roomId,
      deletedBy: deleter.username
    });
    
    res.json({
      success: true,
      message: 'تم حذف الرسالة بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في حذف الرسالة:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 16. تحديث قائمة الأثرياء
function updateRichList() {
  const richList = Array.from(users.values())
    .filter(user => user.gold > 0)
    .sort((a, b) => b.gold - a.gold)
    .slice(0, 3);
  
  io.emit('richListUpdate', richList);
}

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
  
  // إرسال رسالة خاصة
  socket.on('sendPrivateMessage', ({ token, receiver, content }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const senderUsername = decoded.username.toLowerCase();
      const sender = users.get(senderUsername);
      
      if (!sender) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      const receiverKey = receiver.toLowerCase();
      const receiverUser = users.get(receiverKey);
      
      if (!receiverUser) {
        socket.emit('error', { message: 'المستخدم المستقبل غير موجود' });
        return;
      }
      
      const messageId = uuidv4();
      const privateMessage = {
        id: messageId,
        type: 'private',
        content,
        sender: sender.username,
        senderRole: sender.role,
        senderColor: sender.nameColor,
        senderAvatar: sender.avatar,
        receiver: receiverUser.username,
        timestamp: new Date(),
        read: false,
        pointsAwarded: true
      };
      
      // زيادة نقاط التفاعل
      sender.points += 1;
      users.set(senderUsername, sender);
      
      // حفظ الرسالة
      const chatKey = [sender.username, receiverUser.username].sort().join(':');
      if (!privateMessages.has(chatKey)) {
        privateMessages.set(chatKey, []);
      }
      privateMessages.get(chatKey).push(privateMessage);
      
      // إرسال الرسالة للمستقبل إذا كان متصلاً
      if (receiverUser.socketId) {
        io.to(receiverUser.socketId).emit('newPrivateMessage', privateMessage);
        
        // إشعار
        io.to(receiverUser.socketId).emit('notification', {
          type: 'PRIVATE_MESSAGE',
          from: sender.username,
          message: 'رسالة خاصة جديدة'
        });
      }
      
      // تأكيد للمرسل
      socket.emit('privateMessageSent', privateMessage);
      
      // تحديث قائمة المتفاعلين
      updateActiveList();
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة الخاصة:', error);
      socket.emit('error', { message: 'خطأ في إرسال الرسالة الخاصة' });
    }
  });
  
  // تحديث قائمة المتفاعلين
  function updateActiveList() {
    const activeList = Array.from(users.values())
      .filter(user => user.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);
    
    io.emit('activeListUpdate', activeList);
  }
  
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
});
