import { consola } from 'consola';
import { getAllTasks } from './state-manager.js';
import { createTask, updateTask } from './write-queue.js';
import { getKSTISOString } from './utils.js';
import type { Task } from './schema.js';

const CRON_INTERVAL_MS = 60 * 1000; // Check every 1 minute

export function startCronJob() {
  consola.info('Starting recurring tasks scheduler...');
  setInterval(async () => {
    try {
      await processRecurringTasks();
    } catch (err) {
      consola.error('Error in recurring tasks cron job:', err);
    }
  }, CRON_INTERVAL_MS);
  
  // Also run immediately on boot
  processRecurringTasks().catch(err => {
    consola.error('Error in initial recurring tasks check:', err);
  });
}

async function processRecurringTasks() {
  const allTasks = getAllTasks();
  const nowStr = getKSTISOString();
  const nowTime = new Date(nowStr).getTime();

  for (const task of allTasks) {
    const { isTemplate, recurrence, nextRecurAt } = task.frontmatter;

    if (isTemplate && recurrence && nextRecurAt) {
      const recurTime = new Date(nextRecurAt).getTime();

      if (nowTime >= recurTime) {
        consola.info(`[Cron] Triggering recurring task: ${task.frontmatter.title} (${task.frontmatter.id})`);
        
        // 1. Create a new spawned task
        await createTask({
          title: task.frontmatter.title,
          status: 'todo',
          assignee: task.frontmatter.assignee,
          priority: task.frontmatter.priority,
          tags: task.frontmatter.tags,
          epic: task.frontmatter.epic,
          body: task.body,
          isRecurringInstance: true,
        }, 'cron');

        // 2. Advance nextRecurAt on the template
        const nextDate = new Date(recurTime);
        if (recurrence === 'daily') {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (recurrence === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (recurrence === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        await updateTask(task, {
          nextRecurAt: nextDate.toISOString().replace('Z', '+09:00'),
        }, 'cron');

      }
    }
  }
}
