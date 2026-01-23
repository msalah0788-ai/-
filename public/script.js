document.addEventListener('DOMContentLoaded', function() {
    // عناصر DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const guestBtn = document.getElementById('guestBtn');
    const checkUsernameBtn = document.getElementById('checkUsernameBtn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const usernameStatus = document.getElementById('usernameStatus');
    const registerUsername = document.getElementById('registerUsername');
    
    // تبديل بين تبويبات التسجيل/الدخول
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // تحديث التبويبات النشطة
            authTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // إظهار النموذج المناسب
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });
            
            document.getElementById(`${tabName}Form`).classList.add('active');
        });
    });
    
    // التحقق من اسم المستخدم
    checkUsernameBtn.addEventListener('click', async function() {
        const username = registerUsername.value.trim();
        
        if (!username) {
            usernameStatus.textContent = 'يرجى إدخال اسم المستخدم';
            usernameStatus.style.color = '#EF4444';
            return;
        }
        
        if (username.length < 3) {
            usernameStatus.textContent = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
            usernameStatus.style.color = '#EF4444';
            return;
        }
        
        try {
            checkUsernameBtn.disabled = true;
            checkUsernameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // في تطبيق حقيقي، هنا نرسل طلب للخادم للتحقق
            // لمثالنا، سنستخدم تحقق بسيط
            const reservedUsernames = ['admin', 'owner', 'moderator', 'زائر', 'مدير'];
            
            // محاكاة تأخير الشبكة
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (reservedUsernames.includes(username.toLowerCase())) {
                usernameStatus.textContent = 'اسم المستخدم محجوز';
                usernameStatus.style.color = '#EF4444';
            } else {
                usernameStatus.textContent = 'اسم المستخدم متاح';
                usernameStatus.style.color = '#10B981';
            }
        } catch (error) {
            usernameStatus.textContent = 'خطأ في التحقق';
            usernameStatus.style.color = '#EF4444';
        } finally {
            checkUsernameBtn.disabled = false;
            checkUsernameBtn.textContent = 'تحقق';
        }
    });
    
    // تسجيل الدخول
    loginBtn.addEventListener('click', async function() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            alert('يرجى ملء جميع الحقول');
            return;
        }
        
        try {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';
            
            // محاكاة تسجيل الدخول
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // في تطبيق حقيقي، هنا نرسل طلب للخادم
            // للتبسيط، سننتقل مباشرة للشات
            localStorage.setItem('chatUsername', username);
            localStorage.setItem('chatRole', 'member');
            localStorage.setItem('chatColor', '#000000');
            localStorage.setItem('chatFont', 'Cairo');
            localStorage.setItem('chatFontSize', 'medium');
            
            // الانتقال لصفحة الشات
            window.location.href = 'chat.html';
            
        } catch (error) {
            alert('خطأ في تسجيل الدخول: ' + error.message);
            loginBtn.disabled = false;
            loginBtn.textContent = 'دخول';
        }
    });
    
    // إنشاء حساب
    registerBtn.addEventListener('click', async function() {
        const username = registerUsername.value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!username || !password || !confirmPassword) {
            alert('يرجى ملء جميع الحقول');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('كلمات المرور غير متطابقة');
            return;
        }
        
        if (password.length < 6) {
            alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        
        try {
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
            
            // محاكاة إنشاء حساب
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // في تطبيق حقيقي، هنا نرسل طلب للخادم
            localStorage.setItem('chatUsername', username);
            localStorage.setItem('chatRole', 'member');
            localStorage.setItem('chatColor', '#3B82F6'); // لون افتراضي
            localStorage.setItem('chatFont', 'Cairo');
            localStorage.setItem('chatFontSize', 'medium');
            localStorage.setItem('chatToken', 'mock-token-' + Date.now());
            
            // إظهار رسالة نجاح
            alert('تم إنشاء حسابك بنجاح! يتم تسجيل دخولك تلقائياً.');
            
            // الانتقال لصفحة الشات
            window.location.href = 'chat.html';
            
        } catch (error) {
            alert('خطأ في إنشاء الحساب: ' + error.message);
            registerBtn.disabled = false;
            registerBtn.textContent = 'إنشاء حساب';
        }
    });
    
    // الدخول كزائر
    guestBtn.addEventListener('click', function() {
        localStorage.setItem('chatUsername', 'زائر' + Math.floor(Math.random() * 1000));
        localStorage.setItem('chatRole', 'visitor');
        localStorage.setItem('chatColor', '#6B7280');
        localStorage.setItem('chatFont', 'Arial');
        localStorage.setItem('chatFontSize', 'medium');
        
        // الانتقال لصفحة الشات
        window.location.href = 'chat.html';
    });
    
    // معاينة أسماء المستخدمين المدخلة
    registerUsername.addEventListener('input', function() {
        if (this.value.trim()) {
            usernameStatus.textContent = '';
        }
    });
    
    // السماح بالضغط على Enter في حقول الإدخال
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (this.id === 'loginUsername' || this.id === 'loginPassword') {
                    loginBtn.click();
                } else if (this.id === 'registerUsername') {
                    document.getElementById('registerPassword').focus();
                } else if (this.id === 'registerPassword') {
                    document.getElementById('confirmPassword').focus();
                } else if (this.id === 'confirmPassword') {
                    registerBtn.click();
                }
            }
        });
    });
    
    // إضافة تأثيرات بصرية
    const features = document.querySelectorAll('.feature');
    features.forEach((feature, index) => {
        feature.style.animationDelay = `${index * 0.1}s`;
    });
});
