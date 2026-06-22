import DGSheetMixin from "./base-sheet.js";
import composeMixins from "./mixins/compose-mixins.js";
import ItemListMixin from "./mixins/item-list-mixin.js";
import RollSheetMixin from "./mixins/roll-sheet-mixin.js";
import SkillPrepMixin from "./mixins/skill-prep-mixin.js";
import SpecialTrainingMixin from "./mixins/special-training-mixin.js";
import TypedSkillMixin from "./mixins/typed-skill-mixin.js";
import AeInputMixin from "./mixins/ae-input-mixin.js";

const { ActorSheetV2 } = foundry.applications.sheets;

const ComposedActorSheetBase = composeMixins(
  AeInputMixin,
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

  /** Gear tab section partials shared by NPC/unnatural/vehicle gear tabs and agent combat tab. */
  static get GEAR_SECTION_PARTIALS() {
    return [
      `${this.TEMPLATE_PATH}/partials/weapons-section-partial.html`,
      `${this.TEMPLATE_PATH}/partials/armor-section-partial.html`,
      `${this.TEMPLATE_PATH}/partials/other-gear-section-partial.html`,
    ];
  }

  /**
   * Base/shared sheet parts for subclasses.
   * ApplicationV2: every template referenced via {@code {{> "path"}}} in a PART's render
   * tree must be listed in that PART's {@code templates} array.
   */
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
      templates: this.GEAR_SECTION_PARTIALS,
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
    if (this.actor.type !== "agent") {
      this._sortCustomSkills();
    }

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
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._setRightClickListeners();
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
    this._bindAeBackedInputs(element);
  }
}
