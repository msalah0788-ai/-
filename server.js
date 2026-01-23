const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ملفات البيانات
const USERS_FILE = 'users.json';
const SETTINGS_FILE = 'settings.json';
const GIFS_FILE = 'gifs.json';
const NEWS_FILE = 'news.json';

// تحميل البيانات
let usersData = {};
let settingsData = { darkMode: false };
let gifsData = [];
let newsData = [];

if (fs.existsSync(USERS_FILE)) {
    usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
if (fs.existsSync(SETTINGS_FILE)) {
    settingsData = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}
if (fs.existsSync(GIFS_FILE)) {
    gifsData = JSON.parse(fs.readFileSync(GIFS_FILE, 'utf8'));
}
if (fs.existsSync(NEWS_FILE)) {
    newsData = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
}

// حفظ البيانات
function saveUsersData() { fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8'); }
function saveSettingsData() { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2), 'utf8'); }
function saveGifsData() { fs.writeFileSync(GIFS_FILE, JSON.stringify(gifsData, null, 2), 'utf8'); }
function saveNewsData() { fs.writeFileSync(NEWS_FILE, JSON.stringify(newsData, null, 2), 'utf8'); }

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
const mutedUsers = new Map();

// API Routes
app.get('/api/settings', (req, res) => res.json({ success: true, settings: settingsData }));
app.post('/api/settings', (req, res) => {
    settingsData.darkMode = req.body.darkMode;
    saveSettingsData();
    res.json({ success: true, message: 'تم تحديث الإعدادات' });
});

app.post('/api/check-username', (req, res) => {
    const username = req.body.username.toLowerCase();
    const exists = Object.keys(usersData).some(u => u.toLowerCase() === username);
    res.json({ exists });
});

app.post('/api/register', (req, res) => {
    const { username, password, gender, age } = req.body;
    
    if (username.toLowerCase() === 'محمد') {
        return res.json({ success: false, message: 'اسم المستخدم محجوز' });
    }
    
    const usernameExists = Object.keys(usersData).some(u => u.toLowerCase() === username.toLowerCase());
    if (usernameExists) return res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
    if (username.length < 3) return res.json({ success: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    if (password.length < 4) return res.json({ success: false, message: 'كلمة السر يجب أن تكون 4 أحرف على الأقل' });
    if (age < 13 || age > 100) return res.json({ success: false, message: 'العمر يجب أن يكون بين 13 و 100 سنة' });
    
    const serials = Object.values(usersData).map(u => u.serial);
    const serial = Math.max(...serials, 0) + 1;
    
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
    res.json({ success: true, user: { username, role: 'عضو', gender, profilePic: usersData[username].profilePic, serial } });
});

app.get('/api/user/:username', (req, res) => {
    const user = usersData[req.params.username];
    if (user) {
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.json({ success: false, message: 'المستخدم غير موجود' });
    }
});

app.get('/api/all-users', (req, res) => {
    const usersArray = Object.keys(usersData).map(username => {
        const { password, ...userInfo } = usersData[username];
        return { username, ...userInfo };
    });
    res.json({ success: true, users: usersArray });
});

app.post('/api/update-profile', (req, res) => {
    const { username, updates } = req.body;
    if (usersData[username]) {
        Object.keys(updates).forEach(key => {
            if (!['password', 'serial', 'role'].includes(key)) {
                usersData[username][key] = updates[key];
            }
        });
        saveUsersData();
        res.json({ success: true, message: 'تم تحديث البروفايل' });
    } else {
        res.json({ success: false, message: 'المستخدم غير موجود' });
    }
});

app.post('/api/update-role', (req, res) => {
    const { adminUsername, targetUsername, newRole } = req.body;
    if (!usersData[adminUsername] || !usersData[targetUsername]) {
        return res.json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    const adminRole = usersData[adminUsername].role;
    if (adminRole !== 'مالك' && adminRole !== 'وزير' && adminRole !== 'وزيرة') {
        return res.json({ success: false, message: 'ليس لديك الصلاحية' });
    }
    
    if (adminRole === 'وزير' || adminRole === 'وزيرة') {
        if (usersData[targetUsername].role === 'مالك') {
            return res.json({ success: false, message: 'لا يمكنك تعديل رتبة المالك' });
        }
        if (!['عضو', 'عضو مميز', 'زائر'].includes(newRole)) {
            return res.json({ success: false, message: 'لا يمكنك تعيين هذه الرتبة' });
        }
    }
    
    const oldRole = usersData[targetUsername].role;
    usersData[targetUsername].role = newRole;
    updateUserFeatures(targetUsername, newRole);
    saveUsersData();
    
    io.emit('role-updated', { targetUsername, oldRole, newRole, by: adminUsername });
    res.json({ success: true, message: `تم تحديث رتبة ${targetUsername} إلى ${newRole}` });
});

app.get('/api/gifs', (req, res) => res.json({ success: true, gifs: gifsData }));
app.post('/api/gifs', (req, res) => {
    const { username, url, name } = req.body;
    if (usersData[username]?.role !== 'مالك') {
        return res.json({ success: false, message: 'فقط المالك يمكنه إضافة GIFs' });
    }
    const newGif = { id: Date.now(), url, name: name || `GIF ${gifsData.length + 1}`, addedBy: username, addedAt: new Date().toISOString() };
    gifsData.push(newGif);
    saveGifsData();
    io.emit('gif-added', newGif);
    res.json({ success: true, message: 'تمت إضافة GIF' });
});
app.delete('/api/gifs/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    if (usersData[username]?.role !== 'مالك') {
        return res.json({ success: false, message: 'فقط المالك يمكنه حذف GIFs' });
    }
    const index = gifsData.findIndex(gif => gif.id == id);
    if (index !== -1) {
        gifsData.splice(index, 1);
        saveGifsData();
        io.emit('gif-removed', id);
        res.json({ success: true, message: 'تم حذف GIF' });
    } else {
        res.json({ success: false, message: 'GIF غير موجود' });
    }
});

app.get('/api/news', (req, res) => res.json({ success: true, news: newsData.slice(0, 20) }));
app.post('/api/news', (req, res) => {
    const { username, content, image } = req.body;
    const userRole = usersData[username]?.role;
    if (!['مالك', 'وزير', 'وزيرة'].includes(userRole)) {
        return res.json({ success: false, message: 'ليس لديك الصلاحية للنشر' });
    }
    const news = { id: Date.now(), username, content, image, timestamp: new Date().toISOString(), likes: 0, comments: [] };
    newsData.unshift(news);
    if (newsData.length > 50) newsData.pop();
    saveNewsData();
    io.emit('new-news', news);
    res.json({ success: true, message: 'تم نشر الخبر' });
});
app.delete('/api/news/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    if (usersData[username]?.role !== 'مالك') {
        return res.json({ success: false, message: 'فقط المالك يمكنه حذف الأخبار' });
    }
    const index = newsData.findIndex(n => n.id == id);
    if (index !== -1) {
        newsData.splice(index, 1);
        saveNewsData();
        io.emit('news-deleted', id);
        res.json({ success: true, message: 'تم حذف الخبر' });
    } else {
        res.json({ success: false, message: 'الخبر غير موجود' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Socket.io Events
io.on('connection', (socket) => {
    console.log('✅ مستخدم جديد متصل:', socket.id);

    socket.on('user-join', (userData) => {
        const { username } = userData;
        onlineUsers.set(username, { socketId: socket.id, ...userData, joinTime: new Date().toISOString() });
        
        if (usersData[username]) {
            usersData[username].isOnline = true;
            usersData[username].lastSeen = new Date().toISOString();
            saveUsersData();
        }
        
        // تأثير الدخول حسب الرتبة
        const effects = {
            'مالك': { type: 'special', message: `✨ ${username} الملك دخل الشات! ✨`, sound: 'royal-join.mp3', animation: 'crown-glow' },
            'وزير': { type: 'minister', message: `⭐ ${username} الوزير دخل الشات`, sound: 'minister-join.mp3', animation: 'star-pulse' },
            'وزيرة': { type: 'minister', message: `⭐ ${username} الوزيرة دخلت الشات`, sound: 'minister-join.mp3', animation: 'star-pulse' },
            'عضو مميز': { type: 'vip', message: `🌟 ${username} العضو المميز دخل الشات`, sound: 'vip-join.mp3', animation: 'vip-glow' }
        };
        
        const effect = effects[userData.role];
        if (effect) {
            io.emit('user-join-effect', { username, ...effect });
        } else {
            io.emit('user-joined', { username, role: userData.role, profilePic: userData.profilePic });
        }
        
        io.emit('online-users-updated', Array.from(onlineUsers.values()));
    });

    socket.on('send-message', (messageData) => {
        const { username, text, room = 'general', replyTo = null } = messageData;
        if (!username || !text || mutedUsers.has(username)) return;
        
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
        
        if (usersData[username] && !usersData[username].isGuest) {
            usersData[username].interaction += 1;
            usersData[username].messagesCount += 1;
            saveUsersData();
        }
        
        io.emit('new-message', message);
        
        const mentionRegex = /@([\u0600-\u06FF\w]+)/g;
        const mentions = [...text.matchAll(mentionRegex)].map(m => m[1]);
        mentions.forEach(mentionedUser => {
            if (onlineUsers.has(mentionedUser)) {
                io.to(onlineUsers.get(mentionedUser).socketId).emit('mentioned', {
                    by: username,
                    message: text,
                    messageId: message.id
                });
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
                
                if (onlineUsers.has(targetUsername)) {
                    io.to(onlineUsers.get(targetUsername).socketId).emit('profile-liked', {
                        by: likerUsername,
                        likes: usersData[targetUsername].likes
                    });
                }
            }
        }
    });

    socket.on('manage-user', (data) => {
        const { adminUsername, targetUsername, action, duration = 300, reason = '' } = data;
        if (!usersData[adminUsername] || !usersData[targetUsername]) {
            socket.emit('manage-user-error', 'المستخدم غير موجود');
            return;
        }
        
        const adminRole = usersData[adminUsername].role;
        const targetRole = usersData[targetUsername].role;
        
        if (adminRole !== 'مالك' && (adminRole !== 'وزير' && adminRole !== 'وزيرة')) {
            socket.emit('manage-user-error', 'ليس لديك الصلاحية');
            return;
        }
        
        if ((adminRole === 'وزير' || adminRole === 'وزيرة') && targetRole === 'مالك') {
            socket.emit('manage-user-error', 'لا يمكنك إدارة المالك');
            return;
        }
        
        if (action === 'kick') {
            const targetSocket = onlineUsers.get(targetUsername)?.socketId;
            if (targetSocket) {
                io.to(targetSocket).emit('kicked', { by: adminUsername, reason });
                setTimeout(() => {
                    if (onlineUsers.has(targetUsername)) {
                        const socketToDisconnect = io.sockets.sockets.get(targetSocket);
                        if (socketToDisconnect) socketToDisconnect.disconnect();
                    }
                }, 3000);
            }
            io.emit('user-kicked', { targetUsername, by: adminUsername, reason });
            
        } else if (action === 'mute') {
            const unmuteTime = Date.now() + (duration * 1000);
            mutedUsers.set(targetUsername, unmuteTime);
            
            if (!usersData[targetUsername].mutes) usersData[targetUsername].mutes = [];
            usersData[targetUsername].mutes.push({
                by: adminUsername,
                duration,
                unmuteTime,
                reason,
                time: new Date().toISOString()
            });
            saveUsersData();
            
            const targetSocket = onlineUsers.get(targetUsername)?.socketId;
            if (targetSocket) {
                io.to(targetSocket).emit('muted', { by: adminUsername, duration, reason });
            }
            io.emit('user-muted', { targetUsername, by: adminUsername, duration, reason });
            
            setTimeout(() => {
                if (mutedUsers.get(targetUsername) === unmuteTime) {
                    mutedUsers.delete(targetUsername);
                    if (usersData[targetUsername]?.mutes) {
                        usersData[targetUsername].mutes = usersData[targetUsername].mutes.filter(
                            m => m.unmuteTime !== unmuteTime
                        );
                        saveUsersData();
                    }
                    const currentSocket = onlineUsers.get(targetUsername)?.socketId;
                    if (currentSocket) {
                        io.to(currentSocket).emit('unmuted');
                    }
                }
            }, duration * 1000);
            
        } else if (action === 'unmute') {
            mutedUsers.delete(targetUsername);
            if (usersData[targetUsername]?.mutes) {
                usersData[targetUsername].mutes = [];
                saveUsersData();
            }
            const targetSocket = onlineUsers.get(targetUsername)?.socketId;
            if (targetSocket) {
                io.to(targetSocket).emit('unmuted');
            }
            io.emit('user-unmuted', { targetUsername, by: adminUsername });
        }
    });

    socket.on('delete-message', (data) => {
        const { messageId, deleterUsername } = data;
        if (!usersData[deleterUsername]) return;
        
        const deleterRole = usersData[deleterUsername].role;
        const canDelete = deleterRole === 'مالك' || 
                         (deleterRole === 'وزير' || deleterRole === 'وزيرة') ||
                         deleterRole === 'عضو مميز' || 
                         deleterRole === 'عضو';
        
        if (canDelete) {
            io.emit('message-deleted', { messageId, deletedBy: deleterUsername });
        } else {
            socket.emit('delete-error', 'ليس لديك الصلاحية لحذف هذه الرسالة');
        }
    });

    socket.on('get-news', () => {
        socket.emit('news-wall', newsData.slice(0, 20));
    });

    socket.on('like-news', (data) => {
        const { newsId, username } = data;
        const news = newsData.find(n => n.id === newsId);
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
        const news = newsData.find(n => n.id === newsId);
        if (news) {
            if (!news.comments) news.comments = [];
            news.comments.push({ username, comment, timestamp: new Date().toISOString() });
            io.emit('news-commented', { newsId, comment: news.comments[news.comments.length - 1] });
        }
    });

    socket.on('disconnect', () => {
        let disconnectedUser = null;
        for (const [username, data] of onlineUsers.entries()) {
            if (data.socketId === socket.id) {
                disconnectedUser = { username, ...data };
                break;
            }
        }
        
        if (disconnectedUser) {
            if (usersData[disconnectedUser.username]) {
                usersData[disconnectedUser.username].isOnline = false;
                usersData[disconnectedUser.username].lastSeen = new Date().toISOString();
                saveUsersData();
            }
            
            onlineUsers.delete(disconnectedUser.username);
            mutedUsers.delete(disconnectedUser.username);
            
            const exitEffects = {
                'مالك': { type: 'special', message: `👑 ${disconnectedUser.username} الملك غادر الشات`, sound: 'royal-exit.mp3' },
                'وزير': { type: 'minister', message: `⭐ ${disconnectedUser.username} الوزير غادر الشات`, sound: 'minister-exit.mp3' },
                'وزيرة': { type: 'minister', message: `⭐ ${disconnectedUser.username} الوزيرة غادرت الشات`, sound: 'minister-exit.mp3' }
            };
            
            const effect = exitEffects[disconnectedUser.role];
            if (effect) {
                io.emit('user-exit-effect', { username: disconnectedUser.username, ...effect });
            } else {
                io.emit('user-left', { username: disconnectedUser.username, role: disconnectedUser.role });
            }
            
            io.emit('online-users-updated', Array.from(onlineUsers.values()));
            console.log(`❌ ${disconnectedUser.username} انقطع`);
        }
    });
});

function updateUserFeatures(username, newRole) {
    const user = usersData[username];
    if (!user) return;
    
    const features = {
        'مالك': { color: '#FFD700', frame: 'gold-frame.gif', glow: true, title: 'المالك' },
        'وزير': { color: '#9d4edd', frame: 'purple-frame.gif', glow: true, title: 'الوزير' },
        'وزيرة': { color: '#9d4edd', frame: 'purple-frame.gif', glow: true, title: 'الوزيرة' },
        'عضو مميز': { color: '#4cc9f0', frame: 'blue-frame.gif', glow: true, title: 'مميز' },
        'عضو': { color: user.gender === 'أنثى' ? '#FF69B4' : '#1E90FF', frame: '', glow: false, title: '' },
        'زائر': { color: '#6c757d', frame: '', glow: false, title: 'زائر' }
    };
    
    const feature = features[newRole];
    if (feature) {
        user.profileColor = feature.color;
        user.profileFrame = feature.frame;
        user.nameGlow = feature.glow;
        user.nameColor = feature.color;
        user.title = feature.title;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});
