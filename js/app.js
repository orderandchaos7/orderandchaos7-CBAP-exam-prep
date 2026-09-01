/* ============================================
   App Module — Navigation, data loading, screen management
   ============================================ */

const App = (() => {
    let questionData = null; // loaded from JSON
    let cheatsheetData = null; // loaded from JSON
    let currentScreen = 'home';

    // Category display config
    const CATEGORY_CONFIG = {
        ka1: { label: 'KA1', fullName: 'BA Planning & Monitoring', color: '#6c63ff', sets: 3 },
        ka2: { label: 'KA2', fullName: 'Elicitation & Collaboration', color: '#54a0ff', sets: 3 },
        ka3: { label: 'KA3', fullName: 'Requirements Life Cycle Mgmt', color: '#00d4aa', sets: 3 },
        ka4: { label: 'KA4', fullName: 'Strategy Analysis', color: '#feca57', sets: 3 },
        ka5: { label: 'KA5', fullName: 'RADD', color: '#ff6b6b', sets: 3 },
        ka6: { label: 'KA6', fullName: 'Solution Evaluation', color: '#a29bfe', sets: 3 },
        ch9: { label: 'Ch9', fullName: 'Underlying Competencies', color: '#fd79a8', sets: 1 },
        ch10: { label: 'Ch10', fullName: 'Techniques', color: '#e17055', sets: 1 },
        ch11: { label: 'Ch11', fullName: 'Perspectives', color: '#00b894', sets: 1 },
    };

    async function init() {
        await loadQuestions();
        await loadCheatsheets();
        setupNavigation();
        setupSidebar();
        setupCheatsheetBack();
        updateSidebarProgress();
        showScreen('home');
        renderHomeStats();
    }

    async function loadQuestions() {
        try {
            const response = await fetch('js/data/questions.json');
            questionData = await response.json();
        } catch (err) {
            console.error('Failed to load questions:', err);
            document.body.innerHTML = '<div style="padding:40px;color:#ff6b6b;text-align:center"><h2>Failed to load question data</h2><p>Make sure questions.json is in js/data/ folder.</p></div>';
        }
    }

    async function loadCheatsheets() {
        try {
            const response = await fetch('js/data/cheatsheets.json');
            cheatsheetData = await response.json();
        } catch (err) {
            console.warn('Failed to load cheatsheets:', err);
            cheatsheetData = [];
        }
    }

    function getQuestionSet(categoryId) {
        if (!questionData) return null;
        return questionData.find(d => d.categoryId === categoryId) || null;
    }

    function getAllSets() {
        return questionData || [];
    }

    function setupNavigation() {
        // Sidebar nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = link.dataset.screen;
                showScreen(screen);
                closeSidebar();
            });
        });

        // Home action buttons
        document.querySelectorAll('.home-actions .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.screen;
                if (screen) showScreen(screen);
            });
        });
    }

    function setupSidebar() {
        const toggle = document.getElementById('menu-toggle');
        const close = document.getElementById('sidebar-close');
        const overlay = document.getElementById('sidebar-overlay');

        toggle.addEventListener('click', openSidebar);
        close.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);
    }

    function openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebar-overlay').classList.add('active');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }

    function showScreen(screenId) {
        currentScreen = screenId;

        // Update active screen
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`screen-${screenId}`);
        if (target) target.classList.add('active');

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-screen="${screenId}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Render screen content
        switch (screenId) {
            case 'home': renderHomeStats(); break;
            case 'practice': renderPracticeScreen(); break;
            case 'mock': renderMockScreen(); break;
            case 'dashboard': Dashboard.render(); break;
            case 'review': renderReviewScreen(); break;
            case 'cheatsheets': renderCheatsheetsScreen(); break;
        }

        // Scroll to top
        window.scrollTo(0, 0);
    }

    function updateSidebarProgress() {
        const stats = Storage.getAllStats();
        const pct = Math.round((stats.totalAttempted / stats.totalQuestions) * 100);
        document.getElementById('sidebar-progress-bar').style.width = `${pct}%`;
        document.getElementById('sidebar-progress-text').textContent =
            `${stats.totalAttempted.toLocaleString()} / ${stats.totalQuestions.toLocaleString()}`;
    }

    function renderHomeStats() {
        const stats = Storage.getAllStats();
        document.getElementById('home-attempted').textContent = stats.totalAttempted.toLocaleString();
        document.getElementById('home-correct').textContent = stats.totalCorrect.toLocaleString();
        document.getElementById('home-score').textContent = `${stats.score}%`;
        document.getElementById('home-remaining').textContent = stats.remaining.toLocaleString();
        updateSidebarProgress();
    }

    function renderPracticeScreen() {
        const container = document.getElementById('practice-categories');
        container.innerHTML = '';

        Object.entries(CATEGORY_CONFIG).forEach(([prefix, config]) => {
            for (let setNum = 1; setNum <= config.sets; setNum++) {
                const catId = config.sets === 1 ? prefix : `${prefix}_set${setNum}`;
                const setData = getQuestionSet(catId);
                if (!setData) continue;

                const attempt = Storage.getLatestAttemptForSet(catId);
                const card = createSetCard(setData, config, catId, attempt, setNum, config.sets > 1);
                container.appendChild(card);
            }
        });
    }

    function renderMockScreen() {
        const container = document.getElementById('mock-cards');
        container.innerHTML = '';

        for (let i = 1; i <= 3; i++) {
            const catId = `mock${i}`;
            const setData = getQuestionSet(catId);
            if (!setData) continue;

            const attempt = Storage.getLatestAttemptForSet(catId);
            const card = document.createElement('div');
            card.className = 'select-card';
            card.addEventListener('click', () => Quiz.start(catId, 'mock'));

            const badge = attempt
                ? `<span class="select-card-badge badge-done">Completed</span>`
                : `<span class="select-card-badge badge-new">Not Started</span>`;

            const scoreBar = attempt ? `
                <div class="card-score-bar">
                    <div class="card-score-fill" style="width:${attempt.score}%;background:${attempt.score >= 70 ? 'var(--color-correct)' : 'var(--color-wrong)'}"></div>
                </div>` : '';

            card.innerHTML = `
                <div class="select-card-title">Mock Exam ${i}</div>
                <div class="select-card-sub">120 questions &middot; 3h 30m &middot; Exam-weighted</div>
                <div class="select-card-meta">
                    ${badge}
                    ${attempt ? `<span>${attempt.score}% (${attempt.correctAnswers}/${attempt.totalQuestions})</span>` : ''}
                </div>
                ${scoreBar}
            `;
            container.appendChild(card);
        }
    }

    function createSetCard(setData, config, catId, attempt, setNum, showSetNum) {
        const card = document.createElement('div');
        card.className = 'select-card';
        card.addEventListener('click', () => Quiz.start(catId, 'practice'));

        // Check for in-progress session
        const inProgress = Storage.getInProgress(catId);
        let badge;
        if (attempt) {
            badge = `<span class="select-card-badge badge-done">Completed</span>`;
        } else if (inProgress) {
            const answered = Object.keys(inProgress.answers || {}).length;
            badge = `<span class="select-card-badge badge-partial">In Progress (${answered}/${setData.totalQuestions})</span>`;
        } else {
            badge = `<span class="select-card-badge badge-new">Not Started</span>`;
        }

        const setLabel = showSetNum ? ` &middot; Set ${setNum}` : '';
        const scoreBar = attempt ? `
            <div class="card-score-bar">
                <div class="card-score-fill" style="width:${attempt.score}%;background:${attempt.score >= 70 ? 'var(--color-correct)' : 'var(--color-wrong)'}"></div>
            </div>` : '';

        card.innerHTML = `
            <div class="select-card-title" style="color:${config.color}">${config.label} — ${config.fullName}</div>
            <div class="select-card-sub">${setData.totalQuestions} questions${setLabel}</div>
            <div class="select-card-meta">
                ${badge}
                ${attempt ? `<span>${attempt.score}% (${attempt.correctAnswers}/${attempt.totalQuestions})</span>` : ''}
            </div>
            ${scoreBar}
        `;
        return card;
    }

    function renderReviewScreen() {
        const container = document.getElementById('review-list');
        const detail = document.getElementById('review-detail');
        container.innerHTML = '';
        detail.classList.add('hidden');
        detail.innerHTML = '';

        const attempts = Storage.getAttempts().slice().reverse();

        if (attempts.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No completed attempts yet. Start a practice set or mock exam to see results here.</div>';
            return;
        }

        attempts.forEach(a => {
            const item = document.createElement('div');
            item.className = 'review-item';
            const scoreColor = a.score >= 70 ? 'var(--color-correct)' : 'var(--color-wrong)';
            const date = new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="review-item-info">
                    <div class="review-item-title">${a.categoryName}</div>
                    <div class="review-item-date">${date} &middot; ${a.type === 'mock' ? 'Mock Exam' : 'Practice'}</div>
                </div>
                <div class="review-item-score" style="color:${scoreColor}">${a.score}%</div>
            `;

            item.addEventListener('click', () => showReviewDetail(a));
            container.appendChild(item);
        });
    }

    function showReviewDetail(attempt) {
        document.getElementById('review-list').classList.add('hidden');
        const detail = document.getElementById('review-detail');
        detail.classList.remove('hidden');
        Quiz.renderResults(attempt, detail, true);
    }

    // ---- Cheat Sheets ----

    function renderCheatsheetsScreen() {
        const container = document.getElementById('cheatsheet-cards');
        container.innerHTML = '';

        if (!cheatsheetData || cheatsheetData.length === 0) {
            container.innerHTML = '<div class="no-data-msg">Cheat sheet data not available.</div>';
            return;
        }

        cheatsheetData.forEach(sheet => {
            const card = document.createElement('div');
            card.className = 'cs-card';
            card.addEventListener('click', () => openCheatsheet(sheet.id));
            card.innerHTML = `
                <div class="cs-card-icon">${sheet.icon}</div>
                <div class="cs-card-body">
                    <div class="cs-card-title">${sheet.title}</div>
                    <div class="cs-card-desc">Quick-reference study guide</div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function openCheatsheet(sheetId) {
        const sheet = cheatsheetData.find(s => s.id === sheetId);
        if (!sheet) return;

        // Hide listing, show reader
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-cheatsheet-reader').classList.add('active');

        // Keep cheatsheets nav link highlighted
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const csLink = document.querySelector('.nav-link[data-screen="cheatsheets"]');
        if (csLink) csLink.classList.add('active');

        document.getElementById('cs-reader-title').textContent = sheet.title;
        document.getElementById('cs-reader-content').innerHTML = sheet.content;

        window.scrollTo(0, 0);
    }

    function setupCheatsheetBack() {
        const backBtn = document.getElementById('cs-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => showScreen('cheatsheets'));
        }
    }

    function showConfirm(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn btn-outline cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Confirm</button>
                </div>
            </div>
        `;

        overlay.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
        overlay.querySelector('.confirm-btn').addEventListener('click', () => {
            onConfirm();
            overlay.remove();
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        document.body.appendChild(overlay);
    }

    return {
        init,
        getQuestionSet,
        getAllSets,
        showScreen,
        updateSidebarProgress,
        renderHomeStats,
        showConfirm,
        CATEGORY_CONFIG
    };
})();

// Boot the app
document.addEventListener('DOMContentLoaded', () => App.init());
