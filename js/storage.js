/* ============================================
   Storage Module — localStorage helpers
   ============================================ */

const Storage = (() => {
    const KEYS = {
        ATTEMPTS: 'cbap_attempts',
        QUESTIONS: null // loaded at runtime
    };

    function getAttempts() {
        try {
            const raw = localStorage.getItem(KEYS.ATTEMPTS);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    function saveAttempt(attempt) {
        const attempts = getAttempts();
        attempts.push(attempt);
        localStorage.setItem(KEYS.ATTEMPTS, JSON.stringify(attempts));
    }

    function getAttemptById(id) {
        return getAttempts().find(a => a.id === id) || null;
    }

    function getAttemptsForSet(categoryId) {
        return getAttempts().filter(a => a.categoryId === categoryId);
    }

    function getLatestAttemptForSet(categoryId) {
        const setAttempts = getAttemptsForSet(categoryId);
        return setAttempts.length > 0 ? setAttempts[setAttempts.length - 1] : null;
    }

    function getAllStats() {
        const attempts = getAttempts();
        let totalAttempted = 0;
        let totalCorrect = 0;
        const byCategory = {};

        // Track unique questions attempted per set (use latest attempt per set)
        const latestBySet = {};
        attempts.forEach(a => { latestBySet[a.categoryId] = a; });

        Object.values(latestBySet).forEach(a => {
            totalAttempted += a.totalQuestions;
            totalCorrect += a.correctAnswers;

            // Group by KA prefix for dashboard
            const kaKey = getKaGroup(a.categoryId);
            if (!byCategory[kaKey]) {
                byCategory[kaKey] = { attempted: 0, correct: 0, name: kaKey };
            }
            byCategory[kaKey].attempted += a.totalQuestions;
            byCategory[kaKey].correct += a.correctAnswers;
        });

        return {
            totalAttempted,
            totalCorrect,
            totalQuestions: 1410,
            score: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
            remaining: 1410 - totalAttempted,
            byCategory,
            attempts
        };
    }

    function getKaGroup(categoryId) {
        if (categoryId.startsWith('ka1')) return 'KA1';
        if (categoryId.startsWith('ka2')) return 'KA2';
        if (categoryId.startsWith('ka3')) return 'KA3';
        if (categoryId.startsWith('ka4')) return 'KA4';
        if (categoryId.startsWith('ka5')) return 'KA5';
        if (categoryId.startsWith('ka6')) return 'KA6';
        if (categoryId.startsWith('ch9')) return 'Ch9';
        if (categoryId.startsWith('ch10')) return 'Ch10';
        if (categoryId.startsWith('ch11')) return 'Ch11';
        if (categoryId.startsWith('mock')) return 'Mock';
        return 'Other';
    }

    function clearAll() {
        localStorage.removeItem(KEYS.ATTEMPTS);
        // Also clear all in-progress sessions
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cbap_inprogress_')) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    // --- In-progress session helpers (practice mode only) ---

    function saveInProgress(categoryId, sessionData) {
        const key = `cbap_inprogress_${categoryId}`;
        localStorage.setItem(key, JSON.stringify(sessionData));
    }

    function getInProgress(categoryId) {
        try {
            const key = `cbap_inprogress_${categoryId}`;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    function clearInProgress(categoryId) {
        localStorage.removeItem(`cbap_inprogress_${categoryId}`);
    }

    function hasInProgress(categoryId) {
        return localStorage.getItem(`cbap_inprogress_${categoryId}`) !== null;
    }

    function generateAttemptId(categoryId) {
        const now = new Date();
        const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
        return `${categoryId}_${ts}`;
    }

    return {
        getAttempts,
        saveAttempt,
        getAttemptById,
        getAttemptsForSet,
        getLatestAttemptForSet,
        getAllStats,
        getKaGroup,
        clearAll,
        generateAttemptId,
        saveInProgress,
        getInProgress,
        clearInProgress,
        hasInProgress
    };
})();
