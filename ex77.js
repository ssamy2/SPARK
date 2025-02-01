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

let gameState = {
    balance: 0,
    friends: 0,
    invites: [],
    completedTasks: [],
};
function updateUserRankDisplay(rank, username, balance) {
    if (rank !== undefined && username !== undefined && balance !== undefined) {
        userRankDisplay.innerText = `#${rank}`;
        userUsernameDisplay.innerText = truncateUsername(username);
        userBalanceDisplay.innerText = `${formatNumber(balance)} $SPARK`;

        updateUserImage("userAvatar");

        userRankContainer.style.display = 'flex'; 
    }
}

async function updateLeaderboardDisplay(leaderboard) {
    document.getElementById('leaderboardContainer').innerHTML = '';

    for (let index = 0; index < leaderboard.length; index++) {
        const user = leaderboard[index];
        const avatar = user.username
            ? `https://t.me/i/userpic/320/${user.username}.svg`
            : 'https://sawcoin.vercel.app/i/users.jpg';

        const badge = `#${index + 1}`;

        if (index === 0) {
   
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
            const leaderIds = [
                'fourthPlace',
                'fifthPlace',
                'sixthPlace',
                'seventhPlace',
            ];

            const leaderPrefix = leaderIds[index - 3];
            renderTopLeader(
                `${leaderPrefix}Img`,
                `${leaderPrefix}Name`,
                `${leaderPrefix}Balance`,
                `${leaderPrefix}Rank`,
                avatar,
                user.username,
                user.balance,
                badge,
                '#202020' 
            );
        } else {
            const userRow = document.createElement('div');
            userRow.classList.add('leaderboard-row');

            userRow.innerHTML = `
                <img src="${avatar}" alt="Avatar" class="leaderboard-avatar" 
                    onerror="this.src='https://sawcoin.vercel.app/i/users.jpg';" />
                <span class="leaderboard-rank">${badge}</span>
                <span class="leaderboard-username">${truncateUsername(user.username)}</span>
                <span class="leaderboard-balance">${formatNumber(user.balance)} $SPARK</span>
            `;

            document.getElementById('leaderboardContainer').appendChild(userRow);
        }
    }
}

function renderTopLeader(imageId, nameId, balanceId, rankId, avatar, username, balance, rank, color) {
    const imageElement = document.getElementById(imageId);
    const nameElement = document.getElementById(nameId);
    const balanceElement = document.getElementById(balanceId);
    const rankElement = document.getElementById(rankId);

    if (imageElement) imageElement.src = avatar;
    if (nameElement) nameElement.innerText = truncateUsername(username);
    if (balanceElement) balanceElement.innerText = `${formatNumber(balance)} $SPARK`;
    if (rankElement) rankElement.innerText = rank;

    if (imageElement) {
        imageElement.style.borderColor = color;
    }
}


function truncateUsername(username, maxLength = 7) {
    return username.length > maxLength ? `${username.slice(0, maxLength)}...` : username;
}

async function updateUserImage(imageElementId) {
    try {
        const avatarUrl = Telegram.WebApp.initDataUnsafe.user.photo_url || 'https://sawcoin.vercel.app/i/users.jpg';

        const imageElement = document.getElementById(imageElementId);
        if (imageElement) {
            imageElement.src = avatarUrl;
            imageElement.onerror = function () {
                this.src = 'https://sawcoin.vercel.app/i/users.jpg';
            };
        }
    } catch (error) {
        console.error("Error updating user image:", error);
    }
}



document.addEventListener("DOMContentLoaded", () => {
    updateUserImage("userDetailsImage");
    updateUserImage("stingUserImage");   
});


//////////////////////


async function checkAndHandleBan() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
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
            showBanScreen(); 
            return true; 
        }

        return false; 
    } catch (err) {
        console.error('Unexpected error while checking ban status:', err);
        return false;
    }
}


function showBanScreen() {
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

    const content = document.createElement('div');
    content.style.cssText = `
        text-align: center;
        color: white;
    `;

    const banImage = document.createElement('img');
    banImage.src = 'i/bloomer.jpg'; 
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
        window.location.href = 'https://t.me/Dollarsfromtelegram'; 
    };

    content.appendChild(banImage);
    content.appendChild(banMessage);
    content.appendChild(contactSupport);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    document.body.style.overflow = 'hidden';
}
async function fetchLeaderboard() {
    try {
        const { data: leaderboard, error } = await supabase
            .from('users')
            .select('username, balance, telegram_id')
            .order('balance', { ascending: false })
            .limit(50);

        if (error) throw error;

        await updateLeaderboardDisplay(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
    }
}

async function fetchUserRank() {
    try {
        const userTelegramId = Telegram.WebApp.initDataUnsafe.user.id;
        if (!userTelegramId) throw new Error("Telegram ID is missing or invalid.");

        console.log("Fetching rank for Telegram ID:", userTelegramId);

        const { data, error } = await supabase.rpc('get_user_rank', { user_id: userTelegramId });

        if (error) {
            console.error('Error fetching user rank from RPC:', error.message);
            return; 
        }

        console.log("Rank data fetched:", data);

        if (!data || data.length === 0) {
            console.warn('No rank data found for the user.');
            return; 
        }

     
        const rankData = data[0];
        console.log("Rank Data Object:", rankData);

        updateUserRankDisplay(rankData.rank, rankData.username, rankData.balance);
    } catch (err) {
        console.error('Error in fetchUserRank:', err.message);
    }
}

function updateUserRankDisplay(rank, username, balance) {
    if (rank !== undefined && username !== undefined && balance !== undefined) {
        userRankDisplay.innerText = `#${rank}`;
        userUsernameDisplay.innerText = truncateUsername(username);
        userBalanceDisplay.innerText = `${formatNumber(balance)}$SPARK`;

        updateUserImage("userAvatar");

        userRankContainer.style.display = 'flex'; 
    }
}

async function updateLeaderboardDisplay(leaderboard) {
    document.getElementById('leaderboardContainer').innerHTML = '';

    for (let index = 0; index < leaderboard.length; index++) {
        const user = leaderboard[index];
        const avatar = user.username
            ? `https://t.me/i/userpic/320/${user.username}.svg`
            : 'https://sawcoin.vercel.app/i/users.jpg';

        const badge = `#${index + 1}`;

        if (index === 0) {
   
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
            const leaderIds = [
                'fourthPlace',
                'fifthPlace',
                'sixthPlace',
                'seventhPlace',
            ];

            const leaderPrefix = leaderIds[index - 3];
            renderTopLeader(
                `${leaderPrefix}Img`,
                `${leaderPrefix}Name`,
                `${leaderPrefix}Balance`,
                `${leaderPrefix}Rank`,
                avatar,
                user.username,
                user.balance,
                badge,
                '#202020' 
            );
        } else {
            const userRow = document.createElement('div');
            userRow.classList.add('leaderboard-row');

            userRow.innerHTML = `
                <img src="${avatar}" alt="Avatar" class="leaderboard-avatar" 
                    onerror="this.src='https://sawcoin.vercel.app/i/users.jpg';" />
                <span class="leaderboard-rank">${badge}</span>
                <span class="leaderboard-username">${truncateUsername(user.username)}</span>
                <span class="leaderboard-balance">${formatNumber(user.balance)} $SPARK</span>
            `;

            document.getElementById('leaderboardContainer').appendChild(userRow);
        }
    }
}

function renderTopLeader(imageId, nameId, balanceId, rankId, avatar, username, balance, rank, color) {
    const imageElement = document.getElementById(imageId);
    const nameElement = document.getElementById(nameId);
    const balanceElement = document.getElementById(balanceId);
    const rankElement = document.getElementById(rankId);

    if (imageElement) imageElement.src = avatar;
    if (nameElement) nameElement.innerText = truncateUsername(username);
    if (balanceElement) balanceElement.innerText = `${formatNumber(balance)} $SPARK`;
    if (rankElement) rankElement.innerText = rank;

    if (imageElement) {
        imageElement.style.borderColor = color;
    }
}


function truncateUsername(username, maxLength = 7) {
    return username.length > maxLength ? `${username.slice(0, maxLength)}...` : username;
}

async function updateUserImage(imageElementId) {
    try {
        const avatarUrl = Telegram.WebApp.initDataUnsafe.user.photo_url || 'https://sawcoin.vercel.app/i/users.jpg';

        const imageElement = document.getElementById(imageElementId);
        if (imageElement) {
            imageElement.src = avatarUrl;
            imageElement.onerror = function () {
                this.src = 'https://sawcoin.vercel.app/i/users.jpg';
            };
        }
    } catch (error) {
        console.error("Error updating user image:", error);
    }
}



document.addEventListener("DOMContentLoaded", () => {
    updateUserImage("userDetailsImage");
    updateUserImage("stingUserImage");   
});
async function checkAndHandleBan() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
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
            showBanScreen(); 
            return true; 
        }

        return false; 
    } catch (err) {
        console.error('Unexpected error while checking ban status:', err);
        return false;
    }
}


function showBanScreen() {
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

    const content = document.createElement('div');
    content.style.cssText = `
        text-align: center;
        color: white;
    `;

    const banImage = document.createElement('img');
    banImage.src = 'i/bloomer.jpg'; 
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
        window.location.href = 'https://t.me/Dollarsfromtelegram'; 
    };

    content.appendChild(banImage);
    content.appendChild(banMessage);
    content.appendChild(contactSupport);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    document.body.style.overflow = 'hidden';
}
async function updateGameStateInDatabase(updatedData) {
    const userId = uiElements.userTelegramIdDisplay.innerText;
    if (updatedData.balance === 0 && gameState.balance !== 0) {
        console.warn('Skipping update: balance is 0 but the current gameState balance is not.');
        return false;
    }
    try {
        const { data, error } = await supabase.from('users').update(updatedData).eq('telegram_id', userId).select();
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

async function loadGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText;
    try {
        const { data, error } = await supabase.from('users').select('telegram_id, balance, username').eq('telegram_id', userId).single();
        if (data) {
            gameState = {
                ...gameState,
                ...data,
                balance: data.balance ?? gameState.balance,
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
    }, 5000);
}

async function saveGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText;
    const updatedData = {
        balance: gameState.balance,
    };
    try {
        const { error } = await supabase.from('users').update(updatedData).eq('telegram_id', userId);
        if (error) {
            throw new Error(`Error saving game state: ${error.message}`);
        }
        console.log('Game state updated successfully.');
    } catch (err) {
        console.error(err.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isBanned = await checkAndHandleBan();
        if (isBanned) return;
        await loadGameState();
        updateUI();
        loadFriendsList();
        await fetchLeaderboard();
        await fetchUserRank();
        await initializeApp();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

async function initializeApp() {
    try {
        console.log('Initializing app...');
        await fetchUserDataFromTelegram();
        setTimeout(() => {
            if (uiElements.splashScreen) uiElements.splashScreen.style.display = 'none';
            if (uiElements.mainContainer) uiElements.mainContainer.style.display = 'flex';
        }, 2000);
        updateUI();
        registerEventHandlers();
        startEnergyRecovery();
        console.log('App initialized successfully.');
    } catch (error) {
        console.error('Error initializing app:', error.message);
        showNotification(uiElements.purchaseNotification, 'Failed to initialize app.');
    }
}

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
        uiElements.userTelegramIdDisplay.innerText = userTelegramId;
        uiElements.userTelegramNameDisplay.innerText = userTelegramName;

        const userNameElement = document.getElementById("userName");
        if (userNameElement) {
            const maxLength = 8;
            const truncatedName = userTelegramName.length > maxLength ? userTelegramName.slice(0, maxLength) + "..." : userTelegramName;
            userNameElement.innerText = truncatedName;
        }

        await ensureUserAuthenticationAndDatabase(userTelegramId, userTelegramName);
    } catch (error) {
        console.error("Error fetching Telegram user data:", error.message);
    }
}

async function ensureUserAuthenticationAndDatabase(telegramId, userName) {
    try {
        const email = `${telegramId}@sawtoken.coin`;
        const password = `password_${telegramId}`;
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) throw new Error(`Failed to register user: ${signUpError.message}`);
            console.log("User registered in auth system:", signUpData.user.id);
        } else {
            console.log("User logged in successfully:", loginData.user.id);
        }

        const { data: userData, error: userError } = await supabase.from("users").select("*").eq("telegram_id", telegramId).maybeSingle();
        if (userError) throw new Error(`Error fetching user data: ${userError.message}`);
        if (!userData) {
            const { error: insertError } = await supabase.from("users").insert({ telegram_id: telegramId, username: userName, balance: 0 });
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    let mainDigits, remainingDigits;
    if (gameState.balance >= 1_000_000_000) {
        mainDigits = formattedBalance.split(",")[0];
        remainingDigits = formattedBalance.slice(mainDigits.length);
    } else if (gameState.balance >= 1_000_000) {
        mainDigits = formattedBalance.split(",")[0];
        remainingDigits = formattedBalance.slice(mainDigits.length);
    } else if (gameState.balance >= 1_000) {
        mainDigits = formattedBalance.split(",")[0];
        remainingDigits = formattedBalance.slice(mainDigits.length);
    } else {
        mainDigits = formattedBalance;
        remainingDigits = "";
    }

    const mainDigitsElement = document.getElementById("mainDigits");
    const remainingDigitsElement = document.getElementById("remainingDigits");
    if (mainDigitsElement && remainingDigitsElement) {
        mainDigitsElement.textContent = mainDigits;
        remainingDigitsElement.textContent = remainingDigits;
    }

    debounceSave();
}

function formatNumber(value) {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toLocaleString();
}

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
        uiElements.inviteFriendsBtn.addEventListener('click', openTelegramChat);
    }
    if (uiElements.copyInviteLinkBtn) {
        uiElements.copyInviteLinkBtn.addEventListener('click', copyInviteLink);
    }
}

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
    notificationElement.classList.remove('win', 'lose', 'error', 'message');
    let imageUrl = '';
    if (status === 'win') {
        notificationElement.classList.add('win');
        imageUrl = 'i/done.png';
        showConfettiEffect();
    } else if (status === 'lose') {
        notificationElement.classList.add('lose');
        imageUrl = 'i/mistake.png';
    } else if (status === 'error') {
        notificationElement.classList.add('error');
        imageUrl = 'i/error.png';
    } else if (status === 'message') {
        notificationElement.classList.add('message');
        imageUrl = 'i/message.png';
    }
    notificationElement.innerHTML = ` ${message}`;
    notificationElement.classList.add('show');
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
}

function showConfettiEffect() {
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    (function frame() {
        confetti({
            particleCount: 8,
            angle: 90,
            spread: 160,
            startVelocity: 40,
            gravity: 1,
            origin: {
                x: Math.random(),
                y: 0,
            },
            colors: ['#1F1F1F', '#3A3A3A', '#2D83EC', '#A6B1E1', '#6272A4'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

function navigateToScreen(screenId) {
    if (uiElements.contentScreens) {
        uiElements.contentScreens.forEach(screen => screen.classList.remove('active'));
    }
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
    const footerMenu = document.querySelector('.menu');
    if (footerMenu) footerMenu.style.display = 'flex';
}

async function loadFriendsList() {
    const userId = uiElements.userTelegramIdDisplay.innerText;
    const noFriendsMessage = document.getElementById('noFriendsMessage');
    const friendsListDisplay = uiElements.friendsListDisplay;
    if (!userId) {
        console.error("User ID is missing.");
        friendsListDisplay.innerHTML = `Error: Unable to load friends list. Please try again later.`;
        return;
    }
    try {
        const { data, error } = await supabase.from('users').select('invites').eq('telegram_id', userId).single();
        if (error) {
            console.error('Error fetching friends list:', error.message);
            friendsListDisplay.innerHTML = `Error: Unable to fetch friends at the moment.`;
            return;
        }
        if (data && data.invites && Array.isArray(data.invites) && data.invites.length > 0) {
            friendsListDisplay.innerHTML = '';
            noFriendsMessage.style.display = 'none';
            const uniqueInvites = [...new Set(data.invites)];
            const limitedInvites = uniqueInvites.slice(0, 10);
            const friendsPromises = limitedInvites.map(async friendId => {
                const { data: friendData, error: friendError } = await supabase.from('users').select('telegram_id, username, balance').eq('telegram_id', friendId).single();
                if (friendError) {
                    console.error(`Error fetching data for friend ${friendId}:`, friendError.message);
                    return null;
                }
                return friendData;
            });
            const friendsData = await Promise.all(friendsPromises);
            friendsData.forEach(friend => {
                if (friend) {
                    const li = document.createElement('li');
                    li.classList.add('friend-item');
                    const img = document.createElement('img');
                    img.src = friend.username ? `https://t.me/i/userpic/320/${friend.username}.svg` : 'i/users.jpg';
                    img.alt = `${friend.telegram_id} Avatar`;
                    img.classList.add('friend-avatar');
                    const span = document.createElement('span');
                    span.classList.add('friend-name');
                    span.textContent = `ID : ${friend.telegram_id}`;
                    const balanceSpan = document.createElement('span');
                    balanceSpan.classList.add('friend-balance');
                    balanceSpan.textContent = `${formatNumber(friend.balance)} $SPARK`;
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
        friendsListDisplay.innerHTML = `Error: Unexpected issue occurred while loading friends.`;
    }
}

function copyInviteLink() {
    const inviteLink = `https://t.me/SPaRKaIRoBot?start=${uiElements.userTelegramIdDisplay?.innerText || ''}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
        showNotification(uiElements.copyInviteNotification, 'Invite link  Has been copied!');
    }).catch(err => {
        showNotification(uiElements.purchaseNotification, 'Failed to copy invite link.');
    });
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './Scripts/config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function openTelegramChat() {
    const inviteLink = `https://t.me/share/url?text=Join spark and earn 5,000 $SPARK!&url=https://t.me/SPaRKaIRoBot?start=${uiElements.userTelegramIdDisplay?.innerText || ''}`;
    window.open(inviteLink, '_blank');
}
