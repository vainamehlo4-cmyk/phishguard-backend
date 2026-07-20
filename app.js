// ========== API URL ==========
const API_URL = '';

// ========== Shared Functions ==========

function getCurrentUser() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user;
}

function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    const user = getCurrentUser();
    if (user) {
        localStorage.removeItem(`completedModules_${user.id}`);
    }
    window.location.href = 'index.html';
}

function updateUsernameDisplay() {
    const user = getCurrentUser();
    const els = document.querySelectorAll('#username-display');
    els.forEach(el => {
        if (user) el.textContent = user.username || 'User';
    });
}

async function checkBackend() {
    try {
        const response = await fetch(`${API_URL}/api/healthz`);
        return response.ok;
    } catch {
        return false;
    }
}

// ========== Login ==========

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            const oldUser = getCurrentUser();
            if (oldUser) {
                localStorage.removeItem(`completedModules_${oldUser.id}`);
            }
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            window.location.href = 'dashboard.html';
            return { success: true };
        } else {
            return { success: false, error: data.error || 'Login failed' };
        }
    } catch (error) {
        return { success: false, error: 'Cannot connect to backend' };
    }
}

// ========== Registration ==========

async function registerUser(username, email, password) {
    if (!username || username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!email || !email.includes('@')) {
        return { success: false, error: 'Please enter a valid email' };
    }
    if (!password || password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' };
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true };
        } else {
            let errorMsg = data.error || 'Registration failed';
            if (errorMsg.includes('UNIQUE constraint')) {
                errorMsg = 'Username or email already exists. Please try another.';
            }
            return { success: false, error: errorMsg };
        }
    } catch (error) {
        return { success: false, error: 'Cannot connect to backend. Is the server running?' };
    }
}

// ========== Training Progress (User-Specific) ==========

function getStorageKey() {
    const user = getCurrentUser();
    return user ? `completedModules_${user.id}` : 'completedModules';
}

function loadCompletedModules() {
    const key = getStorageKey();
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveCompletedModules(modules) {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(modules));
}

function getCompletedCount() {
    return loadCompletedModules().length;
}

function isModuleCompleted(moduleId) {
    const completed = loadCompletedModules();
    return completed.includes(moduleId);
}

function loadTrainingProgress() {
    const totalModules = 8;
    const completed = loadCompletedModules();
    const completedCount = completed.length;
    const progressPercent = Math.round((completedCount / totalModules) * 100);
    
    const trainingProgressEl = document.getElementById('training-progress');
    if (trainingProgressEl) {
        trainingProgressEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="color:#8899bb;">📚 Training Progress</span>
                <span style="color:#0078D4; font-weight:bold;">${completedCount}/${totalModules} modules</span>
            </div>
            <div class="progress-bar" style="margin:8px 0;">
                <div class="fill" style="width:${progressPercent}%;"></div>
            </div>
            <span style="color:#8899bb; font-size:14px;">${progressPercent}% Complete</span>
        `;
    }
}

// ========== Dashboard ==========

async function loadDashboard() {
    const user = requireAuth();
    if (!user) return;
    updateUsernameDisplay();

    const statusBadge = document.getElementById('status-badge');
    const isOnline = await checkBackend();
    if (statusBadge) {
        statusBadge.textContent = isOnline ? '✅ Online' : '❌ Offline';
        statusBadge.className = isOnline ? '' : 'error';
    }

    loadTrainingProgress();

    try {
        const response = await fetch(`${API_URL}/api/dashboard?username=${user.username}`);
        const data = await response.json();

        document.getElementById('quizzes-taken').textContent = data.stats.quizzesTaken || 0;
        document.getElementById('average-score').textContent = (data.stats.averageScore || 0) + '%';
        document.getElementById('best-score').textContent = (data.stats.bestScore || 0) + '%';
        document.getElementById('completed').textContent = (data.stats.completed || 0) + '%';
        document.getElementById('username-display').textContent = data.user.username;

        const resultsDiv = document.getElementById('recent-results');
        if (data.recentResults && data.recentResults.length > 0) {
            resultsDiv.innerHTML = '';
            data.recentResults.forEach(r => {
                const div = document.createElement('div');
                div.className = 'result-item';
                const passClass = r.score >= 70 ? 'pass' : 'fail';
                div.innerHTML = `<span>Quiz #${r.id}</span><span class="score ${passClass}">${r.score}%</span><span>${new Date(r.date).toLocaleDateString()}</span>`;
                resultsDiv.appendChild(div);
            });
        } else {
            resultsDiv.innerHTML = '<div class="loading-text">No quiz results yet. Take your first quiz!</div>';
        }

        drawChart(data.recentResults);

    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// ========== Chart ==========

function drawChart(results) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (!results || results.length === 0) {
        ctx.fillStyle = '#8899bb';
        ctx.font = '14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet. Take a quiz!', width/2, height/2);
        return;
    }
    
    const scores = results.map(r => r.score);
    const labels = results.map((r, i) => `Q${i+1}`);
    
    ctx.strokeStyle = '#1a2a4a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
        const y = height - 30 - (i / 4) * (height - 60);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
        ctx.fillStyle = '#8899bb';
        ctx.font = '10px Segoe UI';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round((i / 4) * 100) + '%', 35, y + 4);
    }
    
    const barWidth = Math.min(40, (width - 80) / scores.length - 10);
    const startX = 50;
    
    scores.forEach((score, i) => {
        const x = startX + i * (barWidth + 15);
        const barHeight = ((score / 100) * (height - 60));
        const y = height - 30 - barHeight;
        
        const gradient = ctx.createLinearGradient(x, y, x, height - 30);
        if (score >= 70) {
            gradient.addColorStop(0, '#4caf50');
            gradient.addColorStop(1, '#1a5c2a');
        } else {
            gradient.addColorStop(0, '#f44336');
            gradient.addColorStop(1, '#5c1a1a');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#8899bb';
        ctx.font = '10px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(score + '%', x + barWidth/2, y - 5);
        ctx.fillText(labels[i] || '', x + barWidth/2, height - 10);
    });
}

// ========== Training ==========

const TRAINING_MODULES = [
    {
        id: 1,
        title: 'Phishing Basics',
        level: 'Beginner',
        duration: '15 min',
        description: 'Learn what phishing is and how to recognize it.',
        content: `
            <h3>🎣 What is Phishing?</h3>
            <p>Phishing is a cyber attack where criminals pretend to be legitimate organizations to steal your personal information.</p>
            <div class="highlight-box">
                <h4>📌 Key Point:</h4>
                <p>Phishing attacks trick you into clicking links or sharing sensitive information.</p>
            </div>
            <h4>🚩 Red Flags:</h4>
            <ul>
                <li>❌ Urgent language – "Act now!"</li>
                <li>❌ Suspicious sender email address</li>
                <li>❌ Fake links</li>
                <li>❌ Threats – "Your account will be locked"</li>
            </ul>
            <h4>✅ What to Do:</h4>
            <ul>
                <li>✅ Don't click links in suspicious emails</li>
                <li>✅ Verify by contacting the company directly</li>
                <li>✅ Report to your IT department</li>
            </ul>
        `
    },
    {
        id: 2,
        title: 'Spotting Suspicious Emails',
        level: 'Beginner',
        duration: '20 min',
        description: 'Learn to identify red flags in emails.',
        content: `
            <h3>🔍 How to Spot Phishing Emails</h3>
            <p>Phishing emails look real but have tell-tale signs.</p>
            <h4>🚩 Red Flags:</h4>
            <ul>
                <li>⚠️ Suspicious sender address</li>
                <li>⚠️ Urgent or threatening language</li>
                <li>⚠️ Unexpected attachments</li>
                <li>⚠️ Spelling and grammar errors</li>
                <li>⚠️ Requests for personal information</li>
            </ul>
            <div class="success-box">
                <h4>✅ Quick Tip:</h4>
                <p>Hover over links before clicking to see the real URL.</p>
            </div>
        `
    },
    {
        id: 3,
        title: 'Safe Links & Attachments',
        level: 'Intermediate',
        duration: '25 min',
        description: 'Handle links and attachments safely.',
        content: `
            <h3>🔗 Safe Links & Attachments</h3>
            <h4>📎 Handling Attachments:</h4>
            <ul>
                <li>✅ Only open attachments you EXPECT</li>
                <li>✅ Scan attachments with antivirus</li>
                <li>✅ Verify with sender before opening</li>
                <li>❌ Never open .exe or .js files from unknown sources</li>
            </ul>
            <h4>🔗 Handling Links:</h4>
            <ul>
                <li>✅ Hover before clicking to see the URL</li>
                <li>✅ Type URLs manually</li>
                <li>✅ Check for HTTPS (padlock icon)</li>
            </ul>
        `
    },
    {
        id: 4,
        title: 'Social Engineering Attacks',
        level: 'Intermediate',
        duration: '30 min',
        description: 'Understand psychological manipulation tactics.',
        content: `
            <h3>🧠 Social Engineering</h3>
            <p>Attackers manipulate people into giving up confidential information.</p>
            <h4>Common Tactics:</h4>
            <ul>
                <li>📞 Vishing – Voice phishing via phone calls</li>
                <li>📱 Smishing – SMS phishing via text messages</li>
                <li>🕵️ Impersonation – Pretending to be someone you trust</li>
            </ul>
            <div class="success-box">
                <h4>✅ How to Defend:</h4>
                <ul>
                    <li>✅ Be skeptical of unexpected calls</li>
                    <li>✅ Verify identity through official channels</li>
                    <li>✅ Never share personal info with strangers</li>
                </ul>
            </div>
        `
    },
    {
        id: 5,
        title: 'Advanced Phishing',
        level: 'Advanced',
        duration: '35 min',
        description: 'Learn about spear phishing and CEO fraud.',
        content: `
            <h3>🎯 Advanced Phishing</h3>
            <ul>
                <li>🔹 Spear Phishing – Targeted attacks using your personal info</li>
                <li>🔹 Whaling – Phishing targeting executives</li>
                <li>🔹 CEO Fraud – Impersonating executives to authorize payments</li>
            </ul>
            <div class="success-box">
                <h4>🛡️ Defense Strategy:</h4>
                <ul>
                    <li>✅ Always verify via a second channel</li>
                    <li>✅ Implement MFA</li>
                    <li>✅ Require approval for financial transactions</li>
                </ul>
            </div>
        `
    },
    {
        id: 6,
        title: 'Multi-Factor Authentication',
        level: 'Intermediate',
        duration: '20 min',
        description: 'Protect your accounts with MFA.',
        content: `
            <h3>🔐 Multi-Factor Authentication (MFA)</h3>
            <p>MFA adds an extra layer of security beyond just a password.</p>
            <h4>Three Types of Authentication:</h4>
            <ul>
                <li>🔑 Something you know – Password or PIN</li>
                <li>📱 Something you have – Phone or security key</li>
                <li>👆 Something you are – Fingerprint or face recognition</li>
            </ul>
            <div class="success-box">
                <h4>✅ Action Step:</h4>
                <p>Enable MFA on all accounts that offer it!</p>
            </div>
        `
    },
    {
        id: 7,
        title: 'Password Security',
        level: 'Beginner',
        duration: '15 min',
        description: 'Create and manage strong passwords.',
        content: `
            <h3>🔑 Password Security</h3>
            <h4>How Fast Can Hackers Crack Your Password?</h4>
            <ul>
                <li>"password" – &lt; 1 second</li>
                <li>"123456" – &lt; 1 second</li>
                <li>"BlueSky22" – ~ 2 hours</li>
                <li>"BlueSky$FireTruck!22" – ~ 500 years</li>
            </ul>
            <h4>✅ Best Practices:</h4>
            <ul>
                <li>✅ Use at least 12 characters</li>
                <li>✅ Mix uppercase, lowercase, numbers, symbols</li>
                <li>✅ Use unique passwords for each account</li>
                <li>✅ Use a password manager</li>
            </ul>
        `
    },
    {
        id: 8,
        title: 'Mobile Device Security',
        level: 'Intermediate',
        duration: '25 min',
        description: 'Keep your phone and data safe.',
        content: `
            <h3>📱 Mobile Device Security</h3>
            <h4>🔒 Lock Screen:</h4>
            <ul>
                <li>✅ Use a strong PIN or biometric lock</li>
                <li>✅ Enable auto-lock after 1 minute</li>
            </ul>
            <h4>📲 App Security:</h4>
            <ul>
                <li>✅ Only download from official stores</li>
                <li>✅ Review app permissions</li>
                <li>✅ Keep apps updated</li>
            </ul>
            <h4>📶 Network Security:</h4>
            <ul>
                <li>✅ Avoid public WiFi without VPN</li>
                <li>✅ Turn off Bluetooth when not in use</li>
            </ul>
        `
    }
];

async function loadTraining() {
    const user = requireAuth();
    if (!user) return;
    updateUsernameDisplay();

    const list = document.getElementById('training-list');
    if (list) {
        list.innerHTML = '';
        const completed = loadCompletedModules();
        TRAINING_MODULES.forEach(module => {
            const isCompleted = completed.includes(module.id);
            const div = document.createElement('div');
            div.className = 'training-module';
            div.onclick = () => openModule(module.id);
            div.innerHTML = `
                <div class="header">
                    <span class="title">${isCompleted ? '✅ ' : ''}${module.title}</span>
                    <span class="badge ${module.level.toLowerCase()}">${module.level}</span>
                </div>
                <div class="desc">${module.description}</div>
                <div class="meta">
                    <span>⏱️ ${module.duration}</span>
                    <span>${isCompleted ? '✅ Completed' : '📖 Not started'}</span>
                </div>
            `;
            list.appendChild(div);
        });
    }
    updateProgress();
}

function updateProgress() {
    const total = TRAINING_MODULES.length;
    const completed = loadCompletedModules();
    const completedCount = completed.length;
    const percent = Math.round((completedCount / total) * 100);
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    if (progressText) progressText.textContent = `Progress: ${completedCount}/${total} completed`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    
    loadTrainingProgress();
}

function openModule(moduleId) {
    const module = TRAINING_MODULES.find(m => m.id === moduleId);
    if (!module) return;
    
    const detail = document.getElementById('module-detail');
    const list = document.getElementById('training-list');
    list.parentElement.style.display = 'none';
    detail.classList.add('active');
    
    document.getElementById('module-title').textContent = module.title;
    document.getElementById('module-level').textContent = `📊 ${module.level} • ⏱️ ${module.duration}`;
    document.getElementById('module-content').innerHTML = module.content;
    
    const completeBtn = document.getElementById('module-complete-btn');
    const completed = loadCompletedModules();
    if (completed.includes(moduleId)) {
        completeBtn.textContent = '✅ Already Completed!';
        completeBtn.disabled = true;
        completeBtn.style.opacity = '0.6';
    } else {
        completeBtn.textContent = '✅ Mark as Complete';
        completeBtn.disabled = false;
        completeBtn.style.opacity = '1';
    }
    completeBtn.dataset.moduleId = moduleId;
}

function closeModule() {
    const detail = document.getElementById('module-detail');
    const list = document.getElementById('training-list');
    list.parentElement.style.display = 'block';
    detail.classList.remove('active');
}

function completeModule() {
    const btn = document.getElementById('module-complete-btn');
    const moduleId = parseInt(btn.dataset.moduleId);
    const completed = loadCompletedModules();
    
    if (!completed.includes(moduleId)) {
        completed.push(moduleId);
        saveCompletedModules(completed);
        btn.textContent = '✅ Completed!';
        btn.disabled = true;
        btn.style.opacity = '0.6';
        updateProgress();
        loadTraining();
        setTimeout(() => { openModule(moduleId); }, 500);
    }
}

// ========== Quiz ==========

const QUIZZES = [
    {
        id: 1,
        title: 'Phishing Awareness Quiz',
        questions: [
            { id: 1, text: 'What is phishing?', options: ['A type of fishing', 'A cyber attack using fake emails', 'A social media platform', 'A programming language'], correct: 1 },
            { id: 2, text: 'Which of these is a sign of a phishing email?', options: ['Urgent language', 'Requests for personal info', 'Suspicious sender address', 'All of the above'], correct: 3 },
            { id: 3, text: 'What should you do with a suspicious email?', options: ['Click the link', 'Reply with your info', 'Report it', 'Forward to friends'], correct: 2 },
            { id: 4, text: 'What is spear phishing?', options: ['Fishing with a spear', 'Targeted phishing attack', 'A type of malware', 'A security tool'], correct: 1 },
            { id: 5, text: 'Which is a strong password practice?', options: ['Use your name', 'Use 123456', 'Use a mix of characters', 'Use the same password everywhere'], correct: 2 },
        ]
    },
    {
        id: 2,
        title: 'Email Security Quiz',
        questions: [
            { id: 1, text: 'What is a red flag in an email?', options: ['Professional language', 'Urgent request for personal info', 'Known sender', 'Clear subject line'], correct: 1 },
            { id: 2, text: 'What does "phishing" target?', options: ['Your computer hardware', 'Your personal information', 'Your internet speed', 'Your printer'], correct: 1 },
            { id: 3, text: 'How can you verify a suspicious email?', options: ['Call the sender', 'Click all links', 'Reply with questions', 'Ignore it'], correct: 0 },
            { id: 4, text: 'What is social engineering?', options: ['Building a social network', 'Manipulating people for info', 'Engineering software', 'Social media marketing'], correct: 1 },
            { id: 5, text: 'Should you share passwords?', options: ['Yes with friends', 'Yes with coworkers', 'Never share passwords', 'Yes with family'], correct: 2 },
        ]
    },
    {
        id: 3,
        title: 'Advanced Security Quiz',
        questions: [
            { id: 1, text: 'What is MFA?', options: ['Multi-Factor Authentication', 'My Favorite App', 'Mobile First Access', 'Main Function Area'], correct: 0 },
            { id: 2, text: 'What is a zero-day attack?', options: ['Attack on day zero', 'Newly discovered vulnerability', 'Attack at midnight', 'Zero success attack'], correct: 1 },
            { id: 3, text: 'What is ransomware?', options: ['Ransom demand malware', 'Random software', 'Rapid access tool', 'Reliable software'], correct: 0 },
            { id: 4, text: 'Best practice for public WiFi?', options: ['Use VPN', 'Share files', 'Open all links', 'Disable security'], correct: 0 },
            { id: 5, text: 'What is a security breach?', options: ['Unauthorized access to data', 'A broken lock', 'Lost password', 'New software update'], correct: 0 },
        ]
    },
    {
        id: 4,
        title: 'Security Awareness Quiz',
        questions: [
            { id: 1, text: 'What is the most common cyber threat?', options: ['Phishing', 'Ransomware', 'DDoS', 'Malware'], correct: 0 },
            { id: 2, text: 'How often should you update passwords?', options: ['Never', 'Once a year', 'Every 3-6 months', 'Every day'], correct: 2 },
            { id: 3, text: 'What is a security policy?', options: ['Rules for security practices', 'A type of software', 'A password', 'A virus'], correct: 0 },
            { id: 4, text: 'What is encryption?', options: ['Hiding passwords', 'Scrambling data to protect it', 'Deleting files', 'Copying files'], correct: 1 },
            { id: 5, text: 'Who is responsible for security?', options: ['IT department', 'Security team', 'Everyone', 'Management'], correct: 2 },
        ]
    }
];

let currentQuiz = null;
let currentQuestion = 0;
let quizAnswers = [];

async function loadQuiz() {
    const user = requireAuth();
    if (!user) return;
    updateUsernameDisplay();

    const area = document.getElementById('quiz-area');
    if (area) {
        let html = '<h3>Available Quizzes</h3><div class="quiz-list">';
        QUIZZES.forEach(q => {
            html += `
                <div class="quiz-item" onclick="startQuiz(${q.id})">
                    <div class="quiz-info">
                        <strong>${q.title}</strong>
                        <span>${q.questions.length} questions</span>
                    </div>
                    <button class="quiz-start-btn">Start Quiz</button>
                </div>
            `;
        });
        html += '</div><div id="quiz-container"></div>';
        area.innerHTML = html;
    }
}

window.startQuiz = function(quizId) {
    currentQuiz = QUIZZES.find(q => q.id === quizId);
    if (!currentQuiz) return;
    currentQuestion = 0;
    quizAnswers = [];
    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    if (!container) return;
    if (!currentQuiz || currentQuestion >= currentQuiz.questions.length) {
        submitQuizResults();
        return;
    }
    const q = currentQuiz.questions[currentQuestion];
    container.innerHTML = `
        <div class="quiz-question">
            <h4>Question ${currentQuestion + 1} of ${currentQuiz.questions.length}</h4>
            <p>${q.text}</p>
            <div class="quiz-options">
                ${q.options.map((opt, i) => `<button class="quiz-option" onclick="selectAnswer(${i})">${opt}</button>`).join('')}
            </div>
            <div class="quiz-progress">${Math.round((currentQuestion / currentQuiz.questions.length) * 100)}%</div>
        </div>
    `;
}

window.selectAnswer = function(index) {
    const q = currentQuiz.questions[currentQuestion];
    quizAnswers.push({ questionId: q.id, isCorrect: index === q.correct });
    currentQuestion++;
    showQuestion();
};

async function submitQuizResults() {
    const user = getCurrentUser();
    if (!user) return;
    const totalCorrect = quizAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = quizAnswers.length;
    const score = Math.round((totalCorrect / totalQuestions) * 100);
    const passed = score >= 70;
    try {
        await fetch(`${API_URL}/api/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, quizId: currentQuiz.id, answers: quizAnswers })
        });
        const container = document.getElementById('quiz-container');
        container.innerHTML = `
            <div class="quiz-result">
                <h3>${passed ? '🎉' : '📚'} Quiz Complete!</h3>
                <p>Score: <strong>${score}%</strong></p>
                <p>${passed ? '✅ You passed!' : '❌ Keep practicing!'}</p>
                <p>Correct: ${totalCorrect} / ${totalQuestions}</p>
                <button onclick="loadQuiz()" class="retry-btn">Try Another Quiz</button>
            </div>
        `;
        loadDashboard();
    } catch (error) {
        alert('Error submitting quiz: ' + error.message);
    }
}

// ========== Results ==========

async function loadResults() {
    const user = requireAuth();
    if (!user) return;
    updateUsernameDisplay();
    try {
        const response = await fetch(`${API_URL}/api/users/${user.id}/results`);
        const results = await response.json();
        const list = document.getElementById('results-list');
        if (results && results.length > 0) {
            list.innerHTML = '';
            results.forEach(r => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<span>Quiz #${r.quiz_id}</span><span>${r.score}% ${r.passed ? '✅' : '❌'}</span><span>${new Date(r.created_at).toLocaleDateString()}</span>`;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = '<div class="loading-text">No results found. Take a quiz!</div>';
        }
    } catch {
        document.getElementById('results-list').innerHTML = '<div class="loading-text">Error loading results</div>';
    }
}

// ========== Profile ==========

async function loadProfile() {
    const user = requireAuth();
    if (!user) return;
    updateUsernameDisplay();
    document.getElementById('profile-info').innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar">👤</div>
            <div class="profile-details">
                <p><strong>Username:</strong> ${user.username}</p>
                <p><strong>Email:</strong> ${user.email || 'Not set'}</p>
                <p><strong>Role:</strong> ${user.role || 'user'}</p>
                <p><strong>Member since:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'February 2026'}</p>
            </div>
        </div>
    `;
}

// ========== Admin ==========

const ADMIN_PASSWORD = '2007';

function adminLogin() {
    const input = document.getElementById('admin-password');
    const msg = document.getElementById('admin-message');
    if (input.value === ADMIN_PASSWORD) {
        document.getElementById('admin-content').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-login-status').textContent = '✅ Admin authenticated';
        loadAdminUsers();
        loadAdminStats();
        loadAdminCharts();
    } else {
        msg.textContent = '❌ Incorrect password.';
        msg.style.color = '#f44336';
    }
}

async function loadAdminStats() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        const users = await response.json();
        const filteredUsers = users.filter(u => u.username.toLowerCase() !== 'john');
        document.getElementById('admin-stats').innerHTML = `<p>👥 Total Users: ${filteredUsers.length}</p>`;
    } catch {
        document.getElementById('admin-stats').innerHTML = '<p>Error loading stats</p>';
    }
}

async function loadAdminUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        const users = await response.json();
        const filteredUsers = users.filter(u => u.username.toLowerCase() !== 'john');
        
        const div = document.getElementById('admin-users');
        if (filteredUsers.length > 0) {
            div.innerHTML = '';
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead style="background:#1a2a4a;">
                    <tr>
                        <th style="padding:10px;text-align:left;">Username</th>
                        <th style="padding:10px;text-align:left;">Email</th>
                        <th style="padding:10px;text-align:center;">Quizzes</th>
                        <th style="padding:10px;text-align:center;">Avg Score</th>
                        <th style="padding:10px;text-align:center;">Passed</th>
                        <th style="padding:10px;text-align:center;">Failed</th>
                    </tr>
                </thead>
                <tbody id="admin-users-body"></tbody>
            `;
            div.appendChild(table);
            const tbody = document.getElementById('admin-users-body');
            
            for (const u of filteredUsers) {
                const statsRes = await fetch(`${API_URL}/api/users/${u.id}/stats`);
                const stats = await statsRes.json();
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #1a2a4a';
                row.innerHTML = `
                    <td style="padding:8px;">${u.username}</td>
                    <td style="padding:8px;">${u.email}</td>
                    <td style="padding:8px;text-align:center;">${stats.totalQuizzes || 0}</td>
                    <td style="padding:8px;text-align:center;">${stats.averageScore || 0}%</td>
                    <td style="padding:8px;text-align:center;color:#4caf50;">${stats.passedCount || 0}</td>
                    <td style="padding:8px;text-align:center;color:#f44336;">${stats.failCount || 0}</td>
                `;
                tbody.appendChild(row);
            }
        } else {
            div.innerHTML = '<div class="loading-text">No users found</div>';
        }
    } catch (error) {
        console.error('Admin users load error:', error);
        document.getElementById('admin-users').innerHTML = '<div class="loading-text">Error loading users</div>';
    }
}

// ========== Admin Charts ==========

let avgChart = null;
let passFailChart = null;

async function loadAdminCharts() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        const users = await response.json();
        const filteredUsers = users.filter(u => u.username.toLowerCase() !== 'john');
        
        if (filteredUsers.length === 0) {
            const ctx1 = document.getElementById('avgScoreChart').getContext('2d');
            ctx1.clearRect(0, 0, 400, 200);
            const ctx2 = document.getElementById('passFailChart').getContext('2d');
            ctx2.clearRect(0, 0, 400, 200);
            return;
        }

        const userNames = [];
        const avgScores = [];
        let totalPassed = 0;
        let totalFailed = 0;

        for (const u of filteredUsers) {
            const statsRes = await fetch(`${API_URL}/api/users/${u.id}/stats`);
            const stats = await statsRes.json();
            userNames.push(u.username);
            avgScores.push(stats.averageScore || 0);
            totalPassed += stats.passedCount || 0;
            totalFailed += stats.failCount || 0;
        }

        if (avgChart) { avgChart.destroy(); avgChart = null; }
        if (passFailChart) { passFailChart.destroy(); passFailChart = null; }

        const ctx1 = document.getElementById('avgScoreChart').getContext('2d');
        avgChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: userNames,
                datasets: [{
                    label: 'Average Score (%)',
                    data: avgScores,
                    backgroundColor: 'rgba(0, 120, 212, 0.7)',
                    borderColor: 'rgba(0, 120, 212, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#8899bb' }
                    },
                    x: {
                        ticks: { color: '#8899bb' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#8899bb' }
                    }
                }
            }
        });

        const ctx2 = document.getElementById('passFailChart').getContext('2d');
        passFailChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [totalPassed, totalFailed],
                    backgroundColor: ['#4caf50', '#f44336'],
                    borderColor: ['#1a5c2a', '#5c1a1a'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#8899bb' }
                    }
                },
                cutout: '70%'
            }
        });

    } catch (error) {
        console.error('Error loading admin charts:', error);
    }
}

// ========== Generate Report ==========

window.generateReport = async function() {
    const container = document.getElementById('report-container');
    const content = document.getElementById('report-content');
    container.style.display = 'block';
    content.innerHTML = '<div class="loading-text">Generating report...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/users`);
        const users = await response.json();
        const filtered = users.filter(u => u.username.toLowerCase() !== 'john');
        
        let html = `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
            <thead style="background:#1a2a4a;">
                <tr>
                    <th style="padding:8px;text-align:left;">User</th>
                    <th style="padding:8px;text-align:center;">Total Quizzes</th>
                    <th style="padding:8px;text-align:center;">Avg Score</th>
                    <th style="padding:8px;text-align:center;">Passed</th>
                    <th style="padding:8px;text-align:center;">Failed</th>
                    <th style="padding:8px;text-align:center;">Pass Rate</th>
                </tr>
            </thead>
            <tbody>`;
        
        for (const u of filtered) {
            const statsRes = await fetch(`${API_URL}/api/users/${u.id}/stats`);
            const stats = await statsRes.json();
            const total = stats.totalQuizzes || 0;
            const passed = stats.passedCount || 0;
            const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
            html += `
                <tr style="border-bottom:1px solid #1a2a4a;">
                    <td style="padding:8px;">${u.username}</td>
                    <td style="padding:8px;text-align:center;">${total}</td>
                    <td style="padding:8px;text-align:center;">${stats.averageScore || 0}%</td>
                    <td style="padding:8px;text-align:center;color:#4caf50;">${passed}</td>
                    <td style="padding:8px;text-align:center;color:#f44336;">${stats.failCount || 0}</td>
                    <td style="padding:8px;text-align:center;font-weight:bold;">${passRate}%</td>
                </tr>
            `;
        }
        html += `</tbody></table>
            <p style="margin-top:15px;color:#8899bb;font-size:14px;">Report generated on ${new Date().toLocaleString()}</p>
            <button onclick="window.print()" style="margin-top:10px;background:#0078D4;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;">🖨️ Print Report</button>
        `;
        content.innerHTML = html;
    } catch (error) {
        content.innerHTML = '<div class="loading-text">Error generating report</div>';
        console.error(error);
    }
};

// ========== Page Initialization ==========

document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;

    if (path.endsWith('index.html') || path === '/') {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            checkBackend().then(online => {
                statusEl.textContent = online ? '✅ Online' : '❌ Offline';
                statusEl.className = online ? 'online' : 'offline';
            });
        }
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const msgEl = document.getElementById('message');
                const result = await loginUser(username, password);
                if (!result.success) {
                    msgEl.textContent = '❌ ' + (result.error || 'Login failed');
                }
            });
        }

        window.showRegister = function() {
            document.getElementById('register-form').style.display = 'block';
        };
        window.hideRegister = function() {
            document.getElementById('register-form').style.display = 'none';
        };

        const regBtn = document.getElementById('register-btn');
        if (regBtn) {
            regBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                const username = document.getElementById('reg-username').value;
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                const msgEl = document.getElementById('reg-message');
                
                if (!username || username.length < 3) {
                    msgEl.textContent = '❌ Username must be at least 3 characters';
                    msgEl.style.color = '#f44336';
                    return;
                }
                if (!email || !email.includes('@')) {
                    msgEl.textContent = '❌ Please enter a valid email';
                    msgEl.style.color = '#f44336';
                    return;
                }
                if (!password || password.length < 4) {
                    msgEl.textContent = '❌ Password must be at least 4 characters';
                    msgEl.style.color = '#f44336';
                    return;
                }
                
                const result = await registerUser(username, email, password);
                if (result.success) {
                    msgEl.textContent = '✅ User created! Logging you in...';
                    msgEl.style.color = '#4caf50';
                    document.getElementById('reg-username').value = '';
                    document.getElementById('reg-email').value = '';
                    document.getElementById('reg-password').value = '';
                    const loginResult = await loginUser(username, password);
                    if (!loginResult.success) {
                        msgEl.textContent = '✅ User created! Please login.';
                        msgEl.style.color = '#4caf50';
                        setTimeout(() => { window.hideRegister(); }, 2000);
                    }
                } else {
                    msgEl.textContent = '❌ ' + (result.error || 'Registration failed');
                    msgEl.style.color = '#f44336';
                }
            });
        }
    }

    if (path.endsWith('dashboard.html')) {
        loadDashboard();
        setInterval(loadDashboard, 30000);
    }
    if (path.endsWith('training.html')) {
        loadTraining();
        window.completeModule = completeModule;
        window.closeModule = closeModule;
        window.openModule = openModule;
    }
    if (path.endsWith('quiz.html')) { loadQuiz(); }
    if (path.endsWith('results.html')) { loadResults(); }
    if (path.endsWith('profile.html')) { loadProfile(); }
    if (path.endsWith('admin.html')) {
        const user = requireAuth();
        if (!user) return;
        updateUsernameDisplay();
        window.adminLogin = adminLogin;
        window.generateReport = generateReport;
    }
    updateUsernameDisplay();
});

// ========== Service Worker Registration ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
                        labels: { color: '#8899bb' }
                    }
                }
            }
        });

        const ctx2 = document.getElementById('passFailChart').getContext('2d');
        passFailChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [totalPassed, totalFailed],
                    backgroundColor: ['#4caf50', '#f44336'],
                    borderColor: ['#1a5c2a', '#5c1a1a'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#8899bb' }
                    }
                },
                cutout: '70%'
            }
        });

    } catch (error) {
        console.error('Error loading admin charts:', error);
    }
}

// ========== Generate Report ==========

window.generateReport = async function() {
    const container = document.getElementById('report-container');
    const content = document.getElementById('report-content');
    container.style.display = 'block';
    content.innerHTML = '<div class="loading-text">Generating report...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/users`);
        const users = await response.json();
        const filtered = users.filter(u => u.username.toLowerCase() !== 'john');
        
        let html = `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
            <thead style="background:#1a2a4a;">
                <tr>
                    <th style="padding:8px;text-align:left;">User</th>
                    <th style="padding:8px;text-align:center;">Total Quizzes</th>
                    <th style="padding:8px;text-align:center;">Avg Score</th>
                    <th style="padding:8px;text-align:center;">Passed</th>
                    <th style="padding:8px;text-align:center;">Failed</th>
                    <th style="padding:8px;text-align:center;">Pass Rate</th>
                </tr>
            </thead>
            <tbody>`;
        
        for (const u of filtered) {
            const statsRes = await fetch(`${API_URL}/api/users/${u.id}/stats`);
            const stats = await statsRes.json();
            const total = stats.totalQuizzes || 0;
            const passed = stats.passedCount || 0;
            const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
            html += `
                <tr style="border-bottom:1px solid #1a2a4a;">
                    <td style="padding:8px;">${u.username}</td>
                    <td style="padding:8px;text-align:center;">${total}</td>
                    <td style="padding:8px;text-align:center;">${stats.averageScore || 0}%</td>
                    <td style="padding:8px;text-align:center;color:#4caf50;">${passed}</td>
                    <td style="padding:8px;text-align:center;color:#f44336;">${stats.failCount || 0}</td>
                    <td style="padding:8px;text-align:center;font-weight:bold;">${passRate}%</td>
                </tr>
            `;
        }
        html += `</tbody></table>
            <p style="margin-top:15px;color:#8899bb;font-size:14px;">Report generated on ${new Date().toLocaleString()}</p>
            <button onclick="window.print()" style="margin-top:10px;background:#0078D4;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;">🖨️ Print Report</button>
        `;
        content.innerHTML = html;
    } catch (error) {
        content.innerHTML = '<div class="loading-text">Error generating report</div>';
        console.error(error);
    }
};

// ========== Page Initialization ==========

document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;

    if (path.endsWith('index.html') || path === '/') {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            checkBackend().then(online => {
                statusEl.textContent = online ? '✅ Online' : '❌ Offline';
                statusEl.className = online ? 'online' : 'offline';
            });
        }
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const msgEl = document.getElementById('message');
                const result = await loginUser(username, password);
                if (!result.success) {
                    msgEl.textContent = '❌ ' + (result.error || 'Login failed');
                }
            });
        }

        window.showRegister = function() {
            document.getElementById('register-form').style.display = 'block';
        };
        window.hideRegister = function() {
            document.getElementById('register-form').style.display = 'none';
        };

        const regBtn = document.getElementById('register-btn');
        if (regBtn) {
            regBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                const username = document.getElementById('reg-username').value;
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                const msgEl = document.getElementById('reg-message');
                
                if (!username || username.length < 3) {
                    msgEl.textContent = '❌ Username must be at least 3 characters';
                    msgEl.style.color = '#f44336';
                    return;
                }
                if (!email || !email.includes('@')) {
                    msgEl.textContent = '❌ Please enter a valid email';
                    msgEl.style.color = '#f44336';
                    return;
                }
                if (!password || password.length < 4) {
                    msgEl.textContent = '❌ Password must be at least 4 characters';
                    msgEl.style.color = '#f44336';
                    return;
                }
                
                const result = await registerUser(username, email, password);
                if (result.success) {
                    msgEl.textContent = '✅ User created! Logging you in...';
                    msgEl.style.color = '#4caf50';
                    document.getElementById('reg-username').value = '';
                    document.getElementById('reg-email').value = '';
                    document.getElementById('reg-password').value = '';
                    const loginResult = await loginUser(username, password);
                    if (!loginResult.success) {
                        msgEl.textContent = '✅ User created! Please login.';
                        msgEl.style.color = '#4caf50';
                        setTimeout(() => { window.hideRegister(); }, 2000);
                    }
                } else {
                    msgEl.textContent = '❌ ' + (result.error || 'Registration failed');
                    msgEl.style.color = '#f44336';
                }
            });
        }
    }

    if (path.endsWith('dashboard.html')) {
        loadDashboard();
        setInterval(loadDashboard, 30000);
    }
    if (path.endsWith('training.html')) {
        loadTraining();
        window.completeModule = completeModule;
        window.closeModule = closeModule;
        window.openModule = openModule;
    }
    if (path.endsWith('quiz.html')) { loadQuiz(); }
    if (path.endsWith('results.html')) { loadResults(); }
    if (path.endsWith('profile.html')) { loadProfile(); }
    if (path.endsWith('admin.html')) {
        const user = requireAuth();
        if (!user) return;
        updateUsernameDisplay();
        window.adminLogin = adminLogin;
        window.generateReport = generateReport;
    }
    updateUsernameDisplay();
});

// ========== Service Worker Registration ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// ========== PWA Install Prompt ==========
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Attempt to add install button to nav links if they exist
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !document.getElementById('pwa-install-btn')) {
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.innerHTML = '📥 Install App';
        installBtn.className = 'logout'; // Reuse logout button styling
        installBtn.style.backgroundColor = '#4caf50'; // Make it green
        installBtn.style.marginRight = '10px';
        
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
        
        navLinks.insertBefore(installBtn, navLinks.firstChild);
    }
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
    console.log('PWA was installed');
});
