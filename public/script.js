// ====== دوال إدارة الشاشات ======
function showScreen(screenId) {
    // إخفاء جميع الشاشات
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // إظهار الشاشة المطلوبة
    const targetScreen = document.getElementById(screenId + 'Screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
    } else {
        console.error('الشاشة غير موجودة:', screenId);
    }
}

// دوال الاختصار
function showStartScreen() { showScreen('start'); }
function showLogin() { showScreen('login'); }
function showRegister() { showScreen('register'); }
function showGuestLogin() { showScreen('guest'); }

// ====== الإشعارات ======
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    if (!notificationArea) {
        console.log('Notification area not found');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        background: ${type === 'error' ? '#f8d7da' : '#d4edda'};
        color: ${type === 'error' ? '#721c24' : '#155724'};
        padding: 15px;
        margin: 10px;
        border-radius: 5px;
        border: 1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'};
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
    `;
    
    notificationArea.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ====== تسجيل الدخول ======
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const username = document.getElementById('loginUsername')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!username || !password) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    showNotification('جاري تسجيل الدخول...', 'info');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
            showNotification(`مرحباً ${data.username}!`, 'info');
            
            // حفظ بيانات المستخدم
            localStorage.setItem('user', JSON.stringify(data));
            
            // الانتقال للشات بعد ثانية
            setTimeout(() => {
                window.location.href = '/chat';
            }, 1000);
            
        } else {
            showNotification(data.error || 'خطأ في تسجيل الدخول', 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
});

// ====== تسجيل حساب جديد ======
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Register form submitted');
    
    const username = document.getElementById('regUsername')?.value;
    const password = document.getElementById('regPassword')?.value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    
    if (!username || !password || !gender) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (username === 'محمد') {
        showNotification('هذا الاسم محجوز', 'error');
        return;
    }
    
    showNotification('جاري إنشاء الحساب...', 'info');
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, gender })
        });
        
        const data = await response.json();
        console.log('Register response:', data);
        
        if (data.success) {
            showNotification('تم إنشاء الحساب بنجاح!', 'info');
            
            // تعبئة اسم المستخدم في شاشة الدخول
            document.getElementById('loginUsername').value = username;
            
            // الانتقال لشاشة الدخول بعد 2 ثانية
            setTimeout(() => {
                showLogin();
            }, 2000);
            
        } else {
            showNotification(data.error || 'خطأ في إنشاء الحساب', 'error');
        }
        
    } catch (error) {
        console.error('Register error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
});

// ====== الدخول كضيف ======
document.getElementById('guestForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Guest form submitted');
    
    const guestName = document.getElementById('guestName')?.value;
    const gender = document.querySelector('input[name="guestGender"]:checked')?.value;
    
    if (!guestName || !gender) {
        showNotification('يرجى إدخال الاسم واختيار الجنس', 'error');
        return;
    }
    
    if (guestName === 'محمد') {
        showNotification('هذا الاسم محجوز', 'error');
        return;
    }
    
    // إنشاء مستخدم ضيف
    const guestUser = {
        success: true,
        userId: 'guest_' + Date.now(),
        username: guestName,
        role: 'guest',
        gender: gender,
        avatar: gender === 'male' ? '👤' : '👩',
        isGuest: true
    };
    
    // حفظ في localStorage
    localStorage.setItem('user', JSON.stringify(guestUser));
    
    showNotification(`مرحباً ${guestName} (ضيف)!`, 'info');
    
    // الانتقال للشات
    setTimeout(() => {
        window.location.href = '/chat';
    }, 1000);
});

// ====== التهيئة عند تحميل الصفحة ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    
    // تحميل المستخدم المحفوظ
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        console.log('Found saved user:', JSON.parse(savedUser).username);
    }
    
    // إضافة أحداث للخيارات (لكن لا تعتمد عليها)
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Option button clicked');
        });
    });
    
    // ضمان أن الشاشة الأولى ظاهرة
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.classList.add('active');
    }
    
    console.log('Initialization complete');
});
