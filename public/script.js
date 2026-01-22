// ========== المتغيرات العامة ==========
const socket = io();
let currentUser = {
    username: '',
    avatar: '👤',
    avatarImage: null,
    id: null,
    role: 'member'
};
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = null;
let replyingTo = null;
let soundEnabled = true;
let notificationsEnabled = true;

// ========== تهيئة الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    setupEventListeners();
    setupSocketEvents();
});

// ========== تحميل بيانات المستخدم ==========
function loadUserData() {
    const savedUser = localStorage.getItem('arabic_chat_user');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        currentUser.username = parsed.username || 'زائر';
        currentUser.avatar = parsed.avatar || '👤';
        currentUser.avatarImage = parsed.avatarImage || null;
        currentUser.role = parsed.role || 'member';
        
        document.getElementById('usernameInput').value = currentUser.username;
        
        document.querySelectorAll('.avatar-option').forEach(opt => {
            if (opt.dataset.avatar === currentUser.avatar) {
                opt.classList.add('selected');
            }
        });
        
        if (currentUser.avatarImage) {
            document.getElementById('previewImage').src = currentUser.avatarImage;
            document.getElementById('avatarPreview').style.display = 'block';
        }
    }
}

// ========== إعداد المستمعين للأحداث ==========
function setupEventListeners() {
    // اختيار الصورة الشخصية
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            if (this.id === 'customAvatarBtn') {
                document.getElementById('avatarUploadInput').click();
                return;
            }
            
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            currentUser.avatar = this.dataset.avatar;
            currentUser.avatarImage = null;
            document.getElementById('avatarPreview').style.display = 'none';
        });
    });
    
    // رفع صورة شخصية مخصصة
    document.getElementById('avatarUploadInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentUser.avatarImage = e.target.result;
                currentUser.avatar = '🖼️';
                
                document.getElementById('previewImage').src = e.target.result;
                document.getElementById('avatarPreview').style.display = 'block';
                
                document.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                document.getElementById('customAvatarBtn').classList.add('selected');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // الإدخال التلقائي
    document.getElementById('messageInput').addEventListener('input', function() {
        if (this.textContent.trim()) {
            socket.emit('typing');
        }
    });
    
    // إرسال بالإنتر
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ========== أحداث Socket.io ==========
function setupSocketEvents() {
    // الاتصال
    socket.on('connect', () => {
        console.log('✅ متصل بالسيرفر');
        document.getElementById('connectionStatus').textContent = 'متصل';
        document.getElementById('connectionStatus').style.color = '#28a745';
        
        if (currentUser.username) {
            setTimeout(() => { completeLogin(); }, 500);
        }
    });
    
    // قطع الاتصال
    socket.on('disconnect', () => {
        document.getElementById('connectionStatus').textContent = 'غير متصل';
        document.getElementById('connectionStatus').style.color = '#dc3545';
    });
    
    // الترحيب
    socket.on('welcome', (data) => {
        console.log('مرحباً بك! رتبتك:', data.yourRole);
        currentUser.role = data.yourRole;
        updateRoleDisplay();
        updateUsersList(data.users);
        
        data.history.forEach(msg => {
            displayMessage(msg);
        });
        
        const welcomeMsg = {
            type: 'system',
            user: 'النظام',
            text: `🌟 ${data.message} (رتبتك: ${getRoleName(data.yourRole)})`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(welcomeMsg);
    });
    
    // تحديث المستخدمين
    socket.on('users update', (users) => {
        document.getElementById('onlineCount').textContent = users.length;
        updateUsersList(users);
    });
    
    // مستخدم جديد
    socket.on('user joined', (user) => {
        const joinMsg = {
            type: 'system',
            user: 'النظام',
            text: `🟢 ${user.username} انضم للشات (${getRoleName(user.role)})`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(joinMsg);
        playSound('notification');
    });
    
    // مستخدم غادر
    socket.on('user left', (user) => {
        const leaveMsg = {
            type: 'system',
            user: 'النظام',
            text: `🔴 ${user.username} غادر الشات`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(leaveMsg);
    });
    
    // رسالة جديدة
    socket.on('new message', (message) => {
        displayMessage(message);
        
        if (message.userId !== socket.id && soundEnabled) {
            playSound('message');
        }
        
        if (notificationsEnabled && message.userId !== socket.id && document.hidden) {
            showNotification(message.user, message.text || 'أرسل ملف');
        }
    });
    
    // مؤشر الكتابة
    socket.on('user typing', (data) => {
        document.getElementById('typingUser').textContent = data.username;
        document.getElementById('typingIndicator').style.display = 'block';
        
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            document.getElementById('typingIndicator').style.display = 'none';
        }, 3000);
    });
    
    // تشغيل صوت
    socket.on('play sound', (soundType) => {
        if (soundEnabled) {
            playSound(soundType);
        }
    });
    
    // مستخدم تم كتمه
    socket.on('user muted', (data) => {
        const msg = {
            type: 'system',
            user: 'النظام',
            text: `🔇 ${data.mutedBy} كتم ${data.username}`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(msg);
        playSound('notification');
    });
    
    // مستخدم تم إلغاء كتمه - التصحيح هنا
    socket.on('user unmuted', (data) => {
        const msg = {
            type: 'system',
            user: 'النظام',
            text: `🔊 ${data.unmutedBy} ألغى كتم ${data.username}`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(msg);
    });
    
    // مستخدم تم ترقيته
    socket.on('user promoted', (data) => {
        const msg = {
            type: 'system',
            user: 'النظام',
            text: `👑 ${data.promotedBy} رقّى ${data.username} لوزير`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(msg);
        playSound('notification');
        alert(`🎉 تم ترقية ${data.username} لوزير!`);
    });
    
    // مستخدم تم خفض رتبته
    socket.on('user demoted', (data) => {
        const msg = {
            type: 'system',
            user: 'النظام',
            text: `⬇️ ${data.demotedBy} خفض ${data.username} لعضو عادي`,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        displayMessage(msg);
        playSound('notification');
    });
    
    // خطأ
    socket.on('error', (message) => {
        alert(message);
    });
}

// ========== دوال المستخدم ==========
function completeLogin() {
    const username = document.getElementById('usernameInput').value.trim() || 'زائر';
    currentUser.username = username;
    currentUser.id = socket.id;
    
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('chatApp').style.display = 'flex';
    
    socket.emit('register user', currentUser);
    
    localStorage.setItem('arabic_chat_user', JSON.stringify(currentUser));
    updateUserInterface();
    document.getElementById('messageInput').focus();
}

function updateUserInterface() {
    document.getElementById('headerUsername').textContent = currentUser.username;
    updateAvatarDisplay(document.getElementById('headerAvatar'), currentUser);
    
    document.getElementById('sidebarUsername').textContent = currentUser.username;
    updateAvatarDisplay(document.getElementById('sidebarAvatar'), currentUser);
}

function updateRoleDisplay() {
    const roleName = getRoleName(currentUser.role);
    const roleClass = getRoleClass(currentUser.role);
    
    document.getElementById('userRoleDisplay').textContent = roleName;
    document.getElementById('userRoleDisplay').className = `role-badge ${roleClass}`;
    
    document.getElementById('headerRole').textContent = roleName;
    document.getElementById('headerRole').className = `role-badge ${roleClass}`;
    document.getElementById('headerRole').style.display = 'inline-block';
    
    document.getElementById('sidebarRole').innerHTML = `<span class="role-badge ${roleClass}">${roleName}</span>`;
}

function getRoleName(role) {
    switch(role) {
        case 'owner': return '🏆 المالك';
        case 'minister': return '👑 الوزير';
        default: return '👤 عضو';
    }
}

function getRoleClass(role) {
    switch(role) {
        case 'owner': return 'role-owner';
        case 'minister': return 'role-minister';
        default: return 'role-member';
    }
}

function updateAvatarDisplay(element, user) {
    if (user.avatarImage) {
        element.innerHTML = `<img src="${user.avatarImage}" alt="${user.username}">`;
    } else {
        element.textContent = user.avatar;
    }
}

function updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<li style="text-align:center; color:#666;">لا يوجد مستخدمون متصلون</li>';
        return;
    }
    
    users.forEach(user => {
        const li = document.createElement('li');
        
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'user-avatar-small';
        updateAvatarDisplay(avatarDiv, user);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'user-details';
        
        const nameRoleDiv = document.createElement('div');
        nameRoleDiv.className = 'user-name-role';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user.username;
        
        const roleSpan = document.createElement('span');
        roleSpan.className = `role-badge ${getRoleClass(user.role)}`;
        roleSpan.textContent = getRoleName(user.role);
        
        nameRoleDiv.appendChild(nameSpan);
        nameRoleDiv.appendChild(roleSpan);
        
        if (user.id === socket.id) {
            const youSpan = document.createElement('span');
            youSpan.style.cssText = 'font-size:10px; color:#666; margin-right:5px;';
            youSpan.textContent = '(أنت)';
            nameRoleDiv.appendChild(youSpan);
        }
        
        detailsDiv.appendChild(nameRoleDiv);
        
        if (user.promotedBy) {
            const promotedSpan = document.createElement('span');
            promotedSpan.className = 'promoted-by';
            promotedSpan.textContent = `↑ رفعه: ${user.promotedBy}`;
            detailsDiv.appendChild(promotedSpan);
        }
        
        userInfo.appendChild(avatarDiv);
        userInfo.appendChild(detailsDiv);
        
        const statusDiv = document.createElement('div');
        statusDiv.className = `user-status ${user.isMuted ? 'muted' : ''}`;
        statusDiv.title = user.isMuted ? 'مكوت' : 'نشط';
        
        userInfo.appendChild(statusDiv);
        
        li.appendChild(userInfo);
        
        // أزرار الإجراءات للمستخدمين الآخرين
        if (user.id !== socket.id) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'user-actions';
            
            // زر الرد
            const replyBtn = document.createElement('button');
            replyBtn.innerHTML = '<i class="fas fa-reply"></i>';
            replyBtn.title = 'رد';
            replyBtn.onclick = () => setReplyTo(user);
            
            // زر الكتم/إلغاء الكتم
            const muteBtn = document.createElement('button');
            muteBtn.innerHTML = user.isMuted ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
            muteBtn.title = user.isMuted ? 'إلغاء كتم' : 'كتم';
            muteBtn.className = user.isMuted ? '' : 'danger';
            muteBtn.onclick = () => toggleMuteUser(user.id, user.isMuted);
            
            actionsDiv.appendChild(replyBtn);
            actionsDiv.appendChild(muteBtn);
            
            // زر الترقية (فقط للمالك وللأعضاء العاديين)
            if (currentUser.role === 'owner' && user.role === 'member') {
                const promoteBtn = document.createElement('button');
                promoteBtn.innerHTML = '<i class="fas fa-crown"></i>';
                promoteBtn.title = 'ترقية لوزير';
                promoteBtn.className = 'minister-btn';
                promoteBtn.onclick = () => promoteUser(user.id, user.username);
                actionsDiv.appendChild(promoteBtn);
            }
            
            // زر الخفض (فقط للمالك وللوزراء)
            if (currentUser.role === 'owner' && user.role === 'minister') {
                const demoteBtn = document.createElement('button');
                demoteBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
                demoteBtn.title = 'خفض لعضو';
                demoteBtn.className = 'danger';
                demoteBtn.onclick = () => demoteUser(user.id, user.username);
                actionsDiv.appendChild(demoteBtn);
            }
            
            li.appendChild(actionsDiv);
        }
        
        usersList.appendChild(li);
    });
}

// ========== دوال نظام الرتب ==========
function promoteUser(userId, username) {
    if (confirm(`هل تريد ترقية "${username}" لوزير؟\n\nالوزير سيتمكن من:\n• كتم الأعضاء العاديين\n• لا يمكن كتم المالك أو وزراء آخرين`)) {
        socket.emit('promote to minister', userId);
    }
}

function demoteUser(userId, username) {
    if (confirm(`هل تريد خفض "${username}" لعضو عادي؟\n\nسيخسر صلاحيات الوزير.`)) {
        socket.emit('demote minister', userId);
    }
}

function toggleMuteUser(userId, isMuted) {
    if (isMuted) {
        socket.emit('unmute user', userId);
    } else {
        if (confirm('هل تريد كتم هذا المستخدم؟\n\nلن يتمكن من إرسال رسائل.')) {
            socket.emit('mute user', userId);
        }
    }
}

// ========== إدارة الرسائل ==========
function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const msgDiv = document.createElement('div');
    
    let msgClass = 'message';
    if (message.userId === socket.id) {
        msgClass += ' own';
    } else if (message.userId) {
        msgClass += ' other';
    } else {
        msgClass += ' system';
    }
    
    if (message.type === 'reply') {
        msgClass += ' reply';
    }
    
    msgDiv.className = msgClass;
    
    let contentHTML = '';
    
    // رأس الرسالة
    if (message.userId) {
        contentHTML += `
            <div class="message-header">
                <div class="message-avatar">
                    ${message.avatarImage ? 
                        `<img src="${message.avatarImage}" alt="${message.user}">` : 
                        message.avatar}
                </div>
                <div class="message-user">
                    ${message.user}
                </div>
                <div class="message-time">${message.time}</div>
            </div>
        `;
    }
    
    // محتوى الرسالة
    contentHTML += '<div class="message-content">';
    
    // الرد على رسالة
    if (message.type === 'reply' && message.replyToUser) {
        contentHTML += `
            <div class="message-reply">
                <small>رد على ${message.replyToUser}</small>
                ${message.text || ''}
            </div>
        `;
    }
    
    // النص
    if (message.text) {
        contentHTML += `<div class="message-text">${message.text}</div>`;
    }
    
    // ملف
    if (message.type === 'file') {
        if (message.fileType === 'image') {
            contentHTML += `
                <div class="message-file">
                    <img src="${message.fileData}" alt="صورة" class="file-preview" onclick="openImage('${message.fileData}')" style="cursor:pointer;">
                    <div class="file-info">
                        <i class="fas fa-image"></i>
                        <div>
                            <div>${message.fileName}</div>
                            <small>${message.fileSize}</small>
                        </div>
                    </div>
                </div>
            `;
        } else if (message.fileType === 'video') {
            contentHTML += `
                <div class="message-file">
                    <video src="${message.fileData}" controls class="file-preview"></video>
                    <div class="file-info">
                        <i class="fas fa-video"></i>
                        <div>
                            <div>${message.fileName}</div>
                            <small>${message.fileSize}</small>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // رسالة صوتية
    if (message.type === 'voice') {
        contentHTML += `
            <div class="voice-message">
                <div class="voice-player">
                    <button onclick="playVoiceMessage('${message.voiceId}')" style="padding:8px; border-radius:50%;">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="voice-duration">${formatTime(message.duration || 0)}</div>
                </div>
                <small>رسالة صوتية من ${message.user}</small>
            </div>
        `;
    }
    
    contentHTML += '</div>';
    
    // التاريخ
    if (message.date) {
        contentHTML += `<div class="message-date">${message.date}</div>`;
    }
    
    msgDiv.innerHTML = contentHTML;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.textContent.trim();
    
    if (!text && !replyingTo) return;
    
    if (replyingTo) {
        socket.emit('reply to message', {
            text: text,
            replyTo: replyingTo.id,
            replyToUser: replyingTo.user
        });
        clearReply();
    } else {
        socket.emit('send message', { text: text });
    }
    
    messageInput.textContent = '';
    messageInput.focus();
}

function setReplyTo(user) {
    replyingTo = { id: user.id, user: user.username };
    document.getElementById('replyBtn').style.display = 'block';
    document.getElementById('messageInput').placeholder = `رد على ${user.username}...`;
    document.getElementById('messageInput').focus();
}

function clearReply() {
    replyingTo = null;
    document.getElementById('replyBtn').style.display = 'none';
    document.getElementById('messageInput').placeholder = 'اكتب رسالتك هنا...';
}

// ========== دوال مساعدة ==========
function playSound(type) {
    if (!soundEnabled) return;
    
    const sounds = {
        message: document.getElementById('messageSound'),
        notification: document.getElementById('notificationSound'),
        voice: document.getElementById('voiceMessageSound')
    };
    
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(e => console.log('خطأ في الصوت:', e));
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body });
    }
}

// ========== دوال الواجهة المفقودة ==========
function toggleProfileMenu() {
    alert('⚙️ قائمة الملف الشخصي - قيد التطوير');
}

function toggleEmojiPicker() {
    alert('😊 اختيار الإيموجي - قيد التطوير');
}

function showReplyTo() {
    if (replyingTo) {
        alert(`↪️ الرد على: ${replyingTo.user}`);
    } else {
        alert('⚠️ لم تحدد رسالة للرد عليها');
    }
}

// طلب صلاحيات الإشعارات
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
