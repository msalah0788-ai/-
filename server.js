const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ========== نظام الرتب ==========
const ROLES = {
    OWNER: 'owner',
    MINISTER: 'minister',
    MEMBER: 'member'
};

const PREMIUM_ACCOUNTS = {
   
    'محمد': {
        password: 'aumsalah079',
        role: 'owner',
        gender: 'ذكر',
        zodiac: 'الحمل',
        joinDate: new Date().toLocaleDateString('ar-SA')
    }
};

const PERMISSIONS = {
    [ROLES.OWNER]: ['mute', 'unmute', 'promote', 'demote', 'kick', 'delete', 'broadcast'],
    [ROLES.MINISTER]: ['mute', 'unmute', 'delete'],
    [ROLES.MEMBER]: []
};

// ========== تخزين البيانات ==========
const users = {};
const messageHistory = [];
const voiceMessages = new Map();

// ========== إعداد الملفات الثابتة ==========
app.use(express.static(path.join(__dirname, 'public')));

// إنشاء مجلد uploads إذا لم يكن موجوداً
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// ========== الروتس ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        users: Object.keys(users).length,
        messages: messageHistory.length,
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).send('<h1>404 - الصفحة غير موجودة</h1>');
});

// ========== Socket.io Events ==========
io.on('connection', (socket) => {
    console.log('✅ مستخدم جديد متصل:', socket.id);
    
    // ======== 1. تسجيل المستخدم ========
    socket.on('register user', (userData) => {
        const userId = socket.id;
        
        // التحقق من الاسم المكرر
        const existingUser = Object.values(users).find(u => 
            u.username.toLowerCase() === userData.username.toLowerCase() && u.id !== userId
        );
        
        if (existingUser && !userData.isGuest) {
            socket.emit('error', '⚠️ هذا الاسم مستخدم مسبقاً');
            return;
        }
        
        // تحديد الرتبة
        let role = ROLES.MEMBER;
        let isOwner = false;
        let isGuest = userData.isGuest || false;
        
        // تسجيل بحساب مسبق
        if (userData.password && PREMIUM_ACCOUNTS[userData.username]) {
            if (PREMIUM_ACCOUNTS[userData.username].password === userData.password) {
                role = PREMIUM_ACCOUNTS[userData.username].role;
                isOwner = (role === ROLES.OWNER);
            } else {
                socket.emit('error', '❌ كلمة السر غير صحيحة');
                return;
            }
        }
        
        // إذا كان اسم "المالك" فهو المالك
        if (userData.username === 'المالك') {
            if (!userData.password || !PREMIUM_ACCOUNTS['المالك']) {
                socket.emit('error', '❌ اسم "المالك" محجوز. الرجاء استخدام اسم آخر');
                return;
            }
        }
        
        // تسجيل زائر باسم "الوزير"
        else if (userData.username === 'الوزير' && isGuest) {
            socket.emit('error', '❌ اسم "الوزير" محجوز للترقية فقط');
            return;
        }
        
        const newUser = {
            id: userId,
            username: userData.username || 'زائر',
            avatar: userData.avatar || '👤',
            avatarImage: userData.avatarImage || null,
            role: role,
            isOwner: isOwner,
            isGuest: isGuest,
            promotedBy: null,
            gender: userData.gender || 'غير محدد',
            zodiac: userData.zodiac || 'غير محدد',
            joinDate: new Date().toLocaleDateString('ar-SA'),
            status: 'online',
            isMuted: false,
            joinTime: new Date().toLocaleTimeString('ar-SA'),
            socketId: socket.id
        };
        
        users[userId] = newUser;
        
        // إرسال ترحيب
        socket.emit('welcome', {
            message: `مرحباً ${newUser.username}!`,
            users: Object.values(users),
            history: messageHistory.slice(-50),
            yourRole: role,
            userId: userId,
            permissions: PERMISSIONS[role] || []
        });
        
        // إعلام الجميع بمستخدم جديد
        socket.broadcast.emit('user joined', newUser);
        io.emit('users update', Object.values(users));
        
        // إرسال إشعار للنظام
        io.emit('new message', {
            id: Date.now(),
            type: 'system',
            user: 'النظام',
            text: `🌟 ${newUser.username} انضم للشات (${getRoleName(role)})`,
            time: new Date().toLocaleTimeString('ar-SA'),
            date: new Date().toLocaleDateString('ar-SA')
        });
        
        console.log(`✅ ${newUser.username} (${role}) انضم للشات`);
    });
    
    // ======== 2. تحديث الصورة الشخصية ========
    socket.on('update avatar', (imageData) => {
        const user = users[socket.id];
        if (user && imageData) {
            user.avatarImage = imageData;
            io.emit('users update', Object.values(users));
            socket.emit('avatar updated', true);
        }
    });
    
    // ======== 3. إرسال رسالة نصية ========
    socket.on('send message', (msgData) => {
        const user = users[socket.id];
        if (!user) {
            socket.emit('error', '❌ يجب تسجيل الدخول أولاً');
            return;
        }
        
        if (user.isMuted) {
            socket.emit('error', '❌ تم كتمك ولا يمكنك إرسال رسائل');
            return;
        }
        
        if (!msgData.text || msgData.text.trim().length === 0) {
            return;
        }
        
        const message = {
            id: Date.now() + '_' + socket.id,
            type: 'text',
            user: user.username,
            avatar: user.avatar,
            avatarImage: user.avatarImage,
            userId: user.id,
            text: msgData.text.trim(),
            time: new Date().toLocaleTimeString('ar-SA'),
            date: new Date().toLocaleDateString('ar-SA'),
            role: user.role
        };
        
        // حفظ الرسالة
        messageHistory.push(message);
        if (messageHistory.length > 1000) {
            messageHistory.shift();
        }
        
        // إرسال للجميع
        io.emit('new message', message);
        
        // إشعار صوتي
        socket.broadcast.emit('play sound', 'message');
        
        console.log(`💬 ${user.username}: ${msgData.text || '(بدون نص)'}`);
    });
    
    // ======== 4. إرسال ملف (صورة/فيديو) ========
    socket.on('send file', (fileData) => {
        const user = users[socket.id];
        if (!user || user.isMuted) {
            socket.emit('error', '❌ لا يمكنك إرسال ملفات');
            return;
        }
        
        const fileId = `file_${Date.now()}_${socket.id}`;
        
        const message = {
            id: Date.now() + '_' + socket.id,
            type: 'file',
            fileId: fileId,
            user: user.username,
            avatar: user.avatar,
            avatarImage: user.avatarImage,
            userId: user.id,
            fileName: fileData.name,
            fileType: fileData.type,
            fileData: fileData.data,
            fileSize: fileData.size,
            time: new Date().toLocaleTimeString('ar-SA'),
            date: new Date().toLocaleDateString('ar-SA'),
            role: user.role
        };
        
        // حفظ الرسالة
        messageHistory.push(message);
        
        // إرسال للجميع
        io.emit('new message', message);
        
        // إشعار صوتي للملفات
        socket.broadcast.emit('play sound', 'file');
        
        console.log(`📁 ${user.username} أرسل ${fileData.type}`);
    });
    
    // ======== 5. إرسال رسالة صوتية ========
    socket.on('send voice', (voiceData) => {
        const user = users[socket.id];
        if (!user || user.isMuted) return;
        
        const voiceId = `voice_${Date.now()}_${socket.id}`;
        voiceMessages.set(voiceId, {
            data: voiceData.data,
            duration: voiceData.duration,
            userId: socket.id,
            timestamp: Date.now()
        });
        
        // تنظيف بعد 24 ساعة
        setTimeout(() => {
            voiceMessages.delete(voiceId);
        }, 24 * 60 * 60 * 1000);
        
        const message = {
            id: Date.now() + '_' + socket.id,
            type: 'voice',
            voiceId: voiceId,
            user: user.username,
            avatar: user.avatar,
            avatarImage: user.avatarImage,
            userId: user.id,
            duration: voiceData.duration,
            time: new Date().toLocaleTimeString('ar-SA'),
            date: new Date().toLocaleDateString('ar-SA'),
            role: user.role
        };
        
        // حفظ الرسالة
        messageHistory.push(message);
        
        // إرسال للجميع
        io.emit('new message', message);
        
        // إشعار صوتي للرسائل الصوتية
        socket.broadcast.emit('play sound', 'voice');
        
        console.log(`🎤 ${user.username} أرسل رسالة صوتية`);
    });
    
    // ======== 6. طلب رسالة صوتية ========
    socket.on('get voice', (voiceId, callback) => {
        const voice = voiceMessages.get(voiceId);
        if (voice) {
            callback(voice);
        } else {
            callback({ error: 'الرسالة الصوتية غير موجودة' });
        }
    });
    
    // ======== 7. الرد على رسالة ========
    socket.on('reply to message', (replyData) => {
        const user = users[socket.id];
        if (!user || user.isMuted) return;
        
        const message = {
            id: Date.now() + '_' + socket.id,
            type: 'reply',
            user: user.username,
            avatar: user.avatar,
            avatarImage: user.avatarImage,
            userId: user.id,
            text: replyData.text,
            replyTo: replyData.replyTo,
            replyToUser: replyData.replyToUser,
            time: new Date().toLocaleTimeString('ar-SA'),
            date: new Date().toLocaleDateString('ar-SA'),
            role: user.role
        };
        
        // حفظ الرسالة
        messageHistory.push(message);
        
        // إرسال للجميع
        io.emit('new message', message);
        
        // إشعار صوتي للردود
        socket.broadcast.emit('play sound', 'reply');
        
        console.log(`↪️ ${user.username} رد على ${replyData.replyToUser}`);
    });
    
    // ======== 8. كتم مستخدم ========
    socket.on('mute user', (targetUserId) => {
        const user = users[socket.id];
        const targetUser = users[targetUserId];
        
        if (!user || !targetUser) {
            socket.emit('error', '❌ المستخدم غير موجود');
            return;
        }
        
        // لا يمكن كتم المالك
        if (targetUser.role === ROLES.OWNER) {
            socket.emit('error', '❌ لا يمكن كتم المالك!');
            return;
        }
        
        // التحقق من الصلاحيات
        if (!PERMISSIONS[user.role]?.includes('mute')) {
            socket.emit('error', '❌ ليس لديك صلاحية الكتم!');
            return;
        }
        
        // لا يمكن كتم أعلى رتبة
        if (user.role === ROLES.MINISTER && targetUser.role === ROLES.MINISTER) {
            socket.emit('error', '❌ لا يمكن كتم وزير آخر!');
            return;
        }
        
        // لا يمكن كتم نفسه
        if (user.id === targetUser.id) {
            socket.emit('error', '❌ لا يمكنك كتم نفسك!');
            return;
        }
        
        targetUser.isMuted = true;
        
        io.emit('user muted', {
            userId: targetUserId,
            username: targetUser.username,
            mutedBy: user.username,
            role: user.role
        });
        
        io.emit('users update', Object.values(users));
        
        // إرسال رسالة نظام
        io.emit('new message', {
            id: Date.now(),
            type: 'system',
            user: 'النظام',
            text: `🔇 ${user.username} كتم ${targetUser.username}`,
            time: new Date().toLocaleTimeString('ar-SA')
        });
    });
    
    // ======== 9. إلغاء كتم مستخدم ========
    socket.on('unmute user', (targetUserId) => {
        const user = users[socket.id];
        const targetUser = users[targetUserId];
        
        if (!user || !targetUser) return;
        
        // التحقق من الصلاحيات
        if (!PERMISSIONS[user.role]?.includes('unmute')) {
            socket.emit('error', '❌ ليس لديك صلاحية إلغاء الكتم!');
            return;
        }
        
        targetUser.isMuted = false;
        
        io.emit('user unmuted', {
            userId: targetUserId,
            username: targetUser.username,
            unmutedBy: user.username
        });
        
        io.emit('users update', Object.values(users));
        
        // إرسال رسالة نظام
        io.emit('new message', {
            id: Date.now(),
            type: 'system',
            user: 'النظام',
            text: `🔊 ${user.username} ألغى كتم ${targetUser.username}`,
            time: new Date().toLocaleTimeString('ar-SA')
        });
    });
    
    // ======== 10. مؤشر الكتابة ========
    socket.on('typing', () => {
        const user = users[socket.id];
        if (user) {
            socket.broadcast.emit('user typing', {
                username: user.username,
                userId: user.id
            });
        }
    });
    
    // ======== 11. تحديث الملف الشخصي ========
    socket.on('update profile', (newData) => {
        const user = users[socket.id];
        if (user) {
            const oldName = user.username;
            user.username = newData.username || user.username;
            
            // تحديث الرسائل القديمة
            messageHistory.forEach(msg => {
                if (msg.userId === user.id) {
                    msg.user = user.username;
                }
            });
            
            io.emit('users update', Object.values(users));
            socket.emit('profile updated', { success: true });
            
            // إشعار بالتغيير
            if (oldName !== user.username) {
                io.emit('new message', {
                    id: Date.now(),
                    type: 'system',
                    user: 'النظام',
                    text: `🔄 ${oldName} غير اسمه إلى ${user.username}`,
                    time: new Date().toLocaleTimeString('ar-SA')
                });
            }
        }
    });
    
    // ======== 12. ترقية مستخدم لوزير ========
    socket.on('promote to minister', (targetUserId) => {
        const user = users[socket.id];
        const targetUser = users[targetUserId];
        
        if (!user || user.role !== ROLES.OWNER) {
            socket.emit('error', '❌ فقط المالك يمكنه الترقية!');
            return;
        }
        
        if (!targetUser) {
            socket.emit('error', '❌ المستخدم غير موجود');
            return;
        }
        
        if (targetUser.role === ROLES.MEMBER) {
            targetUser.role = ROLES.MINISTER;
            targetUser.promotedBy = user.username;
            
            io.emit('user promoted', {
                userId: targetUserId,
                username: targetUser.username,
                promotedBy: user.username,
                newRole: 'minister'
            });
            
            io.emit('users update', Object.values(users));
            
            // رسالة نظام
            io.emit('new message', {
                id: Date.now(),
                type: 'system',
                user: 'النظام',
                text: `👑 ${user.username} رقّى ${targetUser.username} لوزير`,
                time: new Date().toLocaleTimeString('ar-SA')
            });
            
            console.log(`👑 ${user.username} رقّى ${targetUser.username} لوزير`);
        }
    });
    
    // ======== 13. خفض وزير لعضو ========
    socket.on('demote minister', (targetUserId) => {
        const user = users[socket.id];
        const targetUser = users[targetUserId];
        
        if (!user || user.role !== ROLES.OWNER) {
            socket.emit('error', '❌ فقط المالك يمكنه خفض الرتبة!');
            return;
        }
        
        if (!targetUser) {
            socket.emit('error', '❌ المستخدم غير موجود');
            return;
        }
        
        if (targetUser.role === ROLES.MINISTER) {
            targetUser.role = ROLES.MEMBER;
            targetUser.promotedBy = null;
            
            io.emit('user demoted', {
                userId: targetUserId,
                username: targetUser.username,
                demotedBy: user.username,
                newRole: 'member'
            });
            
            io.emit('users update', Object.values(users));
            
            // رسالة نظام
            io.emit('new message', {
                id: Date.now(),
                type: 'system',
                user: 'النظام',
                text: `⬇️ ${user.username} خفض ${targetUser.username} لعضو عادي`,
                time: new Date().toLocaleTimeString('ar-SA')
            });
            
            console.log(`⬇️ ${user.username} خفض ${targetUser.username} لعضو`);
        }
    });
    
    // ======== 14. حذف رسالة ========
    socket.on('delete message', (data) => {
        const user = users[socket.id];
        if (!user) return;
        
        const { messageId, targetUserId } = data;
        
        // المالك يحذف أي رسالة
        if (user.role === ROLES.OWNER) {
            const index = messageHistory.findIndex(msg => msg.id === messageId);
            if (index !== -1) {
                messageHistory.splice(index, 1);
            }
            io.emit('message deleted', { messageId, deletedBy: user.username });
        }
        // الوزير يحذف رسائل الأعضاء فقط
        else if (user.role === ROLES.MINISTER) {
            if (targetUserId) {
                const targetUser = users[targetUserId];
                if (targetUser && targetUser.role === ROLES.MEMBER) {
                    const index = messageHistory.findIndex(msg => msg.id === messageId);
                    if (index !== -1) {
                        messageHistory.splice(index, 1);
                    }
                    io.emit('message deleted', { messageId, deletedBy: user.username });
                }
            }
        }
    });
    
    // ======== 15. عند قطع الاتصال ========
    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            delete users[socket.id];
            io.emit('user left', user);
            io.emit('users update', Object.values(users));
            
            // رسالة نظام
            io.emit('new message', {
                id: Date.now(),
                type: 'system',
                user: 'النظام',
                text: `🔴 ${user.username} غادر الشات`,
                time: new Date().toLocaleTimeString('ar-SA')
            });
            
            console.log(`❌ ${user.username} غادر الشات`);
        }
    });
});

// ========== دوال مساعدة ==========
function getRoleName(role) {
    switch(role) {
        case 'owner': return '🏆 المالك';
        case 'minister': return '👑 الوزير';
        default: return '👤 عضو';
    }
}

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على البورت: ${PORT}`);
    console.log(`🌍 الموقع: http://localhost:${PORT}`);
    console.log(`📊 حالة السيرفر: http://localhost:${PORT}/status`);
});
