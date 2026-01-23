// ==================== المتغيرات العامة ====================
let socket = null;
let currentUser = null;
let currentScreen = 'start';

// ==================== إدارة الشاشات ====================
function showScreen(screenId) {
    // إخفاء جميع الشاشات
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // إظهار الشاشة المطلوبة
    document.getElementById(screenId + 'Screen').classList.add('active');
    currentScreen = screenId;
}

// دوال إظهار الشاشات
function showStartScreen() { showScreen('start'); }
function showLogin() { showScreen('login'); }
function showRegister() { showScreen('register'); }
function showGuestLogin() { showScreen('guest'); }

// ==================== إشعارات ====================
function showNotification(message, type = 'info', duration = 5000) {
    const notificationArea = document.getElementById('notificationArea');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // أيقونة حسب نوع الإشعار
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    notificationArea.appendChild(notification);
    
    // إزالة الإشعار بعد المدة المحددة
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    // إضافة تأثير الخروج
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ==================== تسجيل الدخول ====================
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data;
            showNotification(`مرحباً ${data.username}!`, 'success');
            
            // الانتقال لصفحة الشات بعد 1 ثانية
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 1000);
            
        } else {
            showNotification(data.error || 'خطأ في تسجيل الدخول', 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    }
});

// ==================== تسجيل حساب جديد ====================
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    
    if (!username || !password || !gender) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('اسم المستخدم يجب أن يكون 3 أحرف على الأقل', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, gender })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول', 'success');
            
            // الانتقال لشاشة تسجيل الدخول بعد 2 ثانية
            setTimeout(() => {
                document.getElementById('loginUsername').value = username;
                showLogin();
            }, 2000);
            
        } else {
            showNotification(data.error || 'خطأ في إنشاء الحساب', 'error');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    }
});

// ==================== الدخول كضيف ====================
document.getElementById('guestForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const guestName = document.getElementById('guestName').value.trim();
    const gender = document.querySelector('input[name="guestGender"]:checked')?.value;
    
    if (!guestName || !gender) {
        showNotification('يرجى إدخال الاسم واختيار الجنس', 'error');
        return;
    }
    
    // إنشاء مستخدم ضيف مؤقت
    currentUser = {
        userId: 'guest_' + Date.now(),
        username: guestName,
        role: 'guest',
        gender: gender,
        avatar: 'default_avatar.png',
        isGuest: true
    };
    
    // حفظ في localStorage
    localStorage.setItem('guestUser', JSON.stringify(currentUser));
    
    showNotification(`مرحباً ${guestName}! (ضيف)`, 'success');
    
    // الانتقال لصفحة الشات بعد 1 ثانية
    setTimeout(() => {
        window.location.href = '/chat.html';
    }, 1000);
});

// ==================== تحميل المستخدم الضيف من localStorage ====================
function loadGuestUser() {
    const savedGuest = localStorage.getItem('guestUser');
    if (savedGuest) {
        return JSON.parse(savedGuest);
    }
    return null;
}

// ==================== التهيئة عند تحميل الصفحة ====================
document.addEventListener('DOMContentLoaded', function() {
    // التحقق إذا كان هناك مستخدم ضيف محفوظ
    const savedGuest = loadGuestUser();
    if (savedGuest && window.location.pathname === '/') {
        if (confirm(`هل تريد الاستمرار كـ ${savedGuest.username} (ضيف)؟`)) {
            currentUser = savedGuest;
            window.location.href = '/chat.html';
        } else {
            localStorage.removeItem('guestUser');
        }
    }
    
    // إضافة تأثيرات للخيارات
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});
