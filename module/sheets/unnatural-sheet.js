import DGNPCSheet from "./npc-sheet.js";

/** @extends {DGNPCSheet} */
export default class DGUnnaturalSheet extends DGNPCSheet {
  /** @override */
  async _processSubmitData(event, form, submitData, options) {
    const submittedData = foundry.utils.expandObject(submitData);

    // we need to update max WP if POW has changed (only for unnatural, but doesn't hurt others)
    submittedData.system.wp.maxNeedsUpdate =
      submittedData.system?.statistics.pow.value !==
      this.actor.system.statistics.pow.value;

    // we need to update max HP if STR or CON have changed (only for unnatural, but doesn't hurt others)
    submittedData.system.health.maxNeedsUpdate =
      submittedData.system?.statistics.str.value !==
        this.actor.system.statistics.str.value ||
      submittedData.system?.statistics.con.value !==
        this.actor.system.statistics.con.value;

    return super._processSubmitData(event, form, submittedData, options);
  }
}
