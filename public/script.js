let currentUser = null;
let selectedGender = 'ذكر';
let isSubmitting = false;

// فتح وإغلاق النوافذ
function openModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    document.getElementById(modalId).classList.add('active');
    document.getElementById('error-message').classList.remove('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
}

// اختيار الجنس
function selectGender(gender, element) {
    selectedGender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

// التحقق من اسم المستخدم
async function checkUsername(username) {
    try {
        const response = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await response.json();
    } catch (error) {
        return { exists: false };
    }
}

// تسجيل الدخول
async function login() {
    if (isSubmitting) return;
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('error-message');
    const submitBtn = document.querySelector('#login-modal .submit-btn');
    const originalText = submitBtn.innerHTML;

    if (!username || !password) {
        errorEl.textContent = 'يرجى ملء جميع الحقول';
        errorEl.classList.add('active');
        return;
    }

    isSubmitting = true;
    submitBtn.innerHTML = '<span class="loading"></span> جاري تسجيل الدخول...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            
            // إضافة بيانات إضافية
            currentUser.isGuest = false;
            currentUser.joinDate = new Date().toISOString();
            
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            
            // تأثير نجاح
            submitBtn.innerHTML = '<i class="fas fa-check"></i> تم تسجيل الدخول بنجاح!';
            submitBtn.style.background = 'linear-gradient(135deg, #38b000, #2d9140)';
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            errorEl.textContent = data.message || 'اسم المستخدم أو كلمة السر غير صحيحة';
            errorEl.classList.add('active');
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        errorEl.textContent = 'خطأ في الاتصال بالخادم. تأكد من تشغيل السيرفر.';
        errorEl.classList.add('active');
        submitBtn.innerHTML = originalText;
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
    }
}

// التسجيل
async function register() {
    if (isSubmitting) return;
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const age = document.getElementById('register-age').value;
    const errorEl = document.getElementById('error-message');
    const submitBtn = document.querySelector('#register-modal .submit-btn');
    const originalText = submitBtn.innerHTML;

    // التحقق من البيانات
    if (!username || !password || !confirmPassword || !age) {
        errorEl.textContent = 'يرجى ملء جميع الحقول';
        errorEl.classList.add('active');
        return;
    }

    if (password !== confirmPassword) {
        errorEl.textContent = 'كلمات السر غير متطابقة';
        errorEl.classList.add('active');
        return;
    }

    if (age < 13 || age > 100) {
        errorEl.textContent = 'العمر يجب أن يكون بين 13 و 100 سنة';
        errorEl.classList.add('active');
        return;
    }

    // التحقق من اسم المستخدم
    const checkResult = await checkUsername(username);
    if (checkResult.exists) {
        errorEl.textContent = 'اسم المستخدم موجود مسبقاً';
        errorEl.classList.add('active');
        return;
    }

    isSubmitting = true;
    submitBtn.innerHTML = '<span class="loading"></span> جاري إنشاء الحساب...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                password, 
                gender: selectedGender, 
                age: parseInt(age) 
            })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            currentUser.isGuest = false;
            currentUser.joinDate = new Date().toISOString();
            
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            
            // تأثير نجاح
            submitBtn.innerHTML = '<i class="fas fa-check"></i> تم إنشاء الحساب بنجاح!';
            submitBtn.style.background = 'linear-gradient(135deg, #38b000, #2d9140)';
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            errorEl.textContent = data.message || 'حدث خطأ أثناء التسجيل';
            errorEl.classList.add('active');
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        errorEl.textContent = 'خطأ في الاتصال بالخادم. تأكد من تشغيل السيرفر.';
        errorEl.classList.add('active');
        submitBtn.innerHTML = originalText;
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
    }
}

// دخول كضيف
function enterAsGuest() {
    const username = document.getElementById('guest-username').value.trim();
    
    if (!username) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = 'يرجى إدخال اسم المستخدم';
        errorEl.classList.add('active');
        return;
    }

    // إنشاء حساب ضيف
    currentUser = {
        username: username,
        role: 'زائر',
        gender: selectedGender,
        profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=${selectedGender === 'أنثى' ? 'FF69B4' : '1E90FF'}`,
        profileColor: selectedGender === 'أنثى' ? '#FF69B4' : '#1E90FF',
        serial: 0,
        isGuest: true,
        joinDate: new Date().toISOString(),
        interaction: 0,
        age: 18
    };

    localStorage.setItem('chatUser', JSON.stringify(currentUser));
    
    // تأثير النجاح
    const submitBtn = document.querySelector('#guest-modal .submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> جاري الدخول...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        window.location.href = 'chat.html';
    }, 800);
}

// الأحداث عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    // تحميل المستخدم السابق إذا كان مسجلاً
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (!user.isGuest) {
            document.getElementById('login-username').value = user.username;
        }
    }

    // تأثيرات البطاقات
    const cards = document.querySelectorAll('.option-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });

    // الإدخال عن طريق Enter
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                if (activeModal.id === 'login-modal') {
                    login();
                } else if (activeModal.id === 'register-modal') {
                    register();
                } else if (activeModal.id === 'guest-modal') {
                    enterAsGuest();
                }
            }
        }
    });

    // إغلاق النوافذ عند النقر خارجها
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // التحقق من اسم المستخدم أثناء الكتابة (للتسجيل)
    const registerUsername = document.getElementById('register-username');
    if (registerUsername) {
        let timeout;
        registerUsername.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const username = registerUsername.value.trim();
                if (username.length >= 3) {
                    const result = await checkUsername(username);
                    const errorEl = document.getElementById('error-message');
                    
                    if (result.exists) {
                        errorEl.textContent = 'اسم المستخدم موجود مسبقاً';
                        errorEl.classList.add('active');
                    } else {
                        errorEl.classList.remove('active');
                    }
                }
            }, 500);
        });
    }

    // إضافة تأثيرات للزر عند التركيز
    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });

    // إظهار نسخة الموقع في console
    console.log('%c✨ شات متقدم ✨', 'color: #4361ee; font-size: 24px; font-weight: bold;');
    console.log('%cمرحباً بك في تطبيق الشات المتقدم', 'color: #666; font-size: 14px;');
});
