// متغيرات عامة
let currentUser = null;
let selectedGender = 'ذكر';

// فتح النوافذ
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('error-message').classList.remove('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// اختيار الجنس
function selectGender(gender) {
    selectedGender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.gender-btn').classList.add('active');
}

// تسجيل الدخول
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('error-message');

    if (!username || !password) {
        errorEl.textContent = 'يرجى ملء جميع الحقول';
        errorEl.classList.add('active');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            window.location.href = 'chat.html';
        } else {
            errorEl.textContent = data.message;
            errorEl.classList.add('active');
        }
    } catch (error) {
        errorEl.textContent = 'خطأ في الاتصال بالخادم';
        errorEl.classList.add('active');
    }
}

// التسجيل
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const age = document.getElementById('register-age').value;
    const errorEl = document.getElementById('error-message');

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

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                password, 
                gender: selectedGender, 
                age 
            })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            window.location.href = 'chat.html';
        } else {
            errorEl.textContent = data.message;
            errorEl.classList.add('active');
        }
    } catch (error) {
        errorEl.textContent = 'خطأ في الاتصال بالخادم';
        errorEl.classList.add('active');
    }
}

// دخول كضيف
function enterAsGuest() {
    const username = document.getElementById('guest-username').value.trim();
    const gender = selectedGender;
    
    if (!username) {
        alert('يرجى إدخال اسم المستخدم');
        return;
    }

    currentUser = {
        username: username,
        role: 'زائر',
        gender: gender,
        profilePic: gender === 'أنثى' ? 'default_female.png' : 'default_male.png',
        isGuest: true
    };

    localStorage.setItem('chatUser', JSON.stringify(currentUser));
    window.location.href = 'chat.html';
}

// إضافة تأثيرات عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    // تحقق من وجود مستخدم مسجل
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (!user.isGuest) {
            document.getElementById('login-username').value = user.username;
        }
    }

    // إضافة تأثيرات للبطاقات
    const cards = document.querySelectorAll('.option-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // السماح بالإدخال عن طريق Enter
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
});
