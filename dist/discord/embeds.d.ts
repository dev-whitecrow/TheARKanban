import { EmbedBuilder } from 'discord.js';
import type { TaskFrontmatter, BoardState } from '../schema.js';
export declare function buildTaskEmbed(task: TaskFrontmatter): EmbedBuilder;
export declare function buildTaskListEmbed(tasks: TaskFrontmatter[], filterLabel: string): EmbedBuilder;
export declare function buildBoardEmbed(board: BoardState): EmbedBuilder;
export declare function buildChangeNotificationEmbed(type: 'task:created' | 'task:updated' | 'task:deleted', task: TaskFrontmatter, source: string): EmbedBuilder;
//# sourceMappingURL=embeds.d.ts.map