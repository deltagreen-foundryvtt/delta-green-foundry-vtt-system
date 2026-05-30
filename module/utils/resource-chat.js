import {
  createDGChatMessage,
  createDGRollChatMessage,
} from "../chat/dg-chat-card.js";

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {string} params.contentKey i18n key for message body.
 * @param {string} params.labelKey i18n key for card subtitle.
 * @param {Record<string, string|number>} params.i18nData
 * @param {string|null} [params.extraContentKey] Optional i18n key appended on a new line after the main body.
 * @param {Roll} [params.roll] When set, attaches the roll to the chat message for display and Dice So Nice.
 * @returns {Promise<ChatMessage>}
 */
export async function createAgentResourceChatMessage({
  actor,
  token = null,
  contentKey,
  labelKey,
  i18nData,
  extraContentKey = null,
  roll = null,
}) {
  let content = game.i18n.format(contentKey, i18nData);
  if (extraContentKey) {
    content = `${content}<br>${game.i18n.format(extraContentKey, i18nData)}`;
  }
  const label = game.i18n.localize(labelKey);
  const messageMode = game.settings.get("core", "messageMode");

  if (roll) {
    return createDGRollChatMessage({
      actor,
      token,
      roll,
      label,
      content,
      messageMode,
    });
  }

  return createDGChatMessage({
    actor,
    token,
    label,
    content,
    messageMode,
  });
}
