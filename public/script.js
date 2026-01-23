// ====== تهيئة التطبيق ======
document.addEventListener('DOMContentLoaded', function() {
  // تهيئة العناصر
  initializeElements();
  
  // تهيئة المستخدمين المحفوظين
  initializeStoredUsers();
  
  // بدء التأثيرات
  startBackgroundEffects();
  
  // التحقق من الجلسة النشطة
  checkActiveSession();
});

// ====== المتغيرات العالمية ======
let currentForm = 'member';
let formData = {
  member: {},
  register: {},
  guest: {}
};

let checkingUsername = false;

// ====== العناصر ======
const elements = {
  // خيارات الدخول
  memberLoginOption: document.getElementById('memberLoginOption'),
  registerOption: document.getElementById('registerOption'),
  guestOption: document.getElementById('guestOption'),
  
  // النماذج
  memberForm: document.getElementById('memberForm'),
  registerForm: document.getElementById('registerForm'),
  guestForm: document.getElementById('guestForm'),
  
  // أزرار التنقل
  backToOptionsBtn: document.getElementById('backToOptionsBtn'),
  
  // حقول النماذج
  memberUsername: document.getElementById('memberUsername'),
  memberPassword: document.getElementById('memberPassword'),
  
  registerUsername: document.getElementById('registerUsername'),
  registerPassword: document.getElementById('registerPassword'),
  registerConfirmPassword: document.getElementById('registerConfirmPassword'),
  registerGender: document.querySelectorAll('input[name="registerGender"]'),
  registerAge: document.getElementById('registerAge'),
  
  guestUsername: document.getElementById('guestUsername'),
  guestGender: document.querySelectorAll('input[name="guestGender"]'),
  guestAge: document.getElementById('guestAge'),
  
  // أزرار التحقق
  checkRegisterUsernameBtn: document.getElementById('checkRegisterUsernameBtn'),
  checkGuestUsernameBtn: document.getElementById('checkGuestUsernameBtn'),
  
  // رسائل التحقق
  registerUsernameValidation: document.getElementById('registerUsernameValidation'),
  guestUsernameValidation: document.getElementById('guestUsernameValidation'),
  registerPasswordValidation: document.getElementById('registerPasswordValidation'),
  registerAgeValidation: document.getElementById('registerAgeValidation'),
  guestAgeValidation: document.getElementById('guestAgeValidation'),
  
  // أزرار الدخول
  memberLoginBtn: document.getElementById('memberLoginBtn'),
  registerBtn: document.getElementById('registerBtn'),
  guestLoginBtn: document.getElementById('guestLoginBtn'),
  
  // أرقام تسلسلية
  registerSerial: document.getElementById('registerSerial'),
  guestSerial: document.getElementById('guestSerial'),
  
  // تأثيرات
  particleEffect: document.getElementById('particleEffect'),
  
  // التنبيهات
  notificationsContainer: document.getElementById('notificationsContainer')
};

// ====== تهيئة العناصر ======
function initializeElements() {
  // أحداث خيارات الدخول
  elements.memberLoginOption.addEventListener('click', () => switchForm('member'));
  elements.registerOption.addEventListener('click', () => switchForm('register'));
  elements.guestOption.addEventListener('click', () => switchForm('guest'));
  
  // زر العودة
  elements.backToOptionsBtn.addEventListener('click', showOptions);
  
  // أحداث التحقق من الحقول
  setupValidationEvents();
  
  // أحداث أزرار التحقق
  elements.checkRegisterUsernameBtn.addEventListener('click', () => checkUsername('register'));
  elements.checkGuestUsernameBtn.addEventListener('click', () => checkUsername('guest'));
  
  // أحداث أزرار الدخول
  elements.memberLoginBtn.addEventListener('click', handleMemberLogin);
  elements.registerBtn.addEventListener('click', handleRegister);
  elements.guestLoginBtn.addEventListener('click', handleGuestLogin);
  
  // أحداث Enter
  setupEnterEvents();
  
  // إنشاء أرقام تسلسلية
  generateSerials();
}

// ====== تهيئة المستخدمين المحفوظين ======
function initializeStoredUsers() {
  // عرض آخر 3 حسابات مسجلة
  const storedUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
  
  if (storedUsers.length > 0) {
    const recentUsersList = document.getElementById('recentUsersList');
    if (recentUsersList) {
      recentUsersList.innerHTML = storedUsers
        .slice(-3)
        .map(user => `
          <div class="recent-user" onclick="fillMemberForm('${user.username}')">
            <div class="user-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
              <div class="username">${user.username}</div>
              <div class="role">${user.role}</div>
            </div>
          </div>
        `)
        .join('');
    }
  }
}

// ====== تبديل النماذج ======
function switchForm(formType) {
  currentForm = formType;
  
  // تحديث خيارات الدخول
  document.querySelectorAll('.option-card').forEach(card => {
    card.classList.remove('active');
  });
  
  const activeOption = {
    'member': elements.memberLoginOption,
    'register': elements.registerOption,
    'guest': elements.guestOption
  }[formType];
  
  if (activeOption) {
    activeOption.classList.add('active');
  }
  
  // إخفاء جميع النماذج
  elements.memberForm.classList.remove('active');
  elements.registerForm.classList.remove('active');
  elements.guestForm.classList.remove('active');
  
  // إظهار النموذج المحدد
  const activeForm = {
    'member': elements.memberForm,
    'register': elements.registerForm,
    'guest': elements.guestForm
  }[formType];
  
  if (activeForm) {
    activeForm.classList.add('active');
  }
  
  // إظهار زر العودة
  elements.backToOptionsBtn.classList.remove('hidden');
  
  // إضافة تأثير
  addFormSwitchEffect();
}

// ====== إظهار خيارات الدخول ======
function showOptions() {
  // إخفاء جميع النماذج
  elements.memberForm.classList.remove('active');
  elements.registerForm.classList.remove('active');
  elements.guestForm.classList.remove('active');
  
  // إخفاء زر العودة
  elements.backToOptionsBtn.classList.add('hidden');
  
  // إزالة النشاط من الخيارات
  document.querySelectorAll('.option-card').forEach(card => {
    card.classList.remove('active');
  });
  
  // إضافة تأثير
  addParticles();
}

// ====== إعداد أحداث التحقق ======
function setupValidationEvents() {
  // التحقق من اسم المستخدم أثناء الكتابة
  elements.registerUsername.addEventListener('input', () => {
    validateUsername(elements.registerUsername, elements.registerUsernameValidation, 'register');
  });
  
  elements.guestUsername.addEventListener('input', () => {
    validateUsername(elements.guestUsername, elements.guestUsernameValidation, 'guest');
  });
  
  // التحقق من كلمة المرور
  elements.registerPassword.addEventListener('input', () => {
    validatePassword(elements.registerPassword, elements.registerPasswordValidation);
  });
  
  elements.registerConfirmPassword.addEventListener('input', () => {
    validatePasswordConfirmation();
  });
  
  // التحقق من العمر
  elements.registerAge.addEventListener('input', () => {
    validateAge(elements.registerAge, elements.registerAgeValidation);
  });
  
  elements.guestAge.addEventListener('input', () => {
    validateAge(elements.guestAge, elements.guestAgeValidation);
  });
}

// ====== التحقق من البيانات ======
function validateUsername(input, validationElement, formType) {
  const username = input.value.trim();
  const minLength = 3;
  const maxLength = 14;
  
  if (!username) {
    updateValidation(validationElement, 'يرجى إدخال اسم المستخدم', false);
    return false;
  }
  
  if (username.length < minLength) {
    updateValidation(validationElement, `يجب أن يكون الاسم ${minLength} أحرف على الأقل`, false);
    return false;
  }
  
  if (username.length > maxLength) {
    updateValidation(validationElement, `يجب ألا يزيد الاسم عن ${maxLength} حرف`, false);
    return false;
  }
  
  if (!/^[a-zA-Z\u0600-\u06FF0-9_\s]+$/.test(username)) {
    updateValidation(validationElement, 'يسمح بالأحرف العربية، الإنجليزية، الأرقام والمسافات فقط', false);
    return false;
  }
  
  // التحقق من الأسماء المحجوزة
  const reservedNames = ['محمد', 'admin', 'administrator', 'owner', 'moderator', 'system'];
  if (reservedNames.includes(username.toLowerCase())) {
    updateValidation(validationElement, 'اسم المستخدم محجوز', false);
    return false;
  }
  
  // حفظ البيانات مؤقتاً
  formData[formType].username = username;
  updateValidation(validationElement, 'الاسم صالح', true);
  return true;
}

function validatePassword(input, validationElement) {
  const password = input.value;
  const minLength = 3;
  const maxLength = 14;
  
  if (!password) {
    updateValidation(validationElement, 'يرجى إدخال كلمة المرور', false);
    return false;
  }
  
  if (password.length < minLength) {
    updateValidation(validationElement, `يجب أن تكون كلمة المرور ${minLength} أحرف على الأقل`, false);
    return false;
  }
  
  if (password.length > maxLength) {
    updateValidation(validationElement, `يجب ألا تزيد كلمة المرور عن ${maxLength} حرف`, false);
    return false;
  }
  
  if (password.toLowerCase() === formData.register.username?.toLowerCase()) {
    updateValidation(validationElement, 'كلمة المرور لا يجب أن تكون مثل اسم المستخدم', false);
    return false;
  }
  
  updateValidation(validationElement, 'كلمة المرور صالحة', true);
  return true;
}

function validatePasswordConfirmation() {
  const password = elements.registerPassword.value;
  const confirmPassword = elements.registerConfirmPassword.value;
  
  if (!confirmPassword) {
    return false;
  }
  
  if (password !== confirmPassword) {
    return false;
  }
  
  return true;
}

function validateAge(input, validationElement) {
  const age = parseInt(input.value);
  
  if (!input.value) {
    updateValidation(validationElement, 'يرجى إدخال العمر', false);
    return false;
  }
  
  if (isNaN(age) || age < 1 || age > 99) {
    updateValidation(validationElement, 'يجب أن يكون العمر بين 1 و 99', false);
    return false;
  }
  
  updateValidation(validationElement, 'العمر صالح', true);
  return true;
}

function validateGender(genderInputs) {
  const selectedGender = Array.from(genderInputs).find(input => input.checked);
  return !!selectedGender;
}

function updateValidation(element, message, isValid) {
  if (!element) return;
  
  element.textContent = message;
  element.className = 'validation-message ' + (isValid ? 'success' : 'error');
  element.innerHTML = `<i class="fas fa-${isValid ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
  
  // تحديث حالة الحقل
  const input = element.previousElementSibling?.querySelector('input, select');
  if (input) {
    if (isValid) {
      input.classList.remove('error');
    } else {
      input.classList.add('error');
    }
  }
}

// ====== التحقق من اسم المستخدم من السيرفر ======
async function checkUsername(formType) {
  const usernameInput = formType === 'register' ? elements.registerUsername : elements.guestUsername;
  const validationElement = formType === 'register' ? elements.registerUsernameValidation : elements.guestUsernameValidation;
  const checkButton = formType === 'register' ? elements.checkRegisterUsernameBtn : elements.checkGuestUsernameBtn;
  
  const username = usernameInput.value.trim();
  
  if (!validateUsername(usernameInput, validationElement, formType)) {
    return;
  }
  
  if (checkingUsername) return;
  checkingUsername = true;
  
  try {
    // تغيير حالة الزر
    checkButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    checkButton.disabled = true;
    
    // محاكاة اتصال بالسيرفر
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // التحقق من التكرار محلياً
    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    const exists = storedUsers[username?.toLowerCase()];
    
    if (exists) {
      updateValidation(validationElement, 'اسم المستخدم محجوز', false);
      addShakeEffect(usernameInput);
    } else {
      updateValidation(validationElement, 'اسم المستخدم متاح ✓', true);
      addSuccessEffect(usernameInput);
    }
    
  } catch (error) {
    console.error('خطأ في التحقق:', error);
    updateValidation(validationElement, 'خطأ في التحقق، حاول لاحقاً', false);
  } finally {
    checkingUsername = false;
    checkButton.innerHTML = '<i class="fas fa-check"></i> تحقق';
    checkButton.disabled = false;
  }
}

// ====== معالجة تسجيل الدخول للأعضاء ======
async function handleMemberLogin() {
  const username = elements.memberUsername.value.trim();
  const password = elements.memberPassword.value;
  
  // التحقق الأساسي
  if (!username || !password) {
    showNotification('يرجى ملء جميع الحقول', 'error');
    addShakeEffect(elements.memberLoginBtn);
    return;
  }
  
  try {
    // عرض التحميل
    elements.memberLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';
    elements.memberLoginBtn.disabled = true;
    
    // تسجيل دخول خاص للمالك (سر بيننا)
    if (username === 'محمد' && password === 'aumsalah079') {
      // إظهار تأثير المالك
      showOwnerEffect();
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // حفظ بيانات المستخدم
      const userData = {
        username: 'محمد',
        role: 'مالك',
        serial: 1,
        token: 'owner-token-' + Date.now(),
        gender: 'ذكر',
        age: 25,
        country: 'السعودية',
        gold: 999999,
        points: 0,
        nameColor: '#FFD700',
        profileBg: 'gold_bg.jpg',
        profileGlow: true,
        frameAnimation: 'gold_frame.gif',
        joinDate: new Date().toISOString()
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userToken', userData.token);
      
      // إضافة للمستخدمين الأخيرة
      addToRecentUsers(userData);
      
      // الانتقال للشات
window.location.href = '/chat';
      return;
    }
    
    // محاكاة الاتصال بالسيرفر
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // التحقق من المستخدمين المخزنين محلياً
    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    const user = storedUsers[username.toLowerCase()];
    
    if (!user) {
      showNotification('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
      addShakeEffect(elements.memberLoginBtn);
      return;
    }
    
    // التحقق من كلمة المرور
    const validPassword = await bcryptCompare(password, user.password);
    if (!validPassword) {
      showNotification('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
      addShakeEffect(elements.memberLoginBtn);
      return;
    }
    
    // تحديث آخر دخول
    user.lastSeen = new Date().toISOString();
    storedUsers[username.toLowerCase()] = user;
    localStorage.setItem('users', JSON.stringify(storedUsers));
    
    // توليد توكن
    const token = generateToken(user);
    
    // حفظ بيانات المستخدم
    const userData = {
      username: user.username,
      role: user.role,
      serial: user.serial,
      token: token,
      gender: user.gender,
      age: user.age,
      country: user.country,
      gold: user.gold || 0,
      points: user.points || 0,
      nameColor: user.nameColor || '#000000',
      profileBg: user.profileBg || null,
      profileGlow: user.profileGlow || false,
      frameAnimation: user.frameAnimation || null,
      joinDate: user.joinDate
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('userToken', token);
    
    // إضافة للمستخدمين الأخيرة
    addToRecentUsers(userData);
    
    // إظهار تأثير الدخول حسب الرتبة
    showLoginEffect(user.role);
    
    // الانتقال للشات بعد التأثير
    setTimeout(() => {
      window.location.href = 'chat.html';
    }, 1200);
    
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    showNotification('حدث خطأ أثناء تسجيل الدخول', 'error');
  } finally {
    elements.memberLoginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
    elements.memberLoginBtn.disabled = false;
  }
}

// ====== معالجة إنشاء حساب جديد ======
async function handleRegister() {
  // التحقق من جميع الحقول
  const usernameValid = validateUsername(elements.registerUsername, elements.registerUsernameValidation, 'register');
  const passwordValid = validatePassword(elements.registerPassword, elements.registerPasswordValidation);
  const passwordMatch = validatePasswordConfirmation();
  const ageValid = validateAge(elements.registerAge, elements.registerAgeValidation);
  const genderValid = validateGender(elements.registerGender);
  
  if (!usernameValid || !passwordValid || !passwordMatch || !ageValid || !genderValid) {
    showNotification('يرجى تصحيح الأخطاء في النموذج', 'error');
    
    // هز الحقول غير الصالحة
    if (!usernameValid) addShakeEffect(elements.registerUsername);
    if (!passwordValid) addShakeEffect(elements.registerPassword);
    if (!passwordMatch) addShakeEffect(elements.registerConfirmPassword);
    if (!ageValid) addShakeEffect(elements.registerAge);
    
    return;
  }
  
  const username = elements.registerUsername.value.trim();
  const password = elements.registerPassword.value;
  const age = parseInt(elements.registerAge.value);
  const gender = Array.from(elements.registerGender).find(input => input.checked).value;
  const serial = parseInt(elements.registerSerial.textContent);
  
  try {
    // عرض التحميل
    elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
    elements.registerBtn.disabled = true;
    
    // محاكاة اتصال بالسيرفر
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // التحقق من عدم التكرار
    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    if (storedUsers[username.toLowerCase()]) {
      showNotification('اسم المستخدم محجوز بالفعل', 'error');
      addShakeEffect(elements.registerUsername);
      return;
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await bcryptHash(password);
    
    // إنشاء بيانات المستخدم
    const user = {
      username: username,
      password: hashedPassword,
      role: 'عضو',
      serial: serial,
      gender: gender,
      age: age,
      country: 'غير محدد',
      joinDate: new Date().toISOString(),
      gold: 0,
      points: 0,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3B82F6&color=fff`,
      nameColor: '#000000',
      profileBg: null,
      profileGlow: false,
      frameAnimation: null,
      lastSeen: new Date().toISOString(),
      likesReceived: 0,
      likesGiven: [],
      goldReceived: 0,
      goldSent: 0
    };
    
    // حفظ المستخدم
    storedUsers[username.toLowerCase()] = user;
    localStorage.setItem('users', JSON.stringify(storedUsers));
    
    // توليد توكن
    const token = generateToken(user);
    
    // حفظ بيانات المستخدم الحالي
    const userData = {
      username: user.username,
      role: user.role,
      serial: user.serial,
      token: token,
      gender: user.gender,
      age: user.age,
      country: user.country,
      gold: user.gold,
      points: user.points,
      nameColor: user.nameColor,
      profileBg: user.profileBg,
      profileGlow: user.profileGlow,
      frameAnimation: user.frameAnimation,
      joinDate: user.joinDate
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('userToken', token);
    
    // إضافة للمستخدمين الأخيرة
    addToRecentUsers(userData);
    
    // إظهار رسالة النجاح
    showNotification('تم إنشاء حسابك بنجاح! يتم تسجيل دخولك تلقائياً', 'success');
    
    // إظهار تأثير الدخول
    showLoginEffect('عضو');
    
   // الانتقال للشات
setTimeout(() => {
  window.location.href = '/chat';
}, 1500);
    
  } catch (error) {
    console.error('خطأ في إنشاء الحساب:', error);
    showNotification('حدث خطأ أثناء إنشاء الحساب', 'error');
  } finally {
    elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب';
    elements.registerBtn.disabled = false;
  }
}

// ====== معالجة تسجيل الزائر ======
async function handleGuestLogin() {
  // التحقق من الحقول
  const usernameValid = validateUsername(elements.guestUsername, elements.guestUsernameValidation, 'guest');
  const ageValid = validateAge(elements.guestAge, elements.guestAgeValidation);
  const genderValid = validateGender(elements.guestGender);
  
  if (!usernameValid || !ageValid || !genderValid) {
    showNotification('يرجى تصحيح الأخطاء في النموذج', 'error');
    
    if (!usernameValid) addShakeEffect(elements.guestUsername);
    if (!ageValid) addShakeEffect(elements.guestAge);
    
    return;
  }
  
  const username = elements.guestUsername.value.trim();
  const age = parseInt(elements.guestAge.value);
  const gender = Array.from(elements.guestGender).find(input => input.checked).value;
  const serial = parseInt(elements.guestSerial.textContent);
  
  try {
    // عرض التحميل
    elements.guestLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';
    elements.guestLoginBtn.disabled = true;
    
    // محاكاة اتصال بالسيرفر
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // التحقق من عدم التكرار
    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    if (storedUsers[username.toLowerCase()]) {
      showNotification('اسم المستخدم محجوز بالفعل', 'error');
      addShakeEffect(elements.guestUsername);
      return;
    }
    
    // إنشاء بيانات الزائر
    const guestUser = {
      username: username,
      password: null,
      role: 'ضيف',
      serial: serial,
      gender: gender,
      age: age,
      country: 'غير محدد',
      joinDate: new Date().toISOString(),
      gold: 0,
      points: 0,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6B7280&color=fff`,
      nameColor: '#6B7280',
      profileBg: null,
      profileGlow: false,
      frameAnimation: null,
      lastSeen: new Date().toISOString(),
      likesReceived: 0,
      likesGiven: [],
      goldReceived: 0,
      goldSent: 0
    };
    
    // حفظ الزائر
    storedUsers[username.toLowerCase()] = guestUser;
    localStorage.setItem('users', JSON.stringify(storedUsers));
    
    // توليد توكن
    const token = generateToken(guestUser);
    
    // حفظ بيانات المستخدم الحالي
    const userData = {
      username: guestUser.username,
      role: guestUser.role,
      serial: guestUser.serial,
      token: token,
      gender: guestUser.gender,
      age: guestUser.age,
      country: guestUser.country,
      gold: guestUser.gold,
      points: guestUser.points,
      nameColor: guestUser.nameColor,
      profileBg: guestUser.profileBg,
      profileGlow: guestUser.profileGlow,
      frameAnimation: guestUser.frameAnimation,
      joinDate: guestUser.joinDate
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('userToken', token);
    
    // إضافة للمستخدمين الأخيرة
    addToRecentUsers(userData);
    
    // إظهار رسالة النجاح
    showNotification('تم تسجيل دخولك كزائر', 'success');
    
   // الانتقال للشات
setTimeout(() => {
  window.location.href = '/chat';
}, 1000);
    
  } catch (error) {
    console.error('خطأ في تسجيل الزائر:', error);
    showNotification('حدث خطأ أثناء تسجيل الدخول', 'error');
  } finally {
    elements.guestLoginBtn.innerHTML = '<i class="fas fa-user-clock"></i> دخول كزائر';
    elements.guestLoginBtn.disabled = false;
  }
}

// ====== توليد الأرقام التسلسلية ======
function generateSerials() {
  // الحصول على آخر رقم تسلسلي
  const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
  const maxSerial = Object.values(storedUsers).reduce((max, user) => {
    return Math.max(max, user.serial || 0);
  }, 1);
  
  // تعيين الأرقام الجديدة
  elements.registerSerial.textContent = maxSerial + 1;
  elements.guestSerial.textContent = maxSerial + 2;
}

// ====== وظائف المساعدة ======

// توليد توكن
function generateToken(user) {
  return 'token-' + Date.now() + '-' + Math.random().toString(36).substr(2);
}

// تشفير كلمة المرور
async function bcryptHash(password) {
  // محاكاة تشفير بسيطة للعرض
  return 'hashed_' + btoa(password);
}

async function bcryptCompare(password, hashedPassword) {
  // محاكاة مقارنة بسيطة للعرض
  return hashedPassword === 'hashed_' + btoa(password);
}

// إضافة المستخدم للأخيرة
function addToRecentUsers(userData) {
  const recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
  
  // إزالة إذا كان موجوداً
  const index = recentUsers.findIndex(u => u.username === userData.username);
  if (index > -1) {
    recentUsers.splice(index, 1);
  }
  
  // إضافة في البداية
  recentUsers.unshift({
    username: userData.username,
    role: userData.role,
    serial: userData.serial
  });
  
  // الاحتفاظ بآخر 5 فقط
  if (recentUsers.length > 5) {
    recentUsers.pop();
  }
  
  localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
}

// ====== التأثيرات ======

// إظهار تأثير المالك
function showOwnerEffect() {
  const effect = document.createElement('div');
  effect.className = 'owner-enter';
  document.body.appendChild(effect);
  
  // إضافة جزيئات ذهب
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      addGoldParticle();
    }, i * 30);
  }
  
  // إزالة التأثير بعد الانتهاء
  setTimeout(() => {
    effect.remove();
  }, 2000);
}

// إظهار تأثير الدخول حسب الرتبة
function showLoginEffect(role) {
  const effectClass = {
    'مالك': 'owner-enter',
    'اونر': 'honor-enter',
    'ادمن': 'admin-enter',
    'عضو مميز': 'vip-enter',
    'عضو': '',
    'ضيف': ''
  }[role];
  
  if (effectClass) {
    const effect = document.createElement('div');
    effect.className = effectClass;
    document.body.appendChild(effect);
    
    setTimeout(() => {
      effect.remove();
    }, 1500);
  }
}

// إضافة جزيئات ذهب
function addGoldParticle() {
  const coin = document.createElement('div');
  coin.className = 'coin';
  
  const size = Math.random() * 15 + 10;
  const left = Math.random() * 100;
  const duration = Math.random() * 1 + 0.5;
  
  coin.style.width = `${size}px`;
  coin.style.height = `${size}px`;
  coin.style.left = `${left}vw`;
  coin.style.animationDuration = `${duration}s`;
  
  elements.particleEffect.appendChild(coin);
  
  setTimeout(() => {
    coin.remove();
  }, duration * 1000);
}

// إضافة تأثير تبديل النموذج
function addFormSwitchEffect() {
  const form = document.querySelector('.auth-form.active');
  if (form) {
    form.classList.add('fade-in');
    setTimeout(() => {
      form.classList.remove('fade-in');
    }, 300);
  }
}

// إضافة جزيئات خلفية
function addParticles() {
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        background: ${i % 3 === 0 ? 'var(--primary-color)' : i % 3 === 1 ? 'var(--secondary-color)' : 'var(--success-color)'};
        border-radius: 50%;
        left: ${Math.random() * 100}vw;
        top: ${Math.random() * 100}vh;
        opacity: ${Math.random() * 0.5 + 0.2};
        animation: float ${Math.random() * 3 + 2}s ease-in-out infinite;
      `;
      
      elements.particleEffect.appendChild(particle);
      
      // إزالة بعد الأنيميشن
      setTimeout(() => {
        particle.remove();
      }, 5000);
    }, i * 100);
  }
}

// بدء تأثيرات الخلفية
function startBackgroundEffects() {
  // أنيميشن للجزيئات
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0) translateX(0); }
      50% { transform: translateY(-20px) translateX(10px); }
    }
    
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
  
  // إضافة جزيئات بشكل دوري
  addParticles();
  setInterval(addParticles, 5000);
  
  // تأثير نبض للشعار
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.classList.add('logo-animation');
  }
}

// تأثير الهز
function addShakeEffect(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

// تأثير النجاح
function addSuccessEffect(element) {
  element.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
  setTimeout(() => {
    element.style.boxShadow = '';
  }, 1000);
}

// ====== التنبيهات ======
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icon = {
    'success': 'check-circle',
    'error': 'exclamation-circle',
    'warning': 'exclamation-triangle',
    'info': 'info-circle'
  }[type];
  
  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <div class="content">
      <p>${message}</p>
    </div>
    <button class="close"><i class="fas fa-times"></i></button>
  `;
  
  elements.notificationsContainer.appendChild(notification);
  
  // حدث الإغلاق
  notification.querySelector('.close').addEventListener('click', () => {
    notification.remove();
  });
  
  // إزالة تلقائية بعد 5 ثواني
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// ====== ملء نموذج العضو ======
function fillMemberForm(username) {
  elements.memberUsername.value = username;
  elements.memberPassword.focus();
  switchForm('member');
}

// ====== إعداد أحداث Enter ======
function setupEnterEvents() {
  // دخول الأعضاء
  elements.memberPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleMemberLogin();
    }
  });
  
  // تسجيل حساب جديد
  elements.registerConfirmPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  });
  
  // تسجيل زائر
  elements.guestAge.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleGuestLogin();
    }
  });
}

// ====== التحقق من الجلسة النشطة ======
function checkActiveSession() {
  const currentUser = localStorage.getItem('currentUser');
  const token = localStorage.getItem('userToken');
  
  if (currentUser && token) {
    // عرض خيار متابعة الجلسة
    showSessionNotification(JSON.parse(currentUser));
  }
}

function showSessionNotification(user) {
  const notification = document.createElement('div');
  notification.className = 'notification info';
  notification.innerHTML = `
    <i class="fas fa-user-check"></i>
    <div class="content">
      <h4>مرحباً بعودتك!</h4>
      <p>${user.username} - الرتبة: ${user.role}</p>
    </div>
    <div class="actions">
      <button class="btn-small" id="continueSessionBtn">متابعة</button>
      <button class="btn-small btn-ghost" id="logoutBtn">تسجيل خروج</button>
    </div>
  `;
  
  elements.notificationsContainer.appendChild(notification);
  
  // أحداث الأزرار
  notification.querySelector('#continueSessionBtn').addEventListener('click', () => {
    window.location.href = '/chat';
  });
  
  notification.querySelector('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userToken');
    notification.remove();
    showNotification('تم تسجيل الخروج', 'success');
  });
  
  // إزالة بعد 10 ثواني
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

// ====== الأزرار المساعدة ======
function clearForm(formType) {
  switch(formType) {
    case 'member':
      elements.memberUsername.value = '';
      elements.memberPassword.value = '';
      break;
    case 'register':
      elements.registerUsername.value = '';
      elements.registerPassword.value = '';
      elements.registerConfirmPassword.value = '';
      elements.registerAge.value = '';
      elements.registerGender.forEach(input => input.checked = false);
      elements.registerUsernameValidation.textContent = '';
      elements.registerPasswordValidation.textContent = '';
      elements.registerAgeValidation.textContent = '';
      break;
    case 'guest':
      elements.guestUsername.value = '';
      elements.guestAge.value = '';
      elements.guestGender.forEach(input => input.checked = false);
      elements.guestUsernameValidation.textContent = '';
      elements.guestAgeValidation.textContent = '';
      break;
  }
}

// ====== الأنيميشن للصفحة ======
// تنشيط الأنيميشن عند تحميل الصفحة
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  
  // إضافة تأثير ظهور تدريجي
  const elementsToAnimate = document.querySelectorAll('.welcome-card, .option-card');
  elementsToAnimate.forEach((el, index) => {
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 10);
    }, index * 100);
  });
});

// ====== وظائف عامة ======
window.switchForm = switchForm;
window.checkUsername = checkUsername;
window.fillMemberForm = fillMemberForm;
window.clearForm = clearForm;
