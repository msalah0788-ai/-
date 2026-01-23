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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ملفات البيانات
const USERS_FILE = 'users.json';
const SETTINGS_FILE = 'settings.json';
const GIFS_FILE = 'gifs.json';

// تحميل البيانات
let usersData = {};
let settingsData = { darkMode: false };
let gifsData = [];

if (fs.existsSync(USERS_FILE)) {
    usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
if (fs.existsSync(SETTINGS_FILE)) {
    settingsData = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}
if (fs.existsSync(GIFS_FILE)) {
    gifsData = JSON.parse(fs.readFileSync(GIFS_FILE, 'utf8'));
}

// حفظ البيانات
function saveUsersData() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8');
}
function saveSettingsData() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2), 'utf8');
}
function saveGifsData() {
    fs.writeFileSync(GIFS_FILE, JSON.stringify(gifsData, null, 2), 'utf8');
}

// تهيئة المالك
if (!usersData['محمد']) {
    usersData['محمد'] = {
        password: 'aumsalah079',
        gender: 'ذكر',
        age: 30,
        role: 'مالك',
        joinDate: new Date().toISOString(),
        interaction: 1500,
        messagesCount: 0,
        profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=محمد&backgroundColor=FFD700',
        profileColor: '#FFD700',
        profileFrame: 'gold-frame.gif',
        coverPhoto: '',
        serial: 1,
        friends: [],
        friendRequests: [],
        likes: 0,
        likedBy: [],
        profileSong: '',
        bio: 'مالك ومؤسس الشات',
        status: 'نشط',
        privateChatEnabled: true,
        title: 'المؤسس',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        nameGlow: true,
        nameColor: '#FFD700'
    };
    saveUsersData();
}

// المستخدمون المتصلون
const onlineUsers = new Map();

// المسارات API
app.get('/api/settings', (req, res) => {
    res.json({ success: true, settings: settingsData });
});

app.post('/api/settings', (req, res) => {
    const { darkMode } = req.body;
    settingsData.darkMode = darkMode;
    saveSettingsData();
    res.json({ success: true, message: 'تم تحديث الإعدادات' });
});

// تحقق من اسم المستخدم (محدث لمنع التكرار)
app.post('/api/check-username', (req, res) => {
    const { username } = req.body;
    
    // تحقق من جميع الحالات (حساس وغير حساس)
    const exists = Object.keys(usersData).some(existingUser => 
        existingUser.toLowerCase() === username.toLowerCase()
    );
    
    res.json({ exists });
});

// التسجيل (محدث)
app.post('/api/register', (req, res) => {
    const { username, password, gender, age } = req.body;
    
    // التحقق من التكرار (حساس وغير حساس)
    const usernameExists = Object.keys(usersData).some(existingUser => 
        existingUser.toLowerCase() === username.toLowerCase()
    );
    
    if (usernameExists) {
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
    
    // إنشاء رقم تسلسلي فريد
    const serials = Object.values(usersData).map(u => u.serial);
    const maxSerial = Math.max(...serials, 0);
    const serial = maxSerial + 1;
    
    // إنشاء المستخدم
    usersData[username] = {
        password,
        gender,
        age: parseInt(age),
        role: 'عضو',
        joinDate: new Date().toISOString(),
        interaction: 0,
        messagesCount: 0,
        profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=${gender === 'أنثى' ? 'FF69B4' : '1E90FF'}`,
        profileColor: gender === 'أنثى' ? '#FF69B4' : '#1E90FF',
        profileFrame: '',
        coverPhoto: '',
        serial,
        friends: [],
        friendRequests: [],
        likes: 0,
        likedBy: [],
        profileSong: '',
        bio: 'مرحباً! أنا جديد هنا.',
        status: 'نشط',
        privateChatEnabled: true,
        title: '',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        nameGlow: false,
        nameColor: gender === 'أنثى' ? '#FF69B4' : '#1E90FF'
    };
    
    saveUsersData();
    
    res.json({
        success: true,
        user: {
            username,
            role: 'عضو',
            gender,
            profilePic: usersData[username].profilePic,
            profileColor: usersData[username].profileColor,
            serial,
            age: usersData[username].age
        }
    });
});

// GIFs API
app.get('/api/gifs', (req, res) => {
    res.json({ success: true, gifs: gifsData });
});

app.post('/api/gifs', (req, res) => {
    const { username, url, name } = req.body;
    
    if (usersData[username]?.role !== 'مالك') {
        res.json({ success: false, message: 'ليس لديك الصلاحية' });
        return;
    }
    
    const newGif = {
        id: Date.now(),
        url,
        name: name || `GIF ${gifsData.length + 1}`,
        addedBy: username,
        addedAt: new Date().toISOString()
    };
    
    gifsData.push(newGif);
    saveGifsData();
    
    // إرسال تحديث للجميع
    io.emit('gif-added', newGif);
    
    res.json({ success: true, message: 'تمت إضافة GIF' });
});

app.delete('/api/gifs/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    
    if (usersData[username]?.role !== 'مالك') {
        res.json({ success: false, message: 'ليس لديك الصلاحية' });
        return;
    }
    
    const index = gifsData.findIndex(gif => gif.id == id);
    if (index !== -1) {
        gifsData.splice(index, 1);
        saveGifsData();
        
        // إرسال تحديث للجميع
        io.emit('gif-removed', id);
        
        res.json({ success: true, message: 'تم حذف GIF' });
    } else {
        res.json({ success: false, message: 'GIF غير موجود' });
    }
});

// ملفات ثابتة
app.use(express.static(path.join(__dirname, 'public')));

// جميع المسارات الأخرى تذهب للصفحة الرئيسية
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io Events
io.on('connection', (socket) => {
    console.log('✅ مستخدم جديد متصل:', socket.id);

    socket.on('user-join', (userData) => {
        const { username } = userData;
        
        // تخزين بيانات الاتصال
        onlineUsers.set(username, {
            socketId: socket.id,
            ...userData,
            joinTime: new Date().toISOString()
        });
        
        // تحديث حالة الاتصال
        if (usersData[username]) {
            usersData[username].isOnline = true;
            usersData[username].lastSeen = new Date().toISOString();
            saveUsersData();
        }
        
        // إرسال تأثير الدخول حسب الرتبة
        const joinEffects = {
            'مالك': {
                type: 'special',
                message: `✨ ${username} الملك دخل الشات! ✨`,
                sound: 'royal-join.mp3',
                animation: 'crown-glow'
            },
            'وزير': 'وزيرة': {
                type: 'minister',
                message: `⭐ ${username} الوزير دخل الشات`,
                sound: 'minister-join.mp3',
                animation: 'star-pulse'
            },
            'عضو مميز': {
                type: 'vip',
                message: `🌟 ${username} العضو المميز دخل الشات`,
                sound: 'vip-join.mp3',
                animation: 'vip-glow'
            }
        };
        
        const effect = joinEffects[userData.role];
        if (effect) {
            io.emit('user-join-effect', {
                username,
                ...effect
            });
        } else {
            // بدون تأثير للعضو العادي والزائر
            io.emit('user-joined', {
                username,
                role: userData.role,
                profilePic: userData.profilePic
            });
        }
        
        // تحديث قائمة المتصلين
        io.emit('online-users-updated', Array.from(onlineUsers.values()));
    });

    socket.on('send-message', (messageData) => {
        const { username, text, room = 'general', replyTo = null } = messageData;
        
        if (!username || !text) return;
        
        const message = {
            id: Date.now(),
            username,
            text,
            room,
            replyTo,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestampFull: new Date().toISOString(),
            userInfo: usersData[username] || { role: 'زائر', gender: 'ذكر' }
        };
        
        // زيادة التفاعل والرسائل
        if (usersData[username] && !usersData[username].isGuest) {
            usersData[username].interaction += 1;
            usersData[username].messagesCount += 1;
            saveUsersData();
        }
        
        // إرسال الرسالة
        io.emit('new-message', message);
        
        // تحقق من المنشنات
        const mentionRegex = /@([\u0600-\u06FF\w]+)/g;
        const mentions = [...text.matchAll(mentionRegex)].map(m => m[1]);
        
        mentions.forEach(mentionedUser => {
            if (onlineUsers.has(mentionedUser)) {
                const userSocket = onlineUsers.get(mentionedUser).socketId;
                if (userSocket) {
                    io.to(userSocket).emit('mentioned', {
                        by: username,
                        message: text,
                        messageId: message.id
                    });
                }
            }
        });
    });

    socket.on('like-profile', (data) => {
        const { targetUsername, likerUsername } = data;
        
        if (usersData[targetUsername] && usersData[likerUsername]) {
            if (!usersData[targetUsername].likedBy.includes(likerUsername)) {
                usersData[targetUsername].likes += 1;
                usersData[targetUsername].likedBy.push(likerUsername);
                saveUsersData();
                
                // إرسال إشعار للشخص المعجب به
                const targetSocket = onlineUsers.get(targetUsername)?.socket
                      });
        
        // إرسال الإشعار
        if (onlineUsers.has(targetUsername)) {
            io.to(onlineUsers.get(targetUsername).socketId).emit('profile-liked', {
                by: likerUsername,
                likes: usersData[targetUsername].likes
            });
        }
    });

    // نظام الطرد والكتم
    socket.on('manage-user', (data) => {
        const { adminUsername, targetUsername, action, duration = null, reason = '' } = data;
        
        if (!usersData[adminUsername] || !usersData[targetUsername]) {
            socket.emit('manage-user-error', 'المستخدم غير موجود');
            return;
        }
        
        const adminRole = usersData[adminUsername].role;
        const targetRole = usersData[targetUsername].role;
        
        // صلاحيات الطرد والكتم
        const canManage = (adminRole === 'مالك') || 
                         ((adminRole === 'وزير' || adminRole === 'وزيرة') && 
                          targetRole !== 'مالك');
        
        if (!canManage) {
            socket.emit('manage-user-error', 'ليس لديك الصلاحية');
            return;
        }
        
        if (action === 'kick') {
            // طرد المستخدم
            const targetSocket = onlineUsers.get(targetUsername)?.socketId;
            if (targetSocket) {
                io.to(targetSocket).emit('kicked', {
                    by: adminUsername,
                    reason
                });
                
                setTimeout(() => {
                    if (onlineUsers.has(targetUsername)) {
                        const socketToDisconnect = io.sockets.sockets.get(targetSocket);
                        if (socketToDisconnect) {
                            socketToDisconnect.disconnect();
                        }
                    }
                }, 3000);
            }
            
            io.emit('user-kicked', {
                targetUsername,
                by: adminUsername,
                reason
            });
            
        } else if (action === 'mute') {
            // كتم المستخدم
            const muteDuration = duration || 300; // 5 دقائق افتراضياً
            const unmuteTime = Date.now() + (muteDuration * 1000);
            
            if (!usersData[targetUsername].mutes) {
                usersData[targetUsername].mutes = [];
            }
            
            usersData[targetUsername].mutes.push({
                by: adminUsername,
                duration: muteDuration,
                unmuteTime,
                reason,
                time: new Date().toISOString()
            });
            
            saveUsersData();
            
            // إرسال إشعار الكتم
            const targetSocket = onlineUsers.get(targetUsername)?.socketId;
            if (targetSocket) {
                io.to(targetSocket).emit('muted', {
                    by: adminUsername,
                    duration: muteDuration,
                    reason
                });
            }
            
            io.emit('user-muted', {
                targetUsername,
                by: adminUsername,
                duration: muteDuration,
                reason
            });
            
            // جدولة فك الكتم
            setTimeout(() => {
                if (usersData[targetUsername]?.mutes) {
                    const muteIndex = usersData[targetUsername].mutes.findIndex(
                        m => m.unmuteTime === unmuteTime
                    );
                    if (muteIndex !== -1) {
                        usersData[targetUsername].mutes.splice(muteIndex, 1);
                        saveUsersData();
                        
                        const currentSocket = onlineUsers.get(targetUsername)?.socketId;
                        if (currentSocket) {
                            io.to(currentSocket).emit('unmuted');
                        }
                    }
                }
            }, muteDuration * 1000);
            
        } else if (action === 'unmute') {
            // فك الكتم
            if (usersData[targetUsername]?.mutes?.length > 0) {
                usersData[targetUsername].mutes = [];
                saveUsersData();
                
                const targetSocket = onlineUsers.get(targetUsername)?.socketId;
                if (targetSocket) {
                    io.to(targetSocket).emit('unmuted');
                }
                
                io.emit('user-unmuted', {
                    targetUsername,
                    by: adminUsername
                });
            }
        }
    });

    // حائط الأخبار
    const newsWall = [];
    
    socket.on('post-news', (data) => {
        const { username, content, image } = data;
        
        if (!usersData[username] || !(usersData[username].role === 'مالك' || 
            usersData[username].role === 'وزير' || usersData[username].role === 'وزيرة')) {
            socket.emit('news-error', 'ليس لديك الصلاحية للنشر');
            return;
        }
        
        const news = {
            id: Date.now(),
            username,
            content,
            image,
            timestamp: new Date().toISOString(),
            likes: 0,
            comments: []
        };
        
        newsWall.unshift(news); // إضافة في البداية
        if (newsWall.length > 50) newsWall.pop(); // حفظ آخر 50 منشور فقط
        
        io.emit('new-news', news);
    });
    
    socket.on('like-news', (data) => {
        const { newsId, username } = data;
        const news = newsWall.find(n => n.id === newsId);
        
        if (news) {
            if (!news.likedBy) news.likedBy = [];
            if (!news.likedBy.includes(username)) {
                news.likes += 1;
                news.likedBy.push(username);
                io.emit('news-liked', { newsId, likes: news.likes });
            }
        }
    });
    
    socket.on('comment-news', (data) => {
        const { newsId, username, comment } = data;
        const news = newsWall.find(n => n.id === newsId);
        
        if (news) {
            if (!news.comments) news.comments = [];
            news.comments.push({
                username,
                comment,
                timestamp: new Date().toISOString()
            });
            
            io.emit('news-commented', {
                newsId,
                comment: news.comments[news.comments.length - 1]
            });
        }
    });
    
    socket.on('delete-news', (data) => {
        const { newsId, username } = data;
        
        if (!usersData[username] || !(usersData[username].role === 'مالك')) {
            socket.emit('news-error', 'فقط المالك يمكنه حذف الأخبار');
            return;
        }
        
        const index = newsWall.findIndex(n => n.id === newsId);
        if (index !== -1) {
            newsWall.splice(index, 1);
            io.emit('news-deleted', newsId);
        }
    });

    // إرسال حائط الأخبار عند الاتصال
    socket.on('get-news', () => {
        socket.emit('news-wall', newsWall.slice(0, 20)); // أول 20 منشور
    });

    // تحديث الرتبة
    socket.on('update-role', (data) => {
        const { adminUsername, targetUsername, newRole } = data;
        
        if (!usersData[adminUsername] || !usersData[targetUsername]) {
            socket.emit('role-update-error', 'المستخدم غير موجود');
            return;
        }
        
        const adminRole = usersData[adminUsername].role;
        
        // صلاحيات تحديث الرتب
        if (adminRole === 'مالك') {
            // المالك يستطيع تغيير أي رتبة
            const oldRole = usersData[targetUsername].role;
            usersData[targetUsername].role = newRole;
            
            // تحديث المزايا حسب الرتبة الجديدة
            updateUserFeatures(targetUsername, newRole);
            
            saveUsersData();
            
            // إرسال إشعار للجميع
            io.emit('role-updated', {
                targetUsername,
                oldRole,
                newRole,
                by: adminUsername
            });
            
            // إرسال إشعار خاص للمستخدم
            const targetSocket = onlineUsers.get(targetUsername)?.socketId;
            if (targetSocket) {
                io.to(targetSocket).emit('your-role-updated', {
                    newRole,
                    by: adminUsername
                });
            }
            
        } else if (adminRole === 'وزير' || adminRole === 'وزيرة') {
            // الوزير لا يستطيع تغيير رتبة المالك
            if (usersData[targetUsername].role === 'مالك') {
                socket.emit('role-update-error', 'لا يمكنك تعديل رتبة المالك');
                return;
            }
            
            // الوزير يستطيع ترقية/تنزيل العضو/العضو المميز/الزائر
            const allowedRoles = ['عضو', 'عضو مميز', 'زائر'];
            if (!allowedRoles.includes(newRole)) {
                socket.emit('role-update-error', 'لا يمكنك تعيين هذه الرتبة');
                return;
            }
            
            const oldRole = usersData[targetUsername].role;
            usersData[targetUsername].role = newRole;
            updateUserFeatures(targetUsername, newRole);
            saveUsersData();
            
            io.emit('role-updated', {
                targetUsername,
                oldRole,
                newRole,
                by: adminUsername
            });
            
        } else {
            socket.emit('role-update-error', 'ليس لديك الصلاحية لتغيير الرتب');
        }
    });

    // حذف الرسائل
    socket.on('delete-message', (data) => {
        const { messageId, deleterUsername } = data;
        
        if (!usersData[deleterUsername]) {
            socket.emit('delete-error', 'المستخدم غير موجود');
            return;
        }
        
        const deleterRole = usersData[deleterUsername].role;
        
        // صلاحيات الحذف حسب الرتبة
        let canDelete = false;
        
        switch(deleterRole) {
            case 'مالك':
                canDelete = true; // المالك يحذف أي رسالة
                break;
                
            case 'وزير':
            case 'وزيرة':
                // الوزير يحذف رسائل العضو والزائر والعضو المميز فقط
                canDelete = true;
                break;
                
            case 'عضو مميز':
                // العضو المميز يحذف رسائله فقط
                canDelete = true;
                break;
                
            case 'عضو':
                // العضو يحذف رسائله فقط
                canDelete = true;
                break;
                
            default:
                canDelete = false;
        }
        
        if (canDelete) {
            io.emit('message-deleted', {
                messageId,
                deletedBy: deleterUsername
            });
        } else {
            socket.emit('delete-error', 'ليس لديك الصلاحية لحذف هذه الرسالة');
        }
    });

    socket.on('disconnect', () => {
        // البحث عن المستخدم المنقطع
        let disconnectedUser = null;
        for (const [username, data] of onlineUsers.entries()) {
            if (data.socketId === socket.id) {
                disconnectedUser = { username, ...data };
                break;
            }
        }
        
        if (disconnectedUser) {
            // تحديث حالة الاتصال
            if (usersData[disconnectedUser.username]) {
                usersData[disconnectedUser.username].isOnline = false;
                usersData[disconnectedUser.username].lastSeen = new Date().toISOString();
                saveUsersData();
            }
            
            // إزالة من المتصلين
            onlineUsers.delete(disconnectedUser.username);
            
            // إرسال تأثير الخروج حسب الرتبة
            const exitEffects = {
                'مالك': {
                    type: 'special',
                    message: `👑 ${disconnectedUser.username} الملك غادر الشات`,
                    sound: 'royal-exit.mp3'
                },
                'وزير': 'وزيرة': {
                    type: 'minister',
                    message: `⭐ ${disconnectedUser.username} الوزير غادر الشات`,
                    sound: 'minister-exit.mp3'
                }
            };
            
            const effect = exitEffects[disconnectedUser.role];
            if (effect) {
                io.emit('user-exit-effect', {
                    username: disconnectedUser.username,
                    ...effect
                });
            } else {
                io.emit('user-left', {
                    username: disconnectedUser.username,
                    role: disconnectedUser.role
                });
            }
            
            // تحديث قائمة المتصلين
            io.emit('online-users-updated', Array.from(onlineUsers.values()));
            
            console.log(`❌ المستخدم ${disconnectedUser.username} انقطع`);
        }
    });
});

// وظيفة تحديث مزايا المستخدم حسب الرتبة
function updateUserFeatures(username, newRole) {
    const user = usersData[username];
    if (!user) return;
    
    switch(newRole) {
        case 'مالك':
            user.profileColor = '#FFD700';
            user.profileFrame = 'gold-frame.gif';
            user.nameGlow = true;
            user.nameColor = '#FFD700';
            user.title = 'المالك';
            break;
            
        case 'وزير':
        case 'وزيرة':
            user.profileColor = '#9d4edd';
            user.profileFrame = 'purple-frame.gif';
            user.nameGlow = true;
            user.nameColor = '#9d4edd';
            user.title = newRole === 'وزير' ? 'الوزير' : 'الوزيرة';
            break;
            
        case 'عضو مميز':
            user.profileColor = '#4cc9f0';
            user.profileFrame = 'blue-frame.gif';
            user.nameGlow = true;
            user.nameColor = '#4cc9f0';
            user.title = 'مميز';
            break;
            
        case 'عضو':
            user.profileColor = user.gender === 'أنثى' ? '#FF69B4' : '#1E90FF';
            user.profileFrame = '';
            user.nameGlow = false;
            user.nameColor = user.gender === 'أنثى' ? '#FF69B4' : '#1E90FF';
            user.title = '';
            break;
            
        case 'زائر':
            user.profileColor = '#6c757d';
            user.profileFrame = '';
            user.nameGlow = false;
            user.nameColor = '#6c757d';
            user.title = 'زائر';
            break;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
});
