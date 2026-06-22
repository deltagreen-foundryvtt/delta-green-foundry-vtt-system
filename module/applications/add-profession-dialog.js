import { BASE_TEMPLATE_PATH } from "../config/index.js";
import {
  bindDialogTabs,
  getDialogContentRoot,
  showDgDialog,
} from "./dg-dialog.js";
import {
  buildSkillDisplayRows,
  renderValidationMessagesHtml,
  updateSkillGridBody,
} from "./character-creation-ui.js";
import {
  BONUS_SKILL_COUNT,
  buildBonusSkillCatalog,
  buildCharacterCreationPayload,
  computeSkillValues,
  formatProfessionValidationMessages,
  getTypedGroupDisplayName,
  parseProfessionSkillKey,
  prepareProfessionSkillRows,
  splitProfessionSkillMap,
} from "../profession/index.js";
import { splitIntoColumns } from "../utils/skill-layout.js";
import { applySkillTooltipDisplayMode } from "../utils/skill-tooltip.js";

const CHARACTER_CREATION_OPTION_COLUMNS = 2;
const { renderTemplate } = foundry.applications.handlebars;

/**
 * @typedef {object} CharacterCreationDraft
 * @property {string[]} checkedOptionKeys
 * @property {Record<string, string>} chooseOneLabels
 * @property {string[]} bonusCatalogIds
 * @property {string[]} bonusTypedLabels
 * @property {string[]} bondNames
 * @property {string[]} bondRelationships
 */

/**
 * @param {Item} professionItem
 * @param {Actor} actor
 * @param {object} [options]
 * @param {CharacterCreationDraft} [options.draft]
 * @returns {Promise<{ outcome: 'submitted', payload: import("../profession/commit-character-creation.js").CharacterCreationPayload, draft: CharacterCreationDraft } | null>}
 */
export default async function showPickSkillsDialog(
  professionItem,
  actor,
  { draft } = {},
) {
  // eslint-disable-next-line no-use-before-define -- class defined below in this module
  const controller = new AddProfessionDialogController(professionItem, actor, {
    draft,
  });
  return controller.run();
}

class AddProfessionDialogController {
  /**
   * @param {Item} professionItem
   * @param {Actor} actor
   * @param {object} [options]
   * @param {CharacterCreationDraft} [options.draft]
   */
  constructor(professionItem, actor, { draft } = {}) {
    this.professionItem = professionItem;
    this.actor = actor;

    const { optionPicks, skills: optionSkillMap } = splitProfessionSkillMap(
      professionItem.system.optionSkills ?? {},
    );
    this.automaticSkills = { ...(professionItem.system.automaticSkills ?? {}) };
    this.automaticSkillMeta = {
      ...(professionItem.system.automaticSkillMeta ?? {}),
    };
    this.optionSkills = { ...optionSkillMap };
    this.optionSkillMeta = { ...(professionItem.system.optionSkillMeta ?? {}) };
    this.optionPicks = optionPicks;

    /** @type {Set<string>} */
    this.checkedOptionKeys = new Set(draft?.checkedOptionKeys ?? []);
    /** @type {Record<string, string>} */
    this.chooseOneLabels = { ...(draft?.chooseOneLabels ?? {}) };
    /** @type {string[]} */
    this.bonusCatalogIds = draft?.bonusCatalogIds
      ? [...draft.bonusCatalogIds]
      : Array(BONUS_SKILL_COUNT).fill("");
    /** @type {string[]} */
    this.bonusTypedLabels = draft?.bonusTypedLabels
      ? [...draft.bonusTypedLabels]
      : Array(BONUS_SKILL_COUNT).fill("");
    /** @type {string[]} */
    this.bondNames = draft?.bondNames ? [...draft.bondNames] : [];
    /** @type {string[]} */
    this.bondRelationships = draft?.bondRelationships
      ? [...draft.bondRelationships]
      : [];

    /** @type {import("foundry.applications.api.DialogV2").default | null} */
    this.dialog = null;
    /** @type {{ outcome: 'submitted', payload: import("../profession/commit-character-creation.js").CharacterCreationPayload, draft: CharacterCreationDraft } | null} */
    this.result = null;
  }

  async run() {
    const content = await this.#buildTemplate();
    this.result = null;

    return showDgDialog({
      modifier: "character-creation",
      content,
      window: {
        title: game.i18n.localize("DG.Profession.Dialog.Title"),
      },
      position: { width: 1080, height: 780 },
      form: { closeOnSubmit: false },
      onRender: async (dialog) => {
        this.dialog = dialog;
        const root = this.#contentRoot();
        if (root) {
          bindDialogTabs(root);
          applySkillTooltipDisplayMode(root);
        }
        this.#bindListeners();
        this.#restoreFormSelections();
        await this.#refreshUi();
      },
      close: () => this.result,
      buttons: [
        {
          action: "cancel",
          label: game.i18n.localize("Cancel"),
          callback: async (_event, _button, dialog) => {
            this.result = null;
            await dialog.close();
            return false;
          },
        },
        {
          action: "submit",
          label: game.i18n.localize("DG.Profession.Dialog.Submit"),
          default: true,
          disabled: true,
          callback: async () => {
            await this.#onSubmit();
            return false;
          },
        },
      ],
    });
  }

  #getFormState() {
    this.#syncFormStateFromDom();
    return {
      checkedOptionKeys: this.checkedOptionKeys,
      chooseOneLabels: { ...this.chooseOneLabels },
      bonusCatalogIds: [...this.bonusCatalogIds],
      bonusTypedLabels: [...this.bonusTypedLabels],
      bondNames: [...this.bondNames],
      bondRelationships: [...this.bondRelationships],
    };
  }

  /** @returns {CharacterCreationDraft} */
  #getDraft() {
    const formState = this.#getFormState();
    return {
      checkedOptionKeys: [...formState.checkedOptionKeys],
      chooseOneLabels: formState.chooseOneLabels,
      bonusCatalogIds: formState.bonusCatalogIds,
      bonusTypedLabels: formState.bonusTypedLabels,
      bondNames: formState.bondNames,
      bondRelationships: formState.bondRelationships,
    };
  }

  #bondCount() {
    return Math.max(
      1,
      Math.trunc(Number(this.professionItem.system.bonds) || 1),
    );
  }

  #computeContext() {
    return {
      automaticMeta: this.automaticSkillMeta,
      optionMeta: this.optionSkillMeta,
      bondCount: this.#bondCount(),
    };
  }

  #compute() {
    return computeSkillValues(
      this.automaticSkills,
      this.optionSkills,
      this.optionPicks,
      this.#getFormState(),
      this.#computeContext(),
    );
  }

  #buildAutomaticChooseOneRows() {
    return Object.entries(this.automaticSkills)
      .map(([key]) => {
        if (!this.automaticSkillMeta[key]?.chooseOne) return null;
        const ref = parseProfessionSkillKey(key);
        if (!ref || ref.kind !== "typed") return null;
        return {
          key,
          groupLabel: getTypedGroupDisplayName(ref.group),
        };
      })
      .filter(Boolean);
  }

  async #buildTemplate() {
    const computed = this.#compute();
    const chaScore =
      this.actor.system.statistics.cha.effectiveValue ??
      this.actor.system.statistics.cha.value;

    const skillRows = buildSkillDisplayRows(computed);

    const optionRows = prepareProfessionSkillRows(
      this.optionSkills,
      this.optionSkillMeta,
    ).map((row) => ({
      ...row,
      isChooseOne: Boolean(this.optionSkillMeta[row.key]?.chooseOne),
    }));
    const optionColumns = splitIntoColumns(
      optionRows,
      CHARACTER_CREATION_OPTION_COLUMNS,
    );

    const automaticChooseOneRows = this.#buildAutomaticChooseOneRows();

    const bondCount = this.#bondCount();
    const bondRows = Array.from({ length: bondCount }, (_, index) => ({
      index,
      number: index + 1,
      chaScore,
    }));

    const bonusSlots = Array.from(
      { length: BONUS_SKILL_COUNT },
      (_, index) => ({
        index,
      }),
    );

    const showSkillOptionsTab = this.optionPicks > 0;

    return renderTemplate(`${BASE_TEMPLATE_PATH}/dialog/add-profession.html`, {
      skillRows,
      showSkillOptionsTab,
      defaultTabSkillOptions: showSkillOptionsTab,
      defaultTabBonus: !showSkillOptionsTab,
      optionPicks: this.optionPicks,
      optionColumns,
      automaticChooseOneRows,
      catalog: buildBonusSkillCatalog(),
      bonusSlots,
      ...this.#getDisplayMessages(computed),
      bondRows,
    });
  }

  #contentRoot() {
    return this.dialog ? getDialogContentRoot(this.dialog) : null;
  }

  #bindListeners() {
    const root = this.#contentRoot();
    if (!root) return;

    root.querySelectorAll('[name="optionSkillChecked"]').forEach((el) => {
      el.addEventListener("change", () => this.#onOptionCheckChange(el));
    });

    root.querySelectorAll("[data-choose-one-key]").forEach((el) => {
      el.addEventListener("input", () => this.#refreshUi());
    });

    root.querySelectorAll("select[data-bonus-index]").forEach((el) => {
      el.addEventListener("change", () => this.#onBonusChange(el));
    });

    root.querySelectorAll("[data-bonus-typed-index]").forEach((el) => {
      el.addEventListener("input", () => this.#refreshUi());
    });

    for (let i = 0; i < this.#bondCount(); i++) {
      root
        .querySelector(`[name="bondName-${i}"]`)
        ?.addEventListener("input", () => this.#refreshUi());
      root
        .querySelector(`[name="bondRelationship-${i}"]`)
        ?.addEventListener("input", () => this.#refreshUi());
    }
  }

  /**
   * @param {HTMLInputElement} checkbox
   */
  #onOptionCheckChange(checkbox) {
    const key = checkbox.value;
    const isChooseOne = checkbox.dataset.isChooseOne === "true";

    if (checkbox.checked) {
      if (this.checkedOptionKeys.size >= this.optionPicks) {
        checkbox.checked = false;
        return;
      }
      this.checkedOptionKeys.add(key);
      if (isChooseOne) {
        const nameInput = this.#getOptionChooseOneInput(key);
        if (nameInput) nameInput.disabled = false;
      }
    } else {
      this.checkedOptionKeys.delete(key);
      if (isChooseOne) {
        const nameInput = this.#getOptionChooseOneInput(key);
        if (nameInput) {
          nameInput.disabled = true;
          nameInput.value = "";
        }
        delete this.chooseOneLabels[key];
      }
    }
    this.#refreshUi();
  }

  /**
   * @param {string} key
   * @returns {HTMLInputElement | null}
   */
  #getOptionChooseOneInput(key) {
    const root = this.#contentRoot();
    if (!root) return null;
    return root.querySelector(
      `[data-option-choose-one="true"][data-choose-one-key="${CSS.escape(
        key,
      )}"]`,
    );
  }

  /**
   * @param {HTMLSelectElement} select
   */
  #onBonusChange(select) {
    const index = Number(select.dataset.bonusIndex);
    this.bonusCatalogIds[index] = select.value;

    const root = this.#contentRoot();
    const typedInput = root?.querySelector(`[name="bonusTypedLabel-${index}"]`);
    const isTyped = select.value.startsWith("typed:");
    if (typedInput) {
      typedInput.classList.toggle("hidden", !isTyped);
      if (!isTyped) {
        typedInput.value = "";
        this.bonusTypedLabels[index] = "";
      }
    }
    this.#syncFormStateFromDom();
    this.#refreshUi();
  }

  #syncFormStateFromDom() {
    const root = this.#contentRoot();
    if (!root) return;

    root.querySelectorAll("[data-choose-one-key]").forEach((input) => {
      const key = input.dataset.chooseOneKey;
      if (key) this.chooseOneLabels[key] = input.value;
    });

    for (let i = 0; i < BONUS_SKILL_COUNT; i++) {
      const select = root.querySelector(`[name="bonusSkill-${i}"]`);
      this.bonusCatalogIds[i] = select?.value ?? "";
      const typedInput = root.querySelector(`[name="bonusTypedLabel-${i}"]`);
      this.bonusTypedLabels[i] = typedInput?.value ?? "";
    }

    const bondCount = this.#bondCount();
    this.bondNames.length = bondCount;
    this.bondRelationships.length = bondCount;
    for (let i = 0; i < bondCount; i++) {
      this.bondNames[i] =
        root.querySelector(`[name="bondName-${i}"]`)?.value ?? "";
      this.bondRelationships[i] =
        root.querySelector(`[name="bondRelationship-${i}"]`)?.value ?? "";
    }
  }

  #restoreFormSelections() {
    const root = this.#contentRoot();
    if (!root) return;

    for (const key of this.checkedOptionKeys) {
      const cb = root.querySelector(
        `[name="optionSkillChecked"][value="${CSS.escape(key)}"]`,
      );
      if (cb) cb.checked = true;
      if (this.optionSkillMeta[key]?.chooseOne) {
        const nameInput = this.#getOptionChooseOneInput(key);
        if (nameInput) {
          nameInput.disabled = false;
          nameInput.value = this.chooseOneLabels[key] ?? "";
        }
      }
    }

    for (const row of this.#buildAutomaticChooseOneRows()) {
      const nameInput = root.querySelector(
        `.character-creation-choose-one-section [data-choose-one-key="${CSS.escape(
          row.key,
        )}"]`,
      );
      if (nameInput) nameInput.value = this.chooseOneLabels[row.key] ?? "";
    }

    for (let i = 0; i < BONUS_SKILL_COUNT; i++) {
      const select = root.querySelector(`[name="bonusSkill-${i}"]`);
      if (select) select.value = this.bonusCatalogIds[i] ?? "";
      const typedInput = root.querySelector(`[name="bonusTypedLabel-${i}"]`);
      const isTyped = (this.bonusCatalogIds[i] ?? "").startsWith("typed:");
      if (typedInput) {
        typedInput.classList.toggle("hidden", !isTyped);
        typedInput.value = this.bonusTypedLabels[i] ?? "";
      }
    }

    for (let i = 0; i < this.#bondCount(); i++) {
      const nameInput = root.querySelector(`[name="bondName-${i}"]`);
      if (nameInput) nameInput.value = this.bondNames[i] ?? "";
      const relInput = root.querySelector(`[name="bondRelationship-${i}"]`);
      if (relInput) relInput.value = this.bondRelationships[i] ?? "";
    }
  }

  /**
   * @param {ReturnType<computeSkillValues>} computed
   */
  #getDisplayMessages(computed) {
    const wastePrefix = "bonusWaste:";
    const mainErrors = computed.validationErrors.filter(
      (code) => !code.startsWith(wastePrefix),
    );
    const wasteErrors = computed.validationErrors.filter((code) =>
      code.startsWith(wastePrefix),
    );

    return {
      validationMessages: formatProfessionValidationMessages(mainErrors, {
        optionPicks: this.optionPicks,
      }),
      capWarnings: computed.capWarnings.map((w) => ({
        warning: game.i18n.format("DG.Profession.Dialog.CapWarning", {
          skill: w.label,
          attempted: w.attempted,
          waste: w.waste,
        }),
      })),
      wasteMessages: formatProfessionValidationMessages(wasteErrors, {
        optionPicks: this.optionPicks,
      }),
    };
  }

  /**
   * @param {ReturnType<computeSkillValues>} computed
   * @returns {string}
   */
  #buildMessagesHtml(computed) {
    const { validationMessages, capWarnings, wasteMessages } =
      this.#getDisplayMessages(computed);

    const capHtml = capWarnings
      .map(
        (w) =>
          `<p class="dg-dialog__message--warning">${foundry.utils.escapeHTML(
            w.warning,
          )}</p>`,
      )
      .join("");

    return (
      renderValidationMessagesHtml(validationMessages) +
      capHtml +
      renderValidationMessagesHtml(wasteMessages)
    );
  }

  async #refreshUi() {
    const root = this.#contentRoot();
    if (!root) return;

    this.#syncFormStateFromDom();

    const computed = this.#compute();
    const rows = buildSkillDisplayRows(computed);

    updateSkillGridBody(
      root.querySelector("[data-profession-skills-body]"),
      rows,
    );

    const messagesEl = root.querySelector("[data-profession-messages]");
    if (messagesEl) {
      messagesEl.innerHTML = this.#buildMessagesHtml(computed);
    }

    const submitBtn = this.dialog?.element?.querySelector(
      'button[data-action="submit"]',
    );
    if (submitBtn) submitBtn.disabled = !computed.isValid;
  }

  async #onSubmit() {
    this.#syncFormStateFromDom();
    const computed = this.#compute();
    if (!computed.isValid) return;

    const draft = this.#getDraft();
    this.result = {
      outcome: "submitted",
      payload: buildCharacterCreationPayload(computed, this.professionItem, {
        bondNames: this.bondNames,
        bondRelationships: this.bondRelationships,
      }),
      draft,
    };
    await this.dialog?.close();
  }
}
