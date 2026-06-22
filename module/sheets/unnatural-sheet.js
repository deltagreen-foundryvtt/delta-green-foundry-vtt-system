import flagUnnaturalResourceMaxUpdates from "../utils/actor-submit.js";
import DGNPCSheet from "./npc-sheet.js";

/** @extends {DGNPCSheet} */
export default class DGUnnaturalSheet extends DGNPCSheet {
  /** @override */
  async _processSubmitData(event, form, submitData, options) {
    const submittedData = foundry.utils.expandObject(submitData);
    flagUnnaturalResourceMaxUpdates(submittedData, this.actor);
    return super._processSubmitData(event, form, submittedData, options);
  }
}
