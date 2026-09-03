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

    // Lucide-style SVG icons for cheat sheet cards (24x24, 2px stroke, currentColor)
    const SVG = (paths) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    const CHEATSHEET_ICONS = {
        // KA1 - Planning & Monitoring: clipboard/list
        ka1: SVG('<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'),
        // KA2 - Elicitation & Collaboration: message/conversation
        ka2: SVG('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/>'),
        // KA3 - Requirements Life Cycle: refresh/cycle
        ka3: SVG('<path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/>'),
        // KA4 - Strategy Analysis: target/compass
        ka4: SVG('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
        // KA5 - RADD: layers/blueprint
        ka5: SVG('<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>'),
        // KA6 - Solution Evaluation: check circle
        ka6: SVG('<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>'),
        // Ch9 - Competencies: brain/lightbulb
        ch9: SVG('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'),
        // Ch10 - Techniques: tool/wrench
        ch10: SVG('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
        // Ch11 - Perspectives: eye/layers
        ch11: SVG('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'),
        default: SVG('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>')
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
            const icon = CHEATSHEET_ICONS[sheet.id] || CHEATSHEET_ICONS.default;
            card.innerHTML = `
                <div class="cs-card-icon">${icon}</div>
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
