export function getKSTISOString(date = new Date()) {
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
    return kstDate.toISOString().replace('Z', '+09:00');
}
export function calculateNextRecurAt(recurrence, fromTime = Date.now()) {
    const nextDate = new Date(fromTime);
    if (recurrence === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 1, 0, 0);
    }
    else if (recurrence === 'weekly') {
        const day = nextDate.getDay();
        const daysUntilMonday = (1 + 7 - day) % 7 || 7;
        nextDate.setDate(nextDate.getDate() + daysUntilMonday);
        nextDate.setHours(0, 1, 0, 0);
    }
    return getKSTISOString(nextDate);
}
//# sourceMappingURL=utils.js.map