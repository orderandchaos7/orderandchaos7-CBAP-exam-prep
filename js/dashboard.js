/* ============================================
   Dashboard Module — Charts and Analytics
   ============================================ */

const Dashboard = (() => {
    let charts = {};

    function render() {
        const stats = Storage.getAllStats();
        renderCategoryChart(stats);
        renderProgressChart(stats);
        renderTrendChart(stats);
        renderMockResultsTable(stats);
        renderWeakAreasTable(stats);
        setupResetButton();
    }

    function destroyChart(key) {
        if (charts[key]) { charts[key].destroy(); charts[key] = null; }
    }

    function renderCategoryChart(stats) {
        destroyChart('category');
        const canvas = document.getElementById('chart-category');
        if (!canvas) return;

        const categories = ['KA1', 'KA2', 'KA3', 'KA4', 'KA5', 'KA6', 'Ch9', 'Ch10', 'Ch11', 'Mock'];
        const colors = ['#6c63ff', '#54a0ff', '#00d4aa', '#feca57', '#ff6b6b', '#a29bfe', '#fd79a8', '#e17055', '#00b894', '#636e72'];
        const scores = categories.map(c => {
            const d = stats.byCategory[c];
            return d && d.attempted > 0 ? Math.round((d.correct / d.attempted) * 100) : 0;
        });
        const attempted = categories.map(c => {
            const d = stats.byCategory[c];
            return d ? d.attempted : 0;
        });

        // Only show categories with data
        const filtered = categories.reduce((acc, c, i) => {
            if (attempted[i] > 0) {
                acc.labels.push(c);
                acc.scores.push(scores[i]);
                acc.colors.push(colors[i]);
            }
            return acc;
        }, { labels: [], scores: [], colors: [] });

        if (filtered.labels.length === 0) {
            canvas.parentElement.querySelector('h3').insertAdjacentHTML('afterend',
                '<div class="no-data-msg">No attempts yet</div>');
            return;
        }

        // Remove any previous no-data messages
        const existing = canvas.parentElement.querySelector('.no-data-msg');
        if (existing) existing.remove();

        charts.category = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: filtered.labels,
                datasets: [{
                    label: 'Score %',
                    data: filtered.scores,
                    backgroundColor: filtered.colors.map(c => c + '99'),
                    borderColor: filtered.colors,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Score: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#8892a8', callback: v => v + '%' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8892a8' }
                    }
                }
            }
        });

        canvas.parentElement.style.height = '280px';
    }

    function renderProgressChart(stats) {
        destroyChart('progress');
        const canvas = document.getElementById('chart-progress');
        if (!canvas) return;

        const attempted = stats.totalAttempted;
        const remaining = stats.remaining;

        charts.progress = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Attempted', 'Remaining'],
                datasets: [{
                    data: [attempted, remaining],
                    backgroundColor: ['#6c63ff', '#1f2940'],
                    borderColor: ['#6c63ff', '#2a3a5c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#8892a8', padding: 16, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${ctx.raw} questions`
                        }
                    }
                }
            }
        });

        canvas.parentElement.style.height = '280px';
    }

    function renderTrendChart(stats) {
        destroyChart('trend');
        const canvas = document.getElementById('chart-trend');
        if (!canvas) return;

        const attempts = stats.attempts;
        if (attempts.length === 0) {
            const existing = canvas.parentElement.querySelector('.no-data-msg');
            if (!existing) {
                canvas.parentElement.querySelector('h3').insertAdjacentHTML('afterend',
                    '<div class="no-data-msg">No attempts yet</div>');
            }
            return;
        }

        const existing = canvas.parentElement.querySelector('.no-data-msg');
        if (existing) existing.remove();

        // Sort by date
        const sorted = [...attempts].sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sorted.map((a, i) => `#${i + 1}`);
        const scores = sorted.map(a => a.score);

        charts.trend = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Score %',
                    data: scores,
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0,212,170,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#00d4aa',
                    pointBorderColor: '#00d4aa',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (ctx) => {
                                const a = sorted[ctx[0].dataIndex];
                                return a.categoryName;
                            },
                            label: (ctx) => `Score: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#8892a8', callback: v => v + '%' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8892a8' }
                    }
                }
            }
        });

        canvas.parentElement.style.height = '280px';
    }

    function renderMockResultsTable(stats) {
        const container = document.getElementById('mock-results-table');
        if (!container) return;

        const mockAttempts = stats.attempts.filter(a => a.type === 'mock');

        if (mockAttempts.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No mock exams completed yet</div>';
            return;
        }

        let rows = mockAttempts.map(a => {
            const date = new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const scoreClass = a.score >= 70 ? 'score-good' : a.score >= 50 ? 'score-warn' : 'score-bad';
            const mins = Math.floor(a.timeSpent / 60);
            return `<tr>
                <td>${a.categoryName}</td>
                <td>${date}</td>
                <td class="${scoreClass}">${a.score}%</td>
                <td>${a.correctAnswers}/${a.totalQuestions}</td>
                <td>${mins}m</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="dash-table">
                <thead><tr>
                    <th>Exam</th><th>Date</th><th>Score</th><th>Correct</th><th>Time</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    function renderWeakAreasTable(stats) {
        const container = document.getElementById('weak-areas-table');
        if (!container) return;

        const weak = Object.entries(stats.byCategory)
            .filter(([_, d]) => d.attempted > 0)
            .map(([key, d]) => ({
                name: key,
                score: Math.round((d.correct / d.attempted) * 100),
                attempted: d.attempted,
                correct: d.correct
            }))
            .filter(d => d.score < 70)
            .sort((a, b) => a.score - b.score);

        if (weak.length === 0) {
            const hasData = Object.values(stats.byCategory).some(d => d.attempted > 0);
            container.innerHTML = hasData
                ? '<div class="no-data-msg">All categories above 70% — keep it up!</div>'
                : '<div class="no-data-msg">No attempts yet</div>';
            return;
        }

        let rows = weak.map(d => {
            const scoreClass = d.score < 50 ? 'score-bad' : 'score-warn';
            return `<tr>
                <td>${d.name}</td>
                <td class="${scoreClass}">${d.score}%</td>
                <td>${d.correct}/${d.attempted}</td>
                <td>Focus on this area</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="dash-table">
                <thead><tr>
                    <th>Category</th><th>Score</th><th>Correct</th><th>Action</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    function setupResetButton() {
        const btn = document.getElementById('reset-data');
        if (!btn) return;

        // Remove old listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            App.showConfirm(
                'Reset All Data',
                'This will permanently delete all your quiz scores, attempt history, and progress. This cannot be undone.',
                () => {
                    Storage.clearAll();
                    App.updateSidebarProgress();
                    App.showScreen('home');
                }
            );
        });
    }

    return { render };
})();
