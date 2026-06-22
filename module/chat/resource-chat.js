import { createDGRollChatMessage } from "./dg-chat-card.js";

/**
 * Underlined "{amount} Willpower" span with a current/max tooltip for chat roll labels.
 *
 * @param {object} params
 * @param {number} params.amount Willpower lost or regained.
 * @param {number} params.current
 * @param {number} params.max
 * @returns {string}
 */
export function buildWillpowerChangeSpan({ amount, current, max }) {
  const willpower = game.i18n.localize("DG.Physical.Chat.Willpower");
  const tooltip = game.i18n.format("DG.Physical.Chat.WillpowerTooltip", {
    current,
    max,
  });
  const label = game.i18n.format("DG.Physical.Chat.WillpowerAmount", {
    amount,
    willpower,
  });

  return `<span class="dg-chat-card__wp-change" data-tooltip-html="${foundry.utils.escapeHTML(
    tooltip,
  )}"><u>${foundry.utils.escapeHTML(label)}</u></span>`;
}

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {string} [params.contentKey] i18n key for message body.
 * @param {string} [params.labelKey] i18n key for the roll-label row when rollLabelKey is omitted.
 * @param {string} [params.rollLabelKey] i18n key for a formatted roll-label row (HTML).
 * @param {Record<string, string|number>} params.i18nData
 * @param {Roll} params.roll Roll attached to the chat message for display and Dice So Nice.
 * @param {string|null} [params.extraContentKey] Optional i18n key appended on a new line after the main body.
 * @returns {Promise<ChatMessage>}
 */
export default async function createAgentResourceChatMessage({
  actor,
  token = null,
  contentKey = null,
  labelKey = "",
  rollLabelKey = null,
  i18nData,
  roll,
  extraContentKey = null,
}) {
  let content = contentKey ? game.i18n.format(contentKey, i18nData) : "";
  if (extraContentKey) {
    const extra = game.i18n.format(extraContentKey, i18nData);
    content = content ? `${content}<br>${extra}` : extra;
  }

  const rollLabel = rollLabelKey
    ? game.i18n.format(rollLabelKey, i18nData)
    : labelKey
    ? game.i18n.localize(labelKey)
    : "";

  const messageMode = game.settings.get("core", "messageMode");

  return createDGRollChatMessage({
    actor,
    token,
    roll,
    rollLabel,
    content,
    messageMode,
  });
}
