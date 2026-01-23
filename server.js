// ==================== استيراد المكتبات ====================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

// ==================== إعداد التطبيق ====================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== قاعدة البيانات ====================
mongoose.connect('mongodb://localhost:27017/chat_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
.catch(err => console.log('❌ خطأ في الاتصال:', err));

// ==================== نماذج قاعدة البيانات ====================

// نموذج المستخدم
const userSchema = new mongoose.Schema({
    serialNumber: { type: Number, unique: true }, // الرقم التسلسلي
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { 
        type: String, 
        enum: ['owner', 'minister', 'premium_member', 'member', 'guest'],
        default: 'guest'
    },
    profile: {
        avatar: { type: String, default: 'default_avatar.png' },
        coverImage: { type: String, default: '' },
        bio: { type: String, default: '' },
        countryFlag: { type: String, default: '' },
        profileSong: { type: String, default: '' },
        likes: { type: Number, default: 0 },
        interactionPoints: { type: Number, default: 0 },
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        privateChatEnabled: { type: Boolean, default: true },
        theme: { type: String, default: 'default' }
    },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: Date.now }
});

// نموذج الرسائل
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true }, // اسم الغرفة
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messageType: { 
        type: String, 
        enum: ['text', 'image', 'audio', 'gif', 'system'],
        default: 'text'
    },
    content: { type: String, required: true },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // رد على رسالة
    mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // المنشنات
    timestamp: { type: Date, default: Date.now }
});

// نموذج الغرف
const roomSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPrivate: { type: Boolean, default: false },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});

// نموذج حائط الأخبار
const newsSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const Room = mongoose.model('Room', roomSchema);
const News = mongoose.model('News', newsSchema);

// ==================== إنشاء المستخدم الأساسي (المالك) ====================
async function createOwnerUser() {
    try {
        const ownerExists = await User.findOne({ username: 'محمد' });
        if (!ownerExists) {
            const hashedPassword = await bcrypt.hash('aumsalah079', 10);
            
            const owner = new User({
                serialNumber: 1,
                username: 'محمد',
                password: hashedPassword,
                gender: 'male',
                role: 'owner',
                profile: {
                    bio: 'مالك الموقع',
                    countryFlag: '🇸🇦'
                }
            });
            
            await owner.save();
            console.log('✅ تم إنشاء حساب المالك: محمد / aumsalah079');
        }
        
        // إنشاء الغرفة العامة
        const generalRoomExists = await Room.findOne({ name: 'الروم العام' });
        if (!generalRoomExists) {
            const owner = await User.findOne({ username: 'محمد' });
            const generalRoom = new Room({
                name: 'الروم العام',
                createdBy: owner._id,
                isPrivate: false
            });
            await generalRoom.save();
            console.log('✅ تم إنشاء الغرفة العامة');
        }
    } catch (error) {
        console.log('❌ خطأ في إنشاء المستخدم الأساسي:', error.message);
    }
}

// ==================== Socket.io Events ====================
const onlineUsers = new Map(); // تخزين المستخدمين المتصلين

io.on('connection', (socket) => {
    console.log('👤 مستخدم جديد متصل:', socket.id);

    // انضمام المستخدم للغرفة
    socket.on('join room', async (data) => {
        const { userId, roomName } = data;
        
        try {
            const user = await User.findById(userId);
            if (user) {
                // تحديث حالة المستخدم
                user.isOnline = true;
                user.lastSeen = new Date();
                await user.save();
                
                // تخزين معلومات الاتصال
                onlineUsers.set(socket.id, {
                    userId: user._id,
                    username: user.username,
                    role: user.role,
                    room: roomName
                });
                
                // انضمام للغرفة
                socket.join(roomName);
                
                // إرسال إشعار دخول
                const roleTitle = getRoleTitle(user.role, user.gender);
                socket.to(roomName).emit('user joined', {
                    userId: user._id,
                    username: user.username,
                    role: roleTitle,
                    isOwner: user.role === 'owner',
                    isMinister: user.role === 'minister'
                });
                
                // إرسال قائمة المتصلين للعميل
                const roomUsers = Array.from(onlineUsers.values())
                    .filter(u => u.room === roomName);
                
                io.to(roomName).emit('online users', roomUsers);
            }
        } catch (error) {
            console.log('❌ خطأ في انضمام الغرفة:', error.message);
        }
    });

    // استقبال رسالة جديدة
    socket.on('send message', async (data) => {
        const { userId, roomName, content, messageType, replyTo, mentionedUsers } = data;
        
        try {
            const user = await User.findById(userId);
            if (user) {
                // إنشاء الرسالة
                const message = new Message({
                    room: roomName,
                    sender: user._id,
                    messageType: messageType || 'text',
                    content: content,
                    replyTo: replyTo,
                    mentionedUsers: mentionedUsers || [],
                    timestamp: new Date()
                });
                
                await message.save();
                
                // زيادة نقاط التفاعل (إذا كانت نصية وأكثر من 4 حروف)
                if (messageType === 'text' && content.length > 4) {
                    user.profile.interactionPoints += 1;
                    await user.save();
                }
                
                // إرسال الرسالة للغرفة
                const messageData = {
                    _id: message._id,
                    room: message.room,
                    sender: {
                        _id: user._id,
                        username: user.username,
                        role: user.role,
                        gender: user.gender,
                        avatar: user.profile.avatar
                    },
                    messageType: message.messageType,
                    content: message.content,
                    replyTo: message.replyTo,
                    mentionedUsers: message.mentionedUsers,
                    timestamp: message.timestamp
                };
                
                io.to(roomName).emit('new message', messageData);
                
                // إرسال إشعار للمذكورين
                if (mentionedUsers && mentionedUsers.length > 0) {
                    mentionedUsers.forEach(mentionedId => {
                        const mentionedSocket = findSocketByUserId(mentionedId);
                        if (mentionedSocket) {
                            io.to(mentionedSocket).emit('mentioned', {
                                by: user.username,
                                message: content.substring(0, 50) + '...'
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.log('❌ خطأ في إرسال الرسالة:', error.message);
        }
    });

    // مستخدم غادر
    socket.on('disconnect', async () => {
        const userInfo = onlineUsers.get(socket.id);
        if (userInfo) {
            try {
                const user = await User.findById(userInfo.userId);
                if (user) {
                    user.isOnline = false;
                    user.lastSeen = new Date();
                    await user.save();
                }
                
                // إرسال إشعار خروج
                socket.to(userInfo.room).emit('user left', {
                    userId: userInfo.userId,
                    username: userInfo.username
                });
                
                // تحديث قائمة المتصلين
                onlineUsers.delete(socket.id);
                const roomUsers = Array.from(onlineUsers.values())
                    .filter(u => u.room === userInfo.room);
                io.to(userInfo.room).emit('online users', roomUsers);
                
            } catch (error) {
                console.log('❌ خطأ عند انقطاع الاتصال:', error.message);
            }
        }
    });
});

// ==================== دوال مساعدة ====================
function getRoleTitle(role, gender) {
    const titles = {
        'owner': 'مالك الموقع',
        'minister': gender === 'male' ? 'وزير' : 'وزيرة',
        'premium_member': gender === 'male' ? 'عضو مميز' : 'عضوة مميزة',
        'member': gender === 'male' ? 'عضو' : 'عضوة',
        'guest': gender === 'male' ? 'زائر' : 'زائرة'
    };
    return titles[role] || 'زائر';
}

function findSocketByUserId(userId) {
    for (const [socketId, userInfo] of onlineUsers.entries()) {
        if (userInfo.userId.toString() === userId.toString()) {
            return socketId;
        }
    }
    return null;
}

// ==================== Routes الأساسية ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 1. خاص لحساب محمد
        if (username === 'محمد') {
            // تحقق مباشر من الباسورد
            if (password === 'aumsalah079') {
                // نجيب أو ننشئ حساب محمد
                let user = await User.findOne({ username: 'محمد' });
                
                if (!user) {
                    // إذا ما لقيناه، ننشئه
                    user = new User({
                        serialNumber: 1,
                        username: 'محمد',
                        password: 'محمد'، // هون بتشفرها بعدين
                        gender: 'male',
                        role: 'owner'
                    });
                    await user.save();
                }
                
                // نجيب
                return res.json({
                    success: true,
                    userId: user._id || '1',
                    username: user.username,
                    role: user.role,
                    gender: user.gender
                });
            } else {
                return res.json({ 
                    success: false, 
                    error: 'كلمة المرور خاطئة' 
                });
            }
        }
        
        // 2. لباقي المستخدمين
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.json({ 
                success: false, 
                error: 'اسم المستخدم غير موجود' 
            });
        }
        
        // تحقق من الباسورد
        if (user.password !== password) { // مؤقتاً بدون تشفير
            return res.json({ 
                success: false, 
                error: 'كلمة المرور خاطئة' 
            });
        }
        
        // نجيب
        res.json({
            success: true,
            userId: user._id,
            username: user.username,
            role: user.role,
            gender: user.gender
        });
        
    } catch (error) {
        console.log('خطأ:', error);
        res.json({ 
            success: false, 
            error: 'حدث خطأ في الخادم' 
        });
    }
});
        
        // التحقق من البيانات
        if (!username || !password || !gender) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }
        
        // التحقق من اسم المستخدم الموجود
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
        }
        
        // إنشاء الرقم التسلسلي
        const lastUser = await User.findOne().sort({ serialNumber: -1 });
        const serialNumber = lastUser ? lastUser.serialNumber + 1 : 2;
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // إنشاء المستخدم الجديد
        const newUser = new User({
            serialNumber,
            username,
            password: hashedPassword,
            gender,
            role: 'member'
        });
        
        await newUser.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح',
            userId: newUser._id 
        });
        
    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // البحث عن المستخدم
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        
        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        
        res.json({
            success: true,
            userId: user._id,
            username: user.username,
            role: user.role,
            gender: user.gender,
            avatar: user.profile.avatar
        });
        
    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// ==================== بدء الخادم ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    await createOwnerUser();
});
