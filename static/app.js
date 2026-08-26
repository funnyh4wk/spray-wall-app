const firebaseConfig = {
    apiKey: "AIzaSyCktyBrBt6plVunjtEkBPg8RAMsLUbU5eQ",
    authDomain: "spray-wall-v2.firebaseapp.com",
    databaseURL: "https://spray-wall-v2-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "spray-wall-v2",
    storageBucket: "spray-wall-v2.firebasestorage.app",
    messagingSenderId: "448869831046",
    appId: "1:448869831046:web:8471c5e855e3dbf6599c07"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

const MASTER_EMAIL = "funnyh4wk@gmail.com"; 
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23374151' d='M24 0H0v24h24z'/%3E%3Cpath fill='%239CA3AF' d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for(let registration of registrations) { registration.unregister(); }
    });
}

const ALL_GRADES = ["1", "2", "3", "4", "5", "5+", "6A", "6A+", "6B", "6B+", "6C", "6C+", "7A", "7A+", "7B", "7B+", "7C", "7C+", "8A", "8A+", "8B", "8B+", "8C"];
let currentGymId = null;
let currentGymRole = 'user';
let currentTab = 'official';
let wizardColor = 'green';
let wizardMarkers = [];
let currentBoulderId = null;
let currentOtherUserId = null;
let gymSectors = {};
let currentSector = 'all';
let currentGradeFilter = 'all';
let currentClimbersData = [];
let profileBackTarget = 'home'; 
let logbookSelectedDate = null; 
let isOpLiked = false; 

// 🔥 КОСМЕТИКА: БАЗА ПРЕДМЕТОВ (40 ШТУК) 🔥
let currentStoreTab = 'backgrounds';
let currentInvTab = 'backgrounds';
let currentGiftItemId = null;

const STORE_ITEMS = [
    // Backgrounds (10 шт)
    { id: 'bg_dark', type: 'backgrounds', name: 'Dark Slate', rarity: 'Common', price: 5000, cssClass: 'bg-dark-slate', color: 'text-gray-400' },
    { id: 'bg_chalk', type: 'backgrounds', name: 'Chalk Dust', rarity: 'Common', price: 5000, cssClass: 'bg-chalk', color: 'text-gray-400' },
    { id: 'bg_ocean', type: 'backgrounds', name: 'Deep Ocean', rarity: 'Rare', price: 15000, cssClass: 'bg-ocean', color: 'text-blue-400' },
    { id: 'bg_hex', type: 'backgrounds', name: 'Hexagon', rarity: 'Rare', price: 15000, cssClass: 'bg-hex', color: 'text-blue-400' },
    { id: 'bg_topo', type: 'backgrounds', name: 'Topographic Map', rarity: 'Epic', price: 50000, cssClass: 'bg-topo', color: 'text-purple-400' },
    { id: 'bg_neon', type: 'backgrounds', name: 'Neon Cyber-Grid', rarity: 'Epic', price: 50000, cssClass: 'bg-neon', color: 'text-purple-400' },
    { id: 'bg_matrix', type: 'backgrounds', name: 'Hacker Rain', rarity: 'Epic', price: 50000, cssClass: 'bg-matrix', color: 'text-purple-400' },
    { id: 'bg_ember', type: 'backgrounds', name: 'Ember Particles', rarity: 'Legendary', price: 150000, cssClass: 'bg-ember', color: 'text-yellow-400' },
    { id: 'bg_void', type: 'backgrounds', name: 'Abyssal Void', rarity: 'Legendary', price: 150000, cssClass: 'bg-void', color: 'text-yellow-400' },
    { id: 'bg_rgb', type: 'backgrounds', name: 'RGB Synthwave', rarity: 'Mythic', price: 300000, cssClass: 'bg-rgb', color: 'text-red-500' },

    // Borders (10 шт)
    { id: 'b_white', type: 'borders', name: 'Chalk White', rarity: 'Common', price: 5000, cssClass: 'b-white', color: 'text-gray-400' },
    { id: 'b_steel', type: 'borders', name: 'Steel Ring', rarity: 'Common', price: 5000, cssClass: 'b-steel', color: 'text-gray-400' },
    { id: 'b_ruby', type: 'borders', name: 'Ruby Red', rarity: 'Rare', price: 15000, cssClass: 'b-ruby', color: 'text-blue-400' },
    { id: 'b_emerald', type: 'borders', name: 'Emerald Glow', rarity: 'Rare', price: 15000, cssClass: 'b-emerald', color: 'text-blue-400' },
    { id: 'b_sapphire', type: 'borders', name: 'Sapphire Pulse', rarity: 'Epic', price: 50000, cssClass: 'b-sapphire', color: 'text-purple-400' },
    { id: 'b_toxic', type: 'borders', name: 'Toxic Hazard', rarity: 'Epic', price: 50000, cssClass: 'b-toxic', color: 'text-purple-400' },
    { id: 'b_cyber', type: 'borders', name: 'Cyber Neon', rarity: 'Epic', price: 50000, cssClass: 'b-cyber', color: 'text-purple-400' },
    { id: 'b_gold', type: 'borders', name: 'Golden Aura', rarity: 'Legendary', price: 150000, cssClass: 'b-gold', color: 'text-yellow-400' },
    { id: 'b_magma', type: 'borders', name: 'Magma Ring', rarity: 'Legendary', price: 150000, cssClass: 'b-magma', color: 'text-yellow-400' },
    { id: 'b_glitch', type: 'borders', name: 'Glitch Border', rarity: 'Mythic', price: 300000, cssClass: 'b-glitch', color: 'text-red-500' },

    // Names (10 шт)
    { id: 'n_iron', type: 'names', name: 'Iron Slate', rarity: 'Common', price: 5000, cssClass: 'n-iron', color: 'text-gray-400' },
    { id: 'n_blood', type: 'names', name: 'Crimson Blood', rarity: 'Common', price: 5000, cssClass: 'n-blood', color: 'text-gray-400' },
    { id: 'n_ocean', type: 'names', name: 'Ocean Wave', rarity: 'Rare', price: 15000, cssClass: 'n-ocean', color: 'text-blue-400' },
    { id: 'n_forest', type: 'names', name: 'Forest Spirit', rarity: 'Rare', price: 15000, cssClass: 'n-forest', color: 'text-blue-400' },
    { id: 'n_cyber', type: 'names', name: 'Cyberpunk', rarity: 'Epic', price: 50000, cssClass: 'n-cyber', color: 'text-purple-400' },
    { id: 'n_hacker', type: 'names', name: 'Hacker Terminal', rarity: 'Epic', price: 50000, cssClass: 'n-hacker', color: 'text-purple-400' },
    { id: 'n_neon', type: 'names', name: 'Neon Pink', rarity: 'Epic', price: 50000, cssClass: 'n-neon', color: 'text-purple-400' },
    { id: 'n_ghost', type: 'names', name: 'Ghost', rarity: 'Legendary', price: 150000, cssClass: 'n-ghost', color: 'text-yellow-400' },
    { id: 'n_gold', type: 'names', name: 'VIP Gold', rarity: 'Legendary', price: 150000, cssClass: 'n-gold', color: 'text-yellow-400' },
    { id: 'n_rgb', type: 'names', name: 'Rainbow RGB', rarity: 'Mythic', price: 300000, cssClass: 'n-rgb', color: 'text-red-500' },

    // Cards / Panels (10 шт)
    { id: 'c_iron', type: 'cards', name: 'Iron Slate', rarity: 'Common', price: 5000, cssClass: 'c-iron', color: 'text-gray-400' },
    { id: 'c_chalk', type: 'cards', name: 'Chalk Outline', rarity: 'Common', price: 5000, cssClass: 'c-chalk', color: 'text-gray-400' },
    { id: 'c_neon', type: 'cards', name: 'Neon Edge', rarity: 'Rare', price: 15000, cssClass: 'c-neon', color: 'text-blue-400' },
    { id: 'c_crimson', type: 'cards', name: 'Crimson Glow', rarity: 'Rare', price: 15000, cssClass: 'c-crimson', color: 'text-blue-400' },
    { id: 'c_jungle', type: 'cards', name: 'Overgrown Vines', rarity: 'Epic', price: 50000, cssClass: 'c-jungle', color: 'text-purple-400' },
    { id: 'c_cyber', type: 'cards', name: 'Cyber Circuit', rarity: 'Epic', price: 50000, cssClass: 'c-cyber', color: 'text-purple-400' },
    { id: 'c_gold', type: 'cards', name: 'Golden Frame', rarity: 'Legendary', price: 150000, cssClass: 'c-gold', color: 'text-yellow-400' },
    { id: 'c_magma', type: 'cards', name: 'Magma Crack', rarity: 'Legendary', price: 150000, cssClass: 'c-magma', color: 'text-yellow-400' },
    { id: 'c_void', type: 'cards', name: 'Void Edge', rarity: 'Legendary', price: 150000, cssClass: 'c-void', color: 'text-yellow-400' },
    { id: 'c_rgb', type: 'cards', name: 'RGB Gamer', rarity: 'Mythic', price: 300000, cssClass: 'c-rgb', color: 'text-red-500' }
];

const RANKS = [
    { id: 0, title: "Rookie", minPts: 0, minGrade: "1", color: "text-gray-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 mr-1.5"><path d="M5 19L12 5l7 14H5z"/></svg>` },
    { id: 1, title: "Plastic Puller", minPts: 300, minGrade: "4", color: "text-orange-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 mr-1.5"><path d="M12 2L3 12l9 10 9-10L12 2zm0 6l4.5 4-4.5 4-4.5-4L12 8z"/></svg>` },
    { id: 2, title: "Crimper", minPts: 1500, minGrade: "5+", color: "text-gray-300", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 mr-1.5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l8-8 8 8"/></svg>` },
    { id: 3, title: "Steel Fingers", minPts: 5000, minGrade: "6B+", color: "text-yellow-500", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 mr-1.5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 18l8-8 8 8M4 10l8-8 8 8"/></svg>` },
    { id: 4, title: "Beast", minPts: 15000, minGrade: "7A", color: "text-cyan-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 mr-1.5"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 4.5l4 3-4 6-4-6 4-3z"/></svg>` },
    { id: 5, title: "Titan", minPts: 40000, minGrade: "7C", color: "text-yellow-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 mr-1.5"><path d="M2 19h20v2H2v-2zm1-2l3-11 4 5 2-8 2 8 4-5 3 11H3z"/></svg>` }
];

function getLeagueInfo(points, maxGrade) {
    let maxGradeIdx = ALL_GRADES.indexOf(maxGrade);
    if (maxGradeIdx === -1) maxGradeIdx = 0;
    
    let currentRankId = 0;
    for(let i = 1; i < RANKS.length; i++) {
        let reqGradeIdx = ALL_GRADES.indexOf(RANKS[i].minGrade);
        if (points >= RANKS[i].minPts && maxGradeIdx >= reqGradeIdx) { currentRankId = i; } else { break; }
    }
    
    let current = RANKS[currentRankId];
    let next = currentRankId < RANKS.length - 1 ? RANKS[currentRankId + 1] : null;
    let percent = 100;
    let isBossLocked = false;
    
    if (next) {
        let reqGradeIdx = ALL_GRADES.indexOf(next.minGrade);
        if (points >= next.minPts && maxGradeIdx < reqGradeIdx) {
            isBossLocked = true;
            percent = 100;
        } else {
            let pointsEarned = points - current.minPts;
            let pointsNeeded = next.minPts - current.minPts;
            percent = Math.min(100, Math.max(0, (pointsEarned / pointsNeeded) * 100));
        }
    }
    return { current, next, percent, isBossLocked };
}

function normArr(d) {
    if (!d) return [];
    if (Array.isArray(d)) return d.filter(x => x !== null);
    if (typeof d === 'object') return Object.values(d).filter(x => x !== null);
    return [];
}

function compressImageToBase64(file, maxDimension = 1200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxDimension || h > maxDimension) {
                    if (w > h) { h = Math.round((h * maxDimension) / w); w = maxDimension; } 
                    else { w = Math.round((w * maxDimension) / h); h = maxDimension; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = e => reject(e);
        };
        reader.onerror = e => reject(e);
    });
}

async function directCloudinaryUpload(base64String) {
    const formData = new FormData();
    formData.append("file", base64String);
    formData.append("upload_preset", "spraywall_preset");

    const res = await fetch("https://api.cloudinary.com/v1_1/hz7ii1gc/image/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || "Cloudinary Error");
}

function showNotify(msg, isError = false) {
    const box = document.getElementById('notify-box');
    box.innerText = msg;
    box.className = `fixed top-5 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded font-bold shadow-lg transition-opacity duration-300 z-[100] uppercase tracking-widest text-[10px] border ${isError ? 'bg-red-900 border-red-500 text-red-100' : 'bg-green-900 border-green-500 text-green-100'}`;
    box.style.opacity = '1'; 
    setTimeout(() => box.style.opacity = '0', 4000);
}

async function getAuthToken() {
    if (auth.currentUser) return await auth.currentUser.getIdToken();
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (user) user.getIdToken().then(resolve).catch(() => resolve(""));
            else resolve("");
        });
    });
}

async function apiCall(endpoint, payload = {}) {
    try {
        let token = await getAuthToken();
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { showNotify("Error: " + (data.detail || "Server error"), true); return null; }
        return data;
    } catch(e) { showNotify("Network Error", true); return null; }
}

function getPoints(history) {
    let total = 0;
    history.forEach(a => {
        if (a.route_type === 'custom' || a.route_type === 'climbers') return;
        const g = a.grade; if (!g) return;
        const idx = ALL_GRADES.indexOf(g); if (idx === -1) return;
        if (idx <= ALL_GRADES.indexOf("4")) total += 10;
        else if (idx <= ALL_GRADES.indexOf("5+")) total += 25;
        else if (idx <= ALL_GRADES.indexOf("6B")) total += 50;
        else if (idx <= ALL_GRADES.indexOf("6C+")) total += 100;
        else if (idx <= ALL_GRADES.indexOf("7B")) total += 250;
        else total += 500;
    }); 
    return total;
}

// 🔥 ГЛОБАЛЬНАЯ ПРИМЕНЯЛКА КОСМЕТИКИ 🔥
function applyCosmetics(profileObj, avatarEl, nameEl) {
    if(!profileObj) return;
    if(!profileObj.equipped) profileObj.equipped = {};
    
    // Background Global
    const bgApp = document.getElementById('app-bg');
    if(bgApp) {
        bgApp.className = "fixed inset-0 z-[-1] transition-all duration-1000 pointer-events-none bg-default";
        if(profileObj.equipped.backgrounds) {
            const bgItem = STORE_ITEMS.find(i => i.id === profileObj.equipped.backgrounds);
            if(bgItem) bgApp.className = `fixed inset-0 z-[-1] transition-all duration-1000 pointer-events-none ${bgItem.cssClass}`;
        }
    }

    // Avatar
    if(avatarEl) {
        avatarEl.className = "w-24 h-24 rounded-full object-cover bg-black shadow-lg transition-all duration-300 border-2 border-gray-700";
        if(profileObj.equipped.borders) {
            const item = STORE_ITEMS.find(i => i.id === profileObj.equipped.borders);
            if(item) avatarEl.className = `w-24 h-24 rounded-full object-cover bg-black shadow-lg transition-all duration-300 ${item.cssClass}`;
        }
    }

    // Name
    if(nameEl) {
        nameEl.className = "text-xl font-black uppercase tracking-wider text-center transition-all duration-300 text-white";
        if(profileObj.equipped.names) {
            const item = STORE_ITEMS.find(i => i.id === profileObj.equipped.names);
            if(item) nameEl.className = `text-xl font-black uppercase tracking-wider text-center transition-all duration-300 ${item.cssClass}`;
        }
    }

    // Cards (Серые Квадратики)
    const cards = document.querySelectorAll('.cosmetic-card');
    cards.forEach(card => {
        let baseClass = card.getAttribute('data-base-class');
        if (!baseClass) {
            baseClass = card.className;
            card.setAttribute('data-base-class', baseClass);
        }
        
        if (profileObj.equipped && profileObj.equipped.cards) {
            const item = STORE_ITEMS.find(i => i.id === profileObj.equipped.cards);
            if(item) {
                card.className = baseClass + ' ' + item.cssClass;
            } else {
                card.className = baseClass;
            }
        } else {
            card.className = baseClass;
        }
    });
}

function toggleMenu() { 
    document.getElementById('drawer').classList.toggle('-translate-x-full'); 
    document.getElementById('drawer-overlay').classList.toggle('hidden-view'); 
}

function showView(viewId) {
    document.querySelectorAll('.w-full.max-w-md > div[id^="view-"]').forEach(el => el.classList.add('hidden-view'));
    document.getElementById(viewId).classList.remove('hidden-view');
    const appBar = document.getElementById('app-bar');
    if(viewId === 'view-auth' || viewId === 'view-onboarding') appBar.classList.add('hidden-view'); 
    else appBar.classList.remove('hidden-view');
}

function navigate(viewName) {
    if(!document.getElementById('drawer').classList.contains('-translate-x-full')) toggleMenu();
    if(viewName === 'home') { loadHomeView(); showView('view-home'); }
    else if(viewName === 'friends') { loadFriendsView(); showView('view-friends'); }
    else if(viewName === 'gyms') { loadGymsView(); showView('view-gyms'); }
    else if(viewName === 'gym-routes') { showView('view-gym-routes'); switchTab(currentTab); }
    else if(viewName === 'settings') { showView('view-settings'); }
    else if(viewName === 'super-admin') { showView('view-super-admin'); }
    else if(viewName === 'league') { loadLeagueView(); showView('view-league'); }
    else if(viewName === 'store') { loadStoreView(); showView('view-store'); }
    else if(viewName === 'inventory') { loadInventoryView(); showView('view-inventory'); }
}

let isLoginMode = true;
function switchAuthMode() {
    isLoginMode = !isLoginMode; 
    document.getElementById('auth-title').innerText = isLoginMode ? "Login" : "Sign Up";
    document.getElementById('auth-btn').innerText = isLoginMode ? "Login" : "Create Account";
    document.getElementById('auth-switch').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('confirm-pwd-container').classList.toggle('hidden-view', isLoginMode);
}

function togglePassword(inId, openId, clId) {
    const pwdInput = document.getElementById(inId), eyeOpen = document.getElementById(openId), eyeClosed = document.getElementById(clId);
    if (pwdInput.type === 'password') { 
        pwdInput.type = 'text'; eyeOpen.classList.add('hidden-view'); eyeClosed.classList.remove('hidden-view'); 
    } else { 
        pwdInput.type = 'password'; eyeOpen.classList.remove('hidden-view'); eyeClosed.classList.add('hidden-view'); 
    }
}

async function processAuth() {
    const rawEmail = document.getElementById('auth-email').value.trim();
    const pwd = document.getElementById('auth-password').value.trim();
    if(!rawEmail || !pwd) return showNotify("Fill all fields", true);
    
    if (!isLoginMode) {
        const pwdConfirm = document.getElementById('auth-password-confirm').value.trim();
        if (pwd !== pwdConfirm) return showNotify("Passwords match failed", true);
        try {
            showNotify("Creating account...");
            const userCred = await auth.createUserWithEmailAndPassword(rawEmail, pwd);
            await userCred.user.sendEmailVerification();
            const profile = { user_id: userCred.user.uid, email: rawEmail, name: "", bio: "Bouldering Enthusiast", avatar_url: "", is_global_admin: false, can_create_gyms: false, coins: 0, inventory: [], equipped: {} };
            const res = await apiCall('/api/db/save', { path: `users/${userCred.user.uid}`, payload: profile });
            if (!res) return;
            localStorage.setItem('user_profile', JSON.stringify(profile)); 
            showNotify("Account created. Verify email.", false); 
            showView('view-onboarding'); 
        } catch (error) { showNotify("Auth Error", true); }
    } else {
        try {
            showNotify("Logging in...");
            const userCred = await auth.signInWithEmailAndPassword(rawEmail, pwd);
            if (!userCred.user.emailVerified) return showNotify("Verify your email first!", true);
            let profile = await apiCall('/api/db/get', { path: `users/${userCred.user.uid}` });
            if (!profile || profile.detail || !profile.name) {
                profile = profile || { user_id: userCred.user.uid, email: rawEmail, name: "", bio: "", avatar_url: "", is_global_admin: false, can_create_gyms: false, coins: 0, inventory: [], equipped: {} };
                localStorage.setItem('user_profile', JSON.stringify(profile)); 
                showView('view-onboarding'); 
                return;
            }
            if (rawEmail.toLowerCase() === MASTER_EMAIL.toLowerCase() && !profile.is_global_admin) { 
                profile.is_global_admin = true; 
                await apiCall('/api/db/save', { path: `users/${userCred.user.uid}/is_global_admin`, payload: true }); 
            }
            profile.ascents_history = normArr(await apiCall('/api/db/get', { path: `user_ascents/${userCred.user.uid}` }));
            localStorage.setItem('user_profile', JSON.stringify(profile)); 
            loadHomeView(); 
            showView('view-home'); 
        } catch (error) { showNotify("Login Failed", true); }
    }
}

async function googleSignIn() {
    try {
        showNotify("Connecting to Google...");
        const userCred = await auth.signInWithPopup(googleProvider);
        let profile = await apiCall('/api/db/get', { path: `users/${userCred.user.uid}` });
        if (!profile || profile.detail) {
            const fallbackName = userCred.user.email ? userCred.user.email.split('@')[0] : "Climber";
            const displayName = userCred.user.displayName || fallbackName;
            profile = { user_id: userCred.user.uid, email: userCred.user.email, name: fallbackName, first_name: displayName.split(" ")[0] || "", last_name: displayName.split(" ").slice(1).join(" ") || "", bio: "Bouldering Enthusiast", avatar_url: userCred.user.photoURL || "", is_global_admin: false, can_create_gyms: false, coins: 0, inventory: [], equipped: {} };
            const res = await apiCall('/api/db/save', { path: `users/${userCred.user.uid}`, payload: profile });
            if (!res) return;
        }
        if (userCred.user.email && userCred.user.email.toLowerCase() === MASTER_EMAIL.toLowerCase() && !profile.is_global_admin) { 
            profile.is_global_admin = true; 
            await apiCall('/api/db/save', { path: `users/${userCred.user.uid}/is_global_admin`, payload: true }); 
        }
        profile.ascents_history = normArr(await apiCall('/api/db/get', { path: `user_ascents/${userCred.user.uid}` }));
        localStorage.setItem('user_profile', JSON.stringify(profile)); 
        loadHomeView(); 
        showView('view-home'); 
    } catch (error) { showNotify("Google Auth Failed", true); }
}

function logout() { 
    auth.signOut(); 
    localStorage.removeItem('user_profile'); 
    document.getElementById('auth-email').value = ''; 
    document.getElementById('auth-password').value = ''; 
    document.getElementById('auth-password-confirm').value = ''; 
    showView('view-auth'); 
}

async function uploadOnboardAvatar(input) {
    let fileObj = input.files[0]; if(!fileObj) return; 
    showNotify("Uploading...");
    try { 
        const base64Str = await compressImageToBase64(fileObj, 600); 
        const imageUrl = await directCloudinaryUpload(base64Str);
        let profile = JSON.parse(localStorage.getItem('user_profile'));
        profile.avatar_url = imageUrl; 
        localStorage.setItem('user_profile', JSON.stringify(profile));
        await apiCall('/api/db/save', { path: `users/${profile.user_id}/avatar_url`, payload: imageUrl });
        document.getElementById('onboard-avatar').src = imageUrl; 
        showNotify("Uploaded");
    } catch(err) { showNotify("Upload failed", true); }
}

async function uploadAvatar(input) {
    let fileObj = input.files[0]; if(!fileObj) return; 
    showNotify("Uploading...");
    try { 
        const base64Str = await compressImageToBase64(fileObj, 600); 
        const imageUrl = await directCloudinaryUpload(base64Str);
        let profile = JSON.parse(localStorage.getItem('user_profile'));
        profile.avatar_url = imageUrl; 
        localStorage.setItem('user_profile', JSON.stringify(profile));
        await apiCall('/api/db/save', { path: `users/${profile.user_id}/avatar_url`, payload: imageUrl });
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) profileAvatar.src = imageUrl;
        showNotify("Uploaded");
    } catch(err) { showNotify("Upload failed", true); }
}

async function loadWallPhoto(input) {
    let fileObj = input.files[0]; if(!fileObj) return; 
    showNotify("Uploading..."); 
    try { 
        const base64Str = await compressImageToBase64(fileObj, 1080); 
        const imageUrl = await directCloudinaryUpload(base64Str);
        document.getElementById('wizard-wall-img').src = imageUrl; 
        document.getElementById('detail-wall-img').src = imageUrl; 
        wizardStep(2); 
    } catch(err) { showNotify("Upload failed", true); }
}

async function completeOnboarding() {
    const nickname = document.getElementById('onb-nickname').value.trim(); 
    const realname = document.getElementById('onb-realname').value.trim(); 
    if (!nickname || !realname) return showNotify("Name required", true);
    
    const parts = realname.split(' ');
    let profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    profile.name = nickname; 
    profile.first_name = parts[0] || ''; 
    profile.last_name = parts.slice(1).join(' ') || '';
    const bio = document.getElementById('onb-bio').value.trim(); 
    if (bio) profile.bio = bio;
    
    const res = await apiCall('/api/db/save', { path: `users/${profile.user_id}`, method: "PUT", payload: profile });
    if (!res) return;
    localStorage.setItem('user_profile', JSON.stringify(profile)); 
    loadHomeView(); 
    showView('view-home'); 
}

function toggleEditProfile(show) {
    document.getElementById('profile-display').classList.toggle('hidden-view', show); 
    document.getElementById('profile-edit').classList.toggle('hidden-view', !show);
    if(show) {
        const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
        document.getElementById('edit-name').value = profile.name || ''; 
        document.getElementById('edit-realname').value = `${profile.first_name || ''} ${profile.last_name || ''}`.trim(); 
        document.getElementById('edit-bio').value = profile.bio || '';
    }
}

async function saveProfile() {
    const name = document.getElementById('edit-name').value.trim(); 
    if(!name) return showNotify("Name required", true);
    
    const parts = document.getElementById('edit-realname').value.trim().split(' ');
    let profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    profile.name = name; 
    profile.first_name = parts[0] || ''; 
    profile.last_name = parts.slice(1).join(' ') || ''; 
    profile.bio = document.getElementById('edit-bio').value.trim();
    
    const res = await apiCall('/api/db/save', { path: `users/${profile.user_id}`, method: "PUT", payload: profile });
    if (!res) return;
    localStorage.setItem('user_profile', JSON.stringify(profile)); 
    loadHomeView(); 
    toggleEditProfile(false); 
    showNotify("Saved!");
}

function renderGradeChart(containerId, gradesArray) {
    const chartContainer = document.getElementById(containerId); 
    chartContainer.innerHTML = '';
    const counts = {}; 
    gradesArray.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
    if (Object.keys(counts).length === 0) { 
        chartContainer.innerHTML = '<p class="text-gray-500 text-center w-full self-center text-[10px] uppercase tracking-wider">No ascents</p>'; 
        return; 
    }
    const maxCount = Math.max(...Object.values(counts));
    Object.keys(counts).sort((a,b) => ALL_GRADES.indexOf(a) - ALL_GRADES.indexOf(b)).forEach(grade => {
        const heightPercent = Math.max((counts[grade] / maxCount) * 100, 5); 
        chartContainer.innerHTML += `<div class="flex flex-col justify-end items-center flex-1 min-w-[24px] h-full mx-0.5"><span class="text-[8px] text-gray-400 mb-1">${counts[grade]}</span><div class="w-full bg-blue-500 rounded-t-sm transition-all duration-500 shadow-sm" style="height: ${heightPercent}%"></div><span class="text-[8px] font-bold mt-1 text-gray-300">${grade}</span></div>`;
    });
}

function renderLogbook() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const history = normArr(profile.ascents_history);
    const daysContainer = document.getElementById('logbook-days'); 
    const entriesContainer = document.getElementById('logbook-entries');
    daysContainer.innerHTML = ''; 
    
    const today = new Date(); 
    today.setHours(0,0,0,0);
    if(!logbookSelectedDate) logbookSelectedDate = today.getTime();
    
    for(let i=6; i>=0; i--) {
        const d = new Date(today); 
        d.setDate(today.getDate() - i);
        const dayAscents = history.filter(a => { 
            const ad = new Date(a.timestamp); ad.setHours(0,0,0,0); 
            return ad.getTime() === d.getTime(); 
        });
        const dot = dayAscents.length > 0 ? '<div class="w-1.5 h-1.5 bg-green-500 rounded-full mt-1"></div>' : '<div class="w-1.5 h-1.5 mt-1"></div>';
        const bgClass = (logbookSelectedDate === d.getTime()) ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700';
        daysContainer.innerHTML += `<button onclick="selectLogbookDate(${d.getTime()})" class="flex flex-col items-center justify-center min-w-[40px] p-2 rounded ${bgClass} hover:bg-gray-700 transition-colors"><span class="text-[8px] text-gray-300 uppercase tracking-widest">${d.toLocaleDateString('en-US', {weekday: 'short'})}</span><span class="font-bold text-sm leading-tight mt-0.5">${d.getDate()}</span>${dot}</button>`;
    }
    entriesContainer.innerHTML = '';
    const selectedAscents = history.filter(a => { 
        const ad = new Date(a.timestamp); 
        ad.setHours(0,0,0,0); 
        return ad.getTime() === logbookSelectedDate; 
    });
    
    if(selectedAscents.length === 0) {
        entriesContainer.innerHTML = '<p class="text-gray-500 text-[10px] uppercase tracking-wider text-center py-2">No ascents</p>';
    } else { 
        selectedAscents.forEach(a => { 
            const badge = '<span class="text-green-500 font-bold text-[10px] uppercase tracking-wider border border-green-500 px-1.5 py-0.5 rounded">Done</span>'; 
            entriesContainer.innerHTML += `<div class="flex justify-between items-center bg-gray-900 p-2.5 rounded border border-gray-800 shadow"><div><p class="font-bold text-xs uppercase tracking-wider">${a.boulder_name || 'Unnamed'}</p><p class="text-[10px] text-gray-400 mt-0.5">Grade: ${a.grade}</p></div>${badge}</div>`; 
        }); 
    }
}

function selectLogbookDate(t) { 
    logbookSelectedDate = t; 
    renderLogbook(); 
}

async function loadHomeView() {
    let localProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    if (!localProfile.user_id) return logout();
    
    try {
        let dbProfile = await apiCall('/api/db/get', { path: `users/${localProfile.user_id}` });
        if (dbProfile && !dbProfile.detail) {
            localProfile = { ...localProfile, ...dbProfile };
        }
    } catch(e) {}
    
    try {
        let ascents = await apiCall('/api/db/get', { path: `user_ascents/${localProfile.user_id}` });
        localProfile.ascents_history = normArr(ascents);
    } catch(e) { localProfile.ascents_history = localProfile.ascents_history || []; }
    
    if (!localProfile.inventory) localProfile.inventory = [];
    if (!localProfile.equipped) localProfile.equipped = {};
    if (localProfile.coins === undefined) localProfile.coins = 0;
    
    localStorage.setItem('user_profile', JSON.stringify(localProfile));
    let profile = localProfile;
    
    const appbarCoinsEl = document.getElementById('appbar-coins');
    if(appbarCoinsEl) appbarCoinsEl.innerText = profile.coins;
    
    const realNameStr = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.name || "UNKNOWN CLIMBER";
    const realNameEl = document.getElementById('profile-realname');
    realNameEl.innerText = realNameStr;
    document.getElementById('profile-name').innerText = `@${profile.nickname || profile.name || "user"}`;
    document.getElementById('profile-bio').innerText = profile.bio || "";
    
    const avatarEl = document.getElementById('profile-avatar');
    avatarEl.src = profile.avatar_url || DEFAULT_AVATAR;
    
    applyCosmetics(profile, avatarEl, realNameEl);
    
    document.getElementById('nav-super-admin').classList.toggle('hidden-view', !profile.is_global_admin);
    
    const history = profile.ascents_history; 
    document.getElementById('stat-total').innerText = history.length;
    
    const officialGrades = history.filter(a => a.route_type !== 'custom').map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const maxOfficialGrade = officialGrades.length ? officialGrades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, officialGrades[0]) : "1";
    
    const allGrades = history.map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const absoluteMaxGrade = allGrades.length ? allGrades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, allGrades[0]) : "-";
    document.getElementById('stat-max').innerText = absoluteMaxGrade;
    
    const totalPoints = getPoints(history); 
    const league = getLeagueInfo(totalPoints, maxOfficialGrade); 
    const rankEl = document.getElementById('profile-rank');
    rankEl.innerHTML = `<div class="flex items-center justify-center">${league.current.svg} <span>${league.current.title}</span> <span class="text-gray-500 text-[10px] ml-1.5 font-normal">(${totalPoints} PTS)</span></div>`;
    rankEl.className = `text-xs font-bold mt-1 uppercase tracking-widest cursor-pointer ${league.current.color}`;
    rankEl.onclick = () => navigate('league'); 
    
    const likes = await apiCall('/api/db/get', { path: `profile_likes/${profile.user_id}` }) || {}; 
    const likeKeys = Object.keys(likes).filter(k => likes[k]);
    document.getElementById('my-likes-count').innerText = likeKeys.length;
    
    const isUnlocked = profile.is_global_admin || history.length >= 20 || ALL_GRADES.indexOf(maxOfficialGrade) >= ALL_GRADES.indexOf("6B+");
    const lockBox = document.getElementById('my-likes-lock'); 
    const listObj = document.getElementById('my-likes-list');
    
    if (isUnlocked) { 
        lockBox.classList.add('hidden-view'); 
        if (likeKeys.length > 0) { 
            listObj.classList.remove('hidden-view'); 
            const allUsers = await apiCall('/api/db/get', { path: `users` }) || {}; 
            listObj.innerHTML = likeKeys.map(uid => allUsers[uid] ? `<p class="text-gray-300 font-bold tracking-wider text-[10px] uppercase mb-1">• @${allUsers[uid].nickname || allUsers[uid].name}</p>` : '').join(''); 
        } else { 
            listObj.classList.add('hidden-view'); 
        } 
    } else { 
        lockBox.classList.remove('hidden-view'); 
        listObj.classList.add('hidden-view'); 
    }
    
    renderGradeChart('stat-chart', allGrades); 
    renderLogbook(); 
    loadFriendRequests();
}

async function loadFriendRequests() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const reqs = await apiCall('/api/db/get', { path: `friend_requests/${profile.user_id}` });
    const box = document.getElementById('friend-requests-box'); 
    const list = document.getElementById('friend-requests-list'); 
    list.innerHTML = '';
    
    let validReqs = {};
    if (Array.isArray(reqs)) { 
        reqs.forEach((val, idx) => { if (val) validReqs[idx] = val; }); 
    } else if (typeof reqs === 'object' && reqs !== null) { 
        for (let key in reqs) { if (reqs[key]) validReqs[key] = reqs[key]; } 
    }
    
    if(Object.keys(validReqs).length === 0) { box.classList.add('hidden-view'); return; }
    box.classList.remove('hidden-view'); 
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {};
    
    for(let senderId in validReqs) {
        const u = allUsers[senderId]; 
        if(!u || !u.name) { 
            await apiCall('/api/db/save', { path: `friend_requests/${profile.user_id}/${senderId}`, method: "DELETE" }); 
            continue; 
        }
        list.innerHTML += `<div class="flex justify-between items-center bg-gray-900 p-2.5 rounded border border-gray-800"><span class="font-bold tracking-wider text-xs uppercase">@${u.nickname || u.name}</span><div><button onclick="acceptFriend('${senderId}', true)" class="bg-green-600 px-3 py-1.5 rounded text-[10px] mr-2 font-bold transition-colors uppercase tracking-wider">Accept</button><button onclick="acceptFriend('${senderId}', false)" class="bg-gray-700 px-3 py-1.5 rounded text-[10px] font-bold transition-colors uppercase tracking-wider border border-gray-600">Decline</button></div></div>`;
    }
    if(list.innerHTML === '') box.classList.add('hidden-view');
}

async function acceptFriend(senderId, accept) {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const res = await apiCall('/api/db/save', { path: `friend_requests/${profile.user_id}/${senderId}`, method: "DELETE" }); 
    if (!res) return;
    
    if(accept) { 
        await apiCall('/api/db/save', { path: `friends/${profile.user_id}/${senderId}`, payload: true }); 
        await apiCall('/api/db/save', { path: `friends/${senderId}/${profile.user_id}`, payload: true }); 
        showNotify("Friend added"); 
    }
    loadFriendRequests();
}

function switchInventoryTab(tab) {
    currentInvTab = tab;
    ['backgrounds', 'borders', 'names', 'cards'].forEach(t => {
        const btn = document.getElementById(`inv-tab-${t}`);
        if(btn) {
            if(t === tab) { btn.classList.add('bg-blue-600'); btn.classList.remove('bg-gray-800', 'border-gray-700'); }
            else { btn.classList.add('bg-gray-800', 'border', 'border-gray-700'); btn.classList.remove('bg-blue-600'); }
        }
    });
    renderInventoryItems();
}

function loadInventoryView() {
    switchInventoryTab('backgrounds');
}

function renderInventoryItems() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    
    const inv = profile.inventory || [];
    const itemsToShow = STORE_ITEMS.filter(i => inv.includes(i.id) && i.type === currentInvTab);
    
    if(itemsToShow.length === 0) {
        list.innerHTML = `<p class="text-gray-500 text-center mt-10 uppercase text-[10px] tracking-widest">No ${currentInvTab} in inventory</p>`;
        return;
    }

    itemsToShow.forEach(item => {
        const isEquipped = profile.equipped && profile.equipped[item.type] === item.id;
        
        let actionButtons = '';
        if(isEquipped) {
            actionButtons = `<button onclick="equipItem('${item.id}', '${item.type}', false)" class="w-full bg-red-900 hover:bg-red-800 border border-red-700 text-red-100 py-2 rounded text-[10px] font-bold uppercase tracking-widest mt-2 shadow transition-colors">Unequip</button>`;
        } else {
            actionButtons = `<button onclick="equipItem('${item.id}', '${item.type}', true)" class="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-[10px] font-bold uppercase tracking-widest mt-2 shadow transition-colors">Equip</button>`;
        }

        let previewHtml = '';
        if (item.type === 'backgrounds') previewHtml = `<div class="w-full h-16 rounded-t-lg bg-gray-900 ${item.cssClass} mb-3 border-b border-gray-700"></div>`;
        else if (item.type === 'borders') previewHtml = `<div class="w-12 h-12 rounded-full bg-gray-900 ${item.cssClass} mx-auto mb-2 mt-2"></div>`;
        else if (item.type === 'names') previewHtml = `<div class="text-center font-black text-sm mb-2 mt-4 uppercase tracking-widest ${item.cssClass}">Example</div>`;
        else if (item.type === 'cards') previewHtml = `<div class="w-full h-12 rounded bg-gray-800 ${item.cssClass} mb-3 flex items-center justify-center"><span class="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Panel</span></div>`;

        list.innerHTML += `
        <div class="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700 flex flex-col ${isEquipped ? 'ring-2 ring-blue-500' : ''}">
            ${previewHtml}
            <div class="text-center mb-1"><span class="font-black uppercase tracking-wider text-xs text-white">${item.name}</span></div>
            <div class="text-center mb-1"><span class="text-[8px] uppercase tracking-widest font-bold ${item.color}">${item.rarity}</span></div>
            ${actionButtons}
        </div>`;
    });
}

async function equipItem(itemId, type, equip) {
    let profile = JSON.parse(localStorage.getItem('user_profile'));
    if(!profile.equipped) profile.equipped = {};
    
    if(equip) profile.equipped[type] = itemId;
    else delete profile.equipped[type];
    
    await apiCall('/api/db/save', { path: `users/${profile.user_id}/equipped`, payload: profile.equipped });
    localStorage.setItem('user_profile', JSON.stringify(profile));
    
    applyCosmetics(profile, document.getElementById('profile-avatar'), document.getElementById('profile-realname'));
    
    renderInventoryItems();
    showNotify(equip ? "Equipped" : "Unequipped");
}

function switchStoreTab(tab) {
    currentStoreTab = tab;
    ['backgrounds', 'borders', 'names', 'cards'].forEach(t => {
        const btn = document.getElementById(`store-tab-${t}`);
        if(btn) {
            if(t === tab) { btn.classList.add('bg-blue-600'); btn.classList.remove('bg-gray-800', 'border-gray-700'); }
            else { btn.classList.add('bg-gray-800', 'border', 'border-gray-700'); btn.classList.remove('bg-blue-600'); }
        }
    });
    renderStoreItems();
}

function loadStoreView() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    document.getElementById('store-coins-display').innerText = profile.coins || 0;
    switchStoreTab('backgrounds');
}

function renderStoreItems() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const list = document.getElementById('store-list');
    list.innerHTML = '';
    
    const itemsToShow = STORE_ITEMS.filter(i => i.type === currentStoreTab);

    itemsToShow.forEach(item => {
        const isOwned = (profile.inventory || []).includes(item.id);
        let displayPrice = profile.is_global_admin ? 'FREE' : `${item.price.toLocaleString()} C`;
        
        let actionButtons = '';
        
        if(isOwned) {
            actionButtons = `
            <div class="flex space-x-2 mt-2">
                <div class="flex-[2] bg-green-900 border border-green-700 text-green-100 py-2 rounded text-[10px] font-bold uppercase tracking-widest shadow flex items-center justify-center">Owned</div>
                <button onclick="openGiftModal('${item.id}')" class="flex-1 bg-pink-600 hover:bg-pink-500 py-2 rounded text-[10px] font-bold uppercase tracking-widest shadow border border-pink-500 text-pink-50 transition-colors">Gift</button>
            </div>`;
        } else {
            actionButtons = `
            <div class="flex space-x-2 mt-2">
                <button onclick="buyItem('${item.id}')" class="flex-[2] bg-yellow-600 hover:bg-yellow-500 py-2 rounded text-[10px] font-bold uppercase tracking-widest shadow border border-yellow-500 text-yellow-50 transition-colors">Buy</button>
                <button onclick="openGiftModal('${item.id}')" class="flex-1 bg-pink-600 hover:bg-pink-500 py-2 rounded text-[10px] font-bold uppercase tracking-widest shadow border border-pink-500 text-pink-50 transition-colors">Gift</button>
            </div>`;
        }

        let previewHtml = '';
        if (item.type === 'backgrounds') previewHtml = `<div class="w-full h-16 rounded-t-lg bg-gray-900 ${item.cssClass} mb-3 border-b border-gray-700"></div>`;
        else if (item.type === 'borders') previewHtml = `<div class="w-12 h-12 rounded-full bg-gray-900 ${item.cssClass} mx-auto mb-2 mt-2"></div>`;
        else if (item.type === 'names') previewHtml = `<div class="text-center font-black text-sm mb-2 mt-4 uppercase tracking-widest ${item.cssClass}">Example</div>`;
        else if (item.type === 'cards') previewHtml = `<div class="w-full h-12 rounded bg-gray-800 ${item.cssClass} mb-3 flex items-center justify-center"><span class="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Panel</span></div>`;

        list.innerHTML += `
        <div class="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700 flex flex-col">
            ${previewHtml}
            <div class="text-center mb-1"><span class="font-black uppercase tracking-wider text-xs text-white">${item.name}</span></div>
            <div class="flex justify-between items-center px-1 mb-1 mt-1 border-t border-gray-700 pt-2">
                <span class="text-[8px] uppercase tracking-widest font-bold ${item.color}">${item.rarity}</span>
                <span class="text-[10px] uppercase tracking-widest font-bold text-yellow-400">${isOwned ? '✓' : displayPrice}</span>
            </div>
            ${actionButtons}
        </div>`;
    });
}

async function buyItem(itemId) {
    let profile = JSON.parse(localStorage.getItem('user_profile'));
    const item = STORE_ITEMS.find(i => i.id === itemId);
    const actualPrice = profile.is_global_admin ? 0 : item.price;
    
    if(profile.coins < actualPrice) return showNotify("Not enough coins", true);
    if(!profile.inventory) profile.inventory = [];
    if(profile.inventory.includes(itemId)) return;
    
    profile.coins -= actualPrice;
    profile.inventory.push(itemId);
    
    await apiCall('/api/db/save', { path: `users/${profile.user_id}/coins`, payload: profile.coins });
    await apiCall('/api/db/save', { path: `users/${profile.user_id}/inventory`, payload: profile.inventory });
    
    localStorage.setItem('user_profile', JSON.stringify(profile));
    document.getElementById('store-coins-display').innerText = profile.coins;
    
    const appbarCoinsEl = document.getElementById('appbar-coins');
    if(appbarCoinsEl) appbarCoinsEl.innerText = profile.coins;
    
    renderStoreItems();
    showNotify("Purchased!");
}

async function openGiftModal(itemId) {
    currentGiftItemId = itemId;
    const item = STORE_ITEMS.find(i => i.id === itemId);
    document.getElementById('gift-item-name').innerText = item.name;
    
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    
    const history = profile.ascents_history || [];
    const officialGrades = history.filter(a => a.route_type !== 'custom').map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const maxOfficialGrade = officialGrades.length ? officialGrades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, officialGrades[0]) : "1";
    const points = getPoints(history);
    const league = getLeagueInfo(points, maxOfficialGrade);
    
    if (league.current.id < 2 && !profile.is_global_admin) {
        return showNotify("Reach CRIMPER league to send gifts", true);
    }

    const friends = await apiCall('/api/db/get', { path: `friends/${profile.user_id}` }) || {};
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {};
    
    const list = document.getElementById('gift-friends-list');
    list.innerHTML = '';
    
    let found = false;
    for(let fId in friends) {
        const u = allUsers[fId];
        if(!u) continue;
        found = true;
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'UNKNOWN';
        list.innerHTML += `<div class="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700"><div class="flex flex-col"><span class="font-bold text-xs uppercase tracking-wider">${fullName}</span><span class="text-gray-500 text-[10px] uppercase">@${u.nickname || u.name}</span></div><button onclick="sendGift('${fId}')" class="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest shadow border border-pink-500">Send</button></div>`;
    }
    
    if(!found) list.innerHTML = '<p class="text-gray-500 text-center mt-4 text-[10px] uppercase tracking-widest">No friends to gift</p>';
    
    document.getElementById('gift-modal').classList.remove('hidden-view');
}

function closeGiftModal() {
    currentGiftItemId = null;
    document.getElementById('gift-modal').classList.add('hidden-view');
}

async function sendGift(friendId) {
    let profile = JSON.parse(localStorage.getItem('user_profile'));
    const item = STORE_ITEMS.find(i => i.id === currentGiftItemId);
    const actualPrice = profile.is_global_admin ? 0 : item.price;
    
    if(profile.coins < actualPrice) return showNotify("Not enough coins", true);
    
    let friendInv = await apiCall('/api/db/get', { path: `users/${friendId}/inventory` }) || [];
    if(friendInv.includes(currentGiftItemId)) {
        closeGiftModal();
        return showNotify("Friend already owns this", true);
    }
    
    friendInv.push(currentGiftItemId);
    profile.coins -= actualPrice;
    
    await apiCall('/api/db/save', { path: `users/${profile.user_id}/coins`, payload: profile.coins });
    await apiCall('/api/db/save', { path: `users/${friendId}/inventory`, payload: friendInv });
    
    localStorage.setItem('user_profile', JSON.stringify(profile));
    document.getElementById('store-coins-display').innerText = profile.coins;
    document.getElementById('appbar-coins').innerText = profile.coins;
    
    closeGiftModal();
    renderStoreItems();
    showNotify("Gift Sent!");
}

function loadLeagueView() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const history = normArr(profile.ascents_history || []);
    const points = getPoints(history);
    
    const officialGrades = history.filter(a => a.route_type !== 'custom').map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const maxOfficialGrade = officialGrades.length ? officialGrades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, officialGrades[0]) : "1";
    
    const league = getLeagueInfo(points, maxOfficialGrade);
    const container = document.getElementById('league-content');
    
    let html = `<h2 class="text-xl font-black mb-5 tracking-widest text-center uppercase border-b border-gray-800 pb-3">League Progress</h2>`;
    
    html += `
    <div class="bg-gray-800 bg-opacity-80 p-4 rounded flex flex-col items-center shadow relative overflow-hidden mb-6 border border-gray-700">
        <div class="${league.current.color} transform scale-125 mb-3 mt-2">${league.current.svg}</div>
        <h3 class="text-xl font-black uppercase tracking-widest ${league.current.color}">${league.current.title}</h3>
        <p class="text-gray-400 mt-1.5 font-bold text-sm">${points} PTS</p>
        <p class="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Max Official: <span class="text-white font-bold">${maxOfficialGrade !== "1" ? maxOfficialGrade : "None"}</span></p>
    </div>`;
    
    if (league.next) {
        html += `<div class="mb-6">`;
        html += `<h4 class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest text-center">Progress to ${league.next.title}</h4>`;
        
        if (league.isBossLocked) {
            html += `
            <div class="bg-gray-900 border border-red-900 p-3 rounded mb-3 shadow">
                <p class="text-red-500 font-bold text-center text-xs mb-1 uppercase tracking-widest">Requirement Pending</p>
                <p class="text-gray-400 text-center text-[10px] uppercase tracking-wider mb-3">To enter ${league.next.title}, complete the official challenge:</p>
                <div class="bg-red-900 border border-red-700 text-red-100 text-center py-2 rounded font-black text-xs shadow uppercase tracking-widest">
                    CLIMB A ${league.next.minGrade} OR HARDER
                </div>
            </div>`;
        } else {
            html += `
            <div class="flex justify-between text-[10px] font-bold mb-1 px-1">
                <span class="text-gray-400">${points} PTS</span>
                <span class="text-gray-400">${league.next.minPts} PTS</span>
            </div>
            <div class="w-full bg-gray-900 rounded-full h-2 mb-2 shadow-inner overflow-hidden border border-gray-800">
                <div class="bg-blue-500 h-2 rounded-full transition-all duration-1000 shadow-md" style="width: ${league.percent}%"></div>
            </div>
            <p class="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Boss Requirement: Climb Official ${league.next.minGrade}</p>
            `;
        }
        html += `</div>`;
    } else {
        html += `<div class="text-center text-yellow-400 font-black text-sm mb-6 uppercase tracking-widest border border-yellow-800 bg-yellow-900 py-3 rounded text-yellow-100">Max League Reached</div>`;
    }
    
    html += `<h4 class="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest text-center border-t border-gray-800 pt-4">All Leagues</h4><div class="space-y-2">`;
    RANKS.forEach((r) => {
        const isCurrent = r.id === league.current.id;
        const isLocked = r.id > league.current.id;
        
        let bgClass = isCurrent ? 'bg-gray-700 bg-opacity-90 border border-blue-500 shadow' : 'bg-gray-900 bg-opacity-70 border border-gray-800';
        if (!isLocked && !isCurrent) bgClass = 'bg-gray-800 bg-opacity-80 border border-gray-700'; 
        
        html += `
        <div class="${bgClass} p-3 rounded flex items-center justify-between transition-all">
            <div class="flex items-center">
                <div class="${isLocked ? 'text-gray-600' : r.color} mr-3">${r.svg}</div>
                <div>
                    <p class="font-bold uppercase tracking-wider text-xs ${isLocked ? 'text-gray-500' : r.color}">${r.title}</p>
                    <p class="text-[8px] text-gray-500 uppercase mt-0.5 tracking-widest">${r.minPts} PTS • Boss: ${r.minGrade}</p>
                </div>
            </div>
            ${isCurrent ? '<span class="bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">Current</span>' : ''}
            ${isLocked ? '<span class="text-gray-600 text-[8px] font-bold uppercase tracking-widest">Locked</span>' : (!isCurrent ? '<span class="text-green-500 text-[8px] font-bold uppercase tracking-widest border border-green-800 px-1.5 py-0.5 rounded">Done</span>' : '')}
        </div>`;
    });
    html += `</div>`;
    
    container.innerHTML = html;
}

async function loadFriendsView() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const friends = await apiCall('/api/db/get', { path: `friends/${profile.user_id}` }) || {}; 
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {};
    const list = document.getElementById('friends-list'); 
    list.innerHTML = '';
    
    if(Object.keys(friends).length === 0) { 
        list.innerHTML = '<p class="text-gray-500 text-center mt-4 uppercase text-[10px] tracking-wider">No friends yet</p>'; return; 
    }
    
    for(let fId in friends) { 
        const u = allUsers[fId]; 
        if(!u) continue; 
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'UNKNOWN';
        
        let nameCss = "";
        if (u.equipped && u.equipped.names) {
            const eqItem = STORE_ITEMS.find(i => i.id === u.equipped.names);
            if (eqItem) nameCss = eqItem.cssClass;
        }

        list.innerHTML += `<div onclick="openOtherProfile('${fId}', 'friends')" class="bg-gray-800 p-3 rounded flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors shadow border border-gray-700"><div class="flex flex-col"><span class="font-bold tracking-wider text-xs uppercase ${nameCss}">${fullName}</span><span class="text-gray-500 text-[10px] uppercase">@${u.nickname || u.name}</span></div><span class="text-blue-400 text-[10px] uppercase tracking-widest font-bold">Profile &gt;</span></div>`; 
    }
}

async function loadGymsView() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    document.getElementById('create-gym-btn').classList.toggle('hidden-view', !(profile.is_global_admin || profile.can_create_gyms));
    const gyms = await apiCall('/api/db/get', { path: `gyms` }) || {}; 
    const list = document.getElementById('gyms-list'); 
    list.innerHTML = '';
    
    for(let gId in gyms) { 
        const g = gyms[gId]; 
        if(!g || !g.id) continue; 
        list.innerHTML += `<div onclick="openGym('${g.id}', '${g.name}')" class="bg-gray-800 bg-opacity-80 p-3 rounded flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors mb-2 shadow border border-gray-700"><div><h3 class="font-bold text-sm uppercase tracking-wider">${g.name}</h3><p class="text-gray-400 text-[10px] uppercase tracking-widest mt-0.5">${g.city || 'Unknown'}</p></div><span class="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Enter &gt;</span></div>`; 
    }
}

function toggleGymForm(show) { 
    document.getElementById('gym-form').classList.toggle('hidden-view', !show); 
}

async function saveGym() {
    const name = document.getElementById('gym-name').value; 
    const city = document.getElementById('gym-city').value; 
    if(!name) return;
    
    const gId = 'gym_' + Math.floor(Math.random()*100000);
    const res = await apiCall('/api/db/save', { path: `gyms/${gId}`, payload: { id: gId, name, city } }); 
    if (!res) return;
    
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    await apiCall('/api/db/save', { path: `gym_roles/${gId}/${profile.user_id}`, payload: 'admin' });
    
    toggleGymForm(false); 
    loadGymsView(); 
    showNotify("Gym created");
}

async function openGym(gymId, gymName) {
    currentGymId = gymId; 
    document.getElementById('gym-title').innerText = gymName;
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    let roles = await apiCall('/api/db/get', { path: `gym_roles/${gymId}` }) || {};
    
    if (!profile.is_global_admin && !roles[profile.user_id]) { 
        await apiCall('/api/db/save', { path: `gym_roles/${gymId}/${profile.user_id}`, payload: 'user' }); 
        roles[profile.user_id] = 'user'; 
    }
    
    currentGymRole = profile.is_global_admin ? 'admin' : (roles[profile.user_id] || 'user');
    document.getElementById('tab-admin').classList.toggle('hidden-view', currentGymRole !== 'admin');
    
    await loadSectors(); 
    switchTab('official'); 
    navigate('gym-routes');
}

async function loadSectors() { 
    gymSectors = await apiCall('/api/db/get', { path: `gym_sectors/${currentGymId}` }) || {}; 
    renderSectors(); 
}

function renderSectors() {
    const container = document.getElementById('sector-filters');
    container.innerHTML = `<button onclick="selectSector('all')" class="whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${currentSector === 'all' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}">All Sectors</button>`;
    
    for(let sId in gymSectors) { 
        if(!gymSectors[sId]) continue; 
        container.innerHTML += `<button onclick="selectSector('${sId}')" class="whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${currentSector === sId ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}">${gymSectors[sId]}</button>`; 
    }
    
    if(currentGymRole === 'admin') {
        container.innerHTML += `<button onclick="toggleSectorForm(true)" class="whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-gray-700 hover:bg-gray-600 transition-colors">+ Add</button>`;
    }
    
    const actionsBlock = document.getElementById('sector-actions');
    if (currentSector !== 'all' && (currentGymRole === 'admin' || currentGymRole === 'setter')) {
        actionsBlock.classList.remove('hidden-view'); 
    } else {
        actionsBlock.classList.add('hidden-view');
    }
}

function selectSector(sId) { 
    currentSector = sId; 
    renderSectors(); 
    loadGallery(); 
}

function renderGradeFilters() {
    const container = document.getElementById('grade-filters');
    container.innerHTML = `<button onclick="selectGradeFilter('all')" class="whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${currentGradeFilter === 'all' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}">All</button>`;
    ALL_GRADES.forEach(g => { 
        container.innerHTML += `<button onclick="selectGradeFilter('${g}')" class="whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold transition-colors ${currentGradeFilter === g ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}">${g}</button>`; 
    });
}

function selectGradeFilter(g) { 
    currentGradeFilter = g; 
    renderGradeFilters(); 
    loadGallery(); 
}

function toggleSectorForm(show) { 
    document.getElementById('add-sector-form').classList.toggle('hidden-view', !show); 
    if(show) { 
        document.getElementById('new-sector-name').value = ''; 
        document.getElementById('new-sector-name').focus(); 
    } 
}

async function saveSector() {
    const name = document.getElementById('new-sector-name').value.trim(); 
    if(!name) return;
    const sId = 'sec_' + Math.random().toString(36).substring(2,9);
    const res = await apiCall('/api/db/save', { path: `gym_sectors/${currentGymId}/${sId}`, payload: name }); 
    if (!res) return;
    toggleSectorForm(false); 
    await loadSectors(); 
    showNotify("Sector added");
}

async function clearSector() {
    if(!confirm("Remove ALL boulders from this sector?")) return;
    const boulders = await apiCall('/api/db/get', { path: `boulders` }) || {};
    for(let bId in boulders) { 
        if(boulders[bId] && boulders[bId].gym_id === currentGymId && boulders[bId].sector_id === currentSector) { 
            await apiCall('/api/db/save', { path: `boulders/${bId}`, method: 'DELETE' }); 
            if(boulders[bId].image_url) apiCall('/api/delete_image', { url: boulders[bId].image_url }); 
        } 
    }
    showNotify("Sector cleared"); 
    loadGallery();
}

async function deleteSector() {
    if(!confirm("Delete this sector AND all its boulders?")) return;
    const boulders = await apiCall('/api/db/get', { path: `boulders` }) || {};
    for(let bId in boulders) { 
        if(boulders[bId] && boulders[bId].gym_id === currentGymId && boulders[bId].sector_id === currentSector) { 
            await apiCall('/api/db/save', { path: `boulders/${bId}`, method: 'DELETE' }); 
            if(boulders[bId].image_url) apiCall('/api/delete_image', { url: boulders[bId].image_url }); 
        } 
    }
    const res = await apiCall('/api/db/save', { path: `gym_sectors/${currentGymId}/${currentSector}`, method: 'DELETE' }); 
    if (!res) return;
    showNotify("Sector deleted"); 
    currentSector = 'all'; 
    await loadSectors(); 
    loadGallery();
}

async function deleteCurrentGym() {
    if(!confirm("Delete this ENTIRE GYM permanently?")) return;
    const boulders = await apiCall('/api/db/get', { path: `boulders` }) || {};
    for(let bId in boulders) { 
        if(boulders[bId] && boulders[bId].gym_id === currentGymId) { 
            await apiCall('/api/db/save', { path: `boulders/${bId}`, method: 'DELETE' }); 
            if(boulders[bId].image_url) apiCall('/api/delete_image', { url: boulders[bId].image_url }); 
        } 
    }
    await apiCall('/api/db/save', { path: `gym_sectors/${currentGymId}`, method: 'DELETE' }); 
    await apiCall('/api/db/save', { path: `gym_roles/${currentGymId}`, method: 'DELETE' });
    const res = await apiCall('/api/db/save', { path: `gyms/${currentGymId}`, method: 'DELETE' }); 
    if (!res) return;
    showNotify("Gym deleted"); 
    navigate('gyms');
}

async function loadGymNews() {
    const newsObj = await apiCall('/api/db/get', { path: `gym_news/${currentGymId}` }) || {};
    const feed = document.getElementById('news-feed');
    feed.innerHTML = '';
    const keys = Object.keys(newsObj).sort().reverse(); 
    if(keys.length === 0) {
        feed.innerHTML = '<p class="text-gray-500 text-center text-[10px] uppercase tracking-widest mt-6">No news yet</p>';
    } else {
        keys.forEach(k => {
            const n = newsObj[k];
            const date = new Date(n.timestamp).toLocaleDateString();
            feed.innerHTML += `<div class="bg-gray-800 bg-opacity-80 p-3 rounded border border-gray-700 shadow mb-3"><p class="text-[9px] text-blue-400 font-bold mb-1.5 uppercase tracking-widest">${date} • ${n.author}</p><p class="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">${n.text}</p></div>`;
        });
    }
    const canAdmin = currentGymRole === 'admin' || currentGymRole === 'setter';
    document.getElementById('news-admin-box').classList.toggle('hidden-view', !canAdmin);
}

async function postGymNews() {
    const text = document.getElementById('news-input').value.trim();
    if(!text) return;
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const nId = Date.now().toString();
    await apiCall('/api/db/save', { path: `gym_news/${currentGymId}/${nId}`, payload: { text: text, author: profile.name, timestamp: Date.now() } });
    document.getElementById('news-input').value = '';
    showNotify("News posted");
    loadGymNews();
}

function switchTab(tabName) {
    currentTab = tabName;
    ['official', 'custom', 'climbers', 'news', 'admin'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) { 
            if (t === tabName) { btn.classList.add('bg-blue-600'); btn.classList.remove('bg-gray-800', 'border-gray-700'); } 
            else { btn.classList.add('bg-gray-800', 'border', 'border-gray-700'); btn.classList.remove('bg-blue-600'); } 
        }
    });
    
    document.getElementById('tab-content-gallery').classList.toggle('hidden-view', tabName === 'climbers' || tabName === 'admin' || tabName === 'news');
    document.getElementById('tab-content-climbers').classList.toggle('hidden-view', tabName !== 'climbers');
    document.getElementById('tab-content-news').classList.toggle('hidden-view', tabName !== 'news');
    document.getElementById('tab-content-admin').classList.toggle('hidden-view', tabName !== 'admin');
    
    const showSectors = (tabName === 'official' || tabName === 'custom');
    document.getElementById('sector-bar-container').classList.toggle('hidden-view', !showSectors);
    document.getElementById('add-route-btn').classList.toggle('hidden-view', tabName === 'climbers' || tabName === 'admin' || tabName === 'news' || (tabName === 'official' && currentGymRole === 'user'));
    
    if(showSectors) renderGradeFilters();
    if(tabName === 'climbers') loadGymClimbers(); 
    else if(tabName === 'news') loadGymNews();
    else if(tabName === 'admin') loadAdminPanel(); 
    else loadGallery();
}

async function loadGallery() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const boulders = await apiCall('/api/db/get', { path: `boulders` }) || {};
    const list = document.getElementById('tab-content-gallery'); 
    list.innerHTML = '';
    
    let found = false; 
    const bKeys = Object.keys(boulders).reverse();
    
    for(let bId of bKeys) {
        const b = boulders[bId]; 
        if(!b || !b.id) continue;
        if(b.gym_id === currentGymId && (b.route_type || 'custom') === currentTab) {
            if (currentSector !== 'all' && b.sector_id !== currentSector) continue;
            const displayGrade = b.consensus_grade ? `${b.grade} (Com: <span class="text-purple-400 font-bold">${b.consensus_grade}</span>)` : b.grade;
            if (currentGradeFilter !== 'all' && b.grade !== currentGradeFilter && b.consensus_grade !== currentGradeFilter) continue;
            
            found = true; 
            const ascent = (profile.ascents_history || []).find(a => a.boulder_id === b.id);
            let badge = ''; 
            if (ascent) { badge = '<span class="text-green-500 font-bold uppercase text-[8px] tracking-widest border border-green-800 bg-green-900 bg-opacity-30 px-1.5 py-0.5 rounded">Done</span>'; }
            
            const bJson = JSON.stringify(b).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const secName = b.sector_id && gymSectors[b.sector_id] ? ` | Sec: ${gymSectors[b.sector_id]}` : '';
            list.innerHTML += `<div onclick="openRouteDetail(JSON.parse('${bJson}'))" class="bg-gray-800 bg-opacity-80 hover:bg-gray-700 p-3 rounded cursor-pointer flex justify-between items-center transition-colors mb-2 shadow border border-gray-700"><div><h4 class="font-bold text-sm tracking-wider uppercase">${b.name || 'Unnamed'}</h4><p class="text-gray-400 text-[10px] mt-1 uppercase tracking-widest">Grade: ${displayGrade} | By: ${b.author || 'Unknown'}${secName}</p><p class="text-blue-400 text-[10px] mt-1 font-bold uppercase tracking-widest">Ascents: ${b.ascents || 0}</p></div>${badge}</div>`;
        }
    }
    if(!found) list.innerHTML = `<p class="text-gray-500 text-center mt-6 uppercase text-[10px] tracking-widest">No routes found</p>`;
}

function openRouteDetail(b) {
    activeBoulder = b; 
    document.getElementById('edit-route-form').classList.add('hidden-view'); 
    document.getElementById('grade-suggest-box').classList.add('hidden-view');
    
    const displayGrade = b.consensus_grade ? `${b.grade} (Com: ${b.consensus_grade})` : b.grade;
    document.getElementById('detail-title').innerText = `${b.name || 'Unnamed'} - ${displayGrade}`;
    document.getElementById('detail-author').innerText = `AUTHOR: ${b.author || 'Unknown'} | ASCENTS: ${b.ascents || 0}\n${b.description || ''}`;
    document.getElementById('detail-wall-img').src = b.image_url;
    
    const container = document.getElementById('detail-canvas'); 
    container.querySelectorAll('.marker').forEach(el => el.remove());
    (b.markers || []).forEach(m => {
        const dot = document.createElement('div'); 
        dot.className = 'marker absolute w-6 h-6 rounded-full border-[3px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2'; 
        dot.style.left = m.x + 'px'; 
        dot.style.top = m.y + 'px'; 
        dot.style.borderColor = m.color === 'green' ? '#22c55e' : m.color === 'blue' ? '#3b82f6' : '#ef4444'; 
        container.appendChild(dot);
    });
    
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    const ascent = (profile.ascents_history || []).find(a => a.boulder_id === b.id);
    const actionsDiv = document.getElementById('detail-actions'); 
    actionsDiv.classList.remove('hidden-view');
    
    if (ascent) {
        actionsDiv.innerHTML = `<button onclick="navigate('gym-routes')" class="bg-gray-800 hover:bg-gray-700 border border-gray-600 py-2.5 rounded font-bold text-[10px] uppercase tracking-widest transition-colors flex-1 shadow">Back</button><button onclick="removeAscent()" class="bg-green-600 hover:bg-red-600 py-2.5 rounded font-bold text-[10px] uppercase tracking-widest transition-colors flex-[2] shadow border border-green-500">Completed</button>`;
    } else {
        actionsDiv.innerHTML = `<button onclick="navigate('gym-routes')" class="bg-gray-800 hover:bg-gray-700 border border-gray-600 py-2.5 rounded font-bold text-[10px] uppercase tracking-widest transition-colors flex-1 shadow">Back</button><button onclick="startCompleteRoute()" class="bg-blue-600 hover:bg-blue-500 py-2.5 rounded font-bold text-[10px] uppercase tracking-widest transition-colors flex-[2] shadow border border-blue-500">Log Ascent</button>`;
    }
    
    const canAdmin = currentGymRole === 'admin' || currentGymRole === 'setter' || (currentTab === 'custom' && b.author_id === profile.user_id) || profile.is_global_admin;
    document.getElementById('detail-admin-actions').classList.toggle('hidden-view', !canAdmin); 
    showView('view-route-detail');
}

function startCompleteRoute() {
    if ((activeBoulder.route_type || 'custom') === 'official') { 
        confirmCompleteRoute(true); 
    } else {
        document.getElementById('detail-actions').classList.add('hidden-view'); 
        document.getElementById('grade-suggest-box').classList.remove('hidden-view');
        const sel = document.getElementById('suggest-grade-select'); 
        sel.innerHTML = ''; 
        ALL_GRADES.forEach(g => { sel.innerHTML += `<option value="${g}">${g}</option>`; }); 
        sel.value = activeBoulder.consensus_grade || activeBoulder.grade || "1";
    }
}

function cancelSuggestGrade() { 
    document.getElementById('grade-suggest-box').classList.add('hidden-view'); 
    document.getElementById('detail-actions').classList.remove('hidden-view'); 
}

function recalcConsensus(boulder) {
    if(!boulder.grade_votes || Object.keys(boulder.grade_votes).length === 0) { boulder.consensus_grade = null; return; }
    let sum = 0; let count = 0; 
    for(let uid in boulder.grade_votes) { sum += boulder.grade_votes[uid]; count++; } 
    boulder.consensus_grade = ALL_GRADES[Math.round(sum/count)];
}

async function confirmCompleteRoute(isOfficial = false) {
    let profile = JSON.parse(localStorage.getItem('user_profile')); 
    let history = profile.ascents_history || [];
    let gradeToLog = activeBoulder.grade;
    
    if (!isOfficial && (activeBoulder.route_type || 'custom') !== 'official') {
        gradeToLog = document.getElementById('suggest-grade-select').value;
        const gradeIdx = ALL_GRADES.indexOf(gradeToLog); 
        activeBoulder.grade_votes = activeBoulder.grade_votes || {}; 
        activeBoulder.grade_votes[profile.user_id] = gradeIdx; 
        recalcConsensus(activeBoulder); 
    }
    
    history.push({ 
        boulder_id: activeBoulder.id, 
        boulder_name: activeBoulder.name, 
        grade: gradeToLog, 
        style: 'completed', 
        timestamp: Date.now(),
        route_type: activeBoulder.route_type || 'custom'
    });
    
    let coinsEarned = 0;
    if (activeBoulder.route_type === 'custom' || activeBoulder.route_type === 'climbers') {
        coinsEarned = 100;
    } else {
        const idx = ALL_GRADES.indexOf(gradeToLog);
        if (idx <= ALL_GRADES.indexOf("4")) coinsEarned = 100;
        else if (idx <= ALL_GRADES.indexOf("5+")) coinsEarned = 250;
        else if (idx <= ALL_GRADES.indexOf("6B")) coinsEarned = 500;
        else if (idx <= ALL_GRADES.indexOf("6C+")) coinsEarned = 1000;
        else if (idx <= ALL_GRADES.indexOf("7B")) coinsEarned = 2500;
        else coinsEarned = 5000;
    }
    profile.coins = (profile.coins || 0) + coinsEarned;
    
    profile.ascents_history = history; 
    localStorage.setItem('user_profile', JSON.stringify(profile));
    await apiCall('/api/db/save', { path: `user_ascents/${profile.user_id}`, payload: history });
    await apiCall('/api/db/save', { path: `users/${profile.user_id}/coins`, payload: profile.coins });
    
    activeBoulder.ascents = (activeBoulder.ascents || 0) + 1;
    await apiCall('/api/db/save', { path: `boulders/${activeBoulder.id}`, payload: activeBoulder }); 
    showNotify(`Ascent logged! +${coinsEarned} COINS`); 
    openRouteDetail(activeBoulder);
}

async function removeAscent() {
    if(!confirm("Cancel this ascent?")) return;
    let profile = JSON.parse(localStorage.getItem('user_profile')); 
    let history = profile.ascents_history || [];
    const idx = history.findIndex(a => a.boulder_id === activeBoulder.id); 
    if(idx > -1) history.splice(idx, 1);
    
    if(activeBoulder.grade_votes && activeBoulder.grade_votes[profile.user_id] !== undefined) { 
        delete activeBoulder.grade_votes[profile.user_id]; 
        recalcConsensus(activeBoulder); 
    }
    activeBoulder.ascents = Math.max(0, (activeBoulder.ascents || 1) - 1);
    
    profile.ascents_history = history; 
    localStorage.setItem('user_profile', JSON.stringify(profile));
    await apiCall('/api/db/save', { path: `user_ascents/${profile.user_id}`, payload: history }); 
    await apiCall('/api/db/save', { path: `boulders/${activeBoulder.id}`, payload: activeBoulder }); 
    showNotify("Ascent cancelled"); 
    openRouteDetail(activeBoulder);
}

async function loadGymClimbers() {
    const roles = await apiCall('/api/db/get', { path: `gym_roles/${currentGymId}` }) || {}; 
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {}; 
    const allAscents = await apiCall('/api/db/get', { path: `user_ascents` }) || {};
    
    currentClimbersData = [];
    for(let uid in roles) {
        const u = allUsers[uid]; 
        if(!u) continue; 
        const history = normArr(allAscents[uid]);
        
        const officialGrades = history.filter(a => a.route_type !== 'custom').map(a => a.grade).filter(g => ALL_GRADES.includes(g)); 
        const maxGradeIdx = officialGrades.length ? Math.max(...officialGrades.map(g => ALL_GRADES.indexOf(g))) : -1;
        const maxGrade = maxGradeIdx > -1 ? ALL_GRADES[maxGradeIdx] : "1";
        
        const points = getPoints(history); 
        currentClimbersData.push({ uid: uid, user: u, points: points, maxGrade: maxGrade, totalAscents: history.length });
    }
    currentClimbersData.sort((a, b) => { 
        if (b.points !== a.points) return b.points - a.points; 
        return b.totalAscents - a.totalAscents; 
    });
    
    document.getElementById('climbers-search').value = ''; 
    renderClimbers();
}

function renderClimbers() {
    const container = document.getElementById('climbers-list-container'); 
    container.innerHTML = ''; 
    const q = (document.getElementById('climbers-search').value || '').toLowerCase(); 
    let rank = 1;
    
    currentClimbersData.forEach(c => {
        const nameStr = (c.user.nickname || c.user.name || 'User').toLowerCase();
        const realStr = ((c.user.first_name || '') + ' ' + (c.user.last_name || '')).toLowerCase();
        
        if (nameStr.includes(q) || realStr.includes(q)) {
            let rankNumColor = rank === 1 ? "text-yellow-500 font-extrabold" : rank === 2 ? "text-gray-300 font-extrabold" : rank === 3 ? "text-orange-400 font-extrabold" : "text-gray-400";
            const league = getLeagueInfo(c.points, c.maxGrade);
            const rankData = league.current;
            const fullName = `${c.user.first_name || ''} ${c.user.last_name || ''}`.trim() || 'UNKNOWN';
            
            let nameCss = "";
            if (c.user.equipped && c.user.equipped.names) {
                const eqItem = STORE_ITEMS.find(i => i.id === c.user.equipped.names);
                if (eqItem) nameCss = eqItem.cssClass;
            }
            
            container.innerHTML += `<div onclick="openOtherProfile('${c.uid}', 'gym-routes')" class="bg-gray-800 p-3 rounded flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors shadow border border-gray-700"><div class="flex items-center space-x-3"><span class="w-5 text-center text-sm ${rankNumColor}">#${rank}</span><div><p class="font-bold tracking-wider uppercase text-xs ${nameCss}">${fullName}</p><div class="flex items-center text-[8px] uppercase font-bold tracking-widest mt-0.5 ${rankData.color}">${rankData.svg} ${rankData.title} <span class="text-gray-500 ml-1 font-normal">(${c.points})</span></div><p class="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">Max Off: <span class="text-red-400 font-bold">${c.maxGrade !== "1" ? c.maxGrade : "-"}</span> | Ascents: <span class="text-green-400 font-bold">${c.totalAscents}</span></p></div></div><span class="text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-900 bg-gray-900 px-2 py-1 rounded">View</span></div>`;
        } 
        rank++;
    });
}

async function loadAdminPanel() {
    const roles = await apiCall('/api/db/get', { path: `gym_roles/${currentGymId}` }) || {}; 
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {};
    const list = document.getElementById('admin-setters-list'); 
    list.innerHTML = '';
    
    for(let uid in roles) { 
        if(roles[uid] === 'setter' && allUsers[uid]) {
            const fullName = `${allUsers[uid].first_name || ''} ${allUsers[uid].last_name || ''}`.trim() || 'UNKNOWN';
            list.innerHTML += `<div class="flex justify-between items-center bg-gray-900 p-2.5 rounded border border-gray-800"><div class="flex flex-col"><span class="font-bold text-xs tracking-wider uppercase">${fullName}</span><span class="text-[10px] text-gray-500 uppercase tracking-widest">@${allUsers[uid].nickname || allUsers[uid].name}</span></div><button onclick="setGymRole('${uid}', 'user')" class="bg-red-900 hover:bg-red-800 border border-red-700 px-2 py-1 rounded text-[10px] font-bold transition-colors uppercase tracking-widest">Demote</button></div>`; 
        }
    }
}

function searchUsersForAdmin() {
    const q = document.getElementById('admin-search-input').value.toLowerCase(); 
    apiCall('/api/db/get', { path: `users` }).then(allUsers => {
        allUsers = allUsers || {};
        const list = document.getElementById('admin-search-results'); 
        list.innerHTML = '';
        
        for(let uid in allUsers) { 
            const u = allUsers[uid]; 
            const realStr = ((u.first_name || '') + ' ' + (u.last_name || '')).toLowerCase();
            const nickStr = (u.nickname || u.name || '').toLowerCase();
            const emailStr = (u.email || '').toLowerCase();
            
            if(u && (realStr.includes(q) || nickStr.includes(q) || emailStr.includes(q))) {
                const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'UNKNOWN';
                list.innerHTML += `<div class="flex justify-between items-center bg-gray-900 border border-gray-800 p-2.5 rounded"><div class="flex flex-col"><span class="font-bold text-xs tracking-wider uppercase">${fullName}</span><span class="text-[10px] text-gray-500 uppercase tracking-widest">@${u.nickname || u.name}</span></div><button onclick="setGymRole('${uid}', 'setter')" class="bg-blue-900 border border-blue-700 hover:bg-blue-800 px-2 py-1 rounded text-[10px] font-bold transition-colors uppercase tracking-widest">Make Setter</button></div>`; 
            }
        }
    });
}

async function setGymRole(uid, role) { 
    const res = await apiCall('/api/db/save', { path: `gym_roles/${currentGymId}/${uid}`, payload: role }); 
    if(res) { showNotify("Role updated"); loadAdminPanel(); } 
}

function startCreateRoute() {
    wizardMarkers = []; 
    document.getElementById('wizard-wall-img').src = ''; 
    const secSelect = document.getElementById('route-sector'); 
    secSelect.innerHTML = '';
    
    const sKeys = Object.keys(gymSectors); 
    if(sKeys.length > 0) { 
        secSelect.classList.remove('hidden-view'); 
        sKeys.forEach(k => { secSelect.innerHTML += `<option value="${k}">${gymSectors[k]}</option>`; }); 
    } else {
        secSelect.classList.add('hidden-view');
    }
    wizardStep(1); 
    showView('view-create-route');
}

function wizardStep(step) { 
    document.getElementById('wizard-step-1').classList.toggle('hidden-view', step !== 1); 
    document.getElementById('wizard-step-2').classList.toggle('hidden-view', step !== 2); 
    document.getElementById('wizard-step-3').classList.toggle('hidden-view', step !== 3); 
}

function setHoldColor(c) { wizardColor = c; }

function handleCanvasClick(e) {
    const rect = e.target.getBoundingClientRect(); 
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if(wizardColor === 'erase') {
        wizardMarkers = wizardMarkers.filter(m => Math.hypot(m.x - x, m.y - y) > 20); 
    } else {
        wizardMarkers.push({ x, y, color: wizardColor }); 
    }
    renderCanvasMarkers();
}

function renderCanvasMarkers() {
    const container = document.getElementById('canvas-container'); 
    container.querySelectorAll('.marker').forEach(el => el.remove());
    wizardMarkers.forEach(m => { 
        const dot = document.createElement('div'); 
        dot.className = 'marker absolute w-5 h-5 rounded-full border-[3px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow'; 
        dot.style.left = m.x + 'px'; 
        dot.style.top = m.y + 'px'; 
        dot.style.borderColor = m.color === 'green' ? '#22c55e' : m.color === 'blue' ? '#3b82f6' : '#ef4444'; 
        container.appendChild(dot); 
    });
}

async function saveNewRoute() {
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    const bId = 'boulder_' + Math.random().toString(36).substring(2, 9);
    
    const bData = { 
        id: bId, 
        gym_id: currentGymId, 
        route_type: currentTab, 
        sector_id: document.getElementById('route-sector').value || null, 
        name: document.getElementById('route-name').value || 'Unnamed', 
        grade: document.getElementById('route-grade').value, 
        description: document.getElementById('route-desc').value, 
        author: profile.name, 
        author_id: profile.user_id, 
        image_url: document.getElementById('wizard-wall-img').src, 
        markers: wizardMarkers, 
        ascents: 0, 
        grade_votes: {} 
    };
    
    const res = await apiCall('/api/db/save', { path: `boulders/${bId}`, payload: bData }); 
    if (!res) return; 
    
    showNotify("Route created!"); 
    document.getElementById('route-name').value = ''; 
    document.getElementById('route-desc').value = ''; 
    navigate('gym-routes');
}

function toggleEditRouteForm() {
    const form = document.getElementById('edit-route-form'); 
    form.classList.toggle('hidden-view');
    if(!form.classList.contains('hidden-view')) { 
        document.getElementById('edit-rt-name').value = activeBoulder.name || ''; 
        document.getElementById('edit-rt-grade').value = activeBoulder.grade || '1'; 
        document.getElementById('edit-rt-desc').value = activeBoulder.description || ''; 
    }
}

async function saveRouteEdit() {
    activeBoulder.name = document.getElementById('edit-rt-name').value || 'Unnamed'; 
    activeBoulder.grade = document.getElementById('edit-rt-grade').value; 
    activeBoulder.description = document.getElementById('edit-rt-desc').value;
    
    const res = await apiCall('/api/db/save', { path: `boulders/${activeBoulder.id}`, payload: activeBoulder }); 
    if (!res) return; 
    
    showNotify("Route updated"); 
    toggleEditRouteForm(); 
    openRouteDetail(activeBoulder);
}

async function deleteRoute() {
    if(!confirm("Delete this route permanently?")) return;
    const res = await apiCall('/api/db/save', { path: `boulders/${activeBoulder.id}`, method: 'DELETE' }); 
    if (!res) return; 
    
    if(activeBoulder.image_url) apiCall('/api/delete_image', { url: activeBoulder.image_url }); 
    showNotify("Route deleted"); 
    navigate('gym-routes');
}

async function openOtherProfile(uid, source = 'home') {
    profileBackTarget = source; currentOtherUserId = uid;
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    if(uid === profile.user_id) { navigate(source); return; }
    
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {}; 
    const u = allUsers[uid] || {};
    
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'UNKNOWN CLIMBER';
    const realNameEl = document.getElementById('op-realname');
    const avatarEl = document.getElementById('op-avatar');
    
    realNameEl.innerText = fullName; 
    document.getElementById('op-name').innerText = `@${u.nickname || u.name || 'unnamed'}`; 
    document.getElementById('op-bio').innerText = u.bio || ""; 
    avatarEl.src = u.avatar_url || DEFAULT_AVATAR;
    
    applyCosmetics(u, avatarEl, realNameEl);
    
    const history = normArr(await apiCall('/api/db/get', { path: `user_ascents/${uid}` })); 
    document.getElementById('op-stat-total').innerText = history.length;
    
    const officialGrades = history.filter(a => a.route_type !== 'custom').map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const maxOfficialGrade = officialGrades.length ? officialGrades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, officialGrades[0]) : "1";
    
    const allGrades = history.map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const absoluteMaxGrade = allGrades.length ? allGrades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, allGrades[0]) : "-";
    document.getElementById('op-stat-max').innerText = absoluteMaxGrade; 
    
    const totalPoints = getPoints(history); 
    const league = getLeagueInfo(totalPoints, maxOfficialGrade); 
    const rankEl = document.getElementById('op-rank');
    rankEl.innerHTML = `<div class="flex items-center justify-center">${league.current.svg} <span>${league.current.title}</span> <span class="text-gray-500 text-[10px] ml-1.5 font-normal">(${totalPoints} PTS)</span></div>`; 
    rankEl.className = `text-xs font-bold mt-1 uppercase tracking-widest ${league.current.color}`;
    
    const likes = await apiCall('/api/db/get', { path: `profile_likes/${uid}` }) || {}; 
    isOpLiked = likes[profile.user_id] === true;
    const likeBtn = document.getElementById('op-like-btn'); 
    likeBtn.innerText = `${isOpLiked ? 'Liked' : 'Like'} (${Object.keys(likes).filter(k=>likes[k]).length})`;
    if(isOpLiked) { 
        likeBtn.classList.add('bg-pink-500', 'text-white', 'border-pink-500'); 
        likeBtn.classList.remove('text-pink-500', 'bg-gray-800'); 
    } else { 
        likeBtn.classList.remove('bg-pink-500', 'text-white'); 
        likeBtn.classList.add('text-pink-500', 'bg-gray-800'); 
    }
    
    renderGradeChart('op-stat-chart', allGrades);
    
    const isFriend = await apiCall('/api/db/get', { path: `friends/${profile.user_id}/${uid}` }); 
    const sentReq = await apiCall('/api/db/get', { path: `friend_requests/${uid}/${profile.user_id}` });
    const btn = document.getElementById('op-action-btn'); 
    if(isFriend) { 
        btn.innerText = "Remove Friend"; 
        btn.className = "flex-[2] py-2.5 rounded font-bold border border-red-700 text-red-500 bg-gray-800 transition-colors uppercase tracking-widest text-[10px] shadow"; 
    } else if(sentReq) { 
        btn.innerText = "Request Sent"; 
        btn.className = "flex-[2] py-2.5 rounded font-bold border border-gray-600 text-gray-400 bg-gray-800 uppercase tracking-widest text-[10px] shadow"; 
    } else { 
        btn.innerText = "Add Friend"; 
        btn.className = "flex-[2] bg-blue-600 hover:bg-blue-500 py-2.5 rounded font-bold transition-colors uppercase tracking-widest text-[10px] shadow"; 
    } 
    showView('view-other-profile');
}

async function toggleLike() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    if (isOpLiked) { 
        await apiCall('/api/db/save', { path: `profile_likes/${currentOtherUserId}/${profile.user_id}`, method: 'DELETE' }); 
        showNotify("Like removed"); 
    } else { 
        await apiCall('/api/db/save', { path: `profile_likes/${currentOtherUserId}/${profile.user_id}`, payload: true }); 
        showNotify("Like sent"); 
    }
    openOtherProfile(currentOtherUserId, profileBackTarget); 
}

async function handleOpAction() {
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    const btn = document.getElementById('op-action-btn');
    if(btn.innerText === "ADD FRIEND") { 
        const res = await apiCall('/api/db/save', { path: `friend_requests/${currentOtherUserId}/${profile.user_id}`, payload: true }); 
        if(!res) return; 
        showNotify("Request sent"); 
        btn.innerText = "REQUEST SENT"; 
        btn.className = "flex-[2] py-2.5 rounded font-bold border border-gray-600 text-gray-400 bg-gray-800 uppercase tracking-widest text-[10px] shadow"; 
    }
    else if(btn.innerText === "REMOVE FRIEND") { 
        await apiCall('/api/db/save', { path: `friends/${profile.user_id}/${currentOtherUserId}`, method: 'DELETE' }); 
        await apiCall('/api/db/save', { path: `friends/${currentOtherUserId}/${profile.user_id}`, method: 'DELETE' }); 
        showNotify("Removed friend"); 
        btn.innerText = "ADD FRIEND"; 
        btn.className = "flex-[2] bg-blue-600 hover:bg-blue-500 py-2.5 rounded font-bold transition-colors uppercase tracking-widest text-[10px] shadow"; 
    }
}

async function deleteAccount() {
    if(!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    await apiCall('/api/db/save', { path: `users/${profile.user_id}`, method: 'DELETE' }); 
    await apiCall('/api/db/save', { path: `user_ascents/${profile.user_id}`, method: 'DELETE' }); 
    if(profile.avatar_url) apiCall('/api/delete_image', { url: profile.avatar_url }); 
    localStorage.clear(); 
    logout(); 
    showNotify("Account deleted");
}

window.onload = async () => {
    const profileStr = localStorage.getItem('user_profile');
    if(profileStr) { 
        const profile = JSON.parse(profileStr); 
        if (profile.detail || !profile.user_id) { 
            localStorage.removeItem('user_profile'); showView('view-auth'); return; 
        } 
        
        if (profile.equipped && profile.equipped.backgrounds) {
            applyCosmetics(profile, null, null); 
        }
        
        if (!profile.name) showView('view-onboarding'); 
        else { loadHomeView(); showView('view-home'); } 
    } else showView('view-auth');
};

async function searchUserForDirector() {
    const q = document.getElementById('sa-search-input').value.toLowerCase().trim(); 
    if (!q) return;
    
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {};
    const list = document.getElementById('sa-search-results'); 
    list.innerHTML = ''; 
    let found = false;
    
    for(let uid in allUsers) {
        const u = allUsers[uid]; 
        if(!u) continue;
        
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const nameMatch = (u.nickname || u.name || '').toLowerCase().includes(q);
        
        if(emailMatch || nameMatch) {
            found = true; 
            const isDir = u.can_create_gyms ? '<span class="text-green-500 text-[8px] font-bold ml-2 uppercase tracking-widest border border-green-800 px-1 py-0.5 rounded bg-green-900 bg-opacity-30">Director</span>' : '';
            
            list.innerHTML += `
            <div class="flex justify-between items-center bg-gray-900 border border-gray-800 p-3 rounded mb-2 shadow">
                <div class="flex flex-col">
                    <span class="font-bold text-xs uppercase tracking-wider">@${u.nickname || u.name} ${isDir}</span>
                    <span class="text-[10px] text-gray-500 mt-0.5 tracking-wider">${u.email}</span>
                </div>
                <button onclick="makeGymDirector('${uid}')" class="bg-purple-900 hover:bg-purple-800 border border-purple-700 px-3 py-1.5 rounded text-[10px] font-bold transition-colors uppercase tracking-widest text-purple-100 shadow">Grant Rights</button>
            </div>`;
        }
    }
    if(!found) list.innerHTML = '<p class="text-gray-500 text-[10px] uppercase tracking-widest text-center mt-4">User not found</p>';
}

async function makeGymDirector(uid) { 
    const res = await apiCall('/api/db/save', { path: `users/${uid}/can_create_gyms`, payload: true }); 
    if(res) { 
        showNotify("Rights granted"); 
        searchUserForDirector(); 
    } 
}