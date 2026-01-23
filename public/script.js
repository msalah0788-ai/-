// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // تحديد عناصر DOM
    const modeToggle = document.getElementById('modeToggle');
    const body = document.body;
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const guestBtn = document.getElementById('guestBtn');
    
    // التحقق من الجلسة المخزنة
    checkStoredSession();
    
    // تبديل الوضع الفاتح/الداكن
    modeToggle.addEventListener('click', toggleTheme);
    
    // تعيين الوضع الحالي
    const savedTheme = localStorage.getItem('chat-theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        modeToggle.classList.remove('fa-moon');
        modeToggle.classList.add('fa-sun');
    }
    
    // إضافة تأثيرات للحقول
    addInputEffects();
    
    // تسجيل الدخول
    loginBtn.addEventListener('click', handleLogin);
    
    // تسجيل حساب جديد
    registerBtn.addEventListener('click', handleRegister);
    
    // دخول زائر
    guestBtn.addEventListener('click', handleGuestLogin);
    
    // السماح بالدخول باستخدام Enter
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (this.closest('#loginSection')) {
                    handleLogin();
                } else if (this.closest('#registerSection')) {
                    handleRegister();
                } else if (this.closest('#guestSection')) {
                    handleGuestLogin();
                }
            }
        });
    });
});

// التحقق من الجلسة المخزنة
function checkStoredSession() {
    const savedSession = localStorage.getItem('chat-session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData.remember && sessionData.expiry > Date.now()) {
                // تلقائي الدخول إذا الجلسة سارية
                autoLogin(sessionData);
            }
        } catch (e) {
            console.error('خطأ في قراءة الجلسة:', e);
            localStorage.removeItem('chat-session');
        }
    }
}

// تسجيل الدخول التلقائي
function autoLogin(sessionData) {
    showLoading();
    
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: sessionData.username,
            password: sessionData.password,
            remember: true
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            // حفظ الجلسة الجديدة
            const sessionToSave = {
                username: sessionData.username,
                password: sessionData.password,
                remember: true,
                expiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 يوم
            };
            localStorage.setItem('chat-session', JSON.stringify(sessionToSave));
            
            // الانتقال للدردشة
            window.location.href = '/chat.html';
        }
    })
    .catch(error => {
        hideLoading();
        console.error('خطأ في الدخول التلقائي:', error);
    });
}

// تبديل الوضع الفاتح/الداكن
function toggleTheme() {
    const body = document.body;
    const modeIcon = document.getElementById('modeToggle');
    
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        modeIcon.classList.remove('fa-moon');
        modeIcon.classList.add('fa-sun');
        localStorage.setItem('chat-theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        modeIcon.classList.remove('fa-sun');
        modeIcon.classList.add('fa-moon');
        localStorage.setItem('chat-theme', 'light');
    }
}

// إضافة تأثيرات للحقول
function addInputEffects() {
    const inputs = document.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        // تأثير عند التركيز
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        // تأثير عند فقدان التركيز
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
        
        // تأثير التحقق من الصحة
        input.addEventListener('input', function() {
            validateField(this);
        });
    });
}

// التحقق من الحقل
function validateField(field) {
    const formGroup = field.parentElement;
    const errorElement = formGroup.parentElement.querySelector('.error-message');
    
    // إزالة رسائل الخطأ السابقة
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    // التحقق من الإدخال المطلوب
    if (field.hasAttribute('required') && !field.value.trim()) {
        showError(formGroup, 'هذا الحقل مطلوب');
        return false;
    }
    
    // التحقق من طول الاسم
    if (field.type === 'text' && field.id.includes('Username')) {
        const username = field.value.trim();
        if (username.length < 3) {
            showError(formGroup, 'يجب أن يكون الاسم 3 أحرف على الأقل');
            return false;
        }
        if (username.length > 14) {
            showError(formGroup, 'يجب ألا يتجاوز الاسم 14 حرف');
            return false;
        }
    }
    
    // التحقق من كلمة المرور
    if (field.type === 'password') {
        const password = field.value;
        if (password.length < 3) {
            showError(formGroup, 'يجب أن تكون كلمة المرور 3 أحرف على الأقل');
            return false;
        }
        if (password.length > 14) {
            showError(formGroup, 'يجب ألا تتجاوز كلمة المرور 14 حرف');
            return false;
        }
    }
    
    // التحقق من العمر
    if (field.id.includes('age')) {
        const age = parseInt(field.value);
        if (age < 1 || age > 99) {
            showError(formGroup, 'يجب أن يكون العمر بين 1 و 99');
            return false;
        }
    }
    
    // التحقق من تطابق كلمة المرور
    if (field.id === 'confirmPassword') {
        const password = document.getElementById('regPassword').value;
        const confirmPassword = field.value;
        
        if (password !== confirmPassword) {
            showError(formGroup, 'كلمة المرور غير متطابقة');
            return false;
        }
    }
    
    return true;
}

// عرض رسالة الخطأ
function showError(formGroup, message) {
    let errorElement = formGroup.parentElement.querySelector('.error-message');
    
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'error-message';
        formGroup.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // اهتزاز الحقل
    formGroup.classList.add('shake');
    setTimeout(() => {
        formGroup.classList.remove('shake');
    }, 500);
}

// معالجة تسجيل الدخول
function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;
    
    // التحقق الأساسي
    if (!username || !password) {
        showError(document.querySelector('#loginSection .form-group'), 'يرجى ملء جميع الحقول');
        return;
    }
    
    if (username.length < 3 || username.length > 14) {
        showError(document.querySelector('#loginSection .form-group'), 'اسم المستخدم يجب أن يكون بين 3 و 14 حرف');
        return;
    }
    
    showLoading();
    
    // إرسال طلب تسجيل الدخول
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
            remember: remember
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('خطأ في الاتصال بالخادم');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        
        if (data.success) {
            // حفظ الجلسة إذا طلب التذكر
            if (remember) {
                const sessionToSave = {
                    username: username,
                    password: password,
                    remember: true,
                    expiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 يوم
                };
                localStorage.setItem('chat-session', JSON.stringify(sessionToSave));
            }
            
            // عرض رسالة نجاح
            showSuccessMessage('تم تسجيل الدخول بنجاح! جاري التحويل...');
            
            // الانتقال للدردشة بعد تأخير قصير
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 1500);
        } else {
            showError(document.querySelector('#loginSection .form-group'), data.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        }
    })
    .catch(error => {
        hideLoading();
        showError(document.querySelector('#loginSection .form-group'), 'حدث خطأ في الاتصال بالخادم');
        console.error('خطأ في تسجيل الدخول:', error);
    });
}

// معالجة تسجيل حساب جديد
function handleRegister() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value;
    
    // التحقق من جميع الحقول
    const fields = [
        { element: 'regUsername', value: username },
        { element: 'regPassword', value: password },
        { element: 'confirmPassword', value: confirmPassword },
        { element: 'gender', value: gender },
        { element: 'age', value: age }
    ];
    
    for (const field of fields) {
        if (!field.value) {
            const formGroup = document.getElementById(field.element).parentElement;
            showError(formGroup, 'هذا الحقل مطلوب');
            return;
        }
    }
    
    // التحقق من صحة البيانات
    if (username.length < 3 || username.length > 14) {
        showError(document.getElementById('regUsername').parentElement, 'اسم المستخدم يجب أن يكون بين 3 و 14 حرف');
        return;
    }
    
    if (password.length < 3 || password.length > 14) {
        showError(document.getElementById('regPassword').parentElement, 'كلمة المرور يجب أن تكون بين 3 و 14 حرف');
        return;
    }
    
    if (password !== confirmPassword) {
        showError(document.getElementById('confirmPassword').parentElement, 'كلمة المرور غير متطابقة');
        return;
    }
    
    if (!gender) {
        showError(document.getElementById('gender').parentElement, 'يرجى اختيار الجنس');
        return;
    }
    
    const ageNum = parseInt(age);
    if (ageNum < 1 || ageNum > 99) {
        showError(document.getElementById('age').parentElement, 'يجب أن يكون العمر بين 1 و 99');
        return;
    }
    
    showLoading();
    
    // إرسال طلب التسجيل
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
            confirmPassword: confirmPassword,
            gender: gender,
            age: ageNum
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('خطأ في الاتصال بالخادم');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        
        if (data.success) {
            // تسجيل الدخول تلقائياً بعد التسجيل
            autoLoginAfterRegister(username, password);
        } else {
            showError(document.getElementById('regUsername').parentElement, data.message || 'حدث خطأ أثناء التسجيل');
        }
    })
    .catch(error => {
        hideLoading();
        showError(document.getElementById('regUsername').parentElement, 'حدث خطأ في الاتصال بالخادم');
        console.error('خطأ في التسجيل:', error);
    });
}

// تسجيل الدخول بعد التسجيل الناجح
function autoLoginAfterRegister(username, password) {
    showLoading();
    
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
            remember: false
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showSuccessMessage(`تم إنشاء حسابك بنجاح! رقمك التسلسلي: ${data.serialNumber}`);
            
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 2000);
        }
    })
    .catch(error => {
        hideLoading();
        console.error('خطأ في الدخول بعد التسجيل:', error);
    });
}

// معالجة دخول الزائر
function handleGuestLogin() {
    const username = document.getElementById('guestUsername').value.trim();
    const gender = document.getElementById('guestGender').value;
    const age = document.getElementById('guestAge').value;
    
    // التحقق من البيانات
    if (!username || !gender || !age) {
        showError(document.querySelector('#guestSection .form-group'), 'يرجى ملء جميع الحقول');
        return;
    }
    
    if (username.length < 3 || username.length > 14) {
        showError(document.getElementById('guestUsername').parentElement, 'الاسم يجب أن يكون بين 3 و 14 حرف');
        return;
    }
    
    const ageNum = parseInt(age);
    if (ageNum < 1 || ageNum > 99) {
        showError(document.getElementById('guestAge').parentElement, 'يجب أن يكون العمر بين 1 و 99');
        return;
    }
    
    showLoading();
    
    // إرسال طلب دخول الزائر
    fetch('/api/guest', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            gender: gender,
            age: ageNum
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('خطأ في الاتصال بالخادم');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showSuccessMessage('مرحباً بك كزائر! جاري التحويل للدردشة...');
            
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 1500);
        } else {
            showError(document.getElementById('guestUsername').parentElement, data.message || 'اسم المستخدم موجود مسبقاً');
        }
    })
    .catch(error => {
        hideLoading();
        showError(document.querySelector('#guestSection .form-group'), 'حدث خطأ في الاتصال بالخادم');
        console.error('خطأ في دخول الزائر:', error);
    });
}

// عرض رسالة النجاح
function showSuccessMessage(message) {
    // إنشاء عنصر رسالة النجاح
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // إضافة الأنماط
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #4CAF50, #2E7D32);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(successDiv);
    
    // إزالة الرسالة بعد 3 ثوانٍ
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
            successDiv.remove();
        }, 500);
    }, 3000);
    
    // إضافة الأنيميشن
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// عرض نافذة التحميل
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    // إضافة تأثيرات للتحميل
    const spinner = loadingOverlay.querySelector('.spinner');
    const text = loadingOverlay.querySelector('p');
    
    // تغيير النص بشكل عشوائي
    const loadingTexts = [
        'جاري التحضير...',
        'جاري تسجيل الدخول...',
        'جاري إنشاء الحساب...',
        'جاري التحقق من البيانات...',
        'جاري الاتصال بالخادم...'
    ];
    
    let textIndex = 0;
    const textInterval = setInterval(() => {
        text.textContent = loadingTexts[textIndex];
        textIndex = (textIndex + 1) % loadingTexts.length;
    }, 2000);
    
    // حفظ معرف الفاصل للإزالة لاحقاً
    loadingOverlay.textInterval = textInterval;
}

// إخفاء نافذة التحميل
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // إزالة الفاصل الزمني لتغيير النص
    if (loadingOverlay.textInterval) {
        clearInterval(loadingOverlay.textInterval);
    }
    
    // التأخير قليلاً قبل الإخفاء
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 500);
}
