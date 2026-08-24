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

// 🔥 СИСТЕМА ЛИГ И БОССОВ (АНТИ-ФАРМИНГ) 🔥
const RANKS = [
    { id: 0, title: "Rookie", minPts: 0, minGrade: "1", color: "text-gray-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mr-1.5"><path d="M5 19L12 5l7 14H5z"/></svg>` },
    { id: 1, title: "Plastic Puller", minPts: 300, minGrade: "4", color: "text-orange-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mr-1.5"><path d="M12 2L3 12l9 10 9-10L12 2zm0 6l4.5 4-4.5 4-4.5-4L12 8z"/></svg>` },
    { id: 2, title: "Crimper", minPts: 1500, minGrade: "5+", color: "text-gray-300", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5 mr-1.5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16l8-8 8 8"/></svg>` },
    { id: 3, title: "Steel Fingers", minPts: 5000, minGrade: "6B+", color: "text-yellow-500", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5 mr-1.5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 18l8-8 8 8M4 10l8-8 8 8"/></svg>` },
    { id: 4, title: "Beast", minPts: 15000, minGrade: "7A", color: "text-cyan-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mr-1.5 drop-shadow-md"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 4.5l4 3-4 6-4-6 4-3z"/></svg>` },
    { id: 5, title: "Titan", minPts: 40000, minGrade: "7C", color: "text-yellow-400", svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mr-1.5 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"><path d="M2 19h20v2H2v-2zm1-2l3-11 4 5 2-8 2 8 4-5 3 11H3z"/></svg>` }
];

function getLeagueInfo(points, maxGrade) {
    let maxGradeIdx = ALL_GRADES.indexOf(maxGrade);
    if (maxGradeIdx === -1) maxGradeIdx = 0;
    
    let currentRankId = 0;
    for(let i = 1; i < RANKS.length; i++) {
        let reqGradeIdx = ALL_GRADES.indexOf(RANKS[i].minGrade);
        if (points >= RANKS[i].minPts && maxGradeIdx >= reqGradeIdx) {
            currentRankId = i;
        } else {
            break;
        }
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

    const res = await fetch("https://api.cloudinary.com/v1_1/hz7ii1gc/image/upload", {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || "Cloudinary Error");
}

function showNotify(msg, isError = false) {
    const box = document.getElementById('notify-box');
    box.innerText = msg;
    box.className = `fixed top-5 px-6 py-3 rounded-lg font-bold shadow-lg transition-opacity duration-300 z-50 uppercase tracking-wider text-sm ${isError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`;
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
        const res = await fetch(endpoint, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if (!res.ok) { 
            showNotify("Error: " + (data.detail || "Server error"), true); 
            return null; 
        }
        return data;
    } catch(e) { 
        showNotify("Network Error", true); 
        return null; 
    }
}

function getPoints(history) {
    let total = 0;
    history.forEach(a => {
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
}

let isLoginMode = true;
function switchAuthMode() {
    isLoginMode = !isLoginMode; 
    document.getElementById('auth-title').innerText = isLoginMode ? "Login" : "Sign Up";
    document.getElementById('auth-btn').innerText = isLoginMode ? "Login" : "Create Account";
    document.getElementById('auth-switch').innerText = isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login";
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
        if (pwd !== pwdConfirm) return showNotify("Passwords do not match!", true);
        try {
            showNotify("Creating secure account...");
            const userCred = await auth.createUserWithEmailAndPassword(rawEmail, pwd);
            await userCred.user.sendEmailVerification();
            const profile = { user_id: userCred.user.uid, email: rawEmail, name: "", bio: "Bouldering Enthusiast", avatar_url: "", is_global_admin: false, can_create_gyms: false };
            const res = await apiCall('/api/db/save', { path: `users/${userCred.user.uid}`, payload: profile });
            if (!res) return;
            localStorage.setItem('user_profile', JSON.stringify(profile)); 
            showNotify("Account created! Check your email to verify.", false); 
            showView('view-onboarding'); 
        } catch (error) { showNotify(error.message.replace("Firebase: ", ""), true); }
    } else {
        try {
            showNotify("Logging in...");
            const userCred = await auth.signInWithEmailAndPassword(rawEmail, pwd);
            if (!userCred.user.emailVerified) return showNotify("Please verify your email first!", true);
            let profile = await apiCall('/api/db/get', { path: `users/${userCred.user.uid}` });
            if (!profile || profile.detail || !profile.name) {
                profile = profile || { user_id: userCred.user.uid, email: rawEmail, name: "", bio: "", avatar_url: "", is_global_admin: false, can_create_gyms: false };
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
            showNotify("Welcome back!");
        } catch (error) { showNotify(error.message.replace("Firebase: ", ""), true); }
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
            profile = { user_id: userCred.user.uid, email: userCred.user.email, name: displayName, first_name: displayName.split(" ")[0] || "", last_name: displayName.split(" ").slice(1).join(" ") || "", bio: "Bouldering Enthusiast", avatar_url: userCred.user.photoURL || "", is_global_admin: false, can_create_gyms: false };
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
        showNotify("Welcome!");
    } catch (error) { showNotify(error.message.replace("Firebase: ", ""), true); }
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
    showNotify("Optimizing & Uploading...");
    try { 
        const base64Str = await compressImageToBase64(fileObj, 600); 
        const imageUrl = await directCloudinaryUpload(base64Str);
        let profile = JSON.parse(localStorage.getItem('user_profile'));
        profile.avatar_url = imageUrl; 
        localStorage.setItem('user_profile', JSON.stringify(profile));
        await apiCall('/api/db/save', { path: `users/${profile.user_id}/avatar_url`, payload: imageUrl });
        document.getElementById('onboard-avatar').src = imageUrl; 
        showNotify("Avatar uploaded!");
    } catch(err) { 
        alert("UPLOAD ERROR: " + err.message);
        showNotify("Upload failed!", true); 
    }
}

async function uploadAvatar(input) {
    let fileObj = input.files[0]; if(!fileObj) return; 
    showNotify("Optimizing & Uploading...");
    try { 
        const base64Str = await compressImageToBase64(fileObj, 600); 
        const imageUrl = await directCloudinaryUpload(base64Str);
        let profile = JSON.parse(localStorage.getItem('user_profile'));
        profile.avatar_url = imageUrl; 
        localStorage.setItem('user_profile', JSON.stringify(profile));
        await apiCall('/api/db/save', { path: `users/${profile.user_id}/avatar_url`, payload: imageUrl });
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) profileAvatar.src = imageUrl;
        showNotify("Avatar uploaded!");
    } catch(err) { 
        alert("UPLOAD ERROR: " + err.message);
        showNotify("Upload failed!", true); 
    }
}

async function loadWallPhoto(input) {
    let fileObj = input.files[0]; if(!fileObj) return; 
    showNotify("Optimizing & Uploading..."); 
    try { 
        const base64Str = await compressImageToBase64(fileObj, 1080); 
        const imageUrl = await directCloudinaryUpload(base64Str);
        document.getElementById('wizard-wall-img').src = imageUrl; 
        document.getElementById('detail-wall-img').src = imageUrl; 
        wizardStep(2); 
        showNotify("Photo uploaded!"); 
    } catch(err) { 
        alert("UPLOAD ERROR: " + err.message);
        showNotify("Upload failed!", true); 
    }
}

async function completeOnboarding() {
    const nickname = document.getElementById('onb-nickname').value.trim(); 
    if (!nickname) return showNotify("Nickname is required!", true);
    
    const parts = document.getElementById('onb-realname').value.trim().split(' ');
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
    showNotify("Setup Complete!");
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
    if(!name) return showNotify("Nickname is required!", true);
    
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
    showNotify("Profile updated!");
}

function renderGradeChart(containerId, gradesArray) {
    const chartContainer = document.getElementById(containerId); 
    chartContainer.innerHTML = '';
    const counts = {}; 
    gradesArray.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
    if (Object.keys(counts).length === 0) { 
        chartContainer.innerHTML = '<p class="text-gray-500 text-center w-full self-center text-xs uppercase tracking-wider">No ascents yet</p>'; 
        return; 
    }
    const maxCount = Math.max(...Object.values(counts));
    Object.keys(counts).sort((a,b) => ALL_GRADES.indexOf(a) - ALL_GRADES.indexOf(b)).forEach(grade => {
        const heightPercent = Math.max((counts[grade] / maxCount) * 100, 5); 
        chartContainer.innerHTML += `<div class="flex flex-col justify-end items-center flex-1 min-w-[32px] h-full mx-1"><span class="text-[10px] text-gray-400 mb-1">${counts[grade]}</span><div class="w-full bg-blue-500 rounded-t-sm transition-all duration-500 shadow-md" style="height: ${heightPercent}%"></div><span class="text-[10px] font-bold mt-1 text-gray-300">${grade}</span></div>`;
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
        const bgClass = (logbookSelectedDate === d.getTime()) ? 'bg-blue-600' : 'bg-gray-700';
        daysContainer.innerHTML += `<button onclick="selectLogbookDate(${d.getTime()})" class="flex flex-col items-center justify-center min-w-[48px] p-2 rounded-lg ${bgClass} hover:bg-blue-500 transition-colors"><span class="text-[10px] text-gray-300 uppercase">${d.toLocaleDateString('en-US', {weekday: 'short'})}</span><span class="font-bold text-lg leading-tight">${d.getDate()}</span>${dot}</button>`;
    }
    entriesContainer.innerHTML = '';
    const selectedAscents = history.filter(a => { 
        const ad = new Date(a.timestamp); 
        ad.setHours(0,0,0,0); 
        return ad.getTime() === logbookSelectedDate; 
    });
    
    if(selectedAscents.length === 0) {
        entriesContainer.innerHTML = '<p class="text-gray-500 text-xs uppercase tracking-wider text-center py-2">Rest day. No ascents logged.</p>';
    } else { 
        selectedAscents.forEach(a => { 
            const badge = '<span class="text-green-500 font-bold text-xs uppercase tracking-wider">Done</span>'; 
            entriesContainer.innerHTML += `<div class="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-700"><div><p class="font-bold text-sm uppercase tracking-wider">${a.boulder_name || 'Unnamed'}</p><p class="text-xs text-gray-400">Grade: ${a.grade}</p></div>${badge}</div>`; 
        }); 
    }
}

function selectLogbookDate(t) { 
    logbookSelectedDate = t; 
    renderLogbook(); 
}

async function loadHomeView() {
    let profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    profile.ascents_history = normArr(await apiCall('/api/db/get', { path: `user_ascents/${profile.user_id}` }));
    localStorage.setItem('user_profile', JSON.stringify(profile));
    
    document.getElementById('profile-name').innerText = profile.name || "Unnamed";
    document.getElementById('profile-realname').innerText = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    document.getElementById('profile-bio').innerText = profile.bio || "";
    document.getElementById('profile-avatar').src = profile.avatar_url || DEFAULT_AVATAR;
    document.getElementById('nav-super-admin').classList.toggle('hidden-view', !profile.is_global_admin);
    
    const history = profile.ascents_history; 
    document.getElementById('stat-total').innerText = history.length;
    const grades = history.map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const maxGrade = grades.length ? grades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, grades[0]) : "1";
    document.getElementById('stat-max').innerText = grades.length ? maxGrade : "-";
    
    const totalPoints = getPoints(history); 
    const league = getLeagueInfo(totalPoints, maxGrade); 
    const rankEl = document.getElementById('profile-rank');
    rankEl.innerHTML = `<div class="flex items-center justify-center">${league.current.svg} <span>${league.current.title}</span> <span class="text-gray-500 text-xs ml-1.5 font-normal">(${totalPoints} PTS)</span></div>`;
    rankEl.className = `text-sm font-bold mt-1 uppercase tracking-widest cursor-pointer ${league.current.color}`;
    rankEl.onclick = () => navigate('league'); 
    
    const likes = await apiCall('/api/db/get', { path: `profile_likes/${profile.user_id}` }) || {}; 
    const likeKeys = Object.keys(likes).filter(k => likes[k]);
    document.getElementById('my-likes-count').innerText = likeKeys.length;
    
    const isUnlocked = profile.is_global_admin || history.length >= 20 || ALL_GRADES.indexOf(maxGrade) >= ALL_GRADES.indexOf("6B+");
    const lockBox = document.getElementById('my-likes-lock'); 
    const listObj = document.getElementById('my-likes-list');
    
    if (isUnlocked) { 
        lockBox.classList.add('hidden-view'); 
        if (likeKeys.length > 0) { 
            listObj.classList.remove('hidden-view'); 
            const allUsers = await apiCall('/api/db/get', { path: `users` }) || {}; 
            listObj.innerHTML = likeKeys.map(uid => allUsers[uid] ? `<p class="text-gray-300 font-bold tracking-wider text-xs uppercase">• @${allUsers[uid].nickname || allUsers[uid].name}</p>` : '').join(''); 
        } else { 
            listObj.classList.add('hidden-view'); 
        } 
    } else { 
        lockBox.classList.remove('hidden-view'); 
        listObj.classList.add('hidden-view'); 
    }
    renderGradeChart('stat-chart', grades); 
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
        list.innerHTML += `<div class="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-800"><span class="font-bold tracking-wider text-sm">@${u.nickname || u.name}</span><div><button onclick="acceptFriend('${senderId}', true)" class="bg-green-600 px-3 py-1 rounded text-xs mr-2 font-bold transition-colors uppercase tracking-wider">Accept</button><button onclick="acceptFriend('${senderId}', false)" class="bg-red-600 px-3 py-1 rounded text-xs font-bold transition-colors uppercase tracking-wider">Decline</button></div></div>`;
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
        showNotify("Friend added!"); 
    }
    loadFriendRequests();
}

// 🔥 ГЕНЕРАТОР ЭКРАНА ЛИГИ 🔥
function loadLeagueView() {
    const profile = JSON.parse(localStorage.getItem('user_profile'));
    const history = normArr(profile.ascents_history || []);
    const points = getPoints(history);
    const grades = history.map(a => a.grade).filter(g => ALL_GRADES.includes(g));
    const maxGrade = grades.length ? grades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, grades[0]) : "1";
    
    const league = getLeagueInfo(points, maxGrade);
    const container = document.getElementById('league-content');
    
    let html = `<h2 class="text-2xl font-black mb-6 text-center uppercase tracking-widest text-white">Your League</h2>`;
    
    // Текущая лига (Карточка)
    html += `
    <div class="bg-gray-800 p-6 rounded-2xl flex flex-col items-center shadow-lg relative overflow-hidden mb-8 border border-gray-700">
        <div class="${league.current.color} scale-150 mb-4">${league.current.svg}</div>
        <h3 class="text-3xl font-black uppercase tracking-wider ${league.current.color}">${league.current.title}</h3>
        <p class="text-gray-400 mt-2 font-bold">${points} PTS</p>
        <p class="text-xs text-gray-500 mt-1 uppercase tracking-wider">Max Grade: <span class="text-white font-bold">${maxGrade !== "1" ? maxGrade : "None"}</span></p>
    </div>`;
    
    // Блок Прогресса / Босса
    if (league.next) {
        html += `<div class="mb-8">`;
        html += `<h4 class="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Progress to ${league.next.title}</h4>`;
        
        if (league.isBossLocked) {
            html += `
            <div class="bg-red-900/30 border border-red-500 p-4 rounded-xl mb-3 shadow-lg">
                <p class="text-red-400 font-bold text-center text-sm mb-1 uppercase tracking-wider">Requirement Pending</p>
                <p class="text-gray-300 text-center text-xs">To enter the <span class="${league.next.color} font-bold">${league.next.title}</span> league, you must complete the challenge:</p>
                <div class="mt-3 bg-red-600 text-white text-center py-3 rounded font-black text-lg shadow-lg uppercase tracking-wider">
                    CLIMB A ${league.next.minGrade} OR HARDER
                </div>
            </div>`;
        } else {
            html += `
            <div class="flex justify-between text-xs font-bold mb-1">
                <span class="text-gray-400">${points} PTS</span>
                <span class="text-gray-400">${league.next.minPts} PTS</span>
            </div>
            <div class="w-full bg-gray-800 rounded-full h-4 mb-2 shadow-inner overflow-hidden border border-gray-700">
                <div class="bg-blue-500 h-4 rounded-full transition-all duration-1000 shadow-md" style="width: ${league.percent}%"></div>
            </div>
            <p class="text-center text-xs text-gray-500 font-bold mb-4 uppercase tracking-wider">Boss Requirement: Climb a ${league.next.minGrade}</p>
            `;
        }
        html += `</div>`;
    } else {
        html += `<div class="text-center text-yellow-400 font-black text-xl mb-8 uppercase tracking-widest">Max League Reached</div>`;
    }
    
    // Список всех лиг
    html += `<h4 class="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">All Leagues</h4><div class="space-y-3">`;
    RANKS.forEach((r) => {
        const isCurrent = r.id === league.current.id;
        const isLocked = r.id > league.current.id;
        
        let bgClass = isCurrent ? 'bg-gray-700 border border-blue-500 shadow-lg scale-105' : 'bg-gray-900 border border-gray-800 opacity-70';
        if (!isLocked && !isCurrent) bgClass = 'bg-gray-800 border border-gray-700'; 
        
        html += `
        <div class="${bgClass} p-4 rounded-xl flex items-center justify-between transition-all">
            <div class="flex items-center">
                <div class="${isLocked ? 'text-gray-600' : r.color} mr-3">${r.svg}</div>
                <div>
                    <p class="font-bold uppercase tracking-wider text-sm ${isLocked ? 'text-gray-500' : r.color}">${r.title}</p>
                    <p class="text-[10px] text-gray-500 uppercase mt-0.5 tracking-wider">${r.minPts} PTS • Boss: ${r.minGrade}</p>
                </div>
            </div>
            ${isCurrent ? '<span class="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">Current</span>' : ''}
            ${isLocked ? '<span class="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Locked</span>' : (!isCurrent ? '<span class="text-green-500 text-[10px] font-bold uppercase tracking-wider">Done</span>' : '')}
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
        list.innerHTML = '<p class="text-gray-500 text-center mt-4 uppercase text-sm tracking-wider">No friends yet</p>'; return; 
    }
    
    for(let fId in friends) { 
        const u = allUsers[fId]; 
        if(!u) continue; 
        list.innerHTML += `<div onclick="openOtherProfile('${fId}', 'friends')" class="bg-gray-800 p-4 rounded-lg flex justify-between items-center cursor-pointer mb-2 hover:bg-gray-700 transition-colors shadow"><span class="font-bold tracking-wider">@${u.nickname || u.name || 'User'}</span><span class="text-blue-400 text-xs uppercase tracking-wider font-bold">Profile &gt;</span></div>`; 
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
        list.innerHTML += `<div onclick="openGym('${g.id}', '${g.name}')" class="bg-gray-800 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors mb-2 shadow"><div><h3 class="font-bold text-lg uppercase tracking-wider">${g.name}</h3><p class="text-gray-400 text-xs uppercase tracking-wider mt-1">${g.city || 'Unknown'}</p></div><span class="text-blue-400 font-bold uppercase text-xs tracking-wider">Enter &gt;</span></div>`; 
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
    showNotify("Gym created!");
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
    container.innerHTML = `<button onclick="selectSector('all')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${currentSector === 'all' ? 'bg-blue-600' : 'bg-gray-800'}">All Sectors</button>`;
    
    for(let sId in gymSectors) { 
        if(!gymSectors[sId]) continue; 
        container.innerHTML += `<button onclick="selectSector('${sId}')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${currentSector === sId ? 'bg-blue-600' : 'bg-gray-800'}">${gymSectors[sId]}</button>`; 
    }
    
    if(currentGymRole === 'admin') {
        container.innerHTML += `<button onclick="toggleSectorForm(true)" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 transition-colors">+ Add</button>`;
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
    container.innerHTML = `<button onclick="selectGradeFilter('all')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${currentGradeFilter === 'all' ? 'bg-blue-600' : 'bg-gray-800'}">All</button>`;
    ALL_GRADES.forEach(g => { 
        container.innerHTML += `<button onclick="selectGradeFilter('${g}')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${currentGradeFilter === g ? 'bg-blue-600' : 'bg-gray-800'}">${g}</button>`; 
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
    showNotify("Sector added!");
}

async function clearSector() {
    if(!confirm("Are you sure you want to remove ALL boulders from this sector?")) return;
    const boulders = await apiCall('/api/db/get', { path: `boulders` }) || {};
    for(let bId in boulders) { 
        if(boulders[bId] && boulders[bId].gym_id === currentGymId && boulders[bId].sector_id === currentSector) { 
            await apiCall('/api/db/save', { path: `boulders/${bId}`, method: 'DELETE' }); 
            if(boulders[bId].image_url) apiCall('/api/delete_image', { url: boulders[bId].image_url }); 
        } 
    }
    showNotify("Sector cleared!"); 
    loadGallery();
}

async function deleteSector() {
    if(!confirm("Are you sure you want to delete this sector AND all its boulders?")) return;
    const boulders = await apiCall('/api/db/get', { path: `boulders` }) || {};
    for(let bId in boulders) { 
        if(boulders[bId] && boulders[bId].gym_id === currentGymId && boulders[bId].sector_id === currentSector) { 
            await apiCall('/api/db/save', { path: `boulders/${bId}`, method: 'DELETE' }); 
            if(boulders[bId].image_url) apiCall('/api/delete_image', { url: boulders[bId].image_url }); 
        } 
    }
    const res = await apiCall('/api/db/save', { path: `gym_sectors/${currentGymId}/${currentSector}`, method: 'DELETE' }); 
    if (!res) return;
    showNotify("Sector deleted!"); 
    currentSector = 'all'; 
    await loadSectors(); 
    loadGallery();
}

async function deleteCurrentGym() {
    if(!confirm("Are you SURE you want to delete this ENTIRE GYM?")) return;
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
    showNotify("Gym deleted successfully!"); 
    navigate('gyms');
}

function switchTab(tabName) {
    currentTab = tabName;
    ['official', 'custom', 'climbers', 'admin'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) { 
            if (t === tabName) { btn.classList.add('bg-blue-600'); btn.classList.remove('bg-gray-800'); } 
            else { btn.classList.add('bg-gray-800'); btn.classList.remove('bg-blue-600'); } 
        }
    });
    document.getElementById('tab-content-gallery').classList.toggle('hidden-view', tabName === 'climbers' || tabName === 'admin');
    document.getElementById('tab-content-climbers').classList.toggle('hidden-view', tabName !== 'climbers');
    document.getElementById('tab-content-admin').classList.toggle('hidden-view', tabName !== 'admin');
    
    const showSectors = (tabName === 'official' || tabName === 'custom');
    document.getElementById('sector-bar-container').classList.toggle('hidden-view', !showSectors);
    document.getElementById('add-route-btn').classList.toggle('hidden-view', tabName === 'climbers' || tabName === 'admin' || (tabName === 'official' && currentGymRole === 'user'));
    
    if(showSectors) renderGradeFilters();
    if(tabName === 'climbers') loadGymClimbers(); 
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
            const displayGrade = b.consensus_grade ? `${b.grade} (Community: <span class="text-purple-400 font-bold">${b.consensus_grade}</span>)` : b.grade;
            if (currentGradeFilter !== 'all' && b.grade !== currentGradeFilter && b.consensus_grade !== currentGradeFilter) continue;
            
            found = true; 
            const ascent = (profile.ascents_history || []).find(a => a.boulder_id === b.id);
            let badge = ''; 
            if (ascent) { badge = '<span class="text-green-500 font-bold uppercase text-[10px] tracking-wider border border-green-500 px-2 py-0.5 rounded">Done</span>'; }
            
            const bJson = JSON.stringify(b).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const secName = b.sector_id && gymSectors[b.sector_id] ? ` | Sector: ${gymSectors[b.sector_id]}` : '';
            list.innerHTML += `<div onclick="openRouteDetail(JSON.parse('${bJson}'))" class="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg cursor-pointer flex justify-between items-center transition-colors mb-2 shadow"><div><h4 class="font-bold text-lg tracking-wider uppercase">${b.name || 'Unnamed'}</h4><p class="text-gray-400 text-xs mt-1 uppercase tracking-wider">Grade: ${displayGrade} | By: ${b.author || 'Unknown'}${secName}</p><p class="text-blue-400 text-[10px] mt-1.5 font-bold uppercase tracking-wider">Ascents: ${b.ascents || 0}</p></div>${badge}</div>`;
        }
    }
    if(!found) list.innerHTML = `<p class="text-gray-500 text-center mt-6 uppercase text-sm tracking-wider">No routes found</p>`;
}

function openRouteDetail(b) {
    activeBoulder = b; 
    document.getElementById('edit-route-form').classList.add('hidden-view'); 
    document.getElementById('grade-suggest-box').classList.add('hidden-view');
    
    const displayGrade = b.consensus_grade ? `${b.grade} (Community: ${b.consensus_grade})` : b.grade;
    document.getElementById('detail-title').innerText = `${b.name || 'Unnamed'} - ${displayGrade}`;
    document.getElementById('detail-author').innerText = `AUTHOR: ${b.author || 'Unknown'} | ASCENTS: ${b.ascents || 0}\n${b.description || ''}`;
    document.getElementById('detail-wall-img').src = b.image_url;
    
    const container = document.getElementById('detail-canvas'); 
    container.querySelectorAll('.marker').forEach(el => el.remove());
    (b.markers || []).forEach(m => {
        const dot = document.createElement('div'); 
        dot.className = 'marker absolute w-7 h-7 rounded-full border-[3px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2'; 
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
        actionsDiv.innerHTML = `<button onclick="navigate('gym-routes')" class="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex-1 shadow-md">Back</button><button onclick="removeAscent()" class="bg-green-600 hover:bg-red-500 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex-[2] shadow-md border border-green-400">Completed</button>`;
    } else {
        actionsDiv.innerHTML = `<button onclick="navigate('gym-routes')" class="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex-1 shadow-md">Back</button><button onclick="startCompleteRoute()" class="bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex-[2] shadow-md">Complete Route</button>`;
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
    
    history.push({ boulder_id: activeBoulder.id, boulder_name: activeBoulder.name, grade: gradeToLog, style: 'completed', timestamp: Date.now() });
    profile.ascents_history = history; 
    localStorage.setItem('user_profile', JSON.stringify(profile));
    await apiCall('/api/db/save', { path: `user_ascents/${profile.user_id}`, payload: history });
    
    activeBoulder.ascents = (activeBoulder.ascents || 0) + 1;
    await apiCall('/api/db/save', { path: `boulders/${activeBoulder.id}`, payload: activeBoulder }); 
    showNotify("Ascent logged!"); 
    openRouteDetail(activeBoulder);
}

async function removeAscent() {
    if(!confirm("Cancel this ascent? This will remove it from your logbook.")) return;
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
    showNotify("Ascent cancelled", true); 
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
        const grades = history.map(a => a.grade).filter(g => ALL_GRADES.includes(g)); 
        const maxGradeIdx = grades.length ? Math.max(...grades.map(g => ALL_GRADES.indexOf(g))) : -1;
        const maxGrade = maxGradeIdx > -1 ? ALL_GRADES[maxGradeIdx] : "1";
        const points = getPoints(history); 
        currentClimbersData.push({ uid: uid, user: u, points: points, maxGrade: maxGrade, totalAscents: grades.length });
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
        
        if (nameStr.includes(q)) {
            let rankNumColor = rank === 1 ? "text-yellow-500 font-extrabold" : rank === 2 ? "text-gray-300 font-extrabold" : rank === 3 ? "text-orange-400 font-extrabold" : "text-gray-400";
            const league = getLeagueInfo(c.points, c.maxGrade);
            const rankData = league.current;
            container.innerHTML += `<div onclick="openOtherProfile('${c.uid}', 'gym-routes')" class="bg-gray-800 p-3 rounded-lg flex justify-between items-center cursor-pointer mb-2 hover:bg-gray-700 transition-colors shadow"><div class="flex items-center space-x-3"><span class="w-6 text-center text-lg ${rankNumColor}">#${rank}</span><div><p class="font-bold tracking-wider uppercase text-sm">@${c.user.nickname || c.user.name || 'User'}</p><div class="flex items-center text-[10px] uppercase font-bold tracking-wider mt-0.5 ${rankData.color}">${rankData.svg} ${rankData.title} <span class="text-gray-500 ml-1 font-normal">(${c.points} PTS)</span></div><p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Max: <span class="text-red-400 font-bold">${c.maxGrade !== "1" ? c.maxGrade : "-"}</span> | Ascents: <span class="text-green-400 font-bold">${c.totalAscents}</span></p></div></div><span class="text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-800 px-2 py-1 rounded">View</span></div>`;
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
            list.innerHTML += `<div class="flex justify-between items-center bg-gray-800 p-3 rounded mb-2 border border-gray-700"><span class="font-bold text-sm tracking-wider uppercase">@${allUsers[uid].nickname || allUsers[uid].name || 'User'}</span><button onclick="setGymRole('${uid}', 'user')" class="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-xs font-bold transition-colors uppercase tracking-wider">Demote</button></div>`; 
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
            if(u && ((u.nickname || u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))) {
                list.innerHTML += `<div class="flex justify-between items-center bg-gray-900 border border-gray-700 p-3 rounded mb-2"><span class="font-bold text-sm tracking-wider uppercase">@${u.nickname || u.name}</span><button onclick="setGymRole('${uid}', 'setter')" class="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold transition-colors uppercase tracking-wider">Make Setter</button></div>`; 
            }
        }
    });
}

async function setGymRole(uid, role) { 
    const res = await apiCall('/api/db/save', { path: `gym_roles/${currentGymId}/${uid}`, payload: role }); 
    if(res) { showNotify("Role updated!"); loadAdminPanel(); } 
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
        dot.className = 'marker absolute w-7 h-7 rounded-full border-[3px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2'; 
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
    
    showNotify("Route updated!"); 
    toggleEditRouteForm(); 
    openRouteDetail(activeBoulder);
}

async function deleteRoute() {
    if(!confirm("Are you sure you want to delete this route permanently?")) return;
    const res = await apiCall('/api/db/save', { path: `boulders/${activeBoulder.id}`, method: 'DELETE' }); 
    if (!res) return; 
    
    if(activeBoulder.image_url) apiCall('/api/delete_image', { url: activeBoulder.image_url }); 
    showNotify("Route deleted!"); 
    navigate('gym-routes');
}

async function openOtherProfile(uid, source = 'home') {
    profileBackTarget = source; currentOtherUserId = uid;
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    if(uid === profile.user_id) { navigate(source); return; }
    
    const allUsers = await apiCall('/api/db/get', { path: `users` }) || {}; 
    const u = allUsers[uid] || {};
    
    document.getElementById('op-name').innerText = `@${u.nickname || u.name || 'User'}`; 
    document.getElementById('op-realname').innerText = `${u.first_name || ''} ${u.last_name || ''}`.trim(); 
    document.getElementById('op-bio').innerText = u.bio || ""; 
    document.getElementById('op-avatar').src = u.avatar_url || DEFAULT_AVATAR;
    
    const history = normArr(await apiCall('/api/db/get', { path: `user_ascents/${uid}` })); 
    document.getElementById('op-stat-total').innerText = history.length;
    const grades = history.map(a => a.grade).filter(g => ALL_GRADES.includes(g)); 
    const maxGrade = grades.length ? grades.reduce((max, g) => ALL_GRADES.indexOf(g) > ALL_GRADES.indexOf(max) ? g : max, grades[0]) : "1"; 
    document.getElementById('op-stat-max').innerText = grades.length ? maxGrade : "-"; 
    
    const totalPoints = getPoints(history); 
    const league = getLeagueInfo(totalPoints, maxGrade); 
    const rankEl = document.getElementById('op-rank');
    rankEl.innerHTML = `<div class="flex items-center justify-center">${league.current.svg} <span>${league.current.title}</span> <span class="text-gray-500 text-xs ml-1.5 font-normal">(${totalPoints} PTS)</span></div>`; 
    rankEl.className = `text-sm font-bold mt-1 uppercase tracking-widest ${league.current.color}`;
    
    const likes = await apiCall('/api/db/get', { path: `profile_likes/${uid}` }) || {}; 
    isOpLiked = likes[profile.user_id] === true;
    const likeBtn = document.getElementById('op-like-btn'); 
    likeBtn.innerText = `${isOpLiked ? 'Liked' : 'Like'} (${Object.keys(likes).filter(k=>likes[k]).length})`;
    if(isOpLiked) { 
        likeBtn.classList.add('bg-pink-500', 'text-white'); 
        likeBtn.classList.remove('text-pink-500'); 
    } else { 
        likeBtn.classList.remove('bg-pink-500', 'text-white'); 
        likeBtn.classList.add('text-pink-500'); 
    }
    
    renderGradeChart('op-stat-chart', grades);
    
    const isFriend = await apiCall('/api/db/get', { path: `friends/${profile.user_id}/${uid}` }); 
    const sentReq = await apiCall('/api/db/get', { path: `friend_requests/${uid}/${profile.user_id}` });
    const btn = document.getElementById('op-action-btn'); 
    if(isFriend) { 
        btn.innerText = "Remove Friend"; 
        btn.className = "mt-4 px-6 py-2 rounded-xl font-bold bg-red-600 hover:bg-red-500 transition-colors uppercase tracking-wider text-xs shadow"; 
    } else if(sentReq) { 
        btn.innerText = "Request Sent"; 
        btn.className = "mt-4 px-6 py-2 rounded-xl font-bold bg-gray-600 uppercase tracking-wider text-xs shadow"; 
    } else { 
        btn.innerText = "Add Friend"; 
        btn.className = "mt-4 px-6 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-colors uppercase tracking-wider text-xs shadow"; 
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
        showNotify("Like sent!"); 
    }
    openOtherProfile(currentOtherUserId, profileBackTarget); 
}

async function handleOpAction() {
    const profile = JSON.parse(localStorage.getItem('user_profile')); 
    const btn = document.getElementById('op-action-btn');
    if(btn.innerText === "Add Friend" || btn.innerText === "ADD FRIEND") { 
        const res = await apiCall('/api/db/save', { path: `friend_requests/${currentOtherUserId}/${profile.user_id}`, payload: true }); 
        if(!res) return; 
        showNotify("Friend request sent!"); 
        btn.innerText = "Request Sent"; 
        btn.className = "mt-4 px-6 py-2 rounded-xl font-bold bg-gray-600 uppercase tracking-wider text-xs shadow"; 
    }
    else if(btn.innerText === "Remove Friend" || btn.innerText === "REMOVE FRIEND") { 
        await apiCall('/api/db/save', { path: `friends/${profile.user_id}/${currentOtherUserId}`, method: 'DELETE' }); 
        await apiCall('/api/db/save', { path: `friends/${currentOtherUserId}/${profile.user_id}`, method: 'DELETE' }); 
        showNotify("Removed from friends"); 
        btn.innerText = "Add Friend"; 
        btn.className = "mt-4 px-6 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-colors uppercase tracking-wider text-xs shadow"; 
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

window.onload = () => {
    const profileStr = localStorage.getItem('user_profile');
    if(profileStr) { 
        const profile = JSON.parse(profileStr); 
        if (profile.detail || !profile.user_id) { 
            localStorage.removeItem('user_profile'); showView('view-auth'); return; 
        } 
        if (!profile.name) showView('view-onboarding'); 
        else { loadHomeView(); showView('view-home'); } 
    } else showView('view-auth');
};
