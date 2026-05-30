/* global TokenDocument */

import DG from "../config/index.js";

const CHAT_CARD_TEMPLATE = "systems/deltagreen/templates/chat/dg-chat-card.hbs";
const { renderTemplate } = foundry.applications.handlebars;

/**
 * Resolve a TokenDocument from sheet/macro context.
 * @param {TokenDocument|object|string|null} token
 * @param {Scene|SceneDocument|string|null} [scene]
 * @returns {TokenDocument|null}
 */
export function resolveDGTokenDocument(token, scene = null) {
  if (!token) return null;
  if (token.documentName === "Token" || token instanceof TokenDocument) {
    return token;
  }
  if (token.document?.documentName === "Token") {
    return token.document;
  }
  const tokenId = typeof token === "string" ? token : token.id ?? token._id;
  if (!tokenId) return null;

  const sceneId =
    typeof scene === "string"
      ? scene
      : scene?.id ?? token.parent?.id ?? canvas.scene?.id;
  const sceneDoc = sceneId ? game.scenes.get(sceneId) : canvas.scene;
  return (
    sceneDoc?.tokens.get(tokenId) ??
    canvas.tokens.get(tokenId)?.document ??
    null
  );
}

/**
 * Speaker for Delta Green chat; uses token name for unlinked tokens.
 * @param {object} params
 * @param {Actor|null} [params.actor]
 * @param {TokenDocument|object|string|null} [params.token]
 * @param {Scene|SceneDocument|string|null} [params.scene]
 * @returns {ChatMessage.SpeakerData}
 */
export function getDGSpeaker({
  actor = null,
  token = null,
  scene = null,
} = {}) {
  const tokenDoc = resolveDGTokenDocument(token, scene);
  const sceneDoc = scene ?? tokenDoc?.parent ?? canvas.scene ?? null;
  const alias = tokenDoc?.name ?? actor?.name;

  return ChatMessage.getSpeaker({
    actor,
    token: tokenDoc,
    scene: sceneDoc,
    alias,
  });
}

/**
 * Token document from an existing chat speaker payload.
 * @param {ChatMessage.SpeakerData|null} speaker
 * @returns {TokenDocument|null}
 */
export function getTokenFromChatSpeaker(speaker) {
  if (!speaker?.token) return null;
  return resolveDGTokenDocument(speaker.token, speaker.scene);
}

/**
 * Best token for a roll from sheet or macro context.
 * @param {Actor|null} actor
 * @param {TokenDocument|object|string|null} [sheetToken]
 * @returns {TokenDocument|null}
 */
export function getDGRollToken(actor, sheetToken = null) {
  const fromSheet = resolveDGTokenDocument(sheetToken);
  if (fromSheet) return fromSheet;

  if (!actor) return null;

  const controlled = canvas.tokens?.controlled?.find((t) => t.actor === actor);
  if (controlled?.document) return controlled.document;

  const active = actor.getActiveTokens?.(true, true)?.[0];
  return active ?? null;
}

/**
 * @param {ChatMessage.SpeakerData|null} speaker
 * @returns {string}
 */
export function getDGChatSpeakerName(speaker) {
  if (!speaker) {
    return game.i18n.localize("CHAT.UnknownUser");
  }
  return speaker.alias ?? game.i18n.localize("CHAT.UnknownUser");
}

/**
 * @param {object} params
 * @param {string} params.speakerName
 * @param {string} [params.label]
 * @param {string} params.content
 * @returns {Promise<string>}
 */
export async function renderDGChatCard({ speakerName, label = "", content }) {
  return renderTemplate(CHAT_CARD_TEMPLATE, {
    speakerName,
    label,
    content,
  });
}

/**
 * Whether HTML already includes an inline dice roll block.
 * @param {string} content
 * @returns {boolean}
 */
function contentIncludesRollDisplay(content) {
  return typeof content === "string" && content.includes("dice-roll");
}

/**
 * Render roll HTML for embedding in a chat card body.
 * @param {Roll[]} rolls
 * @returns {Promise<string>}
 */
async function renderRollsHTML(rolls) {
  let html = "";
  for (const roll of rolls) {
    if (!roll._evaluated) await roll.evaluate();
    html += await roll.render();
  }
  return html;
}

/**
 * Wrap message content in the Delta Green chat card shell.
 * @param {object} messageData
 * @param {object} [options]
 * @param {string} [options.label] Card subtitle (falls back to flavor)
 * @returns {Promise<object>}
 */
export async function wrapDGChatMessageData(messageData, { label } = {}) {
  const labelText = label ?? messageData.flavor;
  if (!labelText) return messageData;

  const speakerName = getDGChatSpeakerName(messageData.speaker);
  const wrappedContent = await renderDGChatCard({
    speakerName,
    label: labelText,
    content: messageData.content ?? "",
  });

  const data = foundry.utils.deepClone(messageData);
  data.content = wrappedContent;
  data.flavor = "";
  foundry.utils.setProperty(data, `flags.${DG.ID}.chatCard`, true);
  return data;
}

/**
 * Build chat message data for a roll with optional Delta Green card wrapping.
 *
 * @param {object} params
 * @param {Roll} params.roll
 * @param {Actor|null} [params.actor]
 * @param {TokenDocument|null} [params.token]
 * @param {Scene|SceneDocument|null} [params.scene]
 * @param {string} [params.label]
 * @param {string} [params.content]
 * @param {string} [params.messageMode]
 * @param {object} [params.flags]
 * @returns {Promise<{ messageData: object, mappedMode: string }>}
 */
export async function prepareDGRollChatMessageData({
  roll,
  actor = null,
  token = null,
  scene = null,
  label = "",
  content,
  messageMode,
  flags = {},
}) {
  const mode = messageMode ?? game.settings.get("core", "messageMode");
  const mappedMode = foundry.dice.Roll._mapLegacyRollMode(mode);

  if (!roll._evaluated) {
    await roll.evaluate({ allowInteractive: mappedMode !== "blind" });
  }

  const speaker = getDGSpeaker({
    actor: actor ?? roll.actor ?? null,
    token: token ?? roll.options?.token ?? null,
    scene,
  });

  let bodyContent = content ?? String(roll.total);

  // Foundry only auto-injects roll HTML when content has no child elements.
  // DG chat cards always wrap content in a <section>, so embed rolls in the body.
  if (label && !contentIncludesRollDisplay(bodyContent)) {
    bodyContent = `${bodyContent}${await renderRollsHTML([roll])}`;
  }

  let messageData = {
    author: game.user.id,
    speaker,
    content: bodyContent,
    sound: CONFIG.sounds.dice,
    rolls: [roll],
    flags: foundry.utils.mergeObject(
      { [DG.ID]: { chatCard: Boolean(label) } },
      flags,
    ),
  };

  if (label) {
    messageData = await wrapDGChatMessageData(messageData, { label });
  }

  return { messageData, mappedMode };
}

/**
 * Create a roll chat message with the Delta Green card shell and an explicit rolls array.
 * Matches the Dolmenwood/DSN pattern: styled content in `content`, Roll objects in `rolls`.
 *
 * @see https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/Integration
 * @param {object} params
 * @param {Roll} params.roll Evaluated or unevaluated roll to attach to the message.
 * @param {Actor|null} [params.actor]
 * @param {TokenDocument|null} [params.token]
 * @param {Scene|SceneDocument|null} [params.scene]
 * @param {string} [params.label] Card subtitle
 * @param {string} [params.content] Card body HTML
 * @param {string} [params.messageMode]
 * @param {object} [params.flags]
 * @returns {Promise<ChatMessage>}
 */
export async function createDGRollChatMessage(params) {
  const { messageData, mappedMode } =
    await prepareDGRollChatMessageData(params);

  const ChatMessageDocument = foundry.utils.getDocumentClass("ChatMessage");
  const msg = new ChatMessageDocument(messageData);
  msg.applyMode(mappedMode);
  return ChatMessageDocument.create(msg);
}

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {Scene|SceneDocument|null} [params.scene]
 * @param {string} [params.label] Card subtitle
 * @param {string} params.content Card body HTML
 * @param {string} [params.messageMode]
 * @param {object} [params.flags]
 * @returns {Promise<ChatMessage>}
 */
export async function createDGChatMessage({
  actor,
  token = null,
  scene = null,
  label = "",
  content,
  messageMode,
  flags = {},
}) {
  const speaker = getDGSpeaker({ actor, token, scene });
  const speakerName = getDGChatSpeakerName(speaker);
  const wrappedContent = await renderDGChatCard({
    speakerName,
    label,
    content,
  });

  return ChatMessage.create({
    speaker,
    content: wrappedContent,
    flavor: "",
    messageMode: messageMode ?? game.settings.get("core", "messageMode"),
    flags: foundry.utils.mergeObject({ [DG.ID]: { chatCard: true } }, flags),
  });
}
