import { createDGChatMessage } from "../chat/dg-chat-card.js";

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {string} params.contentKey i18n key for message body.
 * @param {string} params.labelKey i18n key for card subtitle.
 * @param {Record<string, string|number>} params.i18nData
 * @returns {Promise<ChatMessage>}
 */
export async function createAgentResourceChatMessage({
  actor,
  token = null,
  contentKey,
  labelKey,
  i18nData,
}) {
  const content = game.i18n.format(contentKey, i18nData);
  return createDGChatMessage({
    actor,
    token,
    label: game.i18n.localize(labelKey),
    content,
    messageMode: game.settings.get("core", "messageMode"),
  });
}
