import { EmbedBuilder, } from 'discord.js';
// ─── Color Palette ─────────────────────────────────────────────
const STATUS_COLORS = {
    'todo': 0x6C757D, // gray
    'in-progress': 0x0D6EFD, // blue
    'review': 0xFFC107, // amber
    'done': 0x198754, // green
    'blocked': 0xDC3545, // red
};
const PRIORITY_EMOJI = {
    'urgent': '🔴',
    'high': '🟠',
    'medium': '🟡',
    'low': '🟢',
};
const STATUS_EMOJI = {
    'todo': '📋',
    'in-progress': '🔨',
    'review': '👀',
    'done': '✅',
    'blocked': '🚫',
};
// ─── Task Card Embed ───────────────────────────────────────────
export function buildTaskEmbed(task) {
    const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS[task.status])
        .setTitle(`${STATUS_EMOJI[task.status]} ${task.id}: ${task.title}`)
        .addFields({ name: 'Status', value: task.status, inline: true }, { name: 'Priority', value: `${PRIORITY_EMOJI[task.priority] ?? '⚪'} ${task.priority}`, inline: true }, { name: 'Assignee', value: task.assignee ?? '_unassigned_', inline: true })
        .setTimestamp(new Date(task.updatedAt))
        .setFooter({ text: `Created: ${task.createdAt.slice(0, 10)}` });
    if (task.dueDate) {
        embed.addFields({ name: 'Due Date', value: task.dueDate, inline: true });
    }
    if (task.tags.length > 0) {
        embed.addFields({ name: 'Epic', value: task.tags.map((t) => `\`${t}\``).join(' '), inline: false });
    }
    return embed;
}
// ─── Task List Embed ───────────────────────────────────────────
export function buildTaskListEmbed(tasks, filterLabel) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord blurple
        .setTitle(`📊 Stories — ${filterLabel}`)
        .setTimestamp();
    if (tasks.length === 0) {
        embed.setDescription('_No stories found._');
        return embed;
    }
    const lines = tasks.slice(0, 20).map((t) => {
        const priority = PRIORITY_EMOJI[t.priority] ?? '⚪';
        const assignee = t.assignee ? `→ ${t.assignee}` : '';
        return `${priority} **${t.id}** ${t.title} \`${t.status}\` ${assignee}`;
    });
    embed.setDescription(lines.join('\n'));
    if (tasks.length > 20) {
        embed.setFooter({ text: `Showing 20 of ${tasks.length} stories` });
    }
    else {
        embed.setFooter({ text: `${tasks.length} story(s)` });
    }
    return embed;
}
// ─── Board Summary Embed ───────────────────────────────────────
export function buildBoardEmbed(board) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🌌 MNDK — Kanban Board')
        .setTimestamp()
        .setFooter({ text: `Last sync: ${board.lastSync.slice(0, 19).replace('T', ' ')}` });
    const lines = board.columns.map((col) => {
        const count = col.tasks.length;
        const emoji = STATUS_EMOJI[col.id] ?? '📁';
        const preview = col.tasks.slice(0, 3).map((t) => `  └ ${t.id}: ${t.title}`).join('\n');
        return `${emoji} **${col.label}** (${count})\n${preview || '  └ _empty_'}`;
    });
    embed.setDescription(lines.join('\n\n'));
    embed.addFields({
        name: 'Total',
        value: `${board.totalTasks} story(s)`,
        inline: true,
    });
    return embed;
}
// ─── Change Notification Embed ─────────────────────────────────
export function buildChangeNotificationEmbed(type, task, source) {
    const actionMap = {
        'task:created': { emoji: '🆕', label: 'Created', color: 0x198754 },
        'task:updated': { emoji: '🔄', label: 'Updated', color: 0x0D6EFD },
        'task:deleted': { emoji: '🗑️', label: 'Deleted', color: 0xDC3545 },
    };
    const action = actionMap[type];
    return new EmbedBuilder()
        .setColor(action.color)
        .setDescription(`${action.emoji} **${task.id}** ${action.label.toLowerCase()}: "${task.title}"` +
        `\nStatus: \`${task.status}\` | Priority: ${PRIORITY_EMOJI[task.priority] ?? '⚪'} ${task.priority}` +
        (task.assignee ? `\nAssignee: ${task.assignee}` : '') +
        (task.tags.length > 0 ? `\nEpic: ${task.tags.map(t => `\`${t}\``).join(' ')}` : '') +
        `\n_via ${source}_`)
        .setTimestamp();
}
//# sourceMappingURL=embeds.js.map