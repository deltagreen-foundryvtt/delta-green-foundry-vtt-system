import BaseActorData from "./base-actor.js";
import SheetSettingsActorData from "./sheet-settings.js";

export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...BaseActorData.defineSchema(),
      ...SheetSettingsActorData.defineSchema(),
    };
  }
}
