/* eslint-disable max-classes-per-file */
import DG from "./config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SettingForm = class extends HandlebarsApplicationMixin(ApplicationV2) {
  static _namespace;

  static get namespace() {
    return this._namespace;
  }

  static get settings() {
    throw new Error("This static getter must be defined by a subclass");
  }

  static register() {
    const { settings } = this;
    for (const [settingID, setting] of Object.entries(settings)) {
      game.settings.register(DG.ID, settingID, {
        scope: "world",
        config: false,
        name: game.i18n.localize(`DG.Settings.${settingID}.name`),
        hint: game.i18n.localize(`DG.Settings.${settingID}.hint`),
        ...setting,
      });
    }
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "deltagreen-settings",
    classes: [DG.ID, "settings-menu"],
    window: { contentClasses: ["standard-form"], resizable: true },
    position: { width: 500, height: "auto" },
    actions: {},
    form: {
      handler: this.onSubmit,
      submitOnChange: false,
      closeOnSubmit: false,
    },
  };

  /** @override */
  static PARTS = {
    form: { template: `systems/${DG.ID}/templates/settings.hbs` },
    footer: { template: `systems/${DG.ID}/templates/save.hbs` },
  };

  /** @override */
  static async onSubmit(event, form, formData) {
    event.preventDefault();
    const data = foundry.utils.expandObject(formData.object);

    const settingsPromises = [];
    for (const [key, value] of Object.entries(data)) {
      settingsPromises.push(game.settings.set(DG.ID, key, value));
    }

    Promise.allSettled(settingsPromises).then((values) => {
      ui.notifications.info(game.i18n.localize("DG.Settings.Saved"));
    });
  }

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);

    const {
      createCheckboxInput,
      createNumberInput,
      createSelectInput,
      createTextInput,
      createFormGroup,
    } = foundry.applications.fields;
    context.formGroups = [];

    const { settings } = this.constructor;
    for (const settingID of Object.keys(settings)) {
      const settingConfig = game.settings.settings.get(`${DG.ID}.${settingID}`); // The setting config object, not the value.
      const inputConfig = {
        name: `${DG.ID}.${settingID}`,
        value: game.settings.get(DG.ID, settingID), // The value that the setting is currently set to.
        label: settingConfig.name,
      };

      let input;
      if (settingConfig.type === String && settingConfig.choices) {
        const choices = Object.entries(settingConfig.choices);
        const options = choices.map(([value, label]) => ({
          value,
          label,
        }));
        input = createSelectInput({
          ...inputConfig,
          options,
          localize: true,
        });
      } else if (settingConfig.type === String) {
        input = createTextInput({
          ...inputConfig,
        });
      } else if (settingConfig.type === Number) {
        input = createNumberInput({
          ...inputConfig,
          ...settingConfig.range,
        });
      } else if (settingConfig.type === Boolean) {
        input = createCheckboxInput({
          ...inputConfig,
        });
      }

      context.formGroups.push(
        createFormGroup({
          input,
          hint: settingConfig.hint,
          label: settingConfig.name,
          localize: true,
          rootId: this.options.id,
        }),
      );
    }

    return context;
  }
};

class AutomationSettings extends SettingForm {
  static _namespace = "automation";

  static DEFAULT_OPTIONS = {
    id: `${super.DEFAULT_OPTIONS.id}-${this.namespace ?? ""}`,
    window: { title: "Automation Settings" },
  };

  static get settings() {
    return {
      skillFailure: {
        default: false,
        type: Boolean,
      },
    };
  }
}

class HandlerSettings extends SettingForm {
  static _namespace = "handler";

  static DEFAULT_OPTIONS = {
    id: `${super.DEFAULT_OPTIONS.id}-${this.namespace ?? ""}`,
    window: { title: "Handler-only Settings" },
  };

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
    restricted: true,
  });
  AutomationSettings.register();

  game.settings.registerMenu(DG.ID, "handler", {
    name: game.i18n.localize(`DG.SettingsMenu.handler.name`),
    label: game.i18n.localize(`DG.SettingsMenu.handler.label`),
    hint: "",
    icon: "fa-solid fa-dice",
    type: HandlerSettings,
    restricted: true,
  });
  HandlerSettings.register();

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
