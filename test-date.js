const matter = require('gray-matter');
const { z } = require('zod');

const schema = z.object({
  nextRecurAt: z.string().optional()
});

const str = "---\nnextRecurAt: 2026-09-14T00:01:00.000+09:00\n---\nbody";
const { data } = matter(str);
console.log("Parsed by matter:", typeof data.nextRecurAt, data.nextRecurAt);
const res = schema.safeParse(data);
console.log("Zod result:", res.success ? "Success" : res.error.issues);
