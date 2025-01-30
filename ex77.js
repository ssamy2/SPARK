const uiElements = {
    balanceDisplay: document.getElementById('balanceAmount'),
    purchaseNotification: document.getElementById('purchaseNotification'),
    copyInviteNotification: document.getElementById('copyInviteNotification'),
    clickableImg: document.getElementById('clickableImg'),
    navButtons: document.querySelectorAll('.menu button'),
    contentScreens: document.querySelectorAll('.screen-content'),
    splashScreen: document.querySelector('.splash-screen'),
    mainContainer: document.querySelector('.container'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    friendsListDisplay: document.getElementById('friendsList') || { innerHTML: '' },
    inviteFriendsBtn: document.getElementById('inviteFriendsBtn'),
    copyInviteLinkBtn: document.getElementById('copyInviteLinkBtn'),

};

// حالة اللعبة
let gameState = {
    balance: 0,
    friends: 0,
    invites: [],
    completedTasks: [],
};

//تحديث البيانت من الواجهه الي قاعده البيانات 
async function updateGameStateInDatabase(updatedData) {
    const userId = uiElements.userTelegramIdDisplay.innerText;
    // منع تحديث الرصيد بـ 0 إذا لم يكن القصد ذلك
    if (updatedData.balance === 0 && gameState.balance !== 0) {
        console.warn('Skipping update: balance is 0 but the current gameState balance is not.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .update(updatedData)
            .eq('telegram_id', userId)
            .select();

        if (error) {
            console.error('Error updating game state in Supabase:', error);
            return false;
        }

        console.log('Game state updated successfully in Supabase:', data);
        return true;
    } catch (err) {
        console.error('Unexpected error while updating game state:', err);
        return false;
    }
}


//تحديث قاعده البيانات 
async function loadGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('telegram_id, balance, username')
            .eq('telegram_id', userId)
            .single();

        if (data) {
            gameState = {
                ...gameState,
                ...data,
                balance: data.balance ?? gameState.balance, // دمج الرصيد مع البيانات الحالية
            };
            updateUI();
        }
    } catch (err) {
        console.error('Error loading game state:', err);
    }
}

let saveTimeout;
function debounceSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveGameState();
    }, 5000); // حفظ بعد 5 ثوانٍ
}


// حفظ حالة اللعبة في LocalStorage وقاعدة البيانات
async function saveGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    // إنشاء بيانات محدثة للحفظ
    const updatedData = {
        balance: gameState.balance,
    };

    try {
        // حفظ البيانات في قاعدة البيانات
        const { error } = await supabase
            .from('users')
            .update(updatedData)
            .eq('telegram_id', userId);

        if (error) {
            throw new Error(`Error saving game state: ${error.message}`);
        }

        console.log('Game state updated successfully.');
    } catch (err) {
        console.error(err.message);
    }
}


// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    const isBanned = await checkAndHandleBan();
    if (isBanned) return; 
    await loadGameState();   
    updateUI();  
    loadFriendsList(); 
    await fetchLeaderboard();
    await fetchUserRank();
    await initializeApp();  
});


// دالة تهيئة التطبيق
async function initializeApp() {
    try {
        console.log('Initializing app...');

        // جلب بيانات المستخدم من Telegram وSupabase
        await fetchUserDataFromTelegram();

        // إخفاء شاشة البداية وعرض المحتوى الرئيسي
         setTimeout(() => {
       if (uiElements.splashScreen) uiElements.splashScreen.style.display = 'none';
       if (uiElements.mainContainer) uiElements.mainContainer.style.display = 'flex';
    }, 2000); // 10000 ميلي ثانية تعني 10 ثوانٍ

        // إعداد واجهة المستخدم
        updateUI();
        registerEventHandlers();
        startEnergyRecovery();
        
        console.log('App initialized successfully.');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification(uiElements.purchaseNotification, 'Failed to initialize app.');
        if (uiElements.splashScreen) uiElements.splashScreen.style.display = 'none';
        if (uiElements.mainContainer) uiElements.mainContainer.style.display = 'flex';
    }
}

// جلب بيانات المستخدم من Telegram
async function fetchUserDataFromTelegram() {
    try {
        const telegramApp = window.Telegram.WebApp;
        telegramApp.ready();

        const userTelegramId = telegramApp.initDataUnsafe.user?.id;
        const userTelegramName = telegramApp.initDataUnsafe.user?.username || `user_${userTelegramId}`;
        const isPremium = telegramApp.initDataUnsafe.user?.is_premium;

        if (!userTelegramId) {
            throw new Error("Failed to fetch Telegram user ID.");
        }

        // تحديث واجهة المستخدم
        uiElements.userTelegramIdDisplay.innerText = userTelegramId;
        uiElements.userTelegramNameDisplay.innerText = userTelegramName;

        // عرض الاسم المختصر
        const userNameElement = document.getElementById("userName");
        if (userNameElement) {
            const maxLength = 8;
            const truncatedName = userTelegramName.length > maxLength
                ? userTelegramName.slice(0, maxLength) + "..."
                : userTelegramName;
            userNameElement.innerText = truncatedName;
        }

        // عرض حالة Premium
        const premiumStatusElement = document.getElementById('userPremiumStatus');
        if (premiumStatusElement) {
            premiumStatusElement.innerHTML = isPremium
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-circle-dashed-check"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8.56 3.69a9 9 0 0 0 -2.92 1.95" /><path d="M3.69 8.56a9 9 0 0 0 -.69 3.44" /><path d="M3.69 15.44a9 9 0 0 0 1.95 2.92" /><path d="M8.56 20.31a9 9 0 0 0 3.44 .69" /><path d="M15.44 20.31a9 9 0 0 0 2.92 -1.95" /><path d="M20.31 15.44a9 9 0 0 0 .69 -3.44" /><path d="M20.31 8.56a9 9 0 0 0 -1.95 -2.92" /><path d="M15.44 3.69a9 9 0 0 0 -3.44 -.69" /><path d="M9 12l2 2l4 -4" /></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="Error-mark"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
        }

        // التحقق من تسجيل المستخدم
        await ensureUserAuthenticationAndDatabase(userTelegramId, userTelegramName);
    } catch (error) {
        console.error("Error fetching Telegram user data:", error.message);
    }
}

// وظيفة التحقق أو تسجيل المستخدم في المصادقة وقاعدة البيانات
async function ensureUserAuthenticationAndDatabase(telegramId, userName) {
    try {
        const email = `${telegramId}@sawtoken.coin`;
        const password = `password_${telegramId}`;

        // 1. التحقق من وجود المستخدم في نظام المصادقة
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (loginError) {
            console.log("User not found in auth system. Registering...");
            // تسجيل المستخدم في المصادقة إذا لم يكن موجودًا
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) throw new Error(`Failed to register user: ${signUpError.message}`);
            console.log("User registered in auth system:", signUpData.user.id);
        } else {
            console.log("User logged in successfully:", loginData.user.id);
        }

        // 2. التحقق من وجود المستخدم في قاعدة البيانات
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("telegram_id", telegramId)
            .maybeSingle();

        if (userError) throw new Error(`Error fetching user data: ${userError.message}`);

        // إضافة المستخدم إذا لم يكن موجودًا في قاعدة البيانات
        if (!userData) {
            console.log("User not found in database. Adding user...");
            const { error: insertError } = await supabase
                .from("users")
                .insert({ telegram_id: telegramId, username: userName, balance: 0 });
            if (insertError) throw new Error(`Failed to insert user data: ${insertError.message}`);
            console.log("User added to database successfully.");
        } else {
            console.log("User already exists in database.");
        }

    } catch (error) {
        console.error("Error ensuring user authentication and database:", error.message);
        throw error;
    }
}


function updateUI() {
    let formattedBalance = gameState.balance.toLocaleString("en-US", {
        minimumFractionDigits: 0,  // لا نريد عرض الفواصل العشرية إذا لم تكن ضرورية
        maximumFractionDigits: 0   // نفس الشيء هنا لإزالة الأصفار غير الضرورية
    });

    // تحديد الجزء الرئيسي والجزء الباقي بناءً على الحجم
    let mainDigits, remainingDigits;

    if (gameState.balance >= 1_000_000_000) {
        // مليارات: الرقم الأول كبير
        mainDigits = formattedBalance.split(",")[0]; // الرقم الأول فقط
        remainingDigits = formattedBalance.slice(mainDigits.length); // باقي الأرقام
    } else if (gameState.balance >= 1_000_000) {
     // ملايين: الرقم الأول أو أول رقمين كبير
        mainDigits = formattedBalance.split(",")[0]; // الرقم الأول فقط
        remainingDigits = formattedBalance.slice(mainDigits.length); // باقي الأرقام
    } else if (gameState.balance >= 1_000) {
        // آلاف: أول 3 أرقام كبيرة
        mainDigits = formattedBalance.split(",")[0]; // أول 3 أرقام
        remainingDigits = formattedBalance.slice(mainDigits.length); // باقي الأرقام
    } else {
        // أقل من ألف: الرقم بالكامل
        mainDigits = formattedBalance;
        remainingDigits = "";
    }

    // تحديث DOM
    const mainDigitsElement = document.getElementById("mainDigits");
    const remainingDigitsElement = document.getElementById("remainingDigits");

    if (mainDigitsElement && remainingDigitsElement) {
        mainDigitsElement.textContent = mainDigits;
        remainingDigitsElement.textContent = remainingDigits;
    }
    
    const balanceElements = [
        uiElements.settingsBalanceDisplay
    ];
     forEach(element => {
    if (element) {
        element.innerText = formatNumber(gameState.balance);
      }
   });
    
    debounceSave(); 
}


function formatNumber(value) {
    if (value >= 1_000_000_000_000) {
        return `${(value / 1_000_000_000_000).toFixed(2)}T`;
    } else if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M`; // الملايين
    } else if (value >= 1_000) {
        return `${(value / 1_000).toFixed(2)}K`; // الآلاف
    } else {
        return value.toLocaleString();
    }
}

// تسجيل الأحداث للمستخدم
function registerEventHandlers() {
    if (uiElements.navButtons) {
        uiElements.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetScreen = button.getAttribute('data-target');
                navigateToScreen(targetScreen);
            });
        });
    }

    if (uiElements.inviteFriendsBtn) {
        uiElements.inviteFriendsBtn.addEventListener('click', () => {
            openTelegramChat();
        });
    }

    if (uiElements.copyInviteLinkBtn) {
        uiElements.copyInviteLinkBtn.addEventListener('click', copyInviteLink);
    }
}

//////////////////////////


// عرض الإشعارات للمستخدم
function showNotification(notificationElement, message) {
    if (!notificationElement) return;
    notificationElement.innerText = message;
    notificationElement.classList.add('show');
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
}

function showNotificationWithStatus(notificationElement, message, status = '') {
    if (!notificationElement) return;

    // مسح الفئات السابقة للفوز أو الخسارة أو الخطأ أو الرسالة
    notificationElement.classList.remove('win', 'lose', 'error', 'message');

    // إعداد رابط الصورة بناءً على الحالة
    let imageUrl = '';
    if (status === 'win') {
        notificationElement.classList.add('win');
        imageUrl = 'i/done.png'; // رابط الصورة لحالة الفوز

        // إضافة تأثير القصاصات الورقية للاحتفال
        showConfettiEffect();
    } else if (status === 'lose') {
        notificationElement.classList.add('lose');
        imageUrl = 'i/mistake.png'; // رابط الصورة لحالة الخسارة
    } else if (status === 'error') {
        notificationElement.classList.add('error');
        imageUrl = 'i/error.png'; // رابط الصورة لحالة الخطأ
    } else if (status === 'message') {
        notificationElement.classList.add('message');
        imageUrl = 'i/message.png'; // رابط الصورة للإشعار العادي
    }

    // إضافة الصورة مع الرسالة باستخدام innerHTML
    notificationElement.innerHTML = `<img src="${imageUrl}" class="notification-image" alt=""> ${message}`;

    // إظهار الإشعار
    notificationElement.classList.add('show');

    // إخفاء الإشعار بعد 4 ثوانٍ
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
}

// دالة لإظهار تأثير القصاصات الورقية
function showConfettiEffect() {
    const duration = 2 * 1000; // مدة التأثير (2 ثانية)
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 8, // عدد الجزيئات في كل دفعة
            angle: 90,        // زاوية التساقط (عمودية)
            spread: 160,      // زاوية الانتشار
            startVelocity: 40, // سرعة البداية
            gravity: 1,     // الجاذبية
            origin: {
                x: Math.random(), // انطلاق من أماكن عشوائية
                y: 0              // البداية من أعلى الشاشة
            },
            colors: ['#1F1F1F', '#3A3A3A', '#2D83EC', '#A6B1E1', '#6272A4']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}

//////////////////////////////////////////////////



function navigateToScreen(screenId) {
    if (uiElements.contentScreens) {
        uiElements.contentScreens.forEach(screen => {
            screen.classList.remove('active');
        });
    }
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');

    // دائمًا إظهار القائمة السفلية بغض النظر عن الشاشة
    const footerMenu = document.querySelector('.menu'); // تحديد القائمة السفلية باستخدام الكلاس
    if (footerMenu) {
        footerMenu.style.display = 'flex'; // التأكد من أن القائمة السفلية تظهر دائمًا
    }
}

///////////////////////////////////////



async function loadFriendsList() {
    const userId = uiElements.userTelegramIdDisplay.innerText;
    const noFriendsMessage = document.getElementById('noFriendsMessage');
    const friendsListDisplay = uiElements.friendsListDisplay;

    if (!userId) {
        console.error("User ID is missing.");
        friendsListDisplay.innerHTML = `<li>Error: Unable to load friends list. Please try again later.</li>`;
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('invites')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error fetching friends list:', error.message);
            friendsListDisplay.innerHTML = `<li>Error: Unable to fetch friends at the moment.</li>`;
            return;
        }

        if (data && data.invites && Array.isArray(data.invites) && data.invites.length > 0) {
            friendsListDisplay.innerHTML = '';
            noFriendsMessage.style.display = 'none';

            const uniqueInvites = [...new Set(data.invites)];
            const limitedInvites = uniqueInvites.slice(0, 10);

            const friendsPromises = limitedInvites.map(async (friendId) => {
                const { data: friendData, error: friendError } = await supabase
                    .from('users')
                    .select('telegram_id, username, balance')
                    .eq('telegram_id', friendId)
                    .single();

                if (friendError) {
                    console.error(`Error fetching data for friend ${friendId}:`, friendError.message);
                    return null;
                }

                return friendData;
            });

            const friendsData = await Promise.all(friendsPromises);

            friendsData.forEach((friend) => {
                if (friend) {
                    const li = document.createElement('li');
                    li.classList.add('friend-item');

                    const img = document.createElement('img');
                    img.src = friend.username
                        ? `https://t.me/i/userpic/320/${friend.username}.svg`
                        : 'i/users.jpg';
                    img.alt = `${friend.telegram_id} Avatar`;
                    img.classList.add('friend-avatar');

                    const span = document.createElement('span');
                    span.classList.add('friend-name');
                    span.textContent = `ID : ${friend.telegram_id}`;

                    const balanceSpan = document.createElement('span');
                    balanceSpan.classList.add('friend-balance');
                    balanceSpan.textContent = `${formatNumber(friend.balance)} $SAW`;

                    const friendInfoDiv = document.createElement('div');
                    friendInfoDiv.classList.add('friend-info');
                    friendInfoDiv.appendChild(img);
                    friendInfoDiv.appendChild(span);

                    li.appendChild(friendInfoDiv);
                    li.appendChild(balanceSpan);
                    friendsListDisplay.appendChild(li);
                }
            });

            const totalFriendsCount = uniqueInvites.length;
            document.getElementById('invitedCount').innerText = totalFriendsCount || 0;
            document.getElementById('settingsInvitedCount').innerText = totalFriendsCount || 0;
        } else {
            friendsListDisplay.innerHTML = '';
            noFriendsMessage.style.display = 'block';
        }
    } catch (err) {
        console.error("Unexpected error loading friends list:", err);
        friendsListDisplay.innerHTML = `<li>Error: Unexpected issue occurred while loading friends.</li>`;
    }
}

// نسخ رابط الدعوة
function copyInviteLink() {
    const inviteLink = `https://t.me/SAWCOIN_BOT?start=${uiElements.userTelegramIdDisplay?.innerText || ''}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
        showNotification(uiElements.copyInviteNotification, 'Invite link copied!');
    }).catch(err => {
        showNotification(uiElements.purchaseNotification, 'Failed to copy invite link.');
    });
}


import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './Scripts/config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// مشاركة الدعوة عبر Telegram
function openTelegramChat() {
    const inviteLink = `https://t.me/share/url?text=Join spark and earn 5,000 $SPARK!&url=https://t.me/SAWCOIN_BOT?start=${uiElements.userTelegramIdDisplay?.innerText || ''}`;
    window.open(inviteLink, '_blank');
}


////////////////////////////////////////////////


document.addEventListener('DOMContentLoaded', () => {
    // تهيئة الإعلانات بعد تحميل الصفحة
    const AdController = window.Adsgram.init({ blockId: "int-5511" });
    const button = document.getElementById('ad');
    const purchaseNotification = uiElements.purchaseNotification; // تأكد من وجود هذا العنصر

    // تحقق من وجود العناصر
    if (!button || !purchaseNotification) {
        console.error('Elements not found');
        return;
    }

    // تعريف المكافأة (مثل 1000 عملة)
    const rewardAmount = 1000;

    button.addEventListener('click', () => {
        AdController.show().then((result) => {
            // المستخدم شاهد الإعلان حتى النهاية أو تفاعل معه
            // مكافأة المستخدم
            rewardUser(rewardAmount);
            showNotificationWithStatus(purchaseNotification, `You got me ${rewardAmount} $SAW for watching the ad`, 'win');
        }).catch((result) => {
            // معالجة الحالة إذا حدثت مشكلة في عرض الإعلان
            console.error('mistake ', result);
            showNotification(purchaseNotification, 'Sorry, an error occurred while viewing');
        });
    });

    // دالة مكافأة المستخدم
    function rewardUser(amount) {
        // إضافة المكافأة إلى رصيد المستخدم (تأكد من دمج هذا مع منطق اللعبة الحالي)
        gameState.balance += amount;
        updateUI();
    }
});




//////////////////////////////////////


// القائمه السفليه
document.querySelectorAll('button[data-target]').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        document.querySelectorAll('.screen-content').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
    });
});

// أولاً: الحصول على جميع الأزرار داخل القائمة
const buttons = document.querySelectorAll('.menu button');

// ثانياً: إضافة مستمع للأحداث (Event Listener) لكل زر بحيث يستمع للنقرات
buttons.forEach(button => {
    button.addEventListener('click', function() {
        // عند النقر على زر، يتم إزالة الصف "active" من جميع الأزرار
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // إضافة الصف "active" للزر الذي تم النقر عليه
        this.classList.add('active');
        
        // الحصول على اسم الصفحة أو القسم المستهدف من الزر الذي تم النقر عليه
        const targetPage = this.getAttribute('data-target');
        
        // عرض القسم المناسب
        document.querySelectorAll('.screen-content').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(targetPage).classList.add('active');
    });
});

// ثالثاً: تفعيل الزر الافتراضي (الصفحة الرئيسية)
window.addEventListener('DOMContentLoaded', () => {
    const defaultButton = document.querySelector('button[data-target="mainPage"]'); // افترض أن الصفحة الرئيسية لها data-target="mainPage"
    if (defaultButton) {
        defaultButton.classList.add('active'); // تفعيل الزر افتراضياً
        const defaultScreen = document.getElementById('mainPage'); // افترض أن الصفحة الرئيسية لها ID="mainPage"
        if (defaultScreen) {
            defaultScreen.classList.add('active'); // عرض الشاشة المرتبطة افتراضياً
        }
    }
});



///////////////////////////////////////////


// المهام 
document.addEventListener('DOMContentLoaded', async () => {
    const taskContainer = document.querySelector('#taskcontainer');
    if (!taskContainer) {
        console.error('Task container element not found.');
        return;
    }

    // جلب المهام المكتملة من قاعدة البيانات
    const userId = uiElements.userTelegramIdDisplay.innerText;
    let completedTasks = [];

    try {
        const { data, error } = await supabase
            .from('users')
            .select('completed_tasks')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error fetching completed tasks:', error);
        } else {
            completedTasks = data?.completed_tasks || [];
        }
    } catch (err) {
        console.error('Unexpected error while fetching completed tasks:', err);
    }

    // جلب قائمة المهام من ملف JSON
    fetch('json/tasks.json')
        .then(response => response.json())
        .then(tasks => {
            tasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.classList.add('task-item');

                // صورة المهمة
                const img = document.createElement('img');
                img.src = task.image;
                img.alt = 'Task Image';
                img.classList.add('task-img');
                taskElement.appendChild(img);

                 // Create a container for description and reward
                const infoContainer = document.createElement('div');
                infoContainer.classList.add('info-task'); // This will hold both description and reward

                // Task Description
                const description = document.createElement('p');
                description.textContent = task.description;
                infoContainer.appendChild(description);

                 // Task Reward without Coin Image
                const rewardContainer = document.createElement('div');
                rewardContainer.classList.add('task-reward-container');
            
                const rewardText = document.createElement('span');
                rewardText.textContent = `+ ${task.reward} $SAW`;
                rewardText.classList.add('task-reward');
                rewardContainer.appendChild(rewardText);

                infoContainer.appendChild(rewardContainer); // Append reward below description

                taskElement.appendChild(infoContainer); // Append the info container to the task element

           
                // زر المهمة
                const button = document.createElement('button');
                 button.classList.add('task-button');
                 button.setAttribute('data-task-id', task.id);
                 button.setAttribute('data-reward', task.reward);

                 // تعيين نص الزر بناءً على حالة المهمة
                 if (completedTasks.includes(task.id)) {
                 // علامة الصح
                 button.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                   <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                 </svg>
                `;
                 button.disabled = true;
             } else {
                // السهم
                 button.innerHTML = `
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="arrow">
                     <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                   </svg>
                 `;
                }

               taskElement.appendChild(button);
               taskContainer.appendChild(taskElement);

                // التعامل مع النقر على الزر
                let taskProgress = 0;

                button.addEventListener('click', () => {
                    if (taskProgress === 0) {
                        showLoading(button);
                        openTaskLink(task.url, () => {
                            taskProgress = 1;
                            hideLoading(button, 'Verify');
                        });
                    } else if (taskProgress === 1) {
                        showLoading(button);
                        setTimeout(() => {
                            taskProgress = 2;
                            hideLoading(button, 'Claim');
                        }, 5000);
                    } else if (taskProgress === 2) {
                        claimTaskReward(task.id, task.reward, button, completedTasks);
                    }
                });
            });
        })
        .catch(error => console.error('Error fetching tasks:', error));
});

// استلام المكافأة وتحديث المهام المكتملة فقط
async function claimTaskReward(taskId, reward, button, completedTasks) {
    try {
        if (completedTasks.includes(taskId)) {
            showNotification(uiElements.purchaseNotification, 'You have already claimed this reward.');
            return;
        }

        // تحديث المهام المكتملة
        completedTasks.push(taskId);
        button.textContent = '✓';
        button.disabled = true;
        showNotificationWithStatus(uiElements.purchaseNotification, `Successfully claimed ${reward} $SAW!`, 'win');

        // تحديث قاعدة البيانات للمهام فقط
        const userId = uiElements.userTelegramIdDisplay.innerText;
        const { error } = await supabase
            .from('users')
            .update({ completed_tasks: completedTasks })
            .eq('telegram_id', userId);

        if (error) {
            console.error('Error updating completed tasks:', error);
        }

        // تحديث الرصيد بشكل منفصل
        gameState.balance += reward;
        updateUI();
        debounceSave();
    } catch (error) {
        console.error('Error claiming task reward:', error);
    }
}

// عرض التحميل
function showLoading(button) {
    button.innerHTML = `<span class="loading-spinner"></span>`;
    button.disabled = true;
}

function hideLoading(button, text) {
    button.disabled = false;
    button.innerHTML = text;
}

// فتح رابط المهمة
function openTaskLink(taskurl, callback) {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.openLink(taskurl, { try_instant_view: true });
        setTimeout(callback, 1000);
    } else {
        window.open(taskurl, '_blank');
        setTimeout(callback, 1000);
    }
}


/////////////////////////////////////


function initializeTelegramIntegration() {
    const telegramApp = window.Telegram.WebApp;

    // التأكد من أن التطبيق جاهز
    telegramApp.ready();

    // تعريف الصفحات
    const mainPageId = "mainPage"; // الصفحة الرئيسية
    const defaultHeaderColor = "#000000"; 
    const mainPages = ["mainPage"]; 

    // تحديث زر الرجوع بناءً على الصفحة الحالية
    function updateBackButton() {
        const currentPage = document.querySelector(".screen-content.active");
        if (currentPage && !mainPages.includes(currentPage.id)) {
            telegramApp.BackButton.show(); // إظهار زر الرجوع في الصفحات الفرعية
        } else {
            telegramApp.BackButton.hide(); // إخفاء زر الرجوع في الصفحات الرئيسية
        }
    }

    // تحديث الزر النشط بناءً على الصفحة النشطة
    function updateActiveButton(targetPageId) {
        document.querySelectorAll(".menu button").forEach(btn => {
            const target = btn.getAttribute("data-target");
            btn.classList.toggle("active", target === targetPageId);
        });
    }

    // تحديث لون الهيدر بناءً على الصفحة
     function updateHeaderColor() {
          telegramApp.setHeaderColor(defaultHeaderColor); // اللون الافتراضي لجميع الصفحات
    }

    // التنقل إلى صفحة معينة
    function navigateToPage(targetPageId) {
        // إزالة الصفحة النشطة الحالية
        document.querySelectorAll(".screen-content").forEach(page => page.classList.remove("active"));

        // تفعيل الصفحة المستهدفة
        const targetPage = document.getElementById(targetPageId);
        if (targetPage) {
            targetPage.classList.add("active");
        }

        // تحديث زر الرجوع والزر النشط ولون الهيدر
        updateBackButton();
        updateActiveButton(targetPageId);
        updateHeaderColor(); // تأكد من تحديث الهيدر بعد التفعيل
    }

    // تفعيل حدث زر الرجوع الخاص بـ Telegram
    telegramApp.BackButton.onClick(() => {
        const currentPage = document.querySelector(".screen-content.active");
        if (currentPage && !mainPages.includes(currentPage.id)) {
            navigateToPage(mainPageId); // العودة دائمًا إلى الصفحة الرئيسية من الصفحات الفرعية
        } else {
            telegramApp.close(); // إغلاق WebApp إذا كنت في الصفحة الرئيسية
        }
    });

    // إعداد التنقل بين الأقسام
    document.querySelectorAll("button[data-target]").forEach(button => {
        button.addEventListener("click", () => {
            const targetPageId = button.getAttribute("data-target");

            // تحديث التنقل
            navigateToPage(targetPageId);

            // تحديث سجل التنقل
            if (mainPages.includes(targetPageId)) {
                history.replaceState({ target: targetPageId }, "", `#${targetPageId}`);
            } else {
                history.pushState({ target: targetPageId }, "", `#${targetPageId}`);
            }
        });
    });

    // إدارة التنقل عند استخدام زر الرجوع في المتصفح
    window.addEventListener("popstate", (event) => {
        const targetPageId = event.state ? event.state.target : mainPageId;
        navigateToPage(targetPageId);
    });

    // فتح الصفحة الرئيسية عند تحميل التطبيق
    window.addEventListener("load", () => {
        const hash = window.location.hash.substring(1) || mainPageId;
        navigateToPage(hash);

        // تحديث لون الهيدر عند التحميل
        updateHeaderColor();

        // تحديث سجل التنقل
        history.replaceState({ target: hash }, "", `#${hash}`);
    });
}

// استدعاء التهيئة عند تحميل الصفحة
window.addEventListener("load", initializeTelegramIntegration); 
window.Telegram.WebApp.setHeaderColor('#202020');

//////////////////////////////////////


const leaderboardContainer = document.getElementById('leaderboardContainer');
const userRankContainer = document.getElementById('userRankContainer');
const userRankDisplay = document.getElementById('userRank');
const userUsernameDisplay = document.getElementById('userUsername');
const userBalanceDisplay = document.getElementById('userBalance');

// جلب بيانات المتصدرين
async function fetchLeaderboard() {
    try {
        const { data: leaderboard, error } = await supabase
            .from('users')
            .select('username, balance, telegram_id')
            .order('balance', { ascending: false })
            .limit(50);

        if (error) throw error;

        // تحديث عرض المتصدرين
        await updateLeaderboardDisplay(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
    }
}

async function fetchUserRank() {
    try {
        // قراءة معرف المستخدم الحالي
        const userTelegramId = Telegram.WebApp.initDataUnsafe.user.id;
        if (!userTelegramId) throw new Error("Telegram ID is missing or invalid.");

        console.log("Fetching rank for Telegram ID:", userTelegramId);

        // استدعاء الدالة المخزنة RPC
        const { data, error } = await supabase.rpc('get_user_rank', { user_id: userTelegramId });

        if (error) {
            console.error('Error fetching user rank from RPC:', error.message);
            return; // إنهاء التنفيذ بدون عرض بيانات
        }

        console.log("Rank data fetched:", data);

        // التحقق من وجود بيانات صحيحة
        if (!data || data.length === 0) {
            console.warn('No rank data found for the user.');
            return; // إنهاء التنفيذ بدون عرض بيانات
        }

        // استخراج البيانات المحدثة
        const rankData = data[0];
        console.log("Rank Data Object:", rankData);

        // تحديث الواجهة
        updateUserRankDisplay(rankData.rank, rankData.username, rankData.balance);
    } catch (err) {
        console.error('Error in fetchUserRank:', err.message);
    }
}

function updateUserRankDisplay(rank, username, balance) {
    if (rank !== undefined && username !== undefined && balance !== undefined) {
        userRankDisplay.innerText = `#${rank}`;
        userUsernameDisplay.innerText = truncateUsername(username);
        userBalanceDisplay.innerText = `${formatNumber(balance)} $SAW`;

        // تحديث صورة الملف الشخصي
        updateUserImage("userAvatar");

        userRankContainer.style.display = 'flex'; // إظهار الحاوية
    }
}

async function updateLeaderboardDisplay(leaderboard) {
    // تفريغ الحاوية الرئيسية للمتصدرين الآخرين
    document.getElementById('leaderboardContainer').innerHTML = '';

    for (let index = 0; index < leaderboard.length; index++) {
        const user = leaderboard[index];
        const avatar = user.username
            ? `https://t.me/i/userpic/320/${user.username}.svg`
            : 'https://sawcoin.vercel.app/i/users.jpg';

        const badge = `#${index + 1}`;

        if (index === 0) {
            // المتصدر الأول
            renderTopLeader(
                'firstPlaceImg',
                'firstPlaceName',
                'firstPlaceBalance',
                'firstPlaceRank',
                avatar,
                user.username,
                user.balance,
                badge,
                '#2D83EC'
            );
        } else if (index === 1) {
            // المتصدر الثاني
            renderTopLeader(
                'secondPlaceImg',
                'secondPlaceName',
                'secondPlaceBalance',
                'secondPlaceRank',
                avatar,
                user.username,
                user.balance,
                badge,
                'silver'
            );
        } else if (index === 2) {
            // المتصدر الثالث
            renderTopLeader(
                'thirdPlaceImg',
                'thirdPlaceName',
                'thirdPlaceBalance',
                'thirdPlaceRank',
                avatar,
                user.username,
                user.balance,
                badge,
                'bronze'
            );
        } else if (index >= 3 && index <= 6) {
            // المتصدرون الرابع إلى السابع
            const leaderIds = [
                'fourthPlace',
                'fifthPlace',
                'sixthPlace',
                'seventhPlace',
            ];

            const leaderPrefix = leaderIds[index - 3]; // تحديد معرف القائد بناءً على الترتيب
            renderTopLeader(
                `${leaderPrefix}Img`,
                `${leaderPrefix}Name`,
                `${leaderPrefix}Balance`,
                `${leaderPrefix}Rank`,
                avatar,
                user.username,
                user.balance,
                badge,
                '#202020' // لون افتراضي
            );
        } else {
            // باقي المتصدرين
            const userRow = document.createElement('div');
            userRow.classList.add('leaderboard-row');

            userRow.innerHTML = `
                <img src="${avatar}" alt="Avatar" class="leaderboard-avatar" 
                    onerror="this.src='https://sawcoin.vercel.app/i/users.jpg';" />
                <span class="leaderboard-rank">${badge}</span>
                <span class="leaderboard-username">${truncateUsername(user.username)}</span>
                <span class="leaderboard-balance">${formatNumber(user.balance)} $SAW</span>
            `;

            document.getElementById('leaderboardContainer').appendChild(userRow);
        }
    }
}

// وظيفة لتحديث المتصدرين الفرديين
function renderTopLeader(imageId, nameId, balanceId, rankId, avatar, username, balance, rank, color) {
    const imageElement = document.getElementById(imageId);
    const nameElement = document.getElementById(nameId);
    const balanceElement = document.getElementById(balanceId);
    const rankElement = document.getElementById(rankId);

    if (imageElement) imageElement.src = avatar;
    if (nameElement) nameElement.innerText = truncateUsername(username);
    if (balanceElement) balanceElement.innerText = `${formatNumber(balance)} $SAW`;
    if (rankElement) rankElement.innerText = rank;

    // تغيير لون الحدود (إذا كان هناك حاجة لتخصيص ألوان)
    if (imageElement) {
        imageElement.style.borderColor = color;
    }
}

// مساعد لقطع أسماء المستخدمين الطويلة
function truncateUsername(username, maxLength = 7) {
    return username.length > maxLength ? `${username.slice(0, maxLength)}...` : username;
}

async function updateUserImage(imageElementId) {
    try {
        // جلب photo_url مباشرة من Telegram
        const avatarUrl = Telegram.WebApp.initDataUnsafe.user.photo_url || 'https://sawcoin.vercel.app/i/users.jpg';

        const imageElement = document.getElementById(imageElementId);
        if (imageElement) {
            imageElement.src = avatarUrl; // تعيين الرابط للصورة
            imageElement.onerror = function () {
                this.src = 'https://sawcoin.vercel.app/i/users.jpg';
            };
        }
    } catch (error) {
        console.error("Error updating user image:", error);
    }
}


// استدعاء الوظيفة لتحديث الصور في العناصر المطلوبة
document.addEventListener("DOMContentLoaded", () => {
    updateUserImage("userDetailsImage"); // صورة التفاصيل
    updateUserImage("stingUserImage");   // صورة الإعدادات
});


//////////////////////


async function checkAndHandleBan() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
        // جلب حالة الحظر من قاعدة البيانات
        const { data, error } = await supabase
            .from('users')
            .select('is_banned')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error checking ban status:', error.message);
            return false;
        }

        if (data?.is_banned) {
            showBanScreen(); // إذا كان المستخدم محظورًا، عرض شاشة الحظر
            return true; // المستخدم محظور
        }

        return false; // المستخدم غير محظور
    } catch (err) {
        console.error('Unexpected error while checking ban status:', err);
        return false;
    }
}


function showBanScreen() {
    // إنشاء طبقة تغطي الشاشة بالكامل لمنع التفاعل
    const overlay = document.createElement('div');
    overlay.id = 'banOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 1);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
    `;

    // محتوى شاشة الحظر
    const content = document.createElement('div');
    content.style.cssText = `
        text-align: center;
        color: white;
    `;

    const banImage = document.createElement('img');
    banImage.src = 'i/bloomer.jpg'; // استبدل بمسار الصورة
    banImage.alt = 'Banned';
    banImage.style.cssText = 'width: 170px; margin-bottom: 20px;';

    const banMessage = document.createElement('p');
    banMessage.textContent = 'Your account has been banned for violating policies If you think this is an error please contact support';
    banMessage.style.cssText = 'font-size: 17px; margin-bottom: 20px;';

    const contactSupport = document.createElement('button');
    contactSupport.textContent = 'Contact support';
    contactSupport.style.cssText = `
        padding: 10px 30px;
        background-color: #fff;
        color: #000;
        border: none;
        font-weight: bold;
        border-radius: 20px;
        cursor: pointer;
    `;
    contactSupport.onclick = () => {
        window.location.href = 'https://t.me/X7X_FLASH'; // استبدل بعنوان بريد الدعم
    };

    content.appendChild(banImage);
    content.appendChild(banMessage);
    content.appendChild(contactSupport);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // تعطيل التفاعل مع بقية الشاشة
    document.body.style.overflow = 'hidden';
}

////////////////////////////////////


// تعريف المتغيرات
let lastTaskTime = parseInt(localStorage.getItem('lastTaskTime')) || 0;
let walletAddress = localStorage.getItem('walletAddress') || null;

// إعداد TonConnect UI
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://sawcoin.vercel.app/json/tonconnect-manifest.json',
  buttonRootId: 'ton-connect',
  uiOptions: {
    twaReturnUrl: 'https://t.me/SAWCOIN_BOT/GAME',
  },
});

// منطق تنفيذ مهمة دفع نصف عملة طن
document.getElementById('ton').addEventListener('click', async () => {
  const currentTime = Date.now();
  const cooldownHours = 12;

  // التحقق من وقت التبريد
  const cooldownCheck = checkCooldownPeriod(lastTaskTime, cooldownHours);
  if (!cooldownCheck.canProceed) {
    showNotification(
      uiElements.purchaseNotification,
      `You can complete this task again in ${cooldownCheck.remainingTime}.`
    );
    return;
  }

  // التحقق من ربط المحفظة
  if (!walletAddress) {
    showNotification(uiElements.purchaseNotification, 'Please connect your wallet first!');
    await connectToWallet();
  }

  // تنفيذ الدفع
  try {
    const amount = (0.5 * 1e9).toString(); // نصف طن بالنانو TON
    const recipientAddress = "UQCpMg6TV_zE34ao-Ii2iz5M6s5Qp8OIVWa3YbsB9KwxzwCJ";

    const transaction = {
      validUntil: Math.floor(currentTime / 1000) + 600, // صالح لمدة 10 دقائق
      messages: [{ address: recipientAddress, amount }],
    };

    await tonConnectUI.sendTransaction(transaction);

    // تحديث وقت التنفيذ وإضافة المكافأة
    lastTaskTime = currentTime;
    localStorage.setItem('lastTaskTime', lastTaskTime);

    const reward = 50000; // المكافأة
    gameState.balance += reward;
    updateUI();
    showNotification(
      uiElements.purchaseNotification,
      `Task completed! You earned ${formatNumber(reward)} coins.`
    );
  } catch (error) {
    console.error("Error completing task:", error.message);
    showNotification(uiElements.purchaseNotification, `Task failed: ${error.message}`);
  }
});

// دالة التحقق من وقت التبريد
function checkCooldownPeriod(lastTime, cooldownHours) {
  const currentTime = Date.now();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  if (currentTime - lastTime < cooldownMs) {
    const remainingTime = cooldownMs - (currentTime - lastTime);
    const hours = Math.floor(remainingTime / (60 * 60 * 1000));
    const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
    return { canProceed: false, remainingTime: `${hours}h ${minutes}m` };
  }

  return { canProceed: true };
}

// دالة الاتصال بالمحفظة
async function connectToWallet() {
  try {
    const connectedWallet = await tonConnectUI.connectWallet();
    walletAddress = connectedWallet.account.address; // حفظ العنوان
    localStorage.setItem('walletAddress', walletAddress); // تخزينه محليًا
    console.log('Wallet connected:', walletAddress);
    showNotification(uiElements.purchaseNotification, 'Wallet connected successfully!');
  } catch (error) {
    console.error('Failed to connect wallet:', error.message);
    showNotification(uiElements.purchaseNotification, `Failed to connect wallet: ${error.message}`);
  }
}


//////////////////////////



// منطق المتجر (شراء العملات)
document.querySelectorAll('.purchase-item').forEach(item => {
  item.addEventListener('click', async () => {
    const price = parseInt(item.getAttribute('data-price')); // السعر بالطن
    const coins = parseInt(item.getAttribute('data-coins')); // عدد العملات

    // التحقق من ربط المحفظة
    if (!walletAddress) {
      showNotification(uiElements.purchaseNotification, 'Please connect your wallet first!');
      await connectToWallet();
    }

    // تنفيذ عملية الشراء
    try {
      await processPayment(price, coins);
    } catch (error) {
      console.error("Error during purchase:", error.message);
      showNotification(uiElements.purchaseNotification, `Purchase failed: ${error.message}`);
    }
  });
});

// دالة تنفيذ الدفع للمتجر
async function processPayment(price, coins) {
  const amount = (price * 1e9).toString(); // تحويل السعر إلى Nano TON
  const recipientAddress = "UQCpMg6TV_zE34ao-Ii2iz5M6s5Qp8OIVWa3YbsB9KwxzwCJ";

  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600, // صالح لمدة 10 دقائق
    messages: [{ address: recipientAddress, amount }],
  };

  try {
    await tonConnectUI.sendTransaction(transaction);

    // تحديث رصيد المستخدم بعد الشراء
    gameState.balance += coins;
    updateUI();
    showNotificationWithStatus(
      uiElements.purchaseNotification,
      `Successfully purchased ${formatNumber(coins)} coins!`,
      'win'
    );
  } catch (error) {
    console.error("Transaction failed:", error.message);
    showNotification(uiElements.purchaseNotification, `Payment failed: ${error.message}`);
    throw error;
  }
}

/////////////////////////////




// تفعيل التطبيق
initializeApp();
