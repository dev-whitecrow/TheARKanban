import matter from 'gray-matter';
const fm = { nextRecurAt: "2026-09-14T00:01:00.000+09:00" };
console.log(matter.stringify("body", fm));
