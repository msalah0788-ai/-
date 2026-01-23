// متغيرات الشات
let socket;
let currentUser;
let currentRoom = 'general';
let typingTimeout;
let allUsers = [];

// تهيئة الشات
function initChat() {
    const savedUser = localStorage.getItem('chatUser');
    if (!savedUser) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    displayUserInfo();
    
    // تحميل الثيم المحفوظ
    loadTheme();
    
    socket = io();
    
    socket.emit('join', {
        username: currentUser.username,
        role: currentUser.role,
        gender: currentUser.gender,
        profilePic: currentUser.profilePic,
        profileColor: currentUser.profileColor,
        serial: currentUser.serial
    });
    
    setupEventListeners();
    loadAllUsers();
    setupProfileModal();
    setupRoleManagement();
}

// عرض معلومات المستخدم
function displayUserInfo() {
    document.getElementById('current-username').textContent = currentUser.username;
    document.getElementById('current-role').textContent = currentUser.role;
    
    // تحديث صورة البروفايل
    const profilePic = document.getElementById('current-profile-pic');
    profilePic.src = currentUser.profilePic || 
        `https://ui-avatars.com/api/?name=${currentUser.username}&background=${currentUser.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=256`;
    
    // تحديث رمز الرتبة
    const roleBadge = document.getElementById('current-role');
    roleBadge.className = 'role';
    roleBadge.classList.add(`${getRoleClass(currentUser.role)}-badge`);
    
    // إضافة أيقونة الرتبة
    const roleIcon = getRoleIcon(currentUser.role);
    if (roleIcon) {
        roleBadge.innerHTML = `${currentUser.role} ${roleIcon}`;
    }
}

// إعداد المستمعين
function setupEventListeners() {
    socket.on('receive message', (message) => {
        addMessageToChat(message);
    });
    
    socket.on('update users', (users) => {
        updateOnlineUsers(users);
    });
    
    socket.on('user joined', (user) => {
        showNotification(`${user.username} انضم للشات`, 'success', 'fas fa-user-plus');
    });
    
    socket.on('user left', (user) => {
        showNotification(`${user.username} غادر الشات`, 'info', 'fas fa-door-open');
    });
    
    socket.on('user typing', (data) => {
        showTypingIndicator(data);
    });
    
    socket.on('role updated', (data) => {
        showNotification(
            `تم تحديث رتبة ${data.targetUsername} إلى ${data.newRole} بواسطة ${data.by}`,
            'success',
            'fas fa-crown'
        );
        
        // تحديث إذا كان المستخدم الحالي
        if (data.targetUsername === currentUser.username) {
            currentUser.role = data.newRole;
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            displayUserInfo();
        }
        
        // تحديث قائمة المستخدمين
        loadAllUsers();
    });
    
    socket.on('user mentioned', (data) => {
        if (data.mentioned === currentUser.username) {
            showNotification(
                `تم ذكرك بواسطة ${data.by}`,
                'warning',
                'fas fa-at'
            );
            
            // تشغيل صوت التنبيه
            playNotificationSound();
        }
    });
    
    // إرسال الرسائل
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // إظهار/إخفاء الشريط الجانبي
    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
    
    // إدارة الكتابة
    document.getElementById('message-input').addEventListener('input', handleTyping);
    
    // فتح البروفايل
    document.getElementById('current-profile-pic').addEventListener('click', () => {
        openProfileModal(currentUser.username);
    });
    
    // إعداد أزرار الإيموجيات
    setupEmojiPicker();
    
    // إعداد رفع الملفات
    setupFileUpload();
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
    const roleIcon = getRoleIcon(message.role);
    
    messageElement.className = `message ${roleClass} ${genderClass}`;
    messageElement.innerHTML = `
        <div class="message-user">
            <img src="${message.profilePic || `https://ui-avatars.com/api/?name=${message.username}&background=${message.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=128`}" 
                 alt="${message.username}"
                 onclick="openProfileModal('${message.username}')"
                 style="cursor:pointer">
            <span class="role-badge ${roleClass}-badge">
                ${message.role} ${roleIcon}
            </span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <h4 onclick="openProfileModal('${message.username}')" style="cursor:pointer">
                    ${message.username}
                </h4>
                <span class="message-time">${message.timestamp}</span>
            </div>
            <div class="message-text">${formatMessage(message.text)}</div>
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
            <img src="${user.profilePic || `https://ui-avatars.com/api/?name=${user.username}&background=${user.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=64`}" 
                 width="35" height="35" style="border-radius:50%; cursor:pointer"
                 onclick="openProfileModal('${user.username}')">
            <div style="flex:1;">
                <div style="font-weight:500; cursor:pointer" onclick="openProfileModal('${user.username}')">
                    ${user.username}
                    <span class="user-role ${getRoleClass(user.role)}-badge" style="font-size:10px; padding:1px 6px; margin-right:5px;">
                        ${user.role} ${getRoleIcon(user.role)}
                    </span>
                </div>
                <div style="font-size:11px; color:#666;">
                    ${user.isGuest ? 'زائر' : `رقم: ${user.serial || 'غير معروف'}`}
                </div>
            </div>
            ${currentUser.role === 'مالك' || currentUser.role === 'وزير' || currentUser.role === 'وزيرة' ? 
                `<button class="action-btn small" onclick="openRoleManagement('${user.username}')" title="إدارة الرتبة">
                    <i class="fas fa-user-cog"></i>
                </button>` : ''}
        `;
        usersList.appendChild(userItem);
    });
}

// تحميل جميع المستخدمين
async function loadAllUsers() {
    try {
        // في الحقيقي سيكون هناك API
        // الآن سنستخدم البيانات المحلية
        const onlineUsers = Object.values(users);
        const allUsersList = document.getElementById('all-users-list');
        
        if (allUsersList) {
            // هذا للنسخة المستقبلية
        }
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
    }
}

// إعداد نافذة البروفايل
function setupProfileModal() {
    // إنشاء نافذة البروفايل ديناميكياً
    const profileModal = document.createElement('div');
    profileModal.className = 'profile-modal';
    profileModal.id = 'profile-modal';
    profileModal.innerHTML = `
        <div class="profile-content">
            <div class="profile-header">
                <img id="profile-cover" class="profile-cover" src="">
                <img id="profile-picture" class="profile-picture" 
                     onclick="changeProfilePicture()"
                     src="">
                <button class="close-modal" onclick="closeProfileModal()" style="position:absolute; top:10px; left:10px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="profile-body">
                <h2 id="profile-name" class="profile-name"></h2>
                <span id="profile-role" class="profile-role"></span>
                <div id="profile-serial" class="profile-serial"></div>
                <div id="profile-bio" class="profile-bio"></div>
                
                <div class="profile-stats">
                    <div class="stat">
                        <div id="profile-interaction" class="stat-value">0</div>
                        <div class="stat-label">تفاعل</div>
                    </div>
                    <div class="stat">
                        <div id="profile-friends" class="stat-value">0</div>
                        <div class="stat-label">أصدقاء</div>
                    </div>
                    <div class="stat">
                        <div id="profile-age" class="stat-value">--</div>
                        <div class="stat-label">عمر</div>
                    </div>
                </div>
                
                <div id="profile-actions" class="profile-actions">
                    <!-- الأزرار تظهر حسب الصلاحيات -->
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(profileModal);
}

// فتح بروفايل مستخدم
async function openProfileModal(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            const modal = document.getElementById('profile-modal');
            const isCurrentUser = username === currentUser.username;
            
            // تعبئة البيانات
            document.getElementById('profile-name').textContent = username;
            document.getElementById('profile-role').textContent = user.role;
            document.getElementById('profile-role').className = `profile-role ${getRoleClass(user.role)}-badge`;
            document.getElementById('profile-serial').textContent = `#${user.serial}`;
            document.getElementById('profile-bio').textContent = user.bio || 'لا يوجد وصف';
            document.getElementById('profile-interaction').textContent = user.interaction || 0;
            document.getElementById('profile-friends').textContent = user.friends ? user.friends.length : 0;
            document.getElementById('profile-age').textContent = user.age || '--';
            
            // الصور
            document.getElementById('profile-picture').src = user.profilePic || 
                `https://ui-avatars.com/api/?name=${username}&background=${user.gender === 'أنثى' ? 'FF69B4' : '1E90FF'}&color=fff&size=256`;
            
            if (user.coverPhoto) {
                document.getElementById('profile-cover').src = user.coverPhoto;
            }
            
            // الأزرار
            const actionsDiv = document.getElementById('profile-actions');
            actionsDiv.innerHTML = '';
            
            if (isCurrentUser) {
                // أزرار المستخدم لنفسه
                actionsDiv.innerHTML = `
                    <button class="profile-btn" onclick="editProfile()">
                        <i class="fas fa-edit"></i> تعديل البروفايل
                    </button>
                    <button class="profile-btn" onclick="changeProfilePicture()">
                        <i class="fas fa-camera"></i> تغيير الصورة
                    </button>
                `;
            } else {
                // أزرار للآخرين
                actionsDiv.innerHTML = `
                    <button class="profile-btn" onclick="sendPrivateMessage('${username}')">
                        <i class="fas fa-comment"></i> مراسلة
                    </button>
                    <button class="profile-btn" onclick="sendFriendRequest('${username}')">
                        <i class="fas fa-user-plus"></i> إضافة صديق
                    </button>
                `;
                
                // إضافة زر إدارة الرتب للمسؤولين
                if (currentUser.role === 'مالك' || currentUser.role === 'وزير' || currentUser.role === 'وزيرة') {
                    actionsDiv.innerHTML += `
                        <button class="profile-btn" onclick="openRoleManagement('${username}')">
                            <i class="fas fa-crown"></i> إدارة الرتبة
                        </button>
                    `;
                }
            }
            
            modal.classList.add('active');
        }
    } catch (error) {
        showNotification('خطأ في تحميل البروفايل', 'error', 'fas fa-exclamation-circle');
    }
}

// إدارة الرتب
function setupRoleManagement() {
    const roleManagement = document.createElement('div');
    roleManagement.className = 'role-management';
    roleManagement.id = 'role-management';
    roleManagement.innerHTML = `
        <h3 style="margin-bottom:10px;">إدارة الرتبة</h3>
        <p id="role-target-user"></p>
        <select id="role-select" class="role-select">
            <option value="عضو">عضو</option>
            <option value="عضو مميز">عضو مميز</option>
            <option value="وزير">وزير</option>
            <option value="وزيرة">وزيرة</option>
            <option value="مالك">مالك</option>
        </select>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="profile-btn" onclick="updateUserRole()" style="flex:1;">
                <i class="fas fa-save"></i> حفظ
            </button>
            <button class="profile-btn" onclick="closeRoleManagement()" style="background:#6c757d; flex:1;">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;
    document.body.appendChild(roleManagement);
}

let selectedUserForRole = '';

function openRoleManagement(username) {
    selectedUserForRole = username;
    document.getElementById('role-target-user').textContent = `المستخدم: ${username}`;
    document.getElementById('role-management').classList.add('active');
}

function closeRoleManagement() {
    document.getElementById('role-management').classList.remove('active');
    selectedUserForRole = '';
}

async function updateUserRole() {
    if (!selectedUserForRole) return;
    
    const newRole = document.getElementById('role-select').value;
    
    try {
        const response = await fetch('/api/manage-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                targetUsername: selectedUserForRole,
                newRole: newRole
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success', 'fas fa-check-circle');
            closeRoleManagement();
        } else {
            showNotification(data.message, 'error', 'fas fa-exclamation-circle');
        }
    } catch (error) {
        showNotification('خطأ في تحديث الرتبة', 'error', 'fas fa-exclamation-circle');
    }
}

// إعداد الإيموجيات
function setupEmojiPicker() {
    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'emoji-picker';
    emojiPicker.id = 'emoji-picker';
    
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃',
                   '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
                   '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
                   '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
                   '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
                   '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
                   '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
                   '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
                   '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽',
                   '🙀', '😿', '😾'];
    
    emojis.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        emojiItem.textContent = emoji;
        emojiItem.onclick = () => {
            const input = document.getElementById('message-input');
            input.value += emoji;
            input.focus();
            document.getElementById('emoji-picker').classList.remove('active');
        };
        emojiPicker.appendChild(emojiItem);
    });
    
    document.body.appendChild(emojiPicker);
    
    // زر فتح الإيموجيات
    const emojiBtn = document.querySelector('[title="تسجيل صوتي"]').parentNode;
    emojiBtn.innerHTML = '<i class="fas fa-smile"></i>';
    emojiBtn.title = 'إرسال تعبير';
    emojiBtn.onclick = () => {
        const picker = document.getElementById('emoji-picker');
        picker.classList.toggle('active');
    };
}

// إعداد رفع الملفات
function setupFileUpload() {
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/*';
    imageInput.id = 'image-input';
    imageInput.style.display = 'none';
    document.body.appendChild(imageInput);
    
    // زر رفع الصور
    const imageBtn = document.querySelector('[title="إرسال صورة"]').parentNode;
    imageBtn.onclick = () => {
        document.getElementById('image-input').click();
    };
    
    imageInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // هنا يمكن رفع الصورة للسيرفر
            // حالياً سنعرض معاينة فقط
            showNotification('تم اختيار صورة للرفع', 'info', 'fas fa-image');
        }
    };
}

// تغيير الثيم
function changeTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('chatTheme', themeName);
    showNotification(`تم تغيير الثيم إلى ${themeName}`, 'success', 'fas fa-palette');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('chatTheme') || 'light';
    document.body.className = savedTheme;
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

function getRoleIcon(role) {
    const icons = {
        'مالك': '👑',
        'وزير': '⭐',
        'وزيرة': '⭐',
        'عضو مميز': '🌟',
        'عضو': '👤',
        'زائر': '👣'
    };
    return icons[role] || '';
}

function formatMessage(text) {
    // تحويل الروابط
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // تنسيق المنشن
    text = text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    return text;
}

function showNotification(message, type = 'info', icon = 'fas fa-info-circle') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3');
    audio.volume = 0.3;
    audio.play();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.remove('active');
}

function editProfile() {
    showNotification('ميزة تعديل البروفايل قريباً', 'info', 'fas fa-tools');
}

function changeProfilePicture() {
    showNotification('ميزة تغيير الصورة قريباً', 'info', 'fas fa-tools');
}

function sendPrivateMessage(username) {
    showNotification(`مراسلة ${username} قريباً`, 'info', 'fas fa-tools');
}

function sendFriendRequest(username) {
    showNotification(`تم إرسال طلب صداقة لـ ${username}`, 'success', 'fas fa-user-plus');
}

function handleTyping() {
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
}

function showTypingIndicator(data) {
    const typingIndicator = document.getElementById('typing-indicator');
    if (data.isTyping) {
        typingIndicator.textContent = `${data.username} يكتب...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// تهيئة الشات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initChat);
