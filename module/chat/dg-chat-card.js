/* global TokenDocument */

import DG from "../config/index.js";
import { getCharacterSheetThemeClass } from "../applications/dg-dialog.js";

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
 * Portrait image for a Delta Green chat card.
 * @param {object} params
 * @param {Actor|null} [params.actor]
 * @param {TokenDocument|object|string|null} [params.token]
 * @param {ChatMessage.SpeakerData|null} [params.speaker]
 * @returns {string}
 */
export function getDGChatPortraitSrc({
  actor = null,
  token = null,
  speaker = null,
} = {}) {
  const tokenDoc =
    resolveDGTokenDocument(token) ?? getTokenFromChatSpeaker(speaker);
  const actorDoc =
    actor ?? (speaker ? ChatMessage.getSpeakerActor(speaker) : null);
  return tokenDoc?.texture?.src ?? actorDoc?.img ?? "icons/svg/mystery-man.svg";
}

/**
 * @param {object} params
 * @param {string} [params.title]
 * @param {string} [params.subtitle]
 * @param {string} [params.label] Backward-compat fallback treated as title
 * @param {string} [params.flavor] Foundry flavor fallback treated as title
 * @param {string} [params.rollLabel] Explicit skill/target line below the card header
 * @returns {{ rollLabel: string }}
 */
function normalizeChatCardHeader({
  title = "",
  subtitle = "",
  label = "",
  flavor = "",
  rollLabel = "",
} = {}) {
  if (rollLabel) return { rollLabel };
  const resolvedTitle = title || label || flavor;
  if (resolvedTitle && subtitle) {
    return { rollLabel: `${resolvedTitle}: ${subtitle}` };
  }
  return { rollLabel: resolvedTitle };
}

/**
 * @param {object} params
 * @param {string} [params.title]
 * @param {string} [params.subtitle]
 * @param {string} [params.label]
 * @param {string} [params.flavor]
 * @param {string} [params.rollLabel]
 * @returns {boolean}
 */
function shouldUseChatCard({
  title = "",
  subtitle = "",
  label = "",
  flavor = "",
  rollLabel = "",
} = {}) {
  return Boolean(
    normalizeChatCardHeader({ title, subtitle, label, flavor, rollLabel })
      .rollLabel,
  );
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} element
 */
export function enrichDGChatCardMessage(message, element) {
  const card = element.querySelector(".dg-chat-card");
  if (!card) return;

  card.classList.remove("program-style", "cowboy-style", "outlaw-style");
  card.classList.add(getCharacterSheetThemeClass());

  const foundryHeader = element.querySelector(".message-header");
  const header = card.querySelector(".dg-chat-card__header");

  let portrait = card.querySelector(".dg-chat-card__portrait");
  if (!portrait) {
    portrait = card.querySelector(".dg-chat-card__icon");
    if (portrait) portrait.classList.add("dg-chat-card__portrait");
  }
  if (portrait) {
    portrait.src = getDGChatPortraitSrc({ speaker: message.speaker });
  }

  const speakerEl = card.querySelector(".dg-chat-card__speaker");
  const authorEl = card.querySelector(".dg-chat-card__author");
  const speakerName = message.alias ?? "";
  const authorName = message.author?.name ?? "";

  if (speakerEl) speakerEl.textContent = speakerName;

  if (authorEl) {
    const whisperEl = foundryHeader?.querySelector(".whisper-to");
    if (whisperEl) {
      authorEl.textContent = whisperEl.textContent.trim();
      authorEl.hidden = false;
      whisperEl.remove();
    } else if (speakerName !== authorName && authorName) {
      authorEl.textContent = authorName;
      authorEl.hidden = false;
    } else {
      authorEl.hidden = true;
    }
  }

  let metadataSlot = card.querySelector(".dg-chat-card__metadata");
  if (!metadataSlot && header) {
    metadataSlot = document.createElement("span");
    metadataSlot.className = "dg-chat-card__metadata";
    header.appendChild(metadataSlot);
  }

  const foundryMetadata = foundryHeader?.querySelector(".message-metadata");
  if (metadataSlot && foundryMetadata) {
    metadataSlot.replaceWith(foundryMetadata);
    foundryMetadata.classList.add("dg-chat-card__metadata");
  }

  foundryHeader?.querySelector(".flavor-text")?.remove();
}

/**
 * @param {ChatMessage.SpeakerData} speaker
 * @param {string} [authorId]
 * @returns {{ speakerName: string, authorName: string, showAuthor: boolean }}
 */
function getDGChatCardIdentity(speaker, authorId = game.user.id) {
  const speakerName = getDGChatSpeakerName(speaker);
  const authorName = game.users.get(authorId)?.name ?? "";
  return {
    speakerName,
    authorName,
    showAuthor: Boolean(authorName) && speakerName !== authorName,
  };
}

/**
 * @param {object} params
 * @param {string} params.portraitSrc
 * @param {string} [params.rollLabel]
 * @param {string} [params.speakerName]
 * @param {string} [params.authorName]
 * @param {boolean} [params.showAuthor]
 * @param {string} params.content
 * @returns {Promise<string>}
 */
export async function renderDGChatCard({
  portraitSrc,
  rollLabel = "",
  speakerName = "",
  authorName = "",
  showAuthor = false,
  content,
}) {
  return renderTemplate(CHAT_CARD_TEMPLATE, {
    portraitSrc,
    rollLabel,
    speakerName,
    authorName,
    showAuthor,
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
 * @param {string} [options.title]
 * @param {string} [options.subtitle]
 * @param {string} [options.label] Backward-compat fallback treated as title
 * @param {Actor|null} [options.actor]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<object>}
 */
export async function wrapDGChatMessageData(
  messageData,
  { title, subtitle, label, rollLabel, actor = null, token = null } = {},
) {
  const header = normalizeChatCardHeader({
    title,
    subtitle,
    label: label ?? messageData.flavor,
    rollLabel,
  });
  if (!header.rollLabel) return messageData;

  const portraitSrc = getDGChatPortraitSrc({
    actor,
    token,
    speaker: messageData.speaker,
  });
  const identity = getDGChatCardIdentity(
    messageData.speaker,
    messageData.author,
  );
  const wrappedContent = await renderDGChatCard({
    portraitSrc,
    ...header,
    ...identity,
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
 * @param {string} [params.title]
 * @param {string} [params.subtitle]
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
  title = "",
  subtitle = "",
  label = "",
  rollLabel = "",
  content,
  messageMode,
  flags = {},
}) {
  const mode = messageMode ?? game.settings.get("core", "messageMode");
  const mappedMode = foundry.dice.Roll._mapLegacyRollMode(mode);
  const resolvedActor = actor ?? roll.actor ?? null;
  const resolvedToken = token ?? roll.options?.token ?? null;
  const useCard = shouldUseChatCard({ title, subtitle, label, rollLabel });

  if (!roll._evaluated) {
    await roll.evaluate({ allowInteractive: mappedMode !== "blind" });
  }

  const speaker = getDGSpeaker({
    actor: resolvedActor,
    token: resolvedToken,
    scene,
  });

  let bodyContent = content ?? String(roll.total);

  // Foundry only auto-injects roll HTML when content has no child elements.
  // DG chat cards always wrap content in a <section>, so embed rolls in the body.
  if (useCard && !contentIncludesRollDisplay(bodyContent)) {
    bodyContent = `${bodyContent}${await renderRollsHTML([roll])}`;
  }

  let messageData = {
    author: game.user.id,
    speaker,
    content: bodyContent,
    sound: CONFIG.sounds.dice,
    rolls: [roll],
    flags: foundry.utils.mergeObject({ [DG.ID]: { chatCard: useCard } }, flags),
  };

  if (useCard) {
    messageData = await wrapDGChatMessageData(messageData, {
      title,
      subtitle,
      label,
      rollLabel,
      actor: resolvedActor,
      token: resolvedToken,
    });
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
 * @param {string} [params.title]
 * @param {string} [params.subtitle]
 * @param {string} [params.label]
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
 * @param {string} [params.title]
 * @param {string} [params.subtitle]
 * @param {string} [params.label] Backward-compat fallback treated as title
 * @param {string} params.content Card body HTML
 * @param {string} [params.messageMode]
 * @param {object} [params.flags]
 * @returns {Promise<ChatMessage>}
 */
export async function createDGChatMessage({
  actor,
  token = null,
  scene = null,
  title = "",
  subtitle = "",
  label = "",
  rollLabel = "",
  content,
  messageMode,
  flags = {},
}) {
  const header = normalizeChatCardHeader({ title, subtitle, label, rollLabel });
  if (!header.rollLabel) {
    return ChatMessage.create({
      speaker: getDGSpeaker({ actor, token, scene }),
      content,
      messageMode: messageMode ?? game.settings.get("core", "messageMode"),
      flags,
    });
  }

  const speaker = getDGSpeaker({ actor, token, scene });
  const portraitSrc = getDGChatPortraitSrc({ actor, token, speaker });
  const identity = getDGChatCardIdentity(speaker);
  const wrappedContent = await renderDGChatCard({
    portraitSrc,
    ...header,
    ...identity,
    content,
  });

  return ChatMessage.create({
    speaker,
    content: wrappedContent,
    messageMode: messageMode ?? game.settings.get("core", "messageMode"),
    flags: foundry.utils.mergeObject({ [DG.ID]: { chatCard: true } }, flags),
  });
}
