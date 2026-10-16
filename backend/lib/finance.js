// Pure financial-intelligence helpers. Kept free of Prisma/Express so they can
// be unit-tested in isolation and reused across routes.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Normalize a transaction description into a stable "merchant" key by lowercasing
 * and stripping digits, dates, and punctuation noise. e.g. "Netflix #1234" -> "netflix".
 */
export function merchantKey(description) {
    if (!description) return 'unknown';
    return description
        .toLowerCase()
        .replace(/[0-9]+/g, ' ')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'unknown';
}

function median(nums) {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function classifyCadence(avgIntervalDays) {
    if (avgIntervalDays >= 6 && avgIntervalDays <= 8) return 'weekly';
    if (avgIntervalDays >= 12 && avgIntervalDays <= 16) return 'biweekly';
    if (avgIntervalDays >= 26 && avgIntervalDays <= 35) return 'monthly';
    if (avgIntervalDays >= 58 && avgIntervalDays <= 70) return 'bimonthly';
    if (avgIntervalDays >= 85 && avgIntervalDays <= 100) return 'quarterly';
    if (avgIntervalDays >= 350 && avgIntervalDays <= 380) return 'yearly';
    return null;
}

/**
 * Detect recurring charges/subscriptions from transaction history.
 * Looks for expenses with the same merchant, similar amounts, and regular
 * time intervals between occurrences.
 *
 * @returns array of { merchant, description, cadence, averageAmount, occurrences, lastDate, nextExpectedDate }
 */
export function detectRecurring(transactions) {
    const expenses = transactions.filter(t => t.amount < 0 && t.description);

    // Group by merchant key.
    const groups = new Map();
    for (const t of expenses) {
        const key = merchantKey(t.description);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
    }

    const recurring = [];

    for (const [key, txns] of groups) {
        if (txns.length < 2) continue;

        const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
        const amounts = sorted.map(t => Math.abs(t.amount));
        const medAmount = median(amounts);
        if (medAmount === 0) continue;

        // Amounts must be reasonably consistent (within ~25% of the median).
        const consistent = amounts.every(a => Math.abs(a - medAmount) <= medAmount * 0.25);
        if (!consistent) continue;

        // Compute average interval between consecutive occurrences.
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            intervals.push((new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / DAY_MS);
        }
        const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
        const cadence = classifyCadence(avgInterval);
        if (!cadence) continue;

        const lastDate = sorted[sorted.length - 1].date;
        const nextExpectedDate = new Date(new Date(lastDate).getTime() + avgInterval * DAY_MS);

        recurring.push({
            merchant: key,
            description: sorted[sorted.length - 1].description,
            cadence,
            averageAmount: parseFloat(medAmount.toFixed(2)),
            occurrences: sorted.length,
            lastDate,
            nextExpectedDate,
        });
    }

    // Most expensive subscriptions first.
    return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
}

/**
 * Estimate total monthly cost of detected recurring charges.
 */
export function estimateMonthlyRecurringCost(recurring) {
    const perMonth = { weekly: 4.33, biweekly: 2.17, monthly: 1, bimonthly: 0.5, quarterly: 1 / 3, yearly: 1 / 12 };
    const total = recurring.reduce((s, r) => s + r.averageAmount * (perMonth[r.cadence] || 0), 0);
    return parseFloat(total.toFixed(2));
}

function mean(nums) {
    return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
}

function stddev(nums) {
    if (nums.length < 2) return 0;
    const m = mean(nums);
    const variance = mean(nums.map(v => (v - m) ** 2));
    return Math.sqrt(variance);
}

/**
 * Flag unusual transactions using simple statistical rules:
 *   - amount_spike: expense far above the user's typical spend (> mean + 2.5σ)
 *   - new_merchant:  first-ever charge from a merchant in the recent window
 *   - duplicate:     same merchant + amount charged twice within 3 days
 *
 * @param transactions full history (each must have id, amount, date, description)
 * @param opts.now reference "today" for the recent window (defaults to latest txn / real now)
 * @returns array of alerts sorted newest-first
 */
export function detectAnomalies(transactions, opts = {}) {
    const alerts = [];
    const expenses = transactions.filter(t => t.amount < 0);
    if (expenses.length === 0) return alerts;

    const amounts = expenses.map(t => Math.abs(t.amount));
    const m = mean(amounts);
    const sd = stddev(amounts);
    const spikeThreshold = m + 2.5 * sd;

    const now = opts.now ? new Date(opts.now) : new Date();
    const recentWindowMs = (opts.recentWindowDays ?? 30) * DAY_MS;

    // Build merchant -> sorted dates map for new-merchant detection.
    const merchantFirstSeen = new Map();
    for (const t of expenses) {
        const key = merchantKey(t.description);
        const d = new Date(t.date).getTime();
        if (!merchantFirstSeen.has(key) || d < merchantFirstSeen.get(key)) {
            merchantFirstSeen.set(key, d);
        }
    }

    // Duplicate detection: group by merchant+rounded amount.
    const dupGroups = new Map();
    for (const t of expenses) {
        const k = `${merchantKey(t.description)}|${Math.abs(t.amount).toFixed(2)}`;
        if (!dupGroups.has(k)) dupGroups.set(k, []);
        dupGroups.get(k).push(t);
    }
    const flaggedDuplicateIds = new Set();
    for (const group of dupGroups.values()) {
        if (group.length < 2) continue;
        const sorted = [...group].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (let i = 1; i < sorted.length; i++) {
            const gap = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / DAY_MS;
            if (gap <= 3 && !flaggedDuplicateIds.has(sorted[i].id)) {
                flaggedDuplicateIds.add(sorted[i].id);
                alerts.push({
                    id: sorted[i].id,
                    type: 'duplicate',
                    severity: 'high',
                    title: 'Possible duplicate charge',
                    message: `"${sorted[i].description || 'Transaction'}" of $${Math.abs(sorted[i].amount).toFixed(2)} appears ${Math.round(gap)} day(s) after an identical charge.`,
                    amount: sorted[i].amount,
                    date: sorted[i].date,
                });
            }
        }
    }

    for (const t of expenses) {
        const abs = Math.abs(t.amount);
        const key = merchantKey(t.description);
        const txTime = new Date(t.date).getTime();
        const isRecent = now.getTime() - txTime <= recentWindowMs;

        // Amount spike (only meaningful when we have enough history & spread).
        if (sd > 0 && abs > spikeThreshold && abs > m * 1.5) {
            alerts.push({
                id: t.id,
                type: 'amount_spike',
                severity: abs > m + 4 * sd ? 'high' : 'medium',
                title: 'Unusually large transaction',
                message: `"${t.description || 'Transaction'}" of $${abs.toFixed(2)} is well above your average spend of $${m.toFixed(2)}.`,
                amount: t.amount,
                date: t.date,
            });
        }

        // New merchant in the recent window (and history exists before it).
        if (isRecent && merchantFirstSeen.get(key) === txTime && key !== 'unknown') {
            const olderExists = expenses.some(e => new Date(e.date).getTime() < txTime);
            if (olderExists) {
                alerts.push({
                    id: t.id,
                    type: 'new_merchant',
                    severity: 'low',
                    title: 'First charge from a new merchant',
                    message: `First time you've been charged by "${t.description || 'this merchant'}" ($${abs.toFixed(2)}).`,
                    amount: t.amount,
                    date: t.date,
                });
            }
        }
    }

    return alerts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Project when a savings goal will be completed given a monthly saving rate.
 * @returns { remaining, percentComplete, monthsToGoal, projectedCompletionDate, onTrack, requiredMonthly }
 */
export function projectGoal(goal, monthlySavingRate, now = new Date()) {
    const target = goal.targetAmount;
    const current = goal.currentAmount || 0;
    const remaining = Math.max(target - current, 0);
    const percentComplete = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    const deadline = goal.deadline ? new Date(goal.deadline) : null;
    let monthsToDeadline = null;
    if (deadline) {
        monthsToDeadline = (deadline.getFullYear() - now.getFullYear()) * 12
            + (deadline.getMonth() - now.getMonth());
    }

    let monthsToGoal = null;
    let projectedCompletionDate = null;
    if (remaining === 0) {
        monthsToGoal = 0;
        projectedCompletionDate = now;
    } else if (monthlySavingRate > 0) {
        monthsToGoal = Math.ceil(remaining / monthlySavingRate);
        projectedCompletionDate = new Date(now.getFullYear(), now.getMonth() + monthsToGoal, now.getDate());
    }

    // Amount you'd need to set aside each month to hit the deadline.
    let requiredMonthly = null;
    if (deadline && monthsToDeadline > 0) {
        requiredMonthly = parseFloat((remaining / monthsToDeadline).toFixed(2));
    }

    const onTrack = remaining === 0
        ? true
        : (monthsToGoal !== null && monthsToDeadline !== null ? monthsToGoal <= monthsToDeadline : null);

    return {
        remaining: parseFloat(remaining.toFixed(2)),
        percentComplete: parseFloat(percentComplete.toFixed(1)),
        monthsToDeadline,
        monthsToGoal,
        projectedCompletionDate,
        requiredMonthly,
        onTrack,
    };
}

/**
 * Estimate the user's average monthly net savings from recent transactions.
 */
export function estimateMonthlySavingRate(transactions, monthsBack = 3) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    const recent = transactions.filter(t => new Date(t.date) >= cutoff);
    const net = recent.reduce((s, t) => s + t.amount, 0);
    return parseFloat((net / monthsBack).toFixed(2));
}
