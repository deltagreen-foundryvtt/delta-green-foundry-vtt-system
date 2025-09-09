/* eslint-disable max-classes-per-file */
import DG, { BASE_TEMPLATE_PATH } from "./config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base class for all setting forms.
 *
 * Note: This class is abstract and should not be instantiated directly.
 *
 * @extends {ApplicationV2}
 */
const SettingForm = class extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {"automation"|"handler"|null} */
  static _namespace = null;

  /**
   * The namespace for the settings defined by this class. This is necessary
   * to register the settings with the game.
   *
   * @returns {string}
   */
  static get namespace() {
    return this._namespace;
  }

  /**
   * A getter that returns an object with all the settings defined by the subclass.
   * Used to register settings with the game.
   *
   * @abstract
   * @returns {object} An object with all the settings defined by the subclass
   * @throws Will throw an error if this method is not defined by a subclass.
   */
  static get settings() {
    throw new Error("This static getter must be defined by a subclass");
  }

  /**
   * Registers the settings for each defined SettingForm subclass.
   * @returns {void}
   */
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
    id: "dg-settings",
    classes: [DG.ID, "settings-menu"],
    window: { contentClasses: ["standard-form"], resizable: true },
    position: { width: 500, height: "auto" },
    actions: {},
    form: {
      handler: this.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    footer: { template: `${BASE_TEMPLATE_PATH}/save.hbs` },
  };

  /** @override */
  static async onSubmit(event, form, formData) {
    event.preventDefault();
    // Get form data into a standard object.
    const data = foundry.utils.expandObject(formData.object);

    const settingsPromises = [];
    // Set each setting with the new value, if any.
    for (const [key, value] of Object.entries(data[DG.ID])) {
      settingsPromises.push(game.settings.set(DG.ID, key, value));
    }

    // Once all promises resolve, show a notification.
    Promise.allSettled(settingsPromises).then((values) => {
      ui.notifications.info(game.i18n.localize("DG.Settings.Saved"));
    });
  }

  /** @override */
  _onFirstRender(options) {
    super._onFirstRender(options);

    this._attachFormGroupHTML();
  }

  /**
   * Populate the window content section with form groups representing the settings.
   * @returns {void}
   */
  _attachFormGroupHTML() {
    const windowContent = this.element.querySelector("section.window-content");
    const formGroupString = this._prepareFormGroupElements()
      .map((formGroup) => formGroup.outerHTML)
      .join("");

    // Create a div element whose inner html is the form groups (as a string of HTML),
    // and prepend it to the window content.
    const div = document.createElement("div");
    div.classList.add("flexcol");
    div.innerHTML = formGroupString;
    windowContent.prepend(div);
  }

  /**
   * Generates an array of form groups, each corresponding to a setting in a menu.
   * @returns {HTMLDivElement[]} An array of form group HTML elements.
   */
  _prepareFormGroupElements() {
    // Get Foundry's built-in input creation functions.
    const {
      createCheckboxInput,
      createNumberInput,
      createSelectInput,
      createTextInput,
      createFormGroup,
    } = foundry.applications.fields;
    const formGroups = [];

    // Iterate over each setting and create the appropriate input element.
    const { settings } = this.constructor;
    for (const settingID of Object.keys(settings)) {
      // The setting config object, not the value of the setting itself.
      const settingConfig = game.settings.settings.get(`${DG.ID}.${settingID}`);

      // Default input settings.
      const inputConfig = {
        name: `${DG.ID}.${settingID}`,
        value: game.settings.get(DG.ID, settingID), // The value that the setting is currently set to.
        label: settingConfig.name,
      };

      // Use Foundry's built-in <input>/<select> creation functions.
      let input;
      if (settingConfig.type === String && settingConfig.choices) {
        // Select Input
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
        // Text Input
        input = createTextInput({
          ...inputConfig,
        });
      } else if (settingConfig.type === Number) {
        // Number Input
        input = createNumberInput({
          ...inputConfig,
          ...settingConfig.range,
        });
      } else if (settingConfig.type === Boolean) {
        // Checkbox
        input = createCheckboxInput({
          ...inputConfig,
        });
      }

      // Create a Form Group, which generates all of the HTML for a single setting.
      // It includes a label and hint.
      formGroups.push(
        createFormGroup({
          input,
          hint: settingConfig.hint,
          label: settingConfig.name,
          localize: true,
          rootId: this.options.id,
        }),
      );
    }

    return formGroups;
  }
};

/**
 * Defines the Automation Settings form.
 *
 * @extends {SettingForm}
 */
class AutomationSettings extends SettingForm {
  /** @override */
  static _namespace = "automation";

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${super.DEFAULT_OPTIONS.id}-${this.namespace ?? ""}`,
    window: { title: "DG.SettingsMenu.automation.title" },
  };

  /** @override */
  static get settings() {
    return {
      skillFailure: {
        default: false,
        type: Boolean,
      },
    };
  }
}

/**
 * Defines the Handler-only Settings form.
 *
 * @extends {SettingForm}
 */
class HandlerSettings extends SettingForm {
  /** @override */
  static _namespace = "handler";

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${super.DEFAULT_OPTIONS.id}-${this.namespace ?? ""}`,
    window: { title: "DG.SettingsMenu.handler.title" },
  };

  /** @override */
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
      },
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
