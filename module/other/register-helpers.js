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

  Handlebars.registerHelper("toLowerCase", (str) => {
    try {
      return str.toLowerCase();
    } catch (error) {
      return "";
    }
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

  Handlebars.registerHelper("if_not_eq", (a, b, opts) => {
    if (a !== b) {
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

  Handlebars.registerHelper("cite_ahb", (page) => {
    return `See page ${page} of the Agent's Handbook.`;
  });

  Handlebars.registerHelper("formatLethality", (lethality) => {
    if (lethality > 0) {
      return `${lethality.toString()}%`;
    }
    return "";
  });

  // Is this used anywhere?
  Handlebars.registerHelper(
    "getActorSkillProp",
    (actorData, skillName, prop) => {
      try {
        if (skillName !== "" && prop !== "") {
          const { skills } = actorData.data;
          const skill = skills[skillName];
          const propVal = skill[prop];
          return propVal;
        }
        return "";
      } catch (ex) {
        console.log(ex);
        return "";
      }
    },
  );

  Handlebars.registerHelper("getAvailableRollModes", () => {
    try {
      return CONFIG.Dice.rollModes;
    } catch (error) {
      return console.log(error);
    }
  });

  Handlebars.registerHelper("getDefaultRollMode", () => {
    try {
      return game.settings.get("core", "rollMode");
    } catch (error) {
      return console.log(error);
    }
  });

  Handlebars.registerHelper(
    "calculateHandToHandCombatDamageFormulaBonus",
    (strength) => {
      try {
        let bonus = "";

        if (strength.value < 5) {
          bonus = " - 2";
        } else if (strength.value < 9) {
          bonus = " - 1";
        } else if (strength.value > 12 && strength < 17) {
          bonus = " + 1";
        } else if (strength.value > 16) {
          bonus = " + 2";
        }

        return bonus;
      } catch (error) {
        return console.log(error);
      }
    },
  );

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

  Handlebars.registerHelper(
    "hideSkillBasedOnProficiencyAndUserChoice",
    (hideUntrainedSkills, proficiency) => {
      let showValue = true;

      try {
        if (hideUntrainedSkills === false) {
          showValue = true;
        } else if (proficiency > 0) {
          showValue = true;
        } else {
          showValue = false;
        }
      } catch (error) {
        console.log(error);
      }

      return showValue;
    },
  );

  // looks at system setting for what font to use and returns the class that is then used in the handlebars template that
  // generates the character sheet.
  Handlebars.registerHelper("getFontFamilySystemSettingClass", () => {
    const setting = game.settings.get("deltagreen", "characterSheetFont");

    const characterSheetStyle = game.settings.get(
      "deltagreen",
      "characterSheetStyle",
    );

    /*
    if(setting === "TypeWriterCondensed"){
      return "typewriter-condensed-font";
    }
    else if(setting === "Martel"){
      return "martel-font";
    }
    else if(setting === "Signika"){
      return "signika-font";
    }
    else if(setting === "atwriter"){
      return "atwriter-font";
    }
    else if(setting === "SpecialElite"){
      return "special-elite-font";
    }
    else if(setting === "PublicSans"){
      return "public-sans-font";
    }
    else{
      return "martel-font";
    }
    */

    /*
    if(characterSheetStyle === "cowboy"){
      return "special-elite-font";
    }
    else{
      return "public-sans-font";
    }
    */
  });

  Handlebars.registerHelper("getCharacterSheetStyle", () => {
    const characterSheetStyle = game.settings.get(
      "deltagreen",
      "characterSheetStyle",
    );

    if (characterSheetStyle === "cowboy") {
      return "cowboy-style";
    }
    if (characterSheetStyle === "outlaw") {
      return "outlaw-style";
    }
    return "program-style";
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
