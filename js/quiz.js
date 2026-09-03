/* ============================================
   Quiz Module - Practice + Mock Exam Engine
   ============================================ */

const Quiz = (() => {
    let state = {
        mode: 'practice',       // 'practice' or 'mock'
        categoryId: '',
        categoryName: '',
        questions: [],
        currentIndex: 0,
        answers: {},            // { questionIndex: 'A'|'B'|'C'|'D' }
        flagged: new Set(),
        locked: {},             // { questionIndex: true } - for practice after answering
        startTime: null,
        timerInterval: null,
        timeLimit: 0,           // seconds (0 = no limit)
        finished: false
    };

    function start(categoryId, mode) {
        const setData = App.getQuestionSet(categoryId);
        if (!setData || setData.questions.length === 0) return;

        // Check for in-progress session (practice mode only)
        if (mode === 'practice') {
            const saved = Storage.getInProgress(categoryId);
            if (saved) {
                const answered = Object.keys(saved.answers).length;
                const total = setData.questions.length;
                App.showConfirm(
                    'Resume Session',
                    `You have ${answered} of ${total} questions answered. Would you like to resume where you left off?`,
                    () => resumeSession(categoryId, setData, saved)
                );
                // Add a "Start Over" option by replacing the confirm dialog
                // Actually, let's use a custom two-option dialog
                const overlay = document.querySelector('.confirm-overlay');
                if (overlay) {
                    const actions = overlay.querySelector('.confirm-actions');
                    actions.innerHTML = `
                        <button class="btn btn-outline start-over-btn">Start Over</button>
                        <button class="btn btn-primary resume-btn">Resume</button>
                    `;
                    actions.querySelector('.start-over-btn').addEventListener('click', () => {
                        Storage.clearInProgress(categoryId);
                        overlay.remove();
                        startFresh(categoryId, mode, setData);
                    });
                    actions.querySelector('.resume-btn').addEventListener('click', () => {
                        overlay.remove();
                        resumeSession(categoryId, setData, saved);
                    });
                }
                return;
            }
        }

        startFresh(categoryId, mode, setData);
    }

    function resumeSession(categoryId, setData, saved) {
        state = {
            mode: 'practice',
            categoryId,
            categoryName: setData.categoryName,
            questions: setData.questions,
            currentIndex: saved.currentIndex || 0,
            answers: saved.answers || {},
            flagged: new Set(),
            locked: saved.locked || {},
            startTime: Date.now() - ((saved.elapsedSeconds || 0) * 1000),
            timerInterval: null,
            timeLimit: 0,
            finished: false
        };

        App.showScreen('quiz');
        setupPracticeUI();
        renderQuestion();
    }

    function startFresh(categoryId, mode, setData) {
        state = {
            mode,
            categoryId,
            categoryName: setData.categoryName,
            questions: setData.questions,
            currentIndex: 0,
            answers: {},
            flagged: new Set(),
            locked: {},
            startTime: Date.now(),
            timerInterval: null,
            timeLimit: mode === 'mock' ? 3.5 * 60 * 60 : 0,
            finished: false
        };

        // Show quiz screen
        App.showScreen('quiz');

        // Setup UI
        setupQuizUI(mode);
        renderQuestion();
    }

    function setupPracticeUI() {
        document.getElementById('quiz-title').textContent = state.categoryName;
        document.getElementById('quiz-timer').classList.add('hidden');
        document.getElementById('quiz-nav-grid').classList.add('hidden');
        document.getElementById('quiz-flag').classList.add('hidden');
        document.getElementById('quiz-submit').classList.add('hidden');
        document.getElementById('quiz-next').textContent = 'Next';
    }

    function setupQuizUI(mode) {
        document.getElementById('quiz-title').textContent = state.categoryName;
        const timerEl = document.getElementById('quiz-timer');
        const navGrid = document.getElementById('quiz-nav-grid');
        const flagBtn = document.getElementById('quiz-flag');
        const submitBtn = document.getElementById('quiz-submit');
        const nextBtn = document.getElementById('quiz-next');

        if (mode === 'mock') {
            timerEl.classList.remove('hidden');
            navGrid.classList.remove('hidden');
            flagBtn.classList.remove('hidden');
            submitBtn.classList.remove('hidden');
            nextBtn.textContent = 'Next';
            startTimer();
            renderNavGrid();
        } else {
            timerEl.classList.add('hidden');
            navGrid.classList.add('hidden');
            flagBtn.classList.add('hidden');
            submitBtn.classList.add('hidden');
            nextBtn.textContent = 'Next';
        }
    }

    function startTimer() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const remaining = Math.max(0, state.timeLimit - elapsed);
            updateTimerDisplay(remaining);

            if (remaining <= 0) {
                clearInterval(state.timerInterval);
                finishExam();
            }
        }, 1000);
    }

    function updateTimerDisplay(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const timerEl = document.getElementById('quiz-timer');
        timerEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        timerEl.classList.remove('warning', 'danger');
        if (seconds <= 300) timerEl.classList.add('danger');      // last 5 min
        else if (seconds <= 900) timerEl.classList.add('warning'); // last 15 min
    }

    function renderNavGrid() {
        const grid = document.getElementById('quiz-nav-grid');
        grid.innerHTML = '';
        state.questions.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-nav-btn';
            btn.textContent = i + 1;
            btn.addEventListener('click', () => { state.currentIndex = i; renderQuestion(); });
            grid.appendChild(btn);
        });
        updateNavGrid();
    }

    function updateNavGrid() {
        const btns = document.querySelectorAll('.quiz-nav-btn');
        btns.forEach((btn, i) => {
            btn.classList.remove('current', 'answered', 'flagged');
            if (i === state.currentIndex) btn.classList.add('current');
            if (state.answers[i] !== undefined) btn.classList.add('answered');
            if (state.flagged.has(i)) btn.classList.add('flagged');
        });
    }

    function renderQuestion() {
        const q = state.questions[state.currentIndex];
        const idx = state.currentIndex;
        const total = state.questions.length;

        // Progress
        document.getElementById('quiz-progress').textContent = `${idx + 1} / ${total}`;
        document.getElementById('quiz-progress-bar').style.width = `${((idx + 1) / total) * 100}%`;

        // Question text
        document.getElementById('quiz-question').innerHTML =
            `<span class="quiz-question-num">Q${q.id}</span> ${q.question}`;

        // Choices
        const choicesContainer = document.getElementById('quiz-choices');
        choicesContainer.innerHTML = '';

        const letters = ['A', 'B', 'C', 'D'];
        letters.forEach(letter => {
            if (!q.choices[letter]) return;
            const btn = document.createElement('button');
            btn.className = 'choice-btn';

            const isLocked = state.locked[idx];
            const selected = state.answers[idx];

            if (isLocked) {
                btn.classList.add('locked');
                if (letter === q.answer) btn.classList.add('correct');
                if (letter === selected && selected !== q.answer) btn.classList.add('wrong');
            } else if (state.mode === 'mock' && selected === letter) {
                btn.classList.add('selected');
            } else if (state.mode === 'practice' && selected === letter) {
                btn.classList.add('selected');
            }

            btn.innerHTML = `<span class="choice-letter">${letter}</span><span>${q.choices[letter]}</span>`;

            if (!isLocked && !state.finished) {
                btn.addEventListener('click', () => selectAnswer(letter));
            }

            choicesContainer.appendChild(btn);
        });

        // Feedback (practice mode only, after answering)
        const feedbackEl = document.getElementById('quiz-feedback');
        const explEl = document.getElementById('quiz-explanation');

        if (state.mode === 'practice' && state.locked[idx]) {
            const isCorrect = state.answers[idx] === q.answer;
            feedbackEl.classList.remove('hidden', 'correct', 'wrong');
            feedbackEl.classList.add(isCorrect ? 'correct' : 'wrong');
            feedbackEl.textContent = isCorrect
                ? 'Correct!'
                : `Incorrect - the correct answer is ${q.answer}.`;

            if (q.explanation) {
                explEl.classList.remove('hidden');
                explEl.textContent = q.explanation;
            } else {
                explEl.classList.add('hidden');
            }
        } else {
            feedbackEl.classList.add('hidden');
            explEl.classList.add('hidden');
        }

        // Navigation buttons
        document.getElementById('quiz-prev').disabled = idx === 0;

        const nextBtn = document.getElementById('quiz-next');
        if (state.mode === 'practice') {
            if (idx === total - 1 && state.locked[idx]) {
                nextBtn.textContent = 'Finish';
            } else {
                nextBtn.textContent = 'Next';
            }
        }

        // Flag button
        const flagBtn = document.getElementById('quiz-flag');
        if (state.mode === 'mock') {
            flagBtn.textContent = state.flagged.has(idx) ? 'Unflag' : 'Flag for Review';
        }

        updateNavGrid();
    }

    function selectAnswer(letter) {
        const idx = state.currentIndex;
        state.answers[idx] = letter;

        if (state.mode === 'practice') {
            // Lock immediately and show feedback
            state.locked[idx] = true;
            renderQuestion();
            // Auto-save progress
            saveProgress();
        } else {
            // Mock: just highlight selection, no feedback
            renderQuestion();
        }
    }

    function saveProgress() {
        if (state.mode !== 'practice' || state.finished) return;
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        Storage.saveInProgress(state.categoryId, {
            currentIndex: state.currentIndex,
            answers: state.answers,
            locked: state.locked,
            elapsedSeconds: elapsed
        });
    }

    function setupControls() {
        document.getElementById('quiz-prev').addEventListener('click', () => {
            if (state.currentIndex > 0) {
                state.currentIndex--;
                renderQuestion();
            }
        });

        document.getElementById('quiz-next').addEventListener('click', () => {
            const total = state.questions.length;

            if (state.mode === 'practice') {
                if (state.currentIndex === total - 1 && state.locked[state.currentIndex]) {
                    finishExam();
                    return;
                }
                if (state.currentIndex < total - 1) {
                    state.currentIndex++;
                    renderQuestion();
                }
            } else {
                if (state.currentIndex < total - 1) {
                    state.currentIndex++;
                    renderQuestion();
                }
            }
        });

        document.getElementById('quiz-flag').addEventListener('click', () => {
            const idx = state.currentIndex;
            if (state.flagged.has(idx)) state.flagged.delete(idx);
            else state.flagged.add(idx);
            renderQuestion();
        });

        document.getElementById('quiz-submit').addEventListener('click', () => {
            const answered = Object.keys(state.answers).length;
            const total = state.questions.length;
            const unanswered = total - answered;
            const flaggedCount = state.flagged.size;

            let msg = `You have answered ${answered} of ${total} questions.`;
            if (unanswered > 0) msg += ` ${unanswered} questions are unanswered.`;
            if (flaggedCount > 0) msg += ` ${flaggedCount} questions are flagged for review.`;
            msg += ' Are you sure you want to submit?';

            App.showConfirm('Submit Exam', msg, () => finishExam());
        });
    }

    function finishExam() {
        state.finished = true;
        if (state.timerInterval) clearInterval(state.timerInterval);

        // Clear in-progress data for practice mode
        if (state.mode === 'practice') {
            Storage.clearInProgress(state.categoryId);
        }

        // Calculate results
        let correct = 0;
        const answerDetails = {};

        state.questions.forEach((q, i) => {
            const selected = state.answers[i] || null;
            const isCorrect = selected === q.answer;
            if (isCorrect) correct++;
            answerDetails[i] = {
                selected,
                correct: q.answer,
                isCorrect
            };
        });

        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const score = Math.round((correct / state.questions.length) * 100);

        const attempt = {
            id: Storage.generateAttemptId(state.categoryId),
            type: state.mode,
            categoryId: state.categoryId,
            categoryName: state.categoryName,
            date: new Date().toISOString(),
            totalQuestions: state.questions.length,
            correctAnswers: correct,
            score,
            timeSpent: elapsed,
            answers: answerDetails
        };

        Storage.saveAttempt(attempt);
        App.updateSidebarProgress();

        // Show results
        const container = document.getElementById('results-content');
        renderResults(attempt, container, false);
        App.showScreen('results');
    }

    function renderResults(attempt, container, isReview) {
        const questions = App.getQuestionSet(attempt.categoryId)?.questions || [];
        const elapsed = attempt.timeSpent;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;

        const passThreshold = attempt.type === 'mock' ? 70 : 70;
        const passed = attempt.score >= passThreshold;

        let html = `
            <div class="results-header">
                <div class="results-score-circle ${passed ? 'pass' : 'fail'}">
                    <div class="results-score-value">${attempt.score}%</div>
                    <div class="results-score-label">${attempt.correctAnswers}/${attempt.totalQuestions}</div>
                </div>
                <h2>${attempt.categoryName}</h2>
                <span class="results-pass-badge ${passed ? 'pass' : 'fail'}">
                    ${passed ? 'PASS' : 'BELOW TARGET'}
                </span>
            </div>

            <div class="results-stats">
                <div class="results-stat">
                    <div class="results-stat-value text-correct">${attempt.correctAnswers}</div>
                    <div class="results-stat-label">Correct</div>
                </div>
                <div class="results-stat">
                    <div class="results-stat-value text-wrong">${attempt.totalQuestions - attempt.correctAnswers}</div>
                    <div class="results-stat-label">Incorrect</div>
                </div>
                <div class="results-stat">
                    <div class="results-stat-value">${mins}m ${secs}s</div>
                    <div class="results-stat-label">Time Spent</div>
                </div>
                <div class="results-stat">
                    <div class="results-stat-value">${attempt.totalQuestions > 0 ? Math.round(elapsed / attempt.totalQuestions) : 0}s</div>
                    <div class="results-stat-label">Avg per Q</div>
                </div>
            </div>

            <div class="results-questions">
                <div class="results-filter-bar">
                    <button class="filter-btn active" data-filter="all">All (${attempt.totalQuestions})</button>
                    <button class="filter-btn" data-filter="wrong">Wrong (${attempt.totalQuestions - attempt.correctAnswers})</button>
                    <button class="filter-btn" data-filter="correct">Correct (${attempt.correctAnswers})</button>
                </div>
                <div id="results-q-list"></div>
            </div>

            <div class="results-actions">
                ${isReview ? `<button class="btn btn-outline" onclick="document.getElementById('review-list').classList.remove('hidden');document.getElementById('review-detail').classList.add('hidden');">Back to Review List</button>` : ''}
                <button class="btn btn-primary" onclick="App.showScreen('home')">Back to Home</button>
                ${!isReview && attempt.type === 'practice' ? `<button class="btn btn-secondary" onclick="App.showScreen('practice')">Practice More</button>` : ''}
                ${!isReview && attempt.type === 'mock' ? `<button class="btn btn-secondary" onclick="App.showScreen('mock')">More Mock Exams</button>` : ''}
            </div>
        `;

        container.innerHTML = html;

        // Render question list
        renderResultQuestions(attempt, questions, 'all');

        // Filter buttons
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderResultQuestions(attempt, questions, btn.dataset.filter);
            });
        });
    }

    function renderResultQuestions(attempt, questions, filter) {
        const listEl = document.getElementById('results-q-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        questions.forEach((q, i) => {
            const ans = attempt.answers[i];
            if (!ans) return;

            if (filter === 'wrong' && ans.isCorrect) return;
            if (filter === 'correct' && !ans.isCorrect) return;

            const statusClass = ans.isCorrect ? 'correct' : 'wrong';
            const statusText = ans.isCorrect ? 'Correct' : 'Incorrect';
            const selectedText = ans.selected ? `Your answer: ${ans.selected}` : 'Not answered';
            const correctText = `Correct: ${ans.correct}`;

            const item = document.createElement('div');
            item.className = `result-q-item ${statusClass}`;
            item.innerHTML = `
                <div class="result-q-header">
                    <span class="result-q-num">Q${q.id}</span>
                    <span class="result-q-status ${statusClass}">${statusText}</span>
                </div>
                <div class="result-q-text">${q.question}</div>
                <div class="result-q-answers">${selectedText} &middot; ${correctText}</div>
                ${q.explanation ? `<div class="result-q-explanation">${q.explanation}</div>` : ''}
            `;
            listEl.appendChild(item);
        });

        if (listEl.children.length === 0) {
            listEl.innerHTML = '<div class="no-data-msg">No questions match this filter.</div>';
        }
    }

    // Initialize controls on DOM ready
    document.addEventListener('DOMContentLoaded', setupControls);

    return { start, renderResults };
})();
