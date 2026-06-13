import { getDisorderLabel } from "../profession/disorders.js";
import DGUtils from "./utility-functions.js";

export default function registerHandlebarsHelpers() {
  // Add Handlebars helpers
  Handlebars.registerHelper("localizeWithFallback", (value, fallbackValue) => {
    return DGUtils.localizeWithFallback(value, fallbackValue);
  });

  Handlebars.registerHelper("concat", (...args) => {
    let outStr = "";
    for (const arg in args) {
      if (typeof args[arg] !== "object") {
        outStr += args[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper("toUpperCase", (str) => {
    try {
      return str.toUpperCase();
    } catch (error) {
      return "";
    }
  });

  Handlebars.registerHelper("if_eq", (a, b, opts) => {
    if (a === b) {
      return opts.fn(this);
    }
    return opts.inverse(this);
  });

  Handlebars.registerHelper("if_gt", (a, b, trueVal, falseVal) => {
    if (a > b) {
      return trueVal;
    }
    return falseVal;
  });

  /** Roll visibility modes for dialog selects (v14+ CONFIG.ChatMessage.modes keys). */
  const ROLL_MESSAGE_MODE_KEYS = ["public", "gm", "blind", "self"];

  Handlebars.registerHelper("getAvailableRollModes", () => {
    try {
      return Object.fromEntries(
        ROLL_MESSAGE_MODE_KEYS.filter(
          (key) => key in CONFIG.ChatMessage.modes,
        ).map((key) => [key, CONFIG.ChatMessage.modes[key]]),
      );
    } catch (error) {
      return console.log(error);
    }
  });

  Handlebars.registerHelper("getDefaultRollMode", () => {
    try {
      return game.settings.get("core", "messageMode");
    } catch (error) {
      return console.log(error);
    }
  });

  Handlebars.registerHelper("localizeWeaponSkill", (skill) => {
    let label = skill;

    try {
      if (skill === "dex") {
        label = game.i18n.localize("DG.Attributes.dex");
      }
      if (skill === "DG.Skills.custom") {
        label = game.i18n.localize("DG.ItemWindow.Custom");
      } else {
        label = game.i18n.localize(`DG.Skills.${skill}`);
      }
    } catch (error) {
      console.log(error);
    }

    return label;
  });

  Handlebars.registerHelper("keepSanityPrivate", () => {
    let setting = false;

    try {
      setting = game.settings.get("deltagreen", "keepSanityPrivate");

      if (game.user.isGM) {
        setting = false;
      }
    } catch (ex) {
      setting = false;
    }

    return setting;
  });

  Handlebars.registerHelper("playerHasGamemasterPrivileges", () => {
    return game.user.isGM;
  });

  Handlebars.registerHelper("dgDisorderLabel", (value) => {
    try {
      return getDisorderLabel(value);
    } catch {
      return value ?? "";
    }
  });

  Handlebars.registerHelper("showImpossibleLandscapesContent", () => {
    let result = false;
    const setting = game.settings.get(
      "deltagreen",
      "showImpossibleLandscapesContent",
    );

    if (game.user.isGM === true && setting === true) {
      result = true;
    }

    return result;
  });
}
