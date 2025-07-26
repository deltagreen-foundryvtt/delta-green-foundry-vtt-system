import DG from "./config.js";

export default function registerSystemSettings() {
  game.settings.register("deltagreen", "characterSheetStyle", {
    name: game.i18n.localize("DG.Settings.charactersheet.name"),
    hint: game.i18n.localize("DG.Settings.charactersheet.hint"),
    scope: "world", // This specifies a world-stored setting
    config: true, // This specifies that the setting appears in the configuration view
    requiresReload: true,
    type: String,
    choices: {
      // If choices are defined, the resulting setting will be a select menu
      cowboy: game.i18n.localize("DG.Settings.charactersheet.cowboys"),
      outlaw: game.i18n.localize("DG.Settings.charactersheet.outlaws"),
      program: game.i18n.localize("DG.Settings.charactersheet.program"),
    },
    default: "program", // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      // console.log(value)
    },
  });

  game.settings.register("deltagreen", "sortSkills", {
    name: game.i18n.localize("DG.Settings.sortskills.name"),
    hint: game.i18n.localize("DG.Settings.sortskills.hint"),
    scope: "client",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("deltagreen", "keepSanityPrivate", {
    name: game.i18n.localize("DG.Settings.sanityprivate.name"),
    hint: game.i18n.localize("DG.Settings.sanityprivate.hint"),
    scope: "world",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("deltagreen", "skillImprovementFormula", {
    name: game.i18n.localize("DG.Settings.improvementroll.name"),
    hint: game.i18n.localize("DG.Settings.improvementroll.hint"),
    scope: "world", // This specifies a world-stored setting
    config: true, // This specifies that the setting appears in the configuration view
    type: String,
    choices: DG.skillImprovementFormulas,
    default: "d4", // The default value for the setting, per the most recent errata.
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      // console.log(value)
    },
  });

  game.settings.register(
    "deltagreen",
    "alwaysShowHypergeometrySectionForPlayers",
    {
      name: game.i18n.localize("DG.Settings.hypergeometry.name"),
      hint: game.i18n.localize("DG.Settings.hypergeometry.hint"),
      scope: "world",
      config: true,
      requiresReload: true,
      type: Boolean,
      default: false,
    },
  );

  game.settings.register("deltagreen", "showImpossibleLandscapesContent", {
    name: game.i18n.localize("DG.Settings.landscapes.name"),
    hint: game.i18n.localize("DG.Settings.landscapes.hint"),
    scope: "world",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: true,
  });

  // obsolete - will be removed at some point
  game.settings.register("deltagreen", "characterSheetFont", {
    name: "World Font Choice",
    hint: "Choose font style for use throughout this world.",
    scope: "world", // This specifies a world-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    choices: {
      // If choices are defined, the resulting setting will be a select menu
      SpecialElite: "Special Elite (Classic Typewriters Font)",
      Martel: "Martel (Clean Modern Font)",
      Signika: "Signika (Foundry Default Font)",
      TypeWriterCondensed:
        "Condensed Typewriter (Modern, Small Typewriter Font)",
      PublicSans: "Public Sans (US Government-style sans serif font)",
      // "atwriter": "Another Typewriter (Alternate Old-style Typewriter Font)"
    },
    default: "SpecialElite", // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      // console.log(value)
    },
  });

  // obsolete - will be removed at some point
  game.settings.register("deltagreen", "characterSheetBackgroundImageSetting", {
    name: "World Sheet Background Image",
    hint: "Choose background image for use throughout this world. (Refresh page to see change.)",
    scope: "world", // This specifies a world-stored setting
    config: false, // This specifies that the setting appears in the configuration view
    type: String,
    choices: {
      // If choices are defined, the resulting setting will be a select menu
      OldPaper1: "Old Dirty Paper (Good with Special Elite Font)",
      IvoryPaper: "Ivory White Paper (Good with Martel Font)",
      DefaultParchment: "Default Parchment (Good with Signika Font)",
    },
    default: "OldPaper1", // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      // console.log(value)
    },
  });
}
