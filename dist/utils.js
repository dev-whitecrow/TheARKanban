export function getKSTISOString(date = new Date()) {
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
    return kstDate.toISOString().replace('Z', '+09:00');
}
//# sourceMappingURL=utils.js.map