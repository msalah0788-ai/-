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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// قاعدة بيانات مؤقتة (في الإنتاج استخدم MongoDB أو MySQL)
const users = new Map();
const rooms = new Map();
const messages = new Map();
const privateMessages = new Map();
const blockedUsers = new Map();
const mutedUsers = new Map();
const diaryPosts = new Map();

// تهيئة الغرف الافتراضية
const defaultRooms = [
  { id: 'general', name: 'العمومية', description: 'الغرفة الرئيسية للجميع', color: '#3B82F6' },
  { id: 'games', name: 'الألعاب', description: 'مناقشة الألعاب والمسابقات', color: '#10B981' },
  { id: 'friends', name: 'التعارف', description: 'التعارف وبناء الصداقات', color: '#8B5CF6' },
  { id: 'tech', name: 'التقنية', description: 'مناقشة المواضيع التقنية', color: '#F59E0B' }
];

defaultRooms.forEach(room => {
  rooms.set(room.id, {
    ...room,
    users: new Set(),
    messages: []
  });
});

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// وظائف المساعدة
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      color: user.textColor,
      font: user.font,
      fontSize: user.fontSize
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'الوصول مرفوض' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'التوكن غير صالح' });
    }
    req.user = user;
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    
    if (users.has(username.toLowerCase())) {
      return res.status(400).json({ error: 'اسم المستخدم محجوز' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const newUser = {
      id: userId,
      username: username.trim(),
      password: hashedPassword,
      role: 'member',
      avatar: 'default.png',
      textColor: '#000000',
      font: 'Arial',
      fontSize: 'medium',
      joinDate: new Date(),
      lastSeen: new Date(),
      isOnline: false,
      socketId: null,
      diaryPosts: [],
      blockedUsers: [],
      ignoredBy: []
    };
    
    users.set(username.toLowerCase(), newUser);
    
    const token = generateToken(newUser);
    
    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        avatar: newUser.avatar,
        textColor: newUser.textColor,
        font: newUser.font,
        fontSize: newUser.fontSize
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const userKey = username.toLowerCase();
    const user = users.get(userKey);
    
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
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
        avatar: user.avatar,
        textColor: user.textColor,
        font: user.font,
        fontSize: user.fontSize
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

app.post('/api/update-profile', authenticateToken, (req, res) => {
  try {
    const { textColor, font, fontSize } = req.body;
    const username = req.user.username.toLowerCase();
    const user = users.get(username);
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    if (textColor) user.textColor = textColor;
    if (font) user.font = font;
    if (fontSize) user.fontSize = fontSize;
    
    users.set(username, user);
    
    // تحديث التوكن بالمعلومات الجديدة
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        textColor: user.textColor,
        font: user.font,
        fontSize: user.fontSize
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'خطأ في تحديث الملف الشخصي' });
  }
});

app.get('/api/rooms', (req, res) => {
  const roomsArray = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    description: room.description,
    color: room.color,
    userCount: room.users.size
  }));
  
  res.json({ rooms: roomsArray });
});

app.get('/api/room/:roomId/messages', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'الغرفة غير موجودة' });
  }
  
  res.json({ messages: room.messages.slice(-100) }); // إرسال آخر 100 رسالة فقط
});

// Socket.IO Handling
io.on('connection', (socket) => {
  console.log('مستخدم جديد متصل:', socket.id);
  
  socket.on('join', async ({ token, roomId }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userKey = decoded.username.toLowerCase();
      const user = users.get(userKey);
      
      if (!user) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      // تحديث حالة المستخدم
      user.isOnline = true;
      user.socketId = socket.id;
      user.lastSeen = new Date();
      users.set(userKey, user);
      
      // تخزين بيانات المستخدم في Socket
      socket.userId = user.id;
      socket.username = user.username;
      socket.role = user.role;
      socket.textColor = user.textColor;
      socket.font = user.font;
      socket.fontSize = user.fontSize;
      
      // الانضمام للغرفة
      socket.join(roomId);
      socket.currentRoom = roomId;
      
      const room = rooms.get(roomId);
      if (room) {
        room.users.add(user.username);
        
        // إرسال رسالة دخول للغرفة
        const joinMessage = {
          id: uuidv4(),
          type: 'system',
          content: `${user.username} انضم للغرفة`,
          timestamp: new Date(),
          roomId: roomId
        };
        
        room.messages.push(joinMessage);
        
        // إرسال قائمة المستخدمين المحدثة للجميع
        const roomUsers = Array.from(room.users);
        io.to(roomId).emit('userListUpdate', { 
          roomId, 
          users: roomUsers.map(u => {
            const userObj = users.get(u.toLowerCase());
            return {
              username: u,
              role: userObj?.role || 'visitor',
              isOnline: userObj?.isOnline || false,
              textColor: userObj?.textColor || '#666666',
              avatar: userObj?.avatar || 'default.png'
            };
          })
        });
        
        // إرسال الرسالة الجديدة
        io.to(roomId).emit('newMessage', joinMessage);
        
        // إرسال بيانات الغرفة للمستخدم
        socket.emit('roomJoined', {
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            color: room.color
          },
          users: roomUsers.map(u => {
            const userObj = users.get(u.toLowerCase());
            return {
              username: u,
              role: userObj?.role || 'visitor',
              isOnline: userObj?.isOnline || false,
              textColor: userObj?.textColor || '#666666',
              avatar: userObj?.avatar || 'default.png'
            };
          }),
          messages: room.messages.slice(-50)
        });
      }
      
      // إرسال تحديث حالة الاتصال لجميع المستخدمين
      io.emit('userStatusChange', {
        username: user.username,
        isOnline: true,
        role: user.role
      });
      
    } catch (error) {
      console.error('Join error:', error);
      socket.emit('error', { message: 'خطأ في المصادقة' });
    }
  });
  
  socket.on('sendMessage', ({ token, roomId, content, type = 'text' }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userKey = decoded.username.toLowerCase();
      const user = users.get(userKey);
      
      if (!user) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      // التحقق من حالة الكتم
      const muteKey = `${user.username}:${roomId}`;
      if (mutedUsers.has(muteKey)) {
        const muteInfo = mutedUsers.get(muteKey);
        if (muteInfo.expires > new Date()) {
          socket.emit('muted', { 
            message: `أنت مكتم حتى ${muteInfo.expires.toLocaleTimeString('ar-EG')}`,
            expires: muteInfo.expires
          });
          return;
        } else {
          mutedUsers.delete(muteKey);
        }
      }
      
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'الغرفة غير موجودة' });
        return;
      }
      
      const messageId = uuidv4();
      const newMessage = {
        id: messageId,
        type,
        content,
        sender: user.username,
        senderRole: user.role,
        senderColor: user.textColor,
        senderFont: user.font,
        senderFontSize: user.fontSize,
        timestamp: new Date(),
        roomId
      };
      
      // حفظ الرسالة
      room.messages.push(newMessage);
      
      // إرسال الرسالة لجميع المستخدمين في الغرفة
      io.to(roomId).emit('newMessage', newMessage);
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
    }
  });
  
  socket.on('sendPrivateMessage', ({ token, recipient, content, type = 'text' }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const senderKey = decoded.username.toLowerCase();
      const sender = users.get(senderKey);
      
      if (!sender) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      const recipientKey = recipient.toLowerCase();
      const recipientUser = users.get(recipientKey);
      
      if (!recipientUser) {
        socket.emit('error', { message: 'المستقبل غير موجود' });
        return;
      }
      
      // التحقق من التجاهل
      if (recipientUser.blockedUsers?.includes(sender.username)) {
        socket.emit('error', { message: 'لا يمكن إرسال رسالة لهذا المستخدم' });
        return;
      }
      
      const messageId = uuidv4();
      const privateMessage = {
        id: messageId,
        type,
        content,
        sender: sender.username,
        senderRole: sender.role,
        senderColor: sender.textColor,
        senderFont: sender.font,
        senderFontSize: sender.fontSize,
        recipient: recipient,
        timestamp: new Date(),
        read: false
      };
      
      // حفظ الرسالة الخاصة
      const chatKey = [sender.username, recipient].sort().join(':');
      if (!privateMessages.has(chatKey)) {
        privateMessages.set(chatKey, []);
      }
      privateMessages.get(chatKey).push(privateMessage);
      
      // إرسال الرسالة للمستقبل إذا كان متصلًا
      if (recipientUser.socketId) {
        io.to(recipientUser.socketId).emit('newPrivateMessage', privateMessage);
        io.to(recipientUser.socketId).emit('notification', {
          type: 'privateMessage',
          from: sender.username,
          message: 'رسالة خاصة جديدة'
        });
      }
      
      // تأكيد الإرسال للمرسل
      socket.emit('privateMessageSent', privateMessage);
      
    } catch (error) {
      console.error('Private message error:', error);
      socket.emit('error', { message: 'خطأ في إرسال الرسالة الخاصة' });
    }
  });
  
  socket.on('muteUser', ({ token, roomId, targetUsername, durationMinutes = 10 }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const moderatorKey = decoded.username.toLowerCase();
      const moderator = users.get(moderatorKey);
      
      if (!moderator || (moderator.role !== 'admin' && moderator.role !== 'owner')) {
        socket.emit('error', { message: 'ليس لديك صلاحية لهذا الإجراء' });
        return;
      }
      
      const targetKey = targetUsername.toLowerCase();
      const targetUser = users.get(targetKey);
      
      if (!targetUser) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      const muteKey = `${targetUsername}:${roomId}`;
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + durationMinutes);
      
      mutedUsers.set(muteKey, {
        username: targetUsername,
        roomId,
        moderator: moderator.username,
        expires,
        durationMinutes
      });
      
      // إرسال رسالة نظامية
      const room = rooms.get(roomId);
      if (room) {
        const systemMessage = {
          id: uuidv4(),
          type: 'system',
          content: `قام المشرف ${moderator.username} بكتم العضو ${targetUsername} لمدة ${durationMinutes} دقائق`,
          timestamp: new Date(),
          roomId
        };
        
        room.messages.push(systemMessage);
        io.to(roomId).emit('newMessage', systemMessage);
      }
      
      // إعلام المستخدم المكتم
      if (targetUser.socketId) {
        io.to(targetUser.socketId).emit('muted', {
          message: `لقد تم كتمك لمدة ${durationMinutes} دقائق`,
          expires,
          roomId
        });
      }
      
    } catch (error) {
      console.error('Mute user error:', error);
      socket.emit('error', { message: 'خطأ في كتم المستخدم' });
    }
  });
  
  socket.on('kickUser', ({ token, roomId, targetUsername }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const moderatorKey = decoded.username.toLowerCase();
      const moderator = users.get(moderatorKey);
      
      if (!moderator || (moderator.role !== 'admin' && moderator.role !== 'owner')) {
        socket.emit('error', { message: 'ليس لديك صلاحية لهذا الإجراء' });
        return;
      }
      
      const targetKey = targetUsername.toLowerCase();
      const targetUser = users.get(targetKey);
      
      if (!targetUser) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      // طرد المستخدم من الغرفة
      const room = rooms.get(roomId);
      if (room) {
        room.users.delete(targetUsername);
        
        // إرسال رسالة نظامية
        const systemMessage = {
          id: uuidv4(),
          type: 'system',
          content: `قام المشرف ${moderator.username} بطرد العضو ${targetUsername} من الغرفة`,
          timestamp: new Date(),
          roomId
        };
        
        room.messages.push(systemMessage);
        io.to(roomId).emit('newMessage', systemMessage);
        
        // تحديث قائمة المستخدمين
        const roomUsers = Array.from(room.users);
        io.to(roomId).emit('userListUpdate', {
          roomId,
          users: roomUsers.map(u => {
            const userObj = users.get(u.toLowerCase());
            return {
              username: u,
              role: userObj?.role || 'visitor',
              isOnline: userObj?.isOnline || false,
              textColor: userObj?.textColor || '#666666'
            };
          })
        });
      }
      
      // إعلام المستخدم المطرود
      if (targetUser.socketId) {
        io.to(targetUser.socketId).emit('kicked', {
          roomId,
          message: `لقد تم طردك من الغرفة بواسطة ${moderator.username}`
        });
      }
      
    } catch (error) {
      console.error('Kick user error:', error);
      socket.emit('error', { message: 'خطأ في طرد المستخدم' });
    }
  });
  
  socket.on('blockUser', ({ token, targetUsername }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userKey = decoded.username.toLowerCase();
      const user = users.get(userKey);
      
      if (!user) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      const targetKey = targetUsername.toLowerCase();
      const targetUser = users.get(targetKey);
      
      if (!targetUser) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }
      
      if (!user.blockedUsers) {
        user.blockedUsers = [];
      }
      
      if (!user.blockedUsers.includes(targetUsername)) {
        user.blockedUsers.push(targetUsername);
        users.set(userKey, user);
      }
      
      socket.emit('userBlocked', {
        username: targetUsername,
        message: `تم تجاهل ${targetUsername}. لن ترى رسائله بعد الآن.`
      });
      
    } catch (error) {
      console.error('Block user error:', error);
      socket.emit('error', { message: 'خطأ في تجاهل المستخدم' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('مستخدم انقطع:', socket.username || socket.id);
    
    if (socket.username) {
      const userKey = socket.username.toLowerCase();
      const user = users.get(userKey);
      
      if (user) {
        user.isOnline = false;
        user.socketId = null;
        user.lastSeen = new Date();
        users.set(userKey, user);
        
        // تحديث حالة الاتصال لجميع المستخدمين
        io.emit('userStatusChange', {
          username: user.username,
          isOnline: false,
          role: user.role
        });
        
        // تحديث الغرف
        rooms.forEach((room, roomId) => {
          if (room.users.has(user.username)) {
            room.users.delete(user.username);
            
            // إرسال رسالة خروج
            const leaveMessage = {
              id: uuidv4(),
              type: 'system',
              content: `${user.username} غادر الغرفة`,
              timestamp: new Date(),
              roomId
            };
            
            room.messages.push(leaveMessage);
            io.to(roomId).emit('newMessage', leaveMessage);
            
            // تحديث قائمة المستخدمين
            const roomUsers = Array.from(room.users);
            io.to(roomId).emit('userListUpdate', {
              roomId,
              users: roomUsers.map(u => {
                const userObj = users.get(u.toLowerCase());
                return {
                  username: u,
                  role: userObj?.role || 'visitor',
                  isOnline: userObj?.isOnline || false,
                  textColor: userObj?.textColor || '#666666'
                };
              })
            });
          }
        });
      }
    }
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`🌐 افتح http://localhost:${PORT} في المتصفح`);
});
