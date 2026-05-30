import { createDGRollChatMessage } from "./dg-chat-card.js";

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {string} params.contentKey i18n key for message body.
 * @param {string} params.labelKey i18n key for card subtitle.
 * @param {Record<string, string|number>} params.i18nData
 * @param {Roll} params.roll Roll attached to the chat message for display and Dice So Nice.
 * @param {string|null} [params.extraContentKey] Optional i18n key appended on a new line after the main body.
 * @returns {Promise<ChatMessage>}
 */
export default async function createAgentResourceChatMessage({
  actor,
  token = null,
  contentKey,
  labelKey,
  i18nData,
  roll,
  extraContentKey = null,
}) {
  let content = game.i18n.format(contentKey, i18nData);
  if (extraContentKey) {
    content = `${content}<br>${game.i18n.format(extraContentKey, i18nData)}`;
  }
  const label = game.i18n.localize(labelKey);
  const messageMode = game.settings.get("core", "messageMode");

  return createDGRollChatMessage({
    actor,
    token,
    roll,
    label,
    content,
    messageMode,
  });
}
