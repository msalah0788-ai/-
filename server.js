const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// بيانات التطبيق
const users = {};
const messages = { general: [] };
const rooms = ['general'];
const friendships = {};
const userDataFile = 'users.json';

// تحميل بيانات المستخدمين من ملف
let userData = {};
if (fs.existsSync(userDataFile)) {
    userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
}

// حفظ بيانات المستخدمين
function saveUserData() {
    fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
}

// تعريف رتب المالك
userData['mohammad'] = {
    password: 'aumsalah079',
    gender: 'ذكر',
    age: 30,
    role: 'مالك',
    joinDate: new Date().toISOString(),
    interaction: 1000,
    profilePic: 'default_male.png',
    profileColor: '#FFD700',
    serial: 1
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API لتسجيل الدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (userData[username] && userData[username].password === password) {
        res.json({ 
            success: true, 
            user: {
                username,
                role: userData[username].role,
                gender: userData[username].gender,
                profilePic: userData[username].profilePic
            }
        });
    } else {
        res.json({ success: false, message: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }
});

// API للتسجيل
app.post('/api/register', (req, res) => {
    const { username, password, gender, age } = req.body;
    
    if (userData[username]) {
        res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
    } else if (username.length < 3) {
        res.json({ success: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    } else if (password.length < 4) {
        res.json({ success: false, message: 'كلمة السر يجب أن تكون 4 أحرف على الأقل' });
    } else {
        // إنشاء رقم تسلسلي
        const serial = Object.keys(userData).length + 1;
        
        userData[username] = {
            password,
            gender,
            age: parseInt(age),
            role: 'عضو',
            joinDate: new Date().toISOString(),
            interaction: 0,
            profilePic: gender === 'أنثى' ? 'default_female.png' : 'default_male.png',
            profileColor: gender === 'أنثى' ? '#FF69B4' : '#1E90FF',
            serial,
            friends: [],
            friendRequests: [],
            bio: 'مرحباً! أنا جديد هنا.',
            status: 'نشط',
            privateChatEnabled: true
        };
        
        saveUserData();
        res.json({ 
            success: true, 
            message: 'تم التسجيل بنجاح',
            user: {
                username,
                role: 'عضو',
                gender,
                profilePic: userData[username].profilePic
            }
        });
    }
});

// Socket.io Events
io.on('connection', (socket) => {
    console.log('مستخدم جديد متصل:', socket.id);

    socket.on('join', (userData) => {
        users[socket.id] = {
            id: socket.id,
            username: userData.username,
            role: userData.role,
            gender: userData.gender,
            profilePic: userData.profilePic,
            room: 'general',
            isGuest: userData.isGuest || false
        };

        socket.join('general');
        io.emit('user joined', users[socket.id]);
        io.emit('update users', Object.values(users));
    });

    socket.on('send message', (data) => {
        const user = users[socket.id];
        if (!user) return;

        const message = {
            id: Date.now(),
            username: user.username,
            role: user.role,
            gender: user.gender,
            profilePic: user.profilePic,
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            room: data.room || 'general'
        };

        // زيادة التفاعل للمستخدم
        if (!user.isGuest && data.text.length >= 4) {
            userData[user.username].interaction += 1;
            saveUserData();
        }

        if (!messages[message.room]) messages[message.room] = [];
        messages[message.room].push(message);

        io.to(message.room).emit('receive message', message);
    });

    socket.on('typing', (data) => {
        const user = users[socket.id];
        if (user) {
            socket.broadcast.to(data.room || 'general').emit('user typing', {
                username: user.username,
                isTyping: data.isTyping
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            io.emit('user left', user.username);
            delete users[socket.id];
            io.emit('update users', Object.values(users));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
