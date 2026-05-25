/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {string} params.contentKey i18n key for message body.
 * @param {Record<string, string|number>} params.i18nData
 * @returns {Promise<ChatMessage>}
 */
export async function createAgentResourceChatMessage({
  actor,
  token = null,
  contentKey,
  i18nData,
}) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({
      actor,
      token,
      alias: actor.name,
    }),
    content: game.i18n.format(contentKey, i18nData),
    messageMode: game.settings.get("core", "messageMode"),
  });
}
