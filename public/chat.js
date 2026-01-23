// متغيرات الشات
let socket;
let currentUser;
let currentRoom = 'general';
let typingTimeout;

// تهيئة الشات
function initChat() {
    // تحميل بيانات المستخدم
    const savedUser = localStorage.getItem('chatUser');
    if (!savedUser) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    displayUserInfo();
    
    // الاتصال بالسيرفر
    socket = io();
    
    // الانضمام للشات
    socket.emit('join', {
        username: currentUser.username,
        role: currentUser.role,
        gender: currentUser.gender,
        profilePic: currentUser.profilePic,
        isGuest: currentUser.isGuest || false
    });
    
    // إعداد المستمعين
    setupEventListeners();
}

// عرض معلومات المستخدم
function displayUserInfo() {
    document.getElementById('current-username').textContent = currentUser.username;
    document.getElementById('current-role').textContent = currentUser.role;
    document.getElementById('current-profile-pic').src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=${currentUser.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=128`;
    
    // إضافة رمز الرتبة
    const roleBadge = document.getElementById('current-role');
    roleBadge.className = 'role';
    roleBadge.classList.add(`${getRoleClass(currentUser.role)}-badge`);
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    // استقبال الرسائل
    socket.on('receive message', (message) => {
        addMessageToChat(message);
    });
    
    // تحديث قائمة المستخدمين
    socket.on('update users', (users) => {
        updateOnlineUsers(users);
    });
    
    // عند دخول مستخدم جديد
    socket.on('user joined', (user) => {
        showNotification(`${user.username} انضم للشات`, 'success');
    });
    
    // عند خروج مستخدم
    socket.on('user left', (username) => {
        showNotification(`${username} غادر الشات`, 'info');
    });
    
    // عند الكتابة
    socket.on('user typing', (data) => {
        showTypingIndicator(data);
    });
    
    // إرسال الرسالة
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // إظهار/إخفاء الشريط الجانبي
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // إدارة الكتابة
    document.getElementById('message-input').addEventListener('input', () => {
        socket.emit('typing', {
            username: currentUser.username,
            isTyping: true,
            room: currentRoom
        });
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', {
                username: currentUser.username,
                isTyping: false,
                room: currentRoom
            });
        }, 1000);
    });
}

// إرسال رسالة
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (message && currentUser) {
        socket.emit('send message', {
            text: message,
            room: currentRoom
        });
        
        input.value = '';
        input.style.height = '50px';
        
        // إعلام بالتوقف عن الكتابة
        socket.emit('typing', {
            username: currentUser.username,
            isTyping: false,
            room: currentRoom
        });
    }
}

// إضافة رسالة للشات
function addMessageToChat(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    
    const roleClass = getRoleClass(message.role);
    const genderClass = message.gender === 'أنثى' ? 'female' : 'male';
    
    messageElement.className = `message ${roleClass} ${genderClass}`;
    messageElement.innerHTML = `
        <div class="message-user">
            <img src="https://ui-avatars.com/api/?name=${message.username}&background=${message.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=128" 
                 alt="${message.username}">
            <span class="role-badge ${roleClass}-badge">${message.role}</span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <h4>${message.username}</h4>
                <span class="message-time">${message.timestamp}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// تحديث قائمة المستخدمين المتصلين
function updateOnlineUsers(users) {
    const usersList = document.getElementById('online-users-list');
    usersList.innerHTML = '';
    
    const sortedUsers = users.sort((a, b) => {
        const roleOrder = { 'مالك': 1, 'وزير': 2, 'وزيرة': 2, 'عضو مميز': 3, 'عضو': 4, 'زائر': 5 };
        return (roleOrder[a.role] || 6) - (roleOrder[b.role] || 6);
    });
    
    sortedUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <span class="status"></span>
            <img src="https://ui-avatars.com/api/?name=${user.username}&background=${user.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=64" 
                 width="30" height="30" style="border-radius:50%;">
            <div>
                <div style="font-weight:500;">${user.username}</div>
                <div class="user-role ${getRoleClass(user.role)}-badge" style="display:inline-block; margin-top:2px; font-size:10px; padding:1px 6px;">
                    ${user.role}
                </div>
            </div>
        `;
        usersList.appendChild(userItem);
    });
}

// عرض مؤشر الكتابة
function showTypingIndicator(data) {
    const typingIndicator = document.getElementById('typing-indicator');
    if (data.isTyping) {
        typingIndicator.textContent = `${data.username} يكتب...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// عرض الإشعارات
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// وظائف مساعدة
function getRoleClass(role) {
    const roleMap = {
        'مالك': 'owner',
        'وزير': 'minister',
        'وزيرة': 'minister',
        'عضو مميز': 'vip',
        'عضو': 'member',
        'زائر': 'guest'
    };
    return roleMap[role] || 'member';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// تكبير/تصغير صورة المستخدم
function zoomProfilePic(element) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = element.src;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 10px;
        box-shadow: 0 0 30px rgba(255,255,255,0.2);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => {
        modal.remove();
    });
}

// تهيئة الشات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initChat);

// السماح بتحريك منطقة الإدخال
document.getElementById('message-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
