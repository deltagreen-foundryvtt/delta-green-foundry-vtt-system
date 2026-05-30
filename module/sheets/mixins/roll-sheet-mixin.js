import { getDGRollToken } from "../../chat/dg-chat-card.js";
import { createDGRollFromDataset, processDGRoll } from "../../roll/roll.js";

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function RollSheetMixin(Base) {
  return class extends Base {
    /**
     * Listens for right click events on the actor sheet and executes a regular roll,
     * or luck roll, depending on the action.
     *
     * @returns {void}
     */
    _setRightClickListeners() {
      const { element } = this;
      element.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const target = event.target.closest(
          "[data-action='roll'],[data-action='rollLuck']",
        );
        if (!target) return;

        if (target.dataset.action === "rollLuck") {
          this.constructor._onRollLuck.call(this, event, target);
          return;
        }

        this.constructor._onRoll.call(this, event, target);
      });
    }

    /**
     * Handle clickable rolls.
     *
     * @param {Event} event   The originating click event
     * @async
     * @private
     */
    static async _onRoll(event, target) {
      if (target.classList.contains("not-rollable") || event.which === 2)
        return;

      const item = this.actor.items.get(target.dataset.iid);
      const roll = createDGRollFromDataset(target.dataset, {
        actor: this.actor,
        item,
        element: target,
        sanityDamageSource: "actor",
        token: getDGRollToken(this.actor, this.token),
      });
      await this.processRoll(event, roll);
    }

    static async _onRollLuck(event) {
      if (event.which === 2) return;

      const roll = createDGRollFromDataset(
        { rolltype: "luck", key: "luck" },
        {
          actor: this.actor,
          token: getDGRollToken(this.actor, this.token),
        },
      );
      await this.processRoll(event, roll);
    }

    /**
     * Show a dialog for the roll and then send to chat.
     *
     * @param {Event} event   The originating click event
     * @param {Roll} roll     The roll to show a dialog for and then send to chat.
     * @async
     */
    async processRoll(event, roll) {
      return processDGRoll(event, roll);
    }
  };
}
