// ====== 1. دوال تبديل الشاشات (بسيطة جداً) ======
function showScreen(screenId) {
    // نخفي كل الشاشات
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });
    
    // نظهر الشاشة المطلوبة
    const targetScreen = document.getElementById(screenId + 'Screen');
    if (targetScreen) {
        targetScreen.style.display = 'block';
    }
}

// ====== 2. أحداث الأزرار ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('الصفحة جاهزة');
    
    // زر "دخول الأعضاء"
    const loginBtn = document.querySelector('#loginOption .option-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            console.log('تم النقر على دخول الأعضاء');
            showScreen('login');
        });
    }
    
    // زر "تسجيل حساب جديد"
    const registerBtn = document.querySelector('#registerOption .option-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            console.log('تم النقر على تسجيل حساب جديد');
            showScreen('register');
        });
    }
    
    // زر "الدخول كضيف"
    const guestBtn = document.querySelector('#guestOption .option-btn');
    if (guestBtn) {
        guestBtn.addEventListener('click', function() {
            console.log('تم النقر على الدخول كضيف');
            showScreen('guest');
        });
    }
    
    // أزرار الرجوع
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showScreen('start');
        });
    });
    
    // ====== 3. نموذج تسجيل الدخول ======
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('تم إرسال نموذج الدخول');
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                alert('يرجى ملء جميع الحقول');
                return;
            }
            
            console.log('محاولة الدخول:', username);
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                console.log('الرد من السيرفر:', data);
                
                if (data.success) {
                    alert(`مرحباً ${data.username}!`);
                    
                    // حفظ بيانات المستخدم
                    localStorage.setItem('user', JSON.stringify(data));
                    
                    // الانتقال للشات
                    window.location.href = '/chat';
                    
                } else {
                    alert('خطأ: ' + data.error);
                }
                
            } catch (error) {
                console.error('خطأ في الاتصال:', error);
                alert('حدث خطأ في الاتصال بالخادم');
            }
        });
    }
    
    // ====== 4. نموذج التسجيل الجديد ======
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('تم إرسال نموذج التسجيل');
            
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const gender = document.querySelector('input[name="gender"]:checked')?.value;
            
            if (!username || !password || !gender) {
                alert('يرجى ملء جميع الحقول');
                return;
            }
            
            if (username === 'محمد') {
                alert('اسم "محمد" محجوز للمالك فقط');
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
                console.log('الرد من السيرفر:', data);
                
                if (data.success) {
                    alert('تم إنشاء الحساب بنجاح!');
                    
                    // تعبئة بيانات الدخول
                    document.getElementById('loginUsername').value = username;
                    
                    // الانتقال لشاشة الدخول
                    showScreen('login');
                    
                } else {
                    alert('خطأ: ' + data.error);
                }
                
            } catch (error) {
                console.error('خطأ في الاتصال:', error);
                alert('حدث خطأ في الاتصال بالخادم');
            }
        });
    }
    
    // ====== 5. نموذج الدخول كضيف ======
    const guestForm = document.getElementById('guestForm');
    if (guestForm) {
        guestForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('تم إرسال نموذج الضيف');
            
            const guestName = document.getElementById('guestName').value;
            const gender = document.querySelector('input[name="guestGender"]:checked')?.value;
            
            if (!guestName || !gender) {
                alert('يرجى إدخال الاسم واختيار الجنس');
                return;
            }
            
            if (guestName === 'محمد') {
                alert('اسم "محمد" محجوز للمالك فقط');
                return;
            }
            
            // إنشاء مستخدم ضيف
            const guestUser = {
                success: true,
                userId: 'guest_' + Date.now(),
                username: guestName,
                role: 'guest',
                gender: gender,
                isGuest: true
            };
            
            // حفظ في localStorage
            localStorage.setItem('user', JSON.stringify(guestUser));
            
            alert(`مرحباً ${guestName} (ضيف)!`);
            
            // الانتقال للشات
            window.location.href = '/chat';
        });
    }
    
    // ====== 6. عرض الشاشة الرئيسية ======
    showScreen('start');
});
