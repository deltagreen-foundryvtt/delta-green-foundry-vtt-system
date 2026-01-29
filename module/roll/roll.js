/* eslint-disable max-classes-per-file */
import DGUtils from "../other/utility-functions.js";
import DG from "../config.js";
import { DGPercentileRoll } from "./DGPercentileRoll.js";
import { DGLethalityRoll } from "./DGLethalityRoll.js";
import { DGDamageRoll } from "./DGDamageRoll.js";
import { DGSanityDamageRoll } from "./DGSanityDamageRoll.js";
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

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
   * Simple function that actually creates the message and sends it to chat.
   * We override this to have a little more control over certain aspects of the message,
   * right now, its `speaker` and `rollMode`.
   *
   * @override
   * The following `@param` descriptions comes from the Foundry VTT code.
   * @param {object} messageData          The data object to use when creating the message
   * @param {options} [options]           Additional options which modify the created message.
   * @param {string} [options.rollMode]   The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]   Whether to automatically create the chat message, or only return the
   *                                          prepared chatData object.
   * @returns {Promise<ChatMessage|object>} A promise which resolves to the created ChatMessage document if create is
   *                                        true, or the Object of prepared chatData otherwise.
   */
  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    // eslint-disable-next-line no-param-reassign
    messageData.speaker = ChatMessage.getSpeaker({ actor: this.actor });
    return super.toMessage(messageData, {
      rollMode: this.options.rollMode || rollMode,
      create,
    });
  }
}
