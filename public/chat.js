// ====== المتغيرات العامة ======
let socket = null;
let currentUser = null;
let onlineUsers = [];

// ====== التهيئة ======
document.addEventListener('DOMContentLoaded', function() {
    // تحميل بيانات المستخدم
    loadUser();
    
    // الاتصال بالسوكيت
    connectSocket();
    
    // إضافة المستمعين للأحداث
    setupEventListeners();
    
    // تحديث واجهة المستخدم
    updateUI();
});

// ====== تحميل بيانات المستخدم ======
function loadUser() {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(userData);
    console.log('المستخدم الحالي:', currentUser);
}

// ====== الاتصال بالسوكيت ======
function connectSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ متصل بالخادم');
        
        // انضمام للمستخدم
        socket.emit('join', {
            userId: currentUser.userId,
            username: currentUser.username,
            role: currentUser.role,
            gender: currentUser.gender,
            avatar: currentUser.avatar
        });
    });
    
    // استقبال قائمة المتصلين
    socket.on('online users', (users) => {
        onlineUsers = users;
        updateOnlineUsers();
    });
    
    // استقبال رسالة جديدة
    socket.on('new message', (message) => {
        addMessage(message, 'incoming');
    });
    
    // استقبال إشعار دخول
    socket.on('user joined', (data) => {
        showJoinNotification(data);
    });
    
    // استقبال إشعار خروج
    socket.on('user left', (data) => {
        showLeaveNotification(data);
    });
}

// ====== تحديث قائمة المتصلين ======
function updateOnlineUsers() {
    const onlineCount = onlineUsers.length;
    
    // تحديث العداد
    document.querySelectorAll('#onlineCount, #onlineCount2').forEach(el => {
        el.textContent = onlineCount;
    });
    
    // قائمة المتصلين
    const onlineList = document.getElementById('onlineList');
    const offlineList = document.getElementById('offlineList');
    
    onlineList.innerHTML = '';
    offlineList.innerHTML = '';
    
    // يمكنك هنا إضافة المستخدمين غير المتصلين من قاعدة البيانات
    // حالياً نعرض فقط المتصلين
    
    onlineUsers.forEach(user => {
        const memberItem = createMemberItem(user);
        onlineList.appendChild(memberItem);
    });
}

// ====== إنشاء عنصر عضو ======
function createMemberItem(user) {
    const div = document.createElement('div');
    div.className = 'member-item';
    
    // أسماء الرتب بالعربية
    const roleNames = {
        'owner': 'مالك',
        'minister': user.gender === 'male' ? 'وزير' : 'وزيرة',
        'premium_member': 'مميز',
        'member': 'عضو',
        'guest': 'زائر'
    };
    
    // ألوان الرتب
    const roleColors = {
        'owner': 'role-owner',
        'minister': 'role-minister',
        'premium_member': 'role-premium',
        'member': 'role-member',
        'guest': 'role-guest'
    };
    
    const roleName = roleNames[user.role] || 'زائر';
    const roleClass = roleColors[user.role] || 'role-guest';
    
    // الحرف الأول من الاسم
    const firstChar = user.username.charAt(0);
    
    div.innerHTML = `
        <div class="member-avatar">
            ${firstChar}
        </div>
        <div class="member-info">
            <div class="member-name">${user.username}</div>
            <div class="member-role">
                <span class="role-badge ${roleClass}">${roleName}</span>
            </div>
        </div>
    `;
    
    // حدث النقر لعرض البروفايل
    div.addEventListener('click', () => {
        showProfile(user);
    });
    
    return div;
}

// ====== إضافة رسالة ======
function addMessage(message, type) {
    const container = document.getElementById('messagesContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    
    // تحديد إذا كانت رسالة نظام
    if (message.senderRole === 'system') {
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${message.content}
            </div>
        `;
    } else {
        // رسالة عادية
        const isOwner = message.senderRole === 'owner';
        const isMinister = message.senderRole === 'minister';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender ${isOwner ? 'owner-name' : ''}">
                    ${message.senderName}
                    ${isOwner ? ' 👑' : ''}
                    ${isMinister ? ' ⭐' : ''}
                </span>
                <span class="message-time">${message.time}</span>
            </div>
            <div class="message-content">
                <div class="message-text">${message.content}</div>
            </div>
        `;
        
        // إضافة تأثيرات خاصة
        if (isOwner) {
            messageDiv.classList.add('owner-effect');
        } else if (isMinister) {
            messageDiv.classList.add('minister-effect');
        }
    }
    
    container.appendChild(messageDiv);
    
    // التمرير للأسفل
    container.scrollTop = container.scrollHeight;
}

// ====== إرسال رسالة ======
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (socket && currentUser) {
        socket.emit('send message', {
            userId: currentUser.userId,
            username: currentUser.username,
            role: currentUser.role,
            content: message,
            messageType: 'text'
        });
        
        // إضافة الرسالة محلياً
        addMessage({
            senderName: 'أنت',
            content: message,
            time: new Date().toLocaleTimeString(),
            senderRole: currentUser.role
        }, 'outgoing');
        
        // مسح الحقل
        input.value = '';
        input.focus();
    }
}

// ====== إشعارات الدخول والخروج ======
function showJoinNotification(data) {
    const container = document.getElementById('messagesContainer');
    
    const notification = document.createElement('div');
    notification.className = 'system-message';
    
    // إضافة تأثيرات حسب الرتبة
    let effectClass = '';
    if (data.effect === 'owner_effect') {
        effectClass = 'owner-effect';
    } else if (data.effect === 'minister_effect') {
        effectClass = 'minister-effect';
    }
    
    notification.innerHTML = `
        <div class="message-content ${effectClass}">
            <i class="fas fa-door-open"></i> 
            ${data.username} (${data.role}) دخل الغرفة
        </div>
    `;
    
    container.appendChild(notification);
    container.scrollTop = container.scrollHeight;
}

function showLeaveNotification(data) {
    const container = document.getElementById('messagesContainer');
    
    const notification = document.createElement('div');
    notification.className = 'system-message';
    
    notification.innerHTML = `
        <div class="message-content">
            <i class="fas fa-door-closed"></i> 
            ${data.username} غادر الغرفة
        </div>
    `;
    
    container.appendChild(notification);
    container.scrollTop = container.scrollHeight;
}

// ====== عرض البروفايل ======
function showProfile(user) {
    // هنا يمكنك إنشاء نافذة البروفايل
    alert(`بروفايل: ${user.username}\nالرتبة: ${user.role}\nالجنس: ${user.gender === 'male' ? 'ذكر' : 'أنثى'}`);
}

// ====== إعداد المستمعين للأحداث ======
function setupEventListeners() {
    // إرسال الرسالة
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // فتح/إغلاق القائمة
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const sideMenu = document.getElementById('sideMenu');
    
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.add('active');
    });
    
    closeMenu.addEventListener('click', () => {
        sideMenu.classList.remove('active');
    });
    
    // فتح/إغلاق قائمة الأعضاء
    const closeSidebar = document.getElementById('closeSidebar');
    const membersSidebar = document.getElementById('membersSidebar');
    
    closeSidebar.addEventListener('click', () => {
        membersSidebar.classList.remove('active');
    });
    
    // يمكنك إضافة زر لفتح قائمة الأعضاء في الهيدر
    // أضف هذا في chat.html:
    // <button class="header-btn" id="membersBtn"><i class="fas fa-users"></i></button>
    
    // الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// ====== تحديث واجهة المستخدم ======
function updateUI() {
    if (currentUser) {
        // تحديث الاسم والرتبة
        document.getElementById('userName').textContent = currentUser.username;
        
        const roleNames = {
            'owner': '👑 مالك الموقع',
            'minister': currentUser.gender === 'male' ? '⭐ وزير' : '⭐ وزيرة',
            'premium_member': currentUser.gender === 'male' ? '💎 عضو مميز' : '💎 عضوة مميزة',
            'member': currentUser.gender === 'male' ? '👤 عضو' : '👤 عضوة',
            'guest': '👤 زائر'
        };
        
        document.getElementById('userRole').textContent = roleNames[currentUser.role] || '👤 زائر';
        
        // تحديث الصورة (الحرف الأول)
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = currentUser.username.charAt(0);
        
        // إضافة رسالة ترحيب
        setTimeout(() => {
            addMessage({
                senderName: 'النظام',
                content: `مرحباً ${currentUser.username}! تم الاتصال بالشات العام`,
                time: new Date().toLocaleTimeString(),
                senderRole: 'system'
            }, 'incoming');
        }, 1000);
    }
}

// ====== إظهار إشعار ======
function showNotification(message, type = 'info') {
    const area = document.getElementById('notificationArea');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    area.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
