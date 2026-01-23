require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/syria-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// نماذج قاعدة البيانات
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, minlength: 3, maxlength: 14 },
  password: { type: String, required: true },
  gender: { type: String, enum: ['ذكر', 'انثى'], required: true },
  age: { type: Number, min: 1, max: 99, required: true },
  role: { 
    type: String, 
    enum: ['مالك', 'اونر', 'ادمن', 'عضو مميز', 'عضو', 'ضيف'],
    default: 'عضو'
  },
  serialNumber: { type: Number, unique: true },
  gold: { type: Number, default: 0 },
  interactionPoints: { type: Number, default: 0 },
  profileImage: { type: String, default: '' },
  profileSong: { type: String, default: '' },
  profileBackground: { type: String, default: '' },
  nameColor: { type: String, default: '#000000' },
  profileFrame: { type: String, default: '' },
  nameBackground: { type: String, default: '' },
  country: { type: String, default: '' },
  joinDate: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: String,
  senderRole: String,
  content: String,
  type: { type: String, enum: ['text', 'image', 'audio', 'video', 'youtube'], default: 'text' },
  mediaUrl: String,
  isPrivate: { type: Boolean, default: false },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: String, default: 'general' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  timestamp: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }
});

const muteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration: { type: String, enum: ['5m', '1d', 'permanent'], required: true },
  reason: String,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const banSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration: { type: String, enum: ['5m', '1d', 'permanent'], required: true },
  reason: String,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const Mute = mongoose.model('Mute', muteSchema);
const Ban = mongoose.model('Ban', banSchema);

// تخزين الجلسات
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/syria-chat',
  collection: 'sessions'
});

// إعدادات الجلسة
app.use(session({
  secret: process.env.SESSION_SECRET || 'syria-chat-secret-key',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 ساعة
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إنشاء حساب المالك الأساسي
async function createAdminUser() {
  try {
    const existingAdmin = await User.findOne({ username: 'محمد' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('aumsalah079', 10);
      
      // حساب المالك
      const adminUser = new User({
        username: 'محمد',
        password: hashedPassword,
        gender: 'ذكر',
        age: 25,
        role: 'مالك',
        serialNumber: 1,
        gold: 1000000,
        interactionPoints: 0,
        country: 'سوريا'
      });
      
      await adminUser.save();
      console.log('✅ حساب المالك تم إنشاؤه بنجاح');
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء حساب المالك:', error);
  }
}

// المسارات
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/chat.html');
  } else {
    res.redirect('/index.html');
  }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 يوم
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        serialNumber: user.serialNumber,
        gold: user.gold
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, gender, age } = req.body;
    
    // التحقق من البيانات
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور غير متطابقة' });
    }
    
    if (username.length < 3 || username.length > 14) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم يجب أن يكون بين 3 و 14 حرف' });
    }
    
    if (password.length < 3 || password.length > 14) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون بين 3 و 14 حرف' });
    }
    
    // التحقق من عدم تكرار اسم المستخدم
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
    }
    
    // إنشاء رقم تسلسلي جديد
    const lastUser = await User.findOne().sort({ serialNumber: -1 });
    const newSerialNumber = lastUser ? lastUser.serialNumber + 1 : 2;
    
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // إنشاء المستخدم الجديد
    const newUser = new User({
      username,
      password: hashedPassword,
      gender,
      age,
      serialNumber: newSerialNumber
    });
    
    await newUser.save();
    
    res.json({ 
      success: true, 
      message: 'تم إنشاء الحساب بنجاح',
      serialNumber: newSerialNumber
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// تسجيل الدخول كزائر
app.post('/api/guest', async (req, res) => {
  try {
    const { username, gender, age } = req.body;
    
    if (username.length < 3 || username.length > 14) {
      return res.status(400).json({ success: false, message: 'الاسم يجب أن يكون بين 3 و 14 حرف' });
    }
    
    // التحقق من عدم تكرار الاسم
    const existingUser = await User.findOne({ username, role: 'ضيف' });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'الاسم موجود مسبقاً' });
    }
    
    // إنشاء رقم تسلسلي جديد للزائر
    const lastUser = await User.findOne().sort({ serialNumber: -1 });
    const newSerialNumber = lastUser ? lastUser.serialNumber + 1 : 2;
    
    // إنشاء حساب زائر
    const guestUser = new User({
      username,
      password: 'guest', // كلمة مرور افتراضية
      gender,
      age,
      role: 'ضيف',
      serialNumber: newSerialNumber
    });
    
    await guestUser.save();
    
    req.session.userId = guestUser._id;
    req.session.username = guestUser.username;
    req.session.role = guestUser.role;
    req.session.isGuest = true;
    
    res.json({ 
      success: true,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        role: guestUser.role,
        serialNumber: newSerialNumber
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// الخروج
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('🔗 مستخدم متصل:', socket.id);
  
  socket.on('join-chat', async (userData) => {
    try {
      const user = await User.findById(userData.id);
      if (user) {
        user.isOnline = true;
        await user.save();
        
        socket.join('general');
        socket.userId = user._id;
        socket.username = user.username;
        socket.role = user.role;
        
        // إرسال رسالة دخول
        const welcomeMessage = {
          senderId: user._id,
          senderName: user.username,
          senderRole: user.role,
          content: `🎉 ${user.username} إنضم للغرفة`,
          type: 'system'
        };
        
        io.to('general').emit('new-message', welcomeMessage);
        
        // تحديث قائمة المستخدمين
        const onlineUsers = await User.find({ isOnline: true });
        const allUsers = await User.find().sort({ role: -1, gold: -1 }).limit(50);
        
        io.emit('update-users', {
          online: onlineUsers,
          all: allUsers
        });
      }
    } catch (error) {
      console.error('خطأ في الانضمام:', error);
    }
  });
  
  socket.on('send-message', async (messageData) => {
    try {
      // التحقق من الكتم
      const isMuted = await Mute.findOne({ 
        userId: messageData.senderId,
        expiresAt: { $gt: new Date() }
      });
      
      if (isMuted) {
        socket.emit('muted', { 
          duration: isMuted.duration,
          expiresAt: isMuted.expiresAt 
        });
        return;
      }
      
      // حفظ الرسالة
      const newMessage = new Message({
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        senderRole: messageData.senderRole,
        content: messageData.content,
        type: messageData.type,
        mediaUrl: messageData.mediaUrl,
        isPrivate: messageData.isPrivate,
        receiverId: messageData.receiverId,
        replyTo: messageData.replyTo
      });
      
      await newMessage.save();
      
      // زيادة نقاط التفاعل للمرسل
      await User.findByIdAndUpdate(messageData.senderId, {
        $inc: { interactionPoints: 1 }
      });
      
      // إرسال الرسالة
      if (messageData.isPrivate) {
        io.to(messageData.receiverId).emit('private-message', newMessage);
        socket.emit('private-message-sent', newMessage);
      } else {
        io.to('general').emit('new-message', newMessage);
      }
      
      // تحديث قائمة أكثر المتفاعلين
      const topInteractors = await User.find()
        .sort({ interactionPoints: -1 })
        .limit(3);
      
      io.emit('update-top-interactors', topInteractors);
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    }
  });
  
  socket.on('mute-user', async (data) => {
    try {
      const muter = await User.findById(data.muterId);
      const target = await User.findById(data.targetId);
      
      // التحقق من الصلاحيات
      if (!canMute(muter.role, target.role)) {
        socket.emit('error', { message: 'لا تملك الصلاحية لكتم هذا المستخدم' });
        return;
      }
      
      // حساب وقت انتهاء الكتم
      let expiresAt = new Date();
      switch(data.duration) {
        case '5m':
          expiresAt.setMinutes(expiresAt.getMinutes() + 5);
          break;
        case '1d':
          expiresAt.setDate(expiresAt.getDate() + 1);
          break;
        case 'permanent':
          expiresAt.setFullYear(expiresAt.getFullYear() + 100); // 100 سنة
          break;
      }
      
      const mute = new Mute({
        userId: data.targetId,
        mutedBy: data.muterId,
        duration: data.duration,
        reason: data.reason,
        expiresAt: expiresAt
      });
      
      await mute.save();
      
      // إرسال إشعار
      io.to(data.targetId).emit('muted-notification', {
        duration: data.duration,
        reason: data.reason,
        mutedBy: muter.username
      });
      
      // تسجيل الإجراء
      const actionMessage = {
        senderId: data.muterId,
        senderName: muter.username,
        senderRole: muter.role,
        content: `🔇 قام ${muter.username} بكتم ${target.username} لمدة ${data.duration}`,
        type: 'action'
      };
      
      io.to('general').emit('new-message', actionMessage);
    } catch (error) {
      console.error('خطأ في كتم المستخدم:', error);
    }
  });
  
  socket.on('send-gold', async (data) => {
    try {
      const sender = await User.findById(data.senderId);
      const receiver = await User.findById(data.receiverId);
      
      // التحقق من أن المرسل هو المالك فقط
      if (sender.role !== 'مالك') {
        socket.emit('error', { message: 'فقط المالك يمكنه إرسال الذهب' });
        return;
      }
      
      // التحقق من الرصيد
      if (sender.gold < data.amount) {
        socket.emit('error', { message: 'رصيدك غير كافي' });
        return;
      }
      
      // تحويل الذهب
      sender.gold -= data.amount;
      receiver.gold += data.amount;
      
      await sender.save();
      await receiver.save();
      
      // إرسال إشعار للمستقبل
      io.to(data.receiverId).emit('gold-received', {
        amount: data.amount,
        from: sender.username
      });
      
      // تحديث قائمة الأثرياء
      const richest = await User.find()
        .sort({ gold: -1 })
        .limit(3);
      
      io.emit('update-richest', richest);
    } catch (error) {
      console.error('خطأ في إرسال الذهب:', error);
    }
  });
  
  socket.on('buy-role', async (data) => {
    try {
      const user = await User.findById(data.userId);
      
      let rolePrice = 0;
      let targetRole = '';
      
      switch(data.role) {
        case 'ادمن':
          rolePrice = 20000;
          targetRole = 'ادمن';
          break;
        case 'عضو مميز':
          rolePrice = 5000;
          targetRole = 'عضو مميز';
          break;
      }
      
      if (user.gold < rolePrice) {
        socket.emit('error', { message: 'رصيدك غير كافي لشراء هذه الرتبة' });
        return;
      }
      
      user.gold -= rolePrice;
      user.role = targetRole;
      await user.save();
      
      socket.emit('role-purchased', {
        role: targetRole,
        newGold: user.gold
      });
      
      // إشعار للجميع
      io.to('general').emit('new-message', {
        senderId: user._id,
        senderName: 'النظام',
        senderRole: 'system',
        content: `🎖️ قام ${user.username} بشراء رتبة ${targetRole}`,
        type: 'system'
      });
    } catch (error) {
      console.error('خطأ في شراء الرتبة:', error);
    }
  });
  
  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        const user = await User.findById(socket.userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          await user.save();
          
          // تحديث قائمة المستخدمين
          const onlineUsers = await User.find({ isOnline: true });
          const allUsers = await User.find().sort({ role: -1, gold: -1 }).limit(50);
          
          io.emit('update-users', {
            online: onlineUsers,
            all: allUsers
          });
        }
      }
    } catch (error) {
      console.error('خطأ في قطع الاتصال:', error);
    }
  });
});

// دالة للتحقق من صلاحية الكتم
function canMute(muterRole, targetRole) {
  const roleHierarchy = {
    'مالك': 6,
    'اونر': 5,
    'ادمن': 4,
    'عضو مميز': 3,
    'عضو': 2,
    'ضيف': 1
  };
  
  // المالك لا يمكن كتمه
  if (targetRole === 'مالك') return false;
  
  // الأونر لا يمكن كتم المالك
  if (muterRole === 'اونر' && targetRole === 'مالك') return false;
  
  // يمكن الكتم إذا كان المرتبة أعلى
  return roleHierarchy[muterRole] > roleHierarchy[targetRole];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  await createAdminUser();
});
