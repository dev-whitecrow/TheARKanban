import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, } from 'discord.js';
import { consola } from 'consola';
import { getTask, getAllTasks, getBoardState } from '../state-manager.js';
import { createTask, updateTask, moveTask } from '../write-queue.js';
import { buildTaskEmbed, buildTaskListEmbed, buildBoardEmbed, } from './embeds.js';
import { startNotifications } from './notifications.js';
// ─── Slash Command Definitions ─────────────────────────────────
const taskCommand = new SlashCommandBuilder()
    .setName('story')
    .setDescription('Manage Kanban stories')
    .addSubcommand((sub) => sub
    .setName('create')
    .setDescription('Create a new story')
    .addStringOption((opt) => opt.setName('title').setDescription('Story title').setRequired(true))
    .addStringOption((opt) => opt.setName('assignee').setDescription('Assignee name').setRequired(false))
    .addStringOption((opt) => opt
    .setName('priority')
    .setDescription('Priority level')
    .setRequired(false)
    .addChoices({ name: '🔴 Urgent', value: 'urgent' }, { name: '🟠 High', value: 'high' }, { name: '🟡 Medium', value: 'medium' }, { name: '🟢 Low', value: 'low' }))
    .addStringOption((opt) => opt.setName('epic').setDescription('Epic name (e.g., Marketing)').setRequired(false)))
    .addSubcommand((sub) => sub
    .setName('list')
    .setDescription('List stories')
    .addStringOption((opt) => opt
    .setName('status')
    .setDescription('Filter by status')
    .setRequired(false)
    .addChoices({ name: '📋 Todo', value: 'todo' }, { name: '🔨 In Progress', value: 'in-progress' }, { name: '👀 Review', value: 'review' }, { name: '✅ Done', value: 'done' }, { name: '🚫 Blocked', value: 'blocked' }))
    .addStringOption((opt) => opt.setName('assignee').setDescription('Filter by assignee').setRequired(false)))
    .addSubcommand((sub) => sub
    .setName('show')
    .setDescription('Show story details')
    .addStringOption((opt) => opt.setName('id').setDescription('Story ID (e.g., STORY-001)').setRequired(true)))
    .addSubcommand((sub) => sub
    .setName('move')
    .setDescription('Move story to a new status')
    .addStringOption((opt) => opt.setName('id').setDescription('Story ID').setRequired(true))
    .addStringOption((opt) => opt
    .setName('status')
    .setDescription('Target status')
    .setRequired(true)
    .addChoices({ name: '📋 Todo', value: 'todo' }, { name: '🔨 In Progress', value: 'in-progress' }, { name: '👀 Review', value: 'review' }, { name: '✅ Done', value: 'done' }, { name: '🚫 Blocked', value: 'blocked' })))
    .addSubcommand((sub) => sub
    .setName('assign')
    .setDescription('Assign a story to someone')
    .addStringOption((opt) => opt.setName('id').setDescription('Story ID').setRequired(true))
    .addStringOption((opt) => opt.setName('assignee').setDescription('New assignee (leave empty to unassign)').setRequired(false)));
const boardCommand = new SlashCommandBuilder()
    .setName('board')
    .setDescription('Show the full Kanban board summary');
const COMMANDS = [taskCommand, boardCommand];
// ─── Command Handlers ──────────────────────────────────────────
async function handleTaskCommand(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case 'create': {
            const title = interaction.options.getString('title', true);
            const assignee = interaction.options.getString('assignee') ?? undefined;
            const priority = interaction.options.getString('priority') ?? undefined;
            const epic = interaction.options.getString('epic') ?? undefined;
            const task = await createTask({ title, assignee, priority, epic }, 'discord');
            await interaction.reply({ embeds: [buildTaskEmbed(task.frontmatter)] });
            break;
        }
        case 'list': {
            const status = interaction.options.getString('status');
            const assignee = interaction.options.getString('assignee');
            let tasks = getAllTasks();
            let filterLabel = 'All';
            if (status) {
                tasks = tasks.filter((t) => t.frontmatter.status === status);
                filterLabel = status;
            }
            if (assignee) {
                tasks = tasks.filter((t) => t.frontmatter.assignee === assignee);
                filterLabel += ` → ${assignee}`;
            }
            const embed = buildTaskListEmbed(tasks.map((t) => t.frontmatter), filterLabel);
            await interaction.reply({ embeds: [embed] });
            break;
        }
        case 'show': {
            const id = interaction.options.getString('id', true).toUpperCase();
            const task = getTask(id);
            if (!task) {
                await interaction.reply({ content: `❌ Task \`${id}\` not found.`, ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: [buildTaskEmbed(task.frontmatter)] });
            break;
        }
        case 'move': {
            const id = interaction.options.getString('id', true).toUpperCase();
            const newStatus = interaction.options.getString('status', true);
            const existing = getTask(id);
            if (!existing) {
                await interaction.reply({ content: `❌ Story \`${id}\` not found.`, ephemeral: true });
                return;
            }
            try {
                const updated = await moveTask(existing, newStatus, 'discord');
                await interaction.reply({ embeds: [buildTaskEmbed(updated.frontmatter)] });
            }
            catch (err) {
                await interaction.reply({
                    content: `❌ ${err instanceof Error ? err.message : 'Failed to move story'}`,
                    ephemeral: true,
                });
            }
            break;
        }
        case 'assign': {
            const id = interaction.options.getString('id', true).toUpperCase();
            const assignee = interaction.options.getString('assignee') ?? null;
            const existing = getTask(id);
            if (!existing) {
                await interaction.reply({ content: `❌ Story \`${id}\` not found.`, ephemeral: true });
                return;
            }
            const updated = await updateTask(existing, { assignee }, 'discord');
            await interaction.reply({ embeds: [buildTaskEmbed(updated.frontmatter)] });
            break;
        }
    }
}
async function handleBoardCommand(interaction) {
    const board = await getBoardState();
    await interaction.reply({ embeds: [buildBoardEmbed(board)] });
}
// ─── Bot Startup ───────────────────────────────────────────────
export async function startDiscordBot() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!token) {
        consola.warn('DISCORD_BOT_TOKEN not set — Discord bot disabled');
        throw new Error('DISCORD_BOT_TOKEN is required');
    }
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(token);
    client.once('ready', async () => {
        if (!client.user || !client.application)
            return;
        consola.success(`Discord bot logged in as ${client.user.tag}`);
        // Register commands globally (or guild-specific for dev)
        try {
            const guildId = process.env.DISCORD_GUILD_ID;
            const commandData = COMMANDS.map((c) => c.toJSON());
            if (guildId) {
                // Guild-specific (instant registration, good for dev)
                await rest.put(Routes.applicationGuildCommands(client.application.id, guildId), {
                    body: commandData,
                });
                consola.info(`Registered ${commandData.length} slash commands (guild: ${guildId})`);
            }
            else {
                // Global (takes up to 1 hour to propagate)
                await rest.put(Routes.applicationCommands(client.application.id), {
                    body: commandData,
                });
                consola.info(`Registered ${commandData.length} slash commands (global)`);
            }
        }
        catch (err) {
            consola.error('Failed to register slash commands:', err);
        }
        // Start notifications if channel is configured
        if (channelId) {
            startNotifications(client, channelId);
        }
    });
    // Handle interactions
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand())
            return;
        try {
            switch (interaction.commandName) {
                case 'story':
                    await handleTaskCommand(interaction);
                    break;
                case 'board':
                    await handleBoardCommand(interaction);
                    break;
            }
        }
        catch (err) {
            consola.error(`Discord command error (${interaction.commandName}):`, err);
            try {
                const reply = {
                    content: `❌ Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    ephemeral: true,
                };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                }
                else {
                    await interaction.reply(reply);
                }
            }
            catch (replyErr) {
                consola.error('Failed to send error reply to Discord:', replyErr);
            }
        }
    });
    await client.login(token);
    return client;
}
//# sourceMappingURL=bot.js.map