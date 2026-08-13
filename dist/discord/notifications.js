import { consola } from 'consola';
import { taskEvents } from '../write-queue.js';
import { buildChangeNotificationEmbed } from './embeds.js';
let notificationChannel = null;
/**
 * Start listening to task events and forward them as Discord notifications.
 */
export function startNotifications(client, channelId) {
    // Resolve the channel
    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        consola.warn(`Discord notification channel ${channelId} not found or not a text channel`);
        return;
    }
    notificationChannel = channel;
    consola.success(`Discord notifications active in #${notificationChannel.name}`);
    // Listen to task events (exclude events originating from discord to avoid loops)
    taskEvents.on('task:event', async (event) => {
        if (!notificationChannel)
            return;
        if (event.source === 'discord')
            return; // Don't notify about our own actions
        try {
            const embed = buildChangeNotificationEmbed(event.type, event.task.frontmatter, event.source);
            await notificationChannel.send({ embeds: [embed] });
        }
        catch (err) {
            consola.error('Failed to send Discord notification:', err);
        }
    });
}
//# sourceMappingURL=notifications.js.map