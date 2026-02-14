// Import Modules
import DG from "./config.js";
import DeltaGreenActor from "./actor/actor.js";
import DGAgentSheet from "./sheets/agent-sheet.js";
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
import { handleInlineActions } from "./other/inline.js";
import DGNPCSheet from "./sheets/npc-sheet.js";
import DGUnnaturalSheet from "./sheets/unnatural-sheet.js";
import DGVehicleSheet from "./sheets/vehicle-sheet.js";
import DGAgentSheetV2 from "./sheets/agent-sheet-v2.js";
import AgentData from "./data/actor/agent.js";
import UnnaturalData from "./data/actor/unnatural.js";
import NPCData from "./data/actor/npc.js";
import VehicleData from "./data/actor/vehicle.js";

const { Actors, Items } = foundry.documents.collections;

Hooks.once("init", async () => {
  Object.assign(CONFIG.Actor.dataModels, {
    // The keys are the types defined in our template.json
    agent: AgentData,
    unnatural: UnnaturalData,
    npc: NPCData,
    vehicle: VehicleData,
  });

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

  // Unregister core sheets.
  Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);

  // Register all actor sheets.
  const sheetClassMap = {
    agent: DGAgentSheet,
    npc: DGNPCSheet,
    unnatural: DGUnnaturalSheet,
    vehicle: DGVehicleSheet,
  };
  Object.entries(sheetClassMap).forEach(([actorType, SheetClass]) => {
    Actors.registerSheet(DG.ID, SheetClass, {
      makeDefault: true,
      themes: null,
      label: `DG.Sheet.class.${actorType}`,
      types: [actorType],
    });
  });

  Actors.registerSheet(DG.ID, DGAgentSheetV2, {
    makeDefault: false,
    themes: null,
    label: `Agent Sheet V2`,
    types: ["agent"],
  });

  // Register item sheet.
  Items.registerSheet(DG.ID, DeltaGreenItemSheet, {
    makeDefault: true,
    label: "DG.Sheet.class.item",
    themes: null,
  });

  // Preload Handlebars Templates
  preloadHandlebarsTemplates();

  // Add Handlebars helpers
  registerHandlebarsHelpers();
});

Hooks.once("ready", async () => {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  // TODO: Fix eslint issue on next line
  // eslint-disable-next-line consistent-return
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

Hooks.on("renderGamePause", function (_, html, options) {
  if (options.cssClass !== "paused") return;

  try {
    const gamePausedOverrideText = game.i18n.translations.DG.MissionPaused;

    if (typeof gamePausedOverrideText === "undefined") {
      return;
    }

    html.querySelector("figcaption").textContent = gamePausedOverrideText;
    html.querySelector("img").classList.remove("fa-spin"); // I don't like the logo spinning personally
  } catch {
    // noop
  }
});

function addEventListenerToChatMessage(element) {
  element.addEventListener("click", (event) => {
    const btnWithAction = event.target.closest("button[data-action]");
    const message = event.target.closest("li[data-message-id]");

    const { messageId } = message?.dataset || {};
    if (btnWithAction && messageId) {
      handleInlineActions(btnWithAction, messageId);
    }
  });
}

Hooks.on("renderChatLog", async (app, element) => {
  addEventListenerToChatMessage(element);
});

Hooks.on("renderChatMessageHTML", async (app, element, context) => {
  // ignore non chat card notifications
  if (!context.canClose) return;
  addEventListenerToChatMessage(element);
});
