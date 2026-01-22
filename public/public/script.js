// ملف JavaScript منفصل للدوال المساعدة

// ========== دوال مساعدة عامة ==========
function formatTime(date) {
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(date) {
    return date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== إدارة الصوت ==========
class AudioManager {
    constructor() {
        this.sounds = {
            message: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3'),
            notification: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'),
            voice: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-game-emergency-alarm-1000.mp3'),
            join: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3'),
            leave: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-game-over-470.mp3')
        };
        
        this.enabled = true;
        this.volume = 0.5;
        
        // ضبط الصوت
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }
    
    play(type) {
        if (!this.enabled || !this.sounds[type]) return;
        
        try {
            this.sounds[type].currentTime = 0;
            this.sounds[type].play().catch(e => console.log('خطأ في الصوت:', e));
        } catch (error) {
            console.error('خطأ في تشغيل الصوت:', error);
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }
}

// ========== إدارة التخزين المحلي ==========
class StorageManager {
    constructor() {
        this.key = 'arabic_chat_data';
    }
    
    saveUser(user) {
        const data = {
            user: user,
            timestamp: Date.now()
        };
        localStorage.setItem(this.key, JSON.stringify(data));
    }
    
    loadUser() {
        const data = JSON.parse(localStorage.getItem(this.key));
        if (data && (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000)) {
            return data.user;
        }
        return null;
    }
    
    clear() {
        localStorage.removeItem(this.key);
    }
    
    saveSettings(settings) {
        localStorage.setItem('chat_settings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('chat_settings'));
        return settings || {
            sound: true,
            notifications: true,
            theme: 'light'
        };
    }
}

// ========== إدارة الإشعارات ==========
class NotificationManager {
    constructor() {
        this.enabled = 'Notification' in window;
        this.permission = Notification.permission;
    }
    
    requestPermission() {
        if (!this.enabled) return Promise.resolve(false);
        
        return Notification.requestPermission().then(permission => {
            this.permission = permission;
            return permission === 'granted';
        });
    }
    
    show(title, options = {}) {
        if (!this.enabled || this.permission !== 'granted') return;
        
        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200]
        };
        
        new Notification(title, { ...defaultOptions, ...options });
    }
}

// تصدير الكلاسات للاستخدام
window.ChatUtils = {
    AudioManager,
    StorageManager,
    NotificationManager,
    formatTime,
    formatDate,
    escapeHTML,
    debounce
};
