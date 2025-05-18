// Import Modules
import DeltaGreenActor from "./actor/actor.js";
import DeltaGreenActorSheet from "./actor/actor-sheet.js";
import DeltaGreenItem from "./item/item.js";
import DeltaGreenItemSheet from "./item/item-sheet.js";
import * as DGRolls from "./roll/roll.js";
import registerSystemSettings from "./settings.js";
import preloadHandlebarsTemplates from "./templates.js";
import registerHandlebarsHelpers from "./other/register-helpers.js";
import ParseDeltaGreenStatBlock from "./other/stat-parser-macro.js";
import {
  createDeltaGreenMacro,
  rollItemMacro,
  rollItemSkillCheckMacro,
  rollSkillMacro,
  rollSkillTestAndDamageForOwnedItem,
} from "./other/macro-functions.js";

Hooks.once("init", async () => {
  game.deltagreen = {
    DeltaGreenActor,
    DeltaGreenItem,
    rollItemMacro,
    rollItemSkillCheckMacro,
    rollSkillMacro,
    ParseDeltaGreenStatBlock,
    rollSkillTestAndDamageForOwnedItem,
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "@statistics.dex.value",
    decimals: 0,
  };

  // Register custom dice rolls
  Object.values(DGRolls).forEach((cls) => CONFIG.Dice.rolls.push(cls));

  // Register System Settings
  registerSystemSettings();

  // Define custom Entity classes
  CONFIG.Actor.documentClass = DeltaGreenActor;
  CONFIG.Item.documentClass = DeltaGreenItem;

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet(
    "core",
    foundry.appv1.sheets.ActorSheet
  );
  foundry.documents.collections.Items.unregisterSheet(
    "core",
    foundry.appv1.sheets.ItemSheet
  );
  foundry.documents.collections.Actors.registerSheet(
    "deltagreen",
    DeltaGreenActorSheet,
    {
      makeDefault: true,
    }
  );
  foundry.documents.collections.Items.registerSheet(
    "deltagreen",
    DeltaGreenItemSheet,
    { makeDefault: true }
  );

  // Preload Handlebars Templates
  preloadHandlebarsTemplates();

  // Add Handlebars helpers
  registerHandlebarsHelpers();
});

Hooks.once("ready", async () => {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    // note - if we don't limit this logic to just items, we'll break re-ording macros on the bar
    if (data.type === "Item") {
      // this is async!!
      createDeltaGreenMacro(data, slot);
      // this must return false here! This stops the default logic on item drop from occuring,
      // which is a macro to open an item sheet
      return false;
    }
  });
});

Hooks.on("preCreateItem", (item) => {
  if (item.img === "icons/svg/item-bag.svg") {
    if (item.type === "bond") {
      item.updateSource({
        img: "systems/deltagreen/assets/icons/person-black-bg.svg",
      });
    } else if (item.type === "tome") {
      item.updateSource({
        img: "systems/deltagreen/assets/icons/book-cover.svg",
      });
    } else if (item.type === "ritual") {
      item.updateSource({
        img: "systems/deltagreen/assets/icons/bookmarklet.svg",
      });
    } else {
      item.updateSource({
        img: "systems/deltagreen/assets/icons/swap-bag-black-bg.svg",
      });
    }
  }
});

// Hook into the render call for the Actors Directory to add an extra button
Hooks.on("renderActorDirectory", (app, html, data) => {
  if (!game.user.isGM) {
    return;
  }

  if (html.querySelector("#statParserButton")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "statParserButton";

  const icon = document.createElement("i");

  icon.classList.add("fas", "fa-file-import");

  button.appendChild(icon);
  button.append("Delta Green Stat Block Parser");

  html.querySelector(".directory-footer").appendChild(button);

  if (button) {
    button.addEventListener("click", function (event) {
      ParseDeltaGreenStatBlock();
    });
  }
});

/**
 * We use this hook to translate the sample Typed Skill
 * Note - this event is fired on only the client who did the create action.
 */
// eslint-disable-next-line no-unused-vars
Hooks.on("preCreateActor", async (actor, creationData, options, userId) => {
  // On brand new actors, creationData only has properties: `name`, and `type`.
  // If creationData has `system` then the new actor is either duplicated or imported,
  // We only want to translate the sample Typed Skill on brand new actors,
  // thus we return early if creationData has the `system` property so we do not override anything.
  if (creationData?.system) return;

  // Only translate for actor types with a default Typed Skill (agents and NPCs)
  if (!["agent", "npc"].includes(actor.type)) return;

  // Translate the default typed skill for brand new actors.
  const artLabel = game.i18n.translations.DG?.TypeSkills?.Art ?? "Art";
  const paintingLabel =
    game.i18n.translations.DG?.TypeSkills?.Subskills?.Painting ?? "Painting";

  actor.updateSource({ "system.typedSkills.tskill_01.group": artLabel });
  actor.updateSource({ "system.typedSkills.tskill_01.label": paintingLabel });
});

// Note - this event is fired on ALL connected clients...
Hooks.on("createActor", async (actor, options, userId) => {
  try {
    // use this to trap on if this hook is firing for the same user that triggered the create
    // can put logic specific to a particular user session below
    if (userId !== game.user.id) return;
    if (actor === null) return;

    if (actor.type === "agent") {
      // throw on an unarmed strike item for convenience
      actor.AddUnarmedAttackItemIfMissing();
    } else if (actor.type === "vehicle") {
      actor.AddBaseVehicleItemsIfMissing();
    }
  } catch (ex) {
    console.log(ex);
  }
});
