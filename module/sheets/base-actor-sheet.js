import DGSheetMixin from "./base-sheet.js";
import composeMixins from "./mixins/compose-mixins.js";
import ItemListMixin from "./mixins/item-list-mixin.js";
import RollSheetMixin from "./mixins/roll-sheet-mixin.js";
import SkillPrepMixin from "./mixins/skill-prep-mixin.js";
import SpecialTrainingMixin from "./mixins/special-training-mixin.js";
import TypedSkillMixin from "./mixins/typed-skill-mixin.js";

const { ActorSheetV2 } = foundry.applications.sheets;

const ComposedActorSheetBase = composeMixins(
  SpecialTrainingMixin,
  TypedSkillMixin,
  ItemListMixin,
  SkillPrepMixin,
  RollSheetMixin,
  DGSheetMixin,
)(ActorSheetV2);

/** @extends {ComposedActorSheetBase} */
export default class DGActorSheet extends ComposedActorSheetBase {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    position: { width: 750, height: 770 },
    actions: {
      itemAction: this._onItemAction,
      typedSkillAction: this._onTypedSkillAction,
      specialTrainingAction: this._onSpecialTrainingAction,
      roll: this._onRoll,
      rollLuck: this._onRollLuck,
      toggle: this._toggleGeneric,
      toggleItemSortMode: this._toggleItemSortMode,
      browsePack: this._browsePack,
    },
  });

  /** @override - Singular reference to the actor templates path */
  static TEMPLATE_PATH = /** @type {const} */ (`${super.TEMPLATE_PATH}/actor`);

  /** Holds base/shared parts of sheets for subclasses to reference. */
  static BASE_PARTS = /** @type {const} */ ({
    header: {
      template: `${this.TEMPLATE_PATH}/parts/header.html`,
      templates: [
        `${this.TEMPLATE_PATH}/partials/health-partial.html`,
        `${this.TEMPLATE_PATH}/partials/willpower-partial.html`,
        `${this.TEMPLATE_PATH}/partials/sanity-partial.html`,
      ],
    },
    tabs: {
      template: `templates/generic/tab-navigation.hbs`,
    },
    skills: {
      template: `${this.TEMPLATE_PATH}/parts/skills-tab.html`,
      templates: [
        `${this.TEMPLATE_PATH}/partials/custom-skills-partial.html`,
        `${this.TEMPLATE_PATH}/partials/notes-partial.html`,
      ],
      scrollable: [""],
    },
    gear: {
      template: `${this.TEMPLATE_PATH}/parts/gear-tab.html`,
      scrollable: [""],
    },
    about: {
      template: `${this.TEMPLATE_PATH}/parts/about-tab.html`,
      scrollable: [""],
    },
  });

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    this._prepareCharacterItems(context);

    context.showHyperGeometrySection = this.shouldShowHyperGeometrySection(
      this.actor,
    );

    context.subnameInfoPlaceholder = this._prepareSubnameInfoPlaceholder();

    if (this.actor.type === "vehicle") return context;

    this._sortSkills();
    this._sortCustomSkills();

    context.skillTooltipDisplay = game.settings.get(
      "deltagreen",
      "skillTooltipDisplay",
    );

    if (context.skillTooltipDisplay !== "never") {
      this._prepareSkillTooltips();
    }

    const keepSanityPrivate = game.settings.get(
      "deltagreen",
      "keepSanityPrivate",
    );
    const hideSan = keepSanityPrivate && !game.user.isGM;

    context.maxSan = hideSan ? "???" : this.actor.system.sanity.max;
    context.currentSan = hideSan ? "???" : this.actor.system.sanity.value;
    context.keepSanityPrivate = keepSanityPrivate;

    context.sanityInputs = await foundry.applications.handlebars.renderTemplate(
      `${DGActorSheet.TEMPLATE_PATH}/partials/sanity-${this.actor.type}.html`,
      context,
    );

    context.physicalAttributesTitle = game.i18n.localize(
      "DG.Sheet.BlockHeaders.Statistics",
    );

    context.showNotesInSkills = this.actor.type !== "agent";

    return context;
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    if (!this.actor.limited) return;

    options.parts = ["header"];

    if (this.actor.type === "agent") options.parts.push("tabs", "bio");
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._setRightClickListeners();
  }

  /** @override */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);

    if (!this.actor.limited || this.actor.type !== "agent") return tabs;

    return { bio: { ...tabs.bio, active: true, cssClass: "active" } };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const { element } = this;

    if (this.actor.limited) {
      this.setPosition({ height: "auto" });
      this.setPosition({ height: Number.parseInt(this.element.style.height) });
    }

    this._setupItemDragListeners();
    this._tooltipsSettings(element);
  }

  /** @override */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    controls.push({
      action: "rollLuck",
      label: "DG.RollLuck",
      icon: "fas fa-dice",
    });
    return controls;
  }
}
