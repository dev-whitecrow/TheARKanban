import matter from 'gray-matter';
const str = "---\nnextRecurAt: '2026-09-14T00:01:00.000+09:00'\n---\nbody";
const { data } = matter(str);
console.log("Parsed by matter:", typeof data.nextRecurAt, data.nextRecurAt);
