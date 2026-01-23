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
    serialNumber: { type: Number, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { 
        type: String, 
        enum: ['owner', 'minister', 'premium_member', 'member', 'guest'],
        default: 'member'
    },
    isOnline: { type: Boolean, default: false }
});

// نموذج الرسائل
const messageSchema = new mongoose.Schema({
    room: { type: String, default: 'general' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

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
                role: 'owner'
            });
            
            await owner.save();
            console.log('✅ تم إنشاء حساب المالك: محمد / aumsalah079');
        }
    } catch (error) {
        console.log('❌ خطأ في إنشاء المستخدم الأساسي:', error.message);
    }
}

// ==================== Socket.io Events ====================
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('👤 مستخدم جديد متصل:', socket.id);

    socket.on('join', (userData) => {
        onlineUsers.set(socket.id, userData);
        socket.broadcast.emit('user joined', {
            username: userData.username,
            role: userData.role,
            time: new Date().toLocaleTimeString()
        });
        io.emit('online users', Array.from(onlineUsers.values()));
    });

    socket.on('send message', (data) => {
        io.emit('new message', {
            username: data.username,
            text: data.text,
            time: new Date().toLocaleTimeString()
        });
    });

    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            io.emit('user left', {
                username: user.username,
                time: new Date().toLocaleTimeString()
            });
            onlineUsers.delete(socket.id);
            io.emit('online users', Array.from(onlineUsers.values()));
        }
    });
});

// ==================== Routes الأساسية ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// ==================== تسجيل الدخول ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // خاص لحساب محمد
        if (username === 'محمد') {
            // تحقق مباشر من الباسورد
            if (password === 'aumsalah079') {
                // نجيب أو ننشئ حساب محمد
                let user = await User.findOne({ username: 'محمد' });
                
                if (!user) {
                    const hashedPassword = await bcrypt.hash('aumsalah079', 10);
                    user = new User({
                        serialNumber: 1,
                        username: 'محمد',
                        password: hashedPassword,
                        gender: 'male',
                        role: 'owner'
                    });
                    await user.save();
                }
                
                return res.json({
                    success: true,
                    userId: user._id,
                    username: user.username,
                    role: user.role,
                    gender: user.gender
                });
            } else {
                return res.json({ 
                    success: false, 
                    error: 'كلمة المرور غير صحيحة' 
                });
            }
        }
        
        // باقي المستخدمين
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.json({ 
                success: false, 
                error: 'اسم المستخدم غير موجود' 
            });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.json({ 
                success: false, 
                error: 'كلمة المرور غير صحيحة' 
            });
        }
        
        res.json({
            success: true,
            userId: user._id,
            username: user.username,
            role: user.role,
            gender: user.gender
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.json({ 
            success: false, 
            error: 'حدث خطأ في الخادم' 
        });
    }
});

// ==================== تسجيل حساب جديد ====================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, gender } = req.body;
        
        if (!username || !password || !gender) {
            return res.json({ 
                success: false, 
                error: 'جميع الحقول مطلوبة' 
            });
        }
        
        if (username === 'محمد') {
            return res.json({ 
                success: false, 
                error: 'هذا الاسم محجوز' 
            });
        }
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.json({ 
                success: false, 
                error: 'اسم المستخدم موجود بالفعل' 
            });
        }
        
        const lastUser = await User.findOne().sort({ serialNumber: -1 });
        const serialNumber = lastUser ? lastUser.serialNumber + 1 : 2;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            serialNumber,
            username,
            password: hashedPassword,
            gender,
            role: 'member'
        });
        
        await newUser.save();
        
        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح',
            userId: newUser._id 
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.json({ 
            success: false, 
            error: 'حدث خطأ في الخادم' 
        });
    }
});

// ==================== بدء الخادم ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    await createOwnerUser();
});
