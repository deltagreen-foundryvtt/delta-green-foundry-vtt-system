import { getDGSpeaker } from "../chat/dg-chat-card.js";

/**
 * Whether Dice So Nice is active and its Roll API is available.
 * @returns {boolean}
 */
export function isDiceSoNiceAvailable() {
  return Boolean(
    game.modules.get("dice-so-nice")?.active &&
      typeof game.dice3d?.showForRoll === "function",
  );
}

/**
 * Show a 3D dice animation for a Foundry Roll via the DSN Roll API.
 * Used for rolls that are not posted as chat messages (e.g. stat generation).
 * Chat-based rolls should rely on DSN's createChatMessage hook instead.
 *
 * @see https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/Integration
 * @see https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/API/Roll
 * @param {Roll} roll
 * @param {object} [options]
 * @param {boolean} [options.synchronize=true] Broadcast animation to other clients.
 * @param {ChatMessage.SpeakerData|null} [options.speaker] Chat speaker for NPC roll hiding.
 * @param {string[]|null} [options.whisper] User IDs who can see the roll; null for everyone.
 * @param {boolean} [options.blind=false] Whether the roll is blind for the rolling user.
 * @param {string|null} [options.chatMessageId] Chat message to reveal when the animation ends.
 * @returns {Promise<boolean>} True if animation was displayed.
 */
export async function showDiceSoNiceRoll(
  roll,
  {
    synchronize = true,
    speaker = null,
    whisper = null,
    blind = false,
    chatMessageId = null,
  } = {},
) {
  if (!isDiceSoNiceAvailable()) return false;

  return game.dice3d.showForRoll(
    roll,
    game.user,
    synchronize,
    whisper,
    blind,
    chatMessageId,
    speaker ?? undefined,
    { ghost: false, secret: false },
  );
}

/**
 * Merge evaluated rolls into a pool and show one 3D animation for all of them.
 *
 * @see https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/Integration#step-4-select-roll-order-for-multiple-rolls
 * @param {Roll[]} rolls
 * @param {object} [options]
 * @param {Actor|null} [options.actor]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<void>}
 */
export async function showDiceSoNicePooledRolls(
  rolls,
  { actor = null, token = null } = {},
) {
  if (!isDiceSoNiceAvailable() || !rolls?.length) return;

  const pool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
  const pooledRoll = Roll.fromTerms([pool]);
  const speaker = actor ? getDGSpeaker({ actor, token }) : null;
  await showDiceSoNiceRoll(pooledRoll, { speaker });
}

/**
 * Wait for the 3D animation tied to a chat message, if DSN is available.
 *
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function waitForDiceSoNiceMessageAnimation(messageId) {
  if (!isDiceSoNiceAvailable()) return;
  if (typeof game.dice3d.waitFor3DAnimationByMessageID !== "function") return;
  await game.dice3d.waitFor3DAnimationByMessageID(messageId);
}
