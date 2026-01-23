let currentUser = null;
let selectedGender = 'ذكر';

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('error-message').classList.remove('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function selectGender(gender) {
    selectedGender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.gender-btn').classList.add('active');
}

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

    const checkResult = await checkUsername(username);
    if (checkResult.exists) {
        errorEl.textContent = 'اسم المستخدم موجود مسبقاً';
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

function enterAsGuest() {
    const username = document.getElementById('guest-username').value.trim();
    
    if (!username) {
        alert('يرجى إدخال اسم المستخدم');
        return;
    }

    currentUser = {
        username: username,
        role: 'زائر',
        gender: selectedGender,
        profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=${selectedGender === 'أنثى' ? 'FF69B4' : '1E90FF'}`,
        profileColor: selectedGender === 'أنثى' ? '#FF69B4' : '#1E90FF',
        serial: 0,
        isGuest: true
    };

    localStorage.setItem('chatUser', JSON.stringify(currentUser));
    window.location.href = 'chat.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (!user.isGuest) {
            document.getElementById('login-username').value = user.username;
        }
    }

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
