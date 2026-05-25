import { BASE_TEMPLATE_PATH } from "../config.js";
import {
  BONUS_SKILL_COUNT,
  buildSkillCatalog,
  buildSortedFixedSkillRows,
  buildSortedTypedSkillRows,
  computeSkillValues,
  formatProfessionValidationMessages,
  getTypedGroupDisplayName,
  parseProfessionSkillKey,
  prepareProfessionSkillRows,
  splitProfessionSkillMap,
} from "../utils/profession-skills.js";
import { reorderForColumnSorting } from "../utils/skill-layout.js";

const { DialogV2 } = foundry.applications.api;
const ADD_PROFESSION_SKILL_COLUMNS = 4;
const { renderTemplate } = foundry.applications.handlebars;

/**
 * @param {Item} professionItem
 * @param {Actor} actor
 * @returns {Promise<boolean>}
 */
export async function showPickSkillsDialog(professionItem, actor) {
  // eslint-disable-next-line no-use-before-define -- class defined below in this module
  const controller = new AddProfessionDialogController(professionItem, actor);
  return controller.run();
}

/**
 * @param {{ sortLabel: string, rowId: string, label: string, value: number, isModified: boolean }[]} rows
 * @returns {{ rowId: string, label: string, value: number, isModified: boolean }[]}
 */
function orderSkillRowsForDisplay(rows) {
  const sorted = [...rows].sort((a, b) =>
    a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
  );

  const ordered = game.settings.get("deltagreen", "sortSkills")
    ? reorderForColumnSorting(sorted, ADD_PROFESSION_SKILL_COLUMNS)
    : sorted;

  return ordered.map(({ rowId, label, value, isModified }) => ({
    rowId,
    label,
    value,
    isModified: Boolean(isModified),
  }));
}

class AddProfessionDialogController {
  /**
   * @param {Item} professionItem
   * @param {Actor} actor
   */
  constructor(professionItem, actor) {
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
    this.checkedOptionKeys = new Set();
    /** @type {Record<string, string>} */
    this.chooseOneLabels = {};
    /** @type {string[]} */
    this.bonusCatalogIds = Array(BONUS_SKILL_COUNT).fill("");
    /** @type {string[]} */
    this.bonusTypedLabels = Array(BONUS_SKILL_COUNT).fill("");
    /** @type {string[]} */
    this.bondNames = [];
    /** @type {string[]} */
    this.bondRelationships = [];

    /** @type {DialogV2 | null} */
    this.dialog = null;
    this.submitted = false;
  }

  /**
   * @returns {Promise<boolean>}
   */
  async run() {
    const content = await this.#buildTemplate();
    this.submitted = false;

    return DialogV2.wait({
      content,
      window: {
        title: game.i18n.localize("DG.Profession.Dialog.Title"),
      },
      position: { width: 960 },
      classes: ["add-profession-dialog-app"],
      form: { closeOnSubmit: false },
      render: async (_event, dialog) => {
        this.dialog = dialog;
        this.#bindListeners();
        await this.#refreshUi();
      },
      close: () => this.submitted,
      buttons: [
        {
          action: "cancel",
          label: game.i18n.localize("Cancel"),
          callback: async (_event, _button, dialog) => {
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

  #bondCount() {
    return Number(this.professionItem.system.bonds) || 0;
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

  /**
   * @param {ReturnType<computeSkillValues>} computed
   * @returns {{ rowId: string, label: string, value: number }[]}
   */
  #buildSkillDisplayRows(computed) {
    const modifiedFixed = new Set(computed.modifiedFixedKeys ?? []);
    const modifiedTyped = new Set(computed.modifiedTypedKeys ?? []);
    const fixedRows = buildSortedFixedSkillRows(computed.fixedValues);
    const typedRows = buildSortedTypedSkillRows(computed.typedValues);
    return orderSkillRowsForDisplay([
      ...fixedRows.map((r) => ({
        rowId: r.key,
        label: r.label,
        value: r.value,
        sortLabel: r.sortLabel,
        isModified: modifiedFixed.has(r.key),
      })),
      ...typedRows.map((r) => ({
        rowId: r.storageKey,
        label: r.label,
        value: r.value,
        sortLabel: r.sortLabel,
        isModified: modifiedTyped.has(r.storageKey),
      })),
    ]);
  }

  async #buildTemplate() {
    const computed = this.#compute();
    const chaScore =
      this.actor.system.statistics.cha.effectiveValue ??
      this.actor.system.statistics.cha.value;

    const skillRows = this.#buildSkillDisplayRows(computed);

    const optionRows = prepareProfessionSkillRows(
      this.optionSkills,
      this.optionSkillMeta,
    ).map((row) => ({
      ...row,
      isChooseOne: Boolean(this.optionSkillMeta[row.key]?.chooseOne),
    }));

    const automaticChooseOneRows = this.#buildAutomaticChooseOneRows();

    const capWarnings = computed.capWarnings.map((w) => ({
      warning: game.i18n.format("DG.Profession.Dialog.CapWarning", {
        skill: w.label,
        attempted: w.attempted,
        waste: w.waste,
      }),
    }));

    const bondCount = Number(this.professionItem.system.bonds) || 0;
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

    return renderTemplate(`${BASE_TEMPLATE_PATH}/dialog/add-profession.html`, {
      skillRows,
      showOptionSkills: this.optionPicks > 0,
      optionPicks: this.optionPicks,
      optionRows,
      automaticChooseOneRows,
      catalog: buildSkillCatalog(),
      bonusSlots,
      validationMessages: formatProfessionValidationMessages(
        computed.validationErrors,
        { optionPicks: this.optionPicks },
      ),
      capWarnings,
      bondCount,
      bondRows,
    });
  }

  #contentRoot() {
    return this.dialog?.element?.querySelector(".dialog-content");
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
    const root = this.#contentRoot();

    if (checkbox.checked) {
      if (this.checkedOptionKeys.size >= this.optionPicks) {
        checkbox.checked = false;
        return;
      }
      this.checkedOptionKeys.add(key);
      if (isChooseOne && root) {
        const nameInput = root.querySelector(
          `[data-choose-one-key="${CSS.escape(key)}"]`,
        );
        if (nameInput) nameInput.disabled = false;
      }
    } else {
      this.checkedOptionKeys.delete(key);
      if (isChooseOne && root) {
        const nameInput = root.querySelector(
          `[data-choose-one-key="${CSS.escape(key)}"]`,
        );
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
      if (!this.optionSkillMeta[key]?.chooseOne) continue;
      const nameInput = root.querySelector(
        `[data-choose-one-key="${CSS.escape(key)}"]`,
      );
      if (nameInput) {
        nameInput.disabled = false;
        nameInput.value = this.chooseOneLabels[key] ?? "";
      }
    }

    for (const row of this.#buildAutomaticChooseOneRows()) {
      const nameInput = root.querySelector(
        `[data-choose-one-key="${CSS.escape(row.key)}"]`,
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
  }

  /**
   * @param {ReturnType<computeSkillValues>} computed
   * @returns {string}
   */
  #buildMessagesHtml(computed) {
    const validationHtml = formatProfessionValidationMessages(
      computed.validationErrors,
      { optionPicks: this.optionPicks },
    )
      .map(
        (message) =>
          `<p class="validation-error">${foundry.utils.escapeHTML(
            message,
          )}</p>`,
      )
      .join("");

    const capHtml = computed.capWarnings
      .map(
        (w) =>
          `<p class="cap-warning">${foundry.utils.escapeHTML(
            game.i18n.format("DG.Profession.Dialog.CapWarning", {
              skill: w.label,
              attempted: w.attempted,
              waste: w.waste,
            }),
          )}</p>`,
      )
      .join("");

    return validationHtml + capHtml;
  }

  async #refreshUi() {
    const root = this.#contentRoot();
    if (!root) return;

    const computed = this.#compute();

    const rows = this.#buildSkillDisplayRows(computed);

    const body = root.querySelector("[data-profession-skills-body]");
    if (body) {
      body.innerHTML = rows
        .map((r) => {
          const modifiedClass = r.isModified ? " is-modified" : "";
          return `<div class="add-profession-skill-entry${modifiedClass}" data-skill-row="${foundry.utils.escapeHTML(
            r.rowId,
          )}"><span class="add-profession-skill-label">${foundry.utils.escapeHTML(
            r.label,
          )}</span><span class="add-profession-skill-value" data-skill-value>${
            r.value
          }%</span></div>`;
        })
        .join("");
    }

    const messagesEl = root.querySelector("[data-profession-messages]");
    if (messagesEl) {
      messagesEl.innerHTML = this.#buildMessagesHtml(computed);
    }

    const submitBtn = this.dialog?.element?.querySelector(
      'button[data-action="submit"]',
    );
    if (submitBtn) submitBtn.disabled = !computed.isValid;

    this.#restoreFormSelections();
  }

  async #onSubmit() {
    this.#syncFormStateFromDom();
    const computed = this.#compute();
    if (!computed.isValid) return;

    const updateData = {};
    for (const [key, value] of Object.entries(computed.fixedValues)) {
      updateData[`system.skills.${key}.proficiency`] = value;
      updateData[`system.skills.${key}.failure`] = false;
    }

    const typedSkills = { ...(this.actor.system.typedSkills ?? {}) };
    for (const [, data] of Object.entries(computed.typedValues)) {
      const id = foundry.utils.randomID();
      typedSkills[id] = {
        label: data.label,
        group: data.group,
        proficiency: data.value,
        failure: false,
      };
    }
    updateData["system.typedSkills"] = typedSkills;

    updateData["system.biography.profession"] = this.professionItem.name;

    await this.actor.update(updateData);

    const chaScore =
      this.actor.system.statistics.cha.effectiveValue ??
      this.actor.system.statistics.cha.value;
    const bondCount = this.#bondCount();
    const bondDocs = [];

    for (let i = 0; i < bondCount; i++) {
      const name = this.bondNames[i]?.trim() ?? "";
      const relationship = this.bondRelationships[i]?.trim() ?? "";

      bondDocs.push({
        name,
        type: "bond",
        system: {
          score: chaScore,
          relationship,
        },
      });
    }

    if (bondDocs.length) {
      await this.actor.createEmbeddedDocuments("Item", bondDocs);
    }

    this.submitted = true;
    await this.dialog?.close();
  }
}

export default { showPickSkillsDialog };
