require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تخزين البيانات في الذاكرة
let users = [];
let messages = [];
let userCounter = 2;

// إنشاء حساب المالك
async function createAdminUser() {
    const hashedPassword = await bcrypt.hash('aumsalah079', 10);
    users.push({
        id: '1',
        username: 'محمد',
        password: hashedPassword,
        gender: 'ذكر',
        age: 25,
        role: 'مالك',
        serialNumber: 1,
        gold: 1000000,
        interactionPoints: 0,
        isOnline: false,
        joinDate: new Date()
    });
    console.log('✅ حساب المالك: محمد / aumsalah079');
}

// إعدادات الجلسة
app.use(session({
    secret: process.env.SESSION_SECRET || 'syria-chat-secret',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: false
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// المسارات
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.json({ success: false, message: 'اسم المستخدم غير موجود' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.json({ success: false, message: 'كلمة المرور غير صحيحة' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                serialNumber: user.serialNumber,
                gold: user.gold
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, gender, age } = req.body;
        
        if (password !== confirmPassword) {
            return res.json({ success: false, message: 'كلمة المرور غير متطابقة' });
        }
        
        if (users.some(u => u.username === username)) {
            return res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: (userCounter++).toString(),
            username,
            password: hashedPassword,
            gender,
            age: parseInt(age),
            role: 'عضو',
            serialNumber: userCounter,
            gold: 0,
            interactionPoints: 0,
            isOnline: false,
            joinDate: new Date()
        };
        
        users.push(newUser);
        
        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح',
            serialNumber: newUser.serialNumber
        });
    } catch (error) {
        res.json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// تسجيل الدخول كزائر
app.post('/api/guest', (req, res) => {
    try {
        const { username, gender, age } = req.body;
        
        if (users.some(u => u.username === username && u.role === 'ضيف')) {
            return res.json({ success: false, message: 'الاسم موجود مسبقاً للزوار' });
        }
        
        const newUser = {
            id: (userCounter++).toString(),
            username,
            password: 'guest',
            gender,
            age: parseInt(age),
            role: 'ضيف',
            serialNumber: userCounter,
            gold: 0,
            interactionPoints: 0,
            isOnline: false,
            joinDate: new Date()
        };
        
        users.push(newUser);
        
        req.session.userId = newUser.id;
        req.session.username = newUser.username;
        req.session.role = newUser.role;
        req.session.isGuest = true;
        
        res.json({ 
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                serialNumber: newUser.serialNumber
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// Socket.io events
io.on('connection', (socket) => {
    console.log('🔗 مستخدم متصل:', socket.id);
    
    socket.on('join-chat', (userData) => {
        const user = users.find(u => u.id === userData.id);
        if (user) {
            user.isOnline = true;
            socket.username = user.username;
            socket.role = user.role;
            socket.userId = user.id;
            
            socket.join('general');
            
            // إرسال رسالة دخول
            io.to('general').emit('new-message', {
                senderName: 'النظام',
                content: `🎉 ${user.username} انضم للغرفة`,
                type: 'system'
            });
            
            // تحديث المستخدمين
            io.emit('update-users', {
                online: users.filter(u => u.isOnline),
                all: users
            });
        }
    });
    
    socket.on('send-message', (messageData) => {
        const user = users.find(u => u.id === messageData.senderId);
        if (user) {
            const message = {
                id: Date.now().toString(),
                senderId: user.id,
                senderName: user.username,
                senderRole: user.role,
                content: messageData.content,
                timestamp: new Date()
            };
            
            messages.push(message);
            
            // زيادة نقاط التفاعل
            user.interactionPoints += 1;
            
            io.to('general').emit('new-message', message);
        }
    });
    
    socket.on('disconnect', () => {
        const user = users.find(u => u.id === socket.userId);
        if (user) {
            user.isOnline = false;
            io.emit('update-users', {
                online: users.filter(u => u.isOnline),
                all: users
            });
        }
    });
});

// إنشاء حساب المالك عند التشغيل
createAdminUser();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
    console.log('📱 افتح المتصفح على الرابط أعلاه');
});
