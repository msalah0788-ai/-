// ملف JavaScript الرئيسي - نفس الشكل مع إصلاحات
const socket = io();
let currentUser = {
    username: '',
    avatar: '👤',
    avatarImage: null,
    role: 'member'
};

document.addEventListener('DOMContentLoaded', function() {
    // عرض نافذة الدخول تلقائياً
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('chatApp').style.display = 'none';
    
    // اختيار الصورة الشخصية
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            currentUser.avatar = this.dataset.avatar;
        });
    });
    
    // رفع صورة شخصية
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentUser.avatarImage = e.target.result;
                    currentUser.avatar = '🖼️';
                    // تحديث العرض إذا كان هناك عنصر للصورة
                    const avatarPreview = document.getElementById('avatarPreview');
                    if (avatarPreview) {
                        avatarPreview.src = e.target.result;
                        avatarPreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // زر الدخول
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', completeLogin);
    }
    
    // إدخال الرسالة بـ Enter
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // زر الإرسال
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
});

function completeLogin() {
    const usernameInput = document.getElementById('usernameInput');
    if (!usernameInput) return;
    
    const username = usernameInput.value.trim() || 'زائر';
    
    if (username.length < 2) {
        alert('الاسم يجب أن يكون على الأقل حرفين');
        return;
    }
    
    currentUser.username = username;
    
    // إخفاء نافذة الدخول
    document.getElementById('loginModal').style.display = 'none';
    
    // إظهار واجهة الشات
    document.getElementById('chatApp').style.display = 'flex';
    
    // تحديث الواجهة
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername) {
        headerUsername.textContent = currentUser.username;
    }
    
    // إرسال اسم المستخدم للسيرفر
    socket.emit('change username', currentUser.username);
    
    // تركيز على حقل الرسالة
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.focus();
    }
}

// أحداث Socket.io - معدلة لتتناسب مع server.js
socket.on('connect', () => {
    console.log('✅ متصل بالسيرفر');
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
        connectionStatus.textContent = 'متصل';
        connectionStatus.style.color = 'green';
    }
});

socket.on('disconnect', () => {
    console.log('❌ فقد الاتصال');
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
        connectionStatus.textContent = 'غير متصل';
        connectionStatus.style.color = 'red';
    }
});

socket.on('welcome', (data) => {
    console.log('مرحباً بك:', data);
    
    // تحديث اسم المستخدم إذا كان فارغاً
    if (!currentUser.username && data.username) {
        currentUser.username = data.username;
        const headerUsername = document.getElementById('headerUsername');
        if (headerUsername) {
            headerUsername.textContent = data.username;
        }
    }
    
    // تحديث قائمة المستخدمين
    if (data.onlineUsers) {
        updateUsersList(data.onlineUsers);
        const onlineCount = document.getElementById('onlineCount');
        if (onlineCount) {
            onlineCount.textContent = data.onlineUsers.length;
        }
    }
});

socket.on('users update', (data) => {
    const onlineCount = document.getElementById('onlineCount');
    if (onlineCount && data.count !== undefined) {
        onlineCount.textContent = data.count;
    }
    
    if (data.users) {
        const usersData = data.users.map(username => ({
            username: username,
            avatar: '👤',
            role: 'member'
        }));
        updateUsersList(usersData);
    }
});

socket.on('chat message', (message) => {
    displayMessage({
        userId: message.id || message.userId,
        user: message.user || message.username || 'مستخدم',
        text: message.message,
        time: message.timestamp || new Date().toLocaleTimeString()
    });
});

socket.on('user joined', (data) => {
    // عرض رسالة ترحيب في الشات
    displayMessage({
        type: 'system',
        text: `🎉 ${data.username || 'مستخدم جديد'} انضم للشات`
    });
});

socket.on('user left', (data) => {
    displayMessage({
        type: 'system',
        text: `👋 ${data.username || 'مستخدم'} غادر الشات`
    });
});

socket.on('username changed', (data) => {
    if (data.userId === socket.id) {
        currentUser.username = data.newUsername;
        const headerUsername = document.getElementById('headerUsername');
        if (headerUsername) {
            headerUsername.textContent = data.newUsername;
        }
    }
    
    displayMessage({
        type: 'system',
        text: `${data.oldUsername} غير اسمه إلى ${data.newUsername}`
    });
});

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const text = messageInput.value.trim();
    
    if (!text) {
        alert('الرجاء كتابة رسالة');
        return;
    }
    
    if (text.length > 1000) {
        alert('الرسالة طويلة جداً (الحد الأقصى 1000 حرف)');
        return;
    }
    
    // إرسال الرسالة للسيرفر
    socket.emit('chat message', {
        message: text,
        avatar: currentUser.avatar,
        avatarImage: currentUser.avatarImage
    });
    
    // مسح حقل الإدخال
    messageInput.value = '';
    messageInput.focus();
}

function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const msgDiv = document.createElement('div');
    
    // تحديد نوع الرسالة
    let msgClass = 'message';
    if (message.userId === socket.id) {
        msgClass += ' own';
    } else if (message.type === 'system') {
        msgClass += ' system';
    } else {
        msgClass += ' other';
    }
    
    msgDiv.className = msgClass;
    
    // إنشاء محتوى الرسالة
    let contentHTML = '';
    
    if (message.type === 'system') {
        // رسالة نظام
        contentHTML = `<div style="text-align:center; color:#666; font-style:italic; padding:5px;">${message.text}</div>`;
    } else {
        // رسالة عادية
        const time = message.time || new Date().toLocaleTimeString();
        contentHTML = `
            <div style="font-weight:bold; color:#2E7D32;">
                ${message.user || 'مستخدم'} 
                <small style="color:#666; font-weight:normal;">${time}</small>
            </div>
            <div style="margin-top:5px; word-break:break-word;">${escapeHtml(message.text)}</div>
        `;
    }
    
    msgDiv.innerHTML = contentHTML;
    messagesDiv.appendChild(msgDiv);
    
    // التمرير للأسفل
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList || !users) return;
    
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee;">
                <div style="width:30px; height:30px; border-radius:50%; background:#ddd; display:flex; align-items:center; justify-content:center; font-size:16px;">
                    ${user.avatar || '👤'}
                </div>
                <div>
                    <strong>${escapeHtml(user.username)}</strong>
                    <div style="font-size:12px; color:#666;">
                        ${getRoleName(user.role)}
                    </div>
                </div>
            </div>
        `;
        usersList.appendChild(li);
    });
}

function getRoleName(role) {
    switch(role) {
        case 'owner': return '🏆 المالك';
        case 'minister': return '👑 الوزير';
        case 'admin': return '⭐ مشرف';
        default: return '👤 عضو';
    }
}

// أداة مساعدة لمنع هجمات XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// وظائف إضافية بسيطة
function toggleUsersList() {
    const usersPanel = document.getElementById('usersPanel');
    if (usersPanel) {
        if (usersPanel.style.display === 'none') {
            usersPanel.style.display = 'block';
        } else {
            usersPanel.style.display = 'none';
        }
    }
}

function clearChat() {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv && confirm('هل تريد مسح كل الرسائل؟')) {
        messagesDiv.innerHTML = '';
    }
}
