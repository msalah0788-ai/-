// ====== 1. دالة لتبديل الشاشات ======
function showScreen(screenName) {
    console.log('🔄 جرب فتح: ' + screenName);
    
    // نخفي كل الشاشات
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // نظهر الشاشة المطلوبة
    const targetScreen = document.getElementById(screenName + 'Screen');
    if (targetScreen) {
        targetScreen.style.display = 'block';
        console.log('✅ تم فتح: ' + screenName);
    }
}

// ====== 2. لما تحمل الصفحة ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 الصفحة حملت!');
    
    // نجعل الشاشة الرئيسية تظهر
    showScreen('start');
    
    // ====== 3. نربط الأزرار ======
    
    // زر "دخول الأعضاء"
    const loginBtn = document.querySelector('[onclick*="showLogin"]');
    if (loginBtn) {
        loginBtn.onclick = function() {
            console.log('👤 تم النقر: دخول الأعضاء');
            showScreen('login');
            return false;
        };
    }
    
    // زر "تسجيل حساب جديد"
    const registerBtn = document.querySelector('[onclick*="showRegister"]');
    if (registerBtn) {
        registerBtn.onclick = function() {
            console.log('📝 تم النقر: تسجيل حساب جديد');
            showScreen('register');
            return false;
        };
    }
    
    // زر "الدخول كضيف"
    const guestBtn = document.querySelector('[onclick*="showGuestLogin"]');
    if (guestBtn) {
        guestBtn.onclick = function() {
            console.log('👥 تم النقر: الدخول كضيف');
            showScreen('guest');
            return false;
        };
    }
    
    // ====== 4. أزرار الرجوع ======
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            console.log('↩️ تم النقر: رجوع');
            showScreen('start');
        };
    });
    
    // ====== 5. رسالة تأكيد ======
    setTimeout(() => {
        console.log('✅ كل شيء جاهز! جرب تضغط');
    }, 1000);
});

// ====== 6. دوال عامة (للأزرار القديمة) ======
function showStartScreen() { showScreen('start'); }
function showLogin() { showScreen('login'); }
function showRegister() { showScreen('register'); }
function showGuestLogin() { showScreen('guest'); }
