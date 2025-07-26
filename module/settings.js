import DG from "./config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SettingForm = class extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor() {
    super();
  }

  static _namespace;

  static get namespace() {
    return this.constructor._namespace
  };

  static get settings() {
    return {}
  }

  static init() {
    const settings = this.settings;
    for (const setting of Object.keys(settings)) {
      game.settings.register(DG.ID, setting, {
        scope: "world",
        config: false,
        name: game.i18n.localize(`DG.Settings.${setting}.name`),
        hint: game.i18n.localize(`DG.Settings.${setting}.hint`),
        ...settings[setting],
      });
    }
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: `${DG.ID}-setting-form`,
    classes: [DG.ID, "settings-menu"],
    window: {title:  ``, resizable: true},
    position: {width: 500, height: 'auto'},
    actions: {},
    form: {
      handler: this.onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    form: { template: `systems/${DG.ID}/templates/settings.hbs` },
  }

  static async onSubmit(event, form, formData) {
    event.preventDefault();
    const data = foundry.utils.expandObject(formData.object);

    for (const key in data) {
      game.settings.set(DG.ID, key, data[key]);
    }
  }

  async _prepareContext(_options) {
    let context = await super._prepareContext(_options);
    context.settings = Object.entries(this.constructor.settings).reduce(function (obj, [key, setting]) {
      obj[key] = {
        ...setting,
        key,
        name: `DG.Settings.${key}.name`,
        hint: `DG.Settings.${key}.hint`,
        value: game.settings.get(DG.ID, key),
        isSelect: !!setting.choices,
        isNumber: setting.type === Number,
        isString: setting.type === String,
        isCheckbox: setting.type === Boolean,
      };
      return obj;
    }, {});
    return context;
  }
}

class AutomationSettings extends SettingForm {

  static _namespace = "automation";

  static get settings() {
    return {
      skillFailure: {
        default: false,
        type: Boolean,
      }
    };
  }
}

class HandlerSettings extends SettingForm {

  static _namespace = "handler";

  static get settings() {
    return {
      alwaysShowHypergeometrySectionForPlayers: {
        requiresReload: true,
        type: Boolean,
        default: false,
      },
      showImpossibleLandscapesContent: {
        requiresReload: true,
        type: Boolean,
        default: true,
      },
      keepSanityPrivate: {
        requiresReload: true,
        type: Boolean,
        default: false,
      },
      skillImprovementFormula: {
        type: String,
        choices: DG.skillImprovementFormulas,
        default: "d4",
      }
    };
  }
}

export default function registerSystemSettings() {
  game.settings.registerMenu(DG.ID, "automation", {
    name: game.i18n.localize(`DG.SettingsMenu.automation.name`),
    label: game.i18n.localize(`DG.SettingsMenu.automation.label`),
    hint: "",
    icon: "fa-solid fa-dice",
    type: AutomationSettings,
    restricted: true
  });
  AutomationSettings.init();

  game.settings.registerMenu(DG.ID, "handler", {
    name: game.i18n.localize(`DG.SettingsMenu.handler.name`),
    label: game.i18n.localize(`DG.SettingsMenu.handler.label`),
    hint: "",
    icon: "fa-solid fa-dice",
    type: HandlerSettings,
    restricted: true
  });
  HandlerSettings.init();

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
