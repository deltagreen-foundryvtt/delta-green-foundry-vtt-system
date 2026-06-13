import { BASE_TEMPLATE_PATH } from "../config/index.js";
import {
  HARD_EXPERIENCE_BONUS_COUNT,
  buildBonusSkillCatalog,
  computeHardExperienceSkillValues,
} from "../profession/index.js";
import {
  buildSkillDisplayRows,
  formatBonusPickValidationMessages,
  renderValidationMessagesHtml,
  updateSkillGridBody,
} from "./character-creation-ui.js";
import { getDialogContentRoot, showDgDialog } from "./dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * @typedef {object} HardExperienceDialogState
 * @property {string[]} [bonusCatalogIds]
 * @property {string[]} [bonusTypedLabels]
 * @property {number|null} [removedBondIndex]
 */

/**
 * @param {import("../profession/commit-character-creation.js").CharacterCreationPayload} payload
 * @param {HardExperienceDialogState} [state]
 * @returns {Promise<{ outcome: 'submitted', path: 'hardExperience', bonusCatalogIds: string[], bonusTypedLabels: string[], removedBondIndex: number } | { outcome: 'back' } | null>}
 */
export default async function showHardExperienceDialog(payload, state = {}) {
  const bonusCatalogIds = state.bonusCatalogIds
    ? [...state.bonusCatalogIds]
    : Array(HARD_EXPERIENCE_BONUS_COUNT).fill("");
  const bonusTypedLabels = state.bonusTypedLabels
    ? [...state.bonusTypedLabels]
    : Array(HARD_EXPERIENCE_BONUS_COUNT).fill("");
  let removedBondIndex =
    state.removedBondIndex ?? (payload.bonds.length > 0 ? 0 : null);

  /** @type {{ outcome: 'submitted', path: 'hardExperience', bonusCatalogIds: string[], bonusTypedLabels: string[], removedBondIndex: number } | { outcome: 'back' } | null} */
  let result = null;
  /** @type {import("foundry.applications.api.DialogV2").default | null} */
  let dialog = null;

  const bondRows = payload.bonds.map((bond, index) => ({
    index,
    name: bond.name,
    relationship: bond.relationship,
    checked: index === removedBondIndex,
  }));

  const bonusSlots = Array.from(
    { length: HARD_EXPERIENCE_BONUS_COUNT },
    (_, index) => ({ index }),
  );

  const syncFormStateFromDom = () => {
    const root = dialog ? getDialogContentRoot(dialog) : null;
    if (!root) return;

    for (let i = 0; i < HARD_EXPERIENCE_BONUS_COUNT; i++) {
      const select = root.querySelector(`[name="bonusSkill-${i}"]`);
      bonusCatalogIds[i] = select?.value ?? "";
      const typedInput = root.querySelector(`[name="bonusTypedLabel-${i}"]`);
      bonusTypedLabels[i] = typedInput?.value ?? "";
    }

    const bondSelected = root.querySelector(
      'input[name="removedBondIndex"]:checked',
    );
    removedBondIndex = bondSelected ? Number(bondSelected.value) : null;
  };

  const compute = () =>
    computeHardExperienceSkillValues(payload, {
      bonusCatalogIds,
      bonusTypedLabels,
    });

  const buildTemplateData = () => {
    const computed = compute();
    return {
      skillRows: buildSkillDisplayRows(computed),
      catalog: buildBonusSkillCatalog(),
      bonusSlots,
      bondRows,
      validationMessages: formatBonusPickValidationMessages(
        computed.validationErrors,
        {
          bonusSkillRequiredKey: "DG.HardExperience.Dialog.BonusSkillRequired",
          bonusSkillWasteTooHighKey:
            "DG.HardExperience.Dialog.BonusSkillWasteTooHigh",
        },
      ),
      isValid: computed.isValid && removedBondIndex !== null,
    };
  };

  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/hard-experience.html`,
    buildTemplateData(),
  );

  const refreshUi = async () => {
    syncFormStateFromDom();

    const root = dialog ? getDialogContentRoot(dialog) : null;
    if (!root) return;

    const templateData = buildTemplateData();
    updateSkillGridBody(
      root.querySelector("[data-hard-experience-skills-body]"),
      templateData.skillRows,
    );

    const messagesEl = root.querySelector("[data-hard-experience-messages]");
    if (messagesEl) {
      let messagesHtml = renderValidationMessagesHtml(
        templateData.validationMessages,
      );
      if (removedBondIndex === null) {
        messagesHtml += renderValidationMessagesHtml([
          game.i18n.localize("DG.HardExperience.Dialog.BondRemovalRequired"),
        ]);
      }
      messagesEl.innerHTML = messagesHtml;
    }

    const submitBtn = dialog?.element?.querySelector(
      'button[data-action="submit"]',
    );
    if (submitBtn) {
      submitBtn.disabled = !(templateData.isValid && removedBondIndex !== null);
    }

    for (let i = 0; i < HARD_EXPERIENCE_BONUS_COUNT; i++) {
      const select = root.querySelector(`[name="bonusSkill-${i}"]`);
      if (select) select.value = bonusCatalogIds[i] ?? "";
      const typedInput = root.querySelector(`[name="bonusTypedLabel-${i}"]`);
      const isTyped = (bonusCatalogIds[i] ?? "").startsWith("typed:");
      if (typedInput) {
        typedInput.classList.toggle("hidden", !isTyped);
        typedInput.value = bonusTypedLabels[i] ?? "";
      }
    }

    if (removedBondIndex !== null) {
      const bondInput = root.querySelector(
        `input[name="removedBondIndex"][value="${removedBondIndex}"]`,
      );
      if (bondInput) bondInput.checked = true;
    }
  };

  const bindListeners = () => {
    const root = dialog ? getDialogContentRoot(dialog) : null;
    if (!root) return;

    root.querySelectorAll("select[data-bonus-index]").forEach((select) => {
      select.addEventListener("change", () => {
        const index = Number(select.dataset.bonusIndex);
        bonusCatalogIds[index] = select.value;
        const typedInput = root.querySelector(
          `[name="bonusTypedLabel-${index}"]`,
        );
        const isTyped = select.value.startsWith("typed:");
        if (typedInput) {
          typedInput.classList.toggle("hidden", !isTyped);
          if (!isTyped) {
            typedInput.value = "";
            bonusTypedLabels[index] = "";
          }
        }
        refreshUi();
      });
    });

    root.querySelectorAll("[data-bonus-typed-index]").forEach((input) => {
      input.addEventListener("input", () => refreshUi());
    });

    root.querySelectorAll('input[name="removedBondIndex"]').forEach((input) => {
      input.addEventListener("change", () => refreshUi());
    });
  };

  await showDgDialog({
    modifier: "hard-experience",
    content,
    window: {
      title: game.i18n.localize("DG.HardExperience.Dialog.Title"),
    },
    position: { width: 1080, height: 780 },
    form: { closeOnSubmit: false },
    close: () => result,
    onRender: async (instance) => {
      dialog = instance;
      bindListeners();
      await refreshUi();
    },
    buttons: [
      {
        action: "back",
        label: game.i18n.localize("DG.ProfessionSetup.GoBack"),
        callback: async (_event, _button, instance) => {
          syncFormStateFromDom();
          result = {
            outcome: "back",
            bonusCatalogIds: [...bonusCatalogIds],
            bonusTypedLabels: [...bonusTypedLabels],
            removedBondIndex,
          };
          await instance.close();
          return false;
        },
      },
      {
        action: "submit",
        label: game.i18n.localize("DG.Profession.Dialog.Submit"),
        default: true,
        disabled: true,
        callback: async () => {
          syncFormStateFromDom();
          const computed = compute();
          if (!computed.isValid || removedBondIndex === null) return false;

          result = {
            outcome: "submitted",
            path: "hardExperience",
            bonusCatalogIds: [...bonusCatalogIds],
            bonusTypedLabels: [...bonusTypedLabels],
            removedBondIndex,
          };
          await dialog?.close();
          return false;
        },
      },
    ],
  });

  return result;
}
