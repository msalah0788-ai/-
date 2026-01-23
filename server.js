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
const onlineUsers = {};
const messages = { general: [] };
const rooms = ['general'];
const friendships = {};
const userDataFile = 'users.json';

// تحميل بيانات المستخدمين
let userData = {};
if (fs.existsSync(userDataFile)) {
    userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
}

// حفظ بيانات المستخدمين
function saveUserData() {
    fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
}

// تهيئة المالك إذا لم يكن موجوداً
if (!userData['mohammad']) {
    userData['mohammad'] = {
        password: 'aumsalah079',
        gender: 'ذكر',
        age: 30,
        role: 'مالك',
        joinDate: new Date().toISOString(),
        interaction: 1000,
        profilePic: 'https://ui-avatars.com/api/?name=محمد&background=FFD700&color=000&size=256',
        profileColor: '#FFD700',
        coverPhoto: '',
        serial: 1,
        friends: [],
        friendRequests: [],
        bio: 'مالك الشات',
        status: 'نشط',
        privateChatEnabled: true,
        title: 'المؤسس'
    };
    saveUserData();
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API للتسجيل والدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (userData[username] && userData[username].password === password) {
        res.json({ 
            success: true, 
            user: {
                username,
                role: userData[username].role,
                gender: userData[username].gender,
                profilePic: userData[username].profilePic,
                profileColor: userData[username].profileColor,
                serial: userData[username].serial
            }
        });
    } else {
        res.json({ success: false, message: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    }
});

app.post('/api/register', (req, res) => {
    const { username, password, gender, age } = req.body;
    
    if (userData[username]) {
        res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
    } else if (username.length < 3) {
        res.json({ success: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    } else if (password.length < 4) {
        res.json({ success: false, message: 'كلمة السر يجب أن تكون 4 أحرف على الأقل' });
    } else if (age < 13 || age > 100) {
        res.json({ success: false, message: 'العمر يجب أن يكون بين 13 و 100 سنة' });
    } else {
        const serial = Object.keys(userData).length + 1;
        const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=256`;
        
        userData[username] = {
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
            title: ''
        };
        
        saveUserData();
        res.json({ 
            success: true, 
            user: {
                username,
                role: 'عضو',
                gender,
                profilePic,
                profileColor: userData[username].profileColor,
                serial
            }
        });
    }
});

// API للحصول على معلومات المستخدم
app.get('/api/user/:username', (req, res) => {
    const { username } = req.params;
    if (userData[username]) {
        const { password, ...userInfo } = userData[username];
        res.json({ success: true, user: userInfo });
    } else {
        res.json({ success: false, message: 'المستخدم غير موجود' });
    }
});

// API لتحديث البروفايل
app.post('/api/update-profile', (req, res) => {
    const { username, updates } = req.body;
    
    if (userData[username]) {
        Object.keys(updates).forEach(key => {
            if (key !== 'password' && key !== 'role' && key !== 'serial') {
                userData[username][key] = updates[key];
            }
        });
        saveUserData();
        res.json({ success: true, message: 'تم تحديث البروفايل' });
    } else {
        res.json({ success: false, message: 'المستخدم غير موجود' });
    }
});

// API لإدارة الرتب
app.post('/api/manage-role', (req, res) => {
    const { adminUsername, targetUsername, newRole } = req.body;
    
    if (!userData[adminUsername] || !userData[targetUsername]) {
        return res.json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    const adminRole = userData[adminUsername].role;
    const targetRole = userData[targetUsername].role;
    
    // صلاحيات تغيير الرتب
    if (adminRole === 'مالك') {
        // المالك يستطيع تغيير أي رتبة
        userData[targetUsername].role = newRole;
        
        // تحديث لون البروفايل حسب الرتبة الجديدة
        if (newRole === 'مالك') {
            userData[targetUsername].profileColor = '#FFD700';
        } else if (newRole === 'وزير' || newRole === 'وزيرة') {
            userData[targetUsername].profileColor = '#9d4edd';
        } else if (newRole === 'عضو مميز') {
            userData[targetUsername].profileColor = '#4cc9f0';
        }
        
        saveUserData();
        
        // إرسال إشعار للجميع
        io.emit('role updated', {
            targetUsername,
            newRole,
            by: adminUsername
        });
        
        res.json({ success: true, message: `تم تحديث رتبة ${targetUsername} إلى ${newRole}` });
    } else if (adminRole === 'وزير' || adminRole === 'وزيرة') {
        // الوزير لا يستطيع تغيير رتبة المالك
        if (targetRole === 'مالك') {
            return res.json({ success: false, message: 'لا يمكنك تعديل رتبة المالك' });
        }
        userData[targetUsername].role = newRole;
        saveUserData();
        io.emit('role updated', { targetUsername, newRole, by: adminUsername });
        res.json({ success: true, message: `تم تحديث رتبة ${targetUsername}` });
    } else {
        res.json({ success: false, message: 'ليس لديك الصلاحية لتغيير الرتب' });
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
            profileColor: userData.profileColor,
            serial: userData.serial,
            room: 'general',
            isGuest: userData.isGuest || false
        };

        onlineUsers[userData.username] = {
            ...users[socket.id],
            lastSeen: new Date().toISOString()
        };

        socket.join('general');
        
        // إرسال إشعار دخول
        io.emit('user joined', {
            username: userData.username,
            role: userData.role
        });
        
        // تحديث قائمة المستخدمين
        io.emit('update users', Object.values(onlineUsers));
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
            if (userData[user.username]) {
                userData[user.username].interaction += 1;
                saveUserData();
            }
        }

        if (!messages[message.room]) messages[message.room] = [];
        messages[message.room].push(message);

        io.to(message.room).emit('receive message', message);
        
        // إرسال إشعار إذا تم منشن المستخدم
        const mentionedUsers = data.text.match(/@(\w+)/g);
        if (mentionedUsers) {
            mentionedUsers.forEach(mention => {
                const mentionedUsername = mention.substring(1);
                if (userData[mentionedUsername]) {
                    io.emit('user mentioned', {
                        mentioned: mentionedUsername,
                        by: user.username,
                        message: data.text
                    });
                }
            });
        }
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
            // تحديث آخر ظهور
            if (userData[user.username]) {
                userData[user.username].lastSeen = new Date().toISOString();
                saveUserData();
            }
            
            // إزالة من المتصلين
            delete onlineUsers[user.username];
            
            io.emit('user left', {
                username: user.username,
                role: user.role
            });
            
            io.emit('update users', Object.values(onlineUsers));
            delete users[socket.id];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
