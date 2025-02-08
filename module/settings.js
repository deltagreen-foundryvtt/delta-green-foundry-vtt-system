export default function registerSystemSettings() {
  game.settings.register("deltagreen", "characterSheetStyle", {
    name: "Character Sheet Style",
    hint: "Choose how actor sheets should be styled. 'Program' is a more modern government style, where 'Cowboy/Outlaw' is an older, grittier looking typewriter style.",
    scope: "world", // This specifies a world-stored setting
    config: true, // This specifies that the setting appears in the configuration view
    requiresReload: true,
    type: String,
    choices: {
      // If choices are defined, the resulting setting will be a select menu
      cowboy: "The Cowboys",
      outlaw: "The Outlaws",
      program: "The Program",
    },
    default: "program", // The default value for the setting
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      // console.log(value)
    },
  });

  game.settings.register("deltagreen", "sortSkills", {
    name: "Sort Skills By Column?",
    hint: "Checked sorts by column. Unchecked sorts by row.",
    scope: "client",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("deltagreen", "keepSanityPrivate", {
    name: "Keep Sanity Private",
    hint: "Hide sanity from players on both character sheet and rolls.",
    scope: "world",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("deltagreen", "skillImprovementFormula", {
    name: "Default Skill Improvement Roll",
    hint: " Default 1d4. There have been multiple errata on this, choose which fits best for the pace of your game.",
    scope: "world", // This specifies a world-stored setting
    config: true, // This specifies that the setting appears in the configuration view
    type: String,
    choices: {
      // If choices are defined, the resulting setting will be a select menu
      1: "Flat +1",
      "1d3": "+1D3%",
      "1d4": "+1D4%",
      "1d4-1": "+1D4-1%",
    },
    default: "1d4", // The default value for the setting, per the most recent errata.
    onChange: (value) => {
      // A callback function which triggers when the setting is changed
      // console.log(value)
    },
  });

  game.settings.register(
    "deltagreen",
    "alwaysShowHypergeometrySectionForPlayers",
    {
      name: "Always Show Hypergeometry Section for Players",
      hint: "Always show Hypergeometry item section for players, even if they don't have any items of that type.",
      scope: "world",
      config: true,
      requiresReload: true,
      type: Boolean,
      default: false,
    }
  );

  game.settings.register("deltagreen", "showImpossibleLandscapesContent", {
    name: "Show Impossible Landscapes Content",
    hint: "Show Impossible Landscapes-specific fields from character sheets.",
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
