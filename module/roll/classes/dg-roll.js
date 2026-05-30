/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
import {
  createDGRollChatMessage,
  prepareDGRollChatMessageData,
} from "../../chat/dg-chat-card.js";

export class DGRoll extends Roll {
  /**
   * NOTE: This class will rarely be called on its own. It should generally be extended. Look to DGPercentileRoll as an example.
   *
   * Customize our roll with some useful information, passed in the `options` Object.
   *
   * @param {string}          formula            Unused - The string formula to parse (from Foundry)
   * @param {Object}          data               Unused - The data object against which to parse attributes within the formula
   * @param {Object}          [options]          Additional data which is preserved in the database
   * @param {Number}          [options.rollType] The type of roll (stat, skill, sanity, damage, etc).
   * @param {String}          [options.key]      The key of the skill, stat, etc. to use as a basis for this roll.
   * @param {DeltaGreenActor} [options.actor]    The actor that this roll originates from.
   * @param {DeltaGreenItem}  [options.item]     Optional - The item from which the roll originates.
   */
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options);
    const { rollType, key, actor, item } = options;
    this.type = rollType;
    this.key = key;
    this.actor = actor;
    this.item = item;
    this.modifier = 0;
  }

  /**
   * Posts a roll to chat with the Delta Green card shell and an explicit `rolls`
   * array for Dice So Nice (listen-path compatible).
   *
   * @override
   * The following `@param` descriptions comes from the Foundry VTT code.
   * @param {object} messageData          The data object to use when creating the message
   * @param {options} [options]           Additional options which modify the created message.
   * @param {string} [options.messageMode]  A key of CONFIG.ChatMessage.modes
   * @param {boolean} [options.create=true]   Whether to automatically create the chat message, or only return the
   *                                          prepared chatData object.
   * @returns {Promise<ChatMessage|object>} A promise which resolves to the created ChatMessage document if create is
   *                                        true, or the Object of prepared chatData otherwise.
   */
  async toMessage(messageData = {}, { messageMode, create = true } = {}) {
    const label = messageData.label ?? messageData.flavor;
    delete messageData.label;

    const mode =
      messageMode ?? this.options.messageMode ?? this.options.rollMode;

    if (create) {
      return createDGRollChatMessage({
        roll: this,
        actor: this.actor,
        token: this.options.token,
        label,
        content: messageData.content,
        messageMode: mode,
        flags: messageData.flags ?? {},
      });
    }

    const { messageData: prepared, mappedMode } =
      await prepareDGRollChatMessageData({
        roll: this,
        actor: this.actor,
        token: this.options.token,
        label,
        content: messageData.content,
        messageMode: mode,
        flags: messageData.flags ?? {},
      });

    const cls = foundry.utils.getDocumentClass("ChatMessage");
    // eslint-disable-next-line new-cap -- Foundry document class resolved at runtime
    const msg = new cls(prepared);
    msg.applyMode(mappedMode);
    return msg.toObject();
  }
}
