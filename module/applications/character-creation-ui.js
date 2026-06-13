import {
  buildSortedFixedSkillRows,
  buildSortedTypedSkillRows,
  getBonusTrackLabel,
} from "../profession/index.js";
import { reorderForColumnSorting } from "../utils/skill-layout.js";
import {
  applySkillTooltipDisplayMode,
  buildSkillTooltip,
} from "../utils/skill-tooltip.js";

export const CHARACTER_CREATION_SKILL_COLUMNS = 2;

/**
 * @param {{ sortLabel: string, rowId: string, label: string, value: number, isModified: boolean, tooltip?: string }[]} rows
 * @param {number} [columns]
 * @returns {{ rowId: string, label: string, value: number, isModified: boolean, tooltip: string }[]}
 */
export function orderSkillRowsForDisplay(
  rows,
  columns = CHARACTER_CREATION_SKILL_COLUMNS,
) {
  const sorted = [...rows].sort((a, b) =>
    a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
  );

  const ordered = game.settings.get("deltagreen", "sortSkills")
    ? reorderForColumnSorting(sorted, columns)
    : sorted;

  return ordered.map(({ rowId, label, value, isModified, tooltip }) => ({
    rowId,
    label,
    value,
    isModified: Boolean(isModified),
    tooltip: tooltip ?? "",
  }));
}

/**
 * @param {object} computed
 * @param {Record<string, { group: string, label: string, value: number }>} [typedValuesSource]
 * @returns {{ rowId: string, label: string, value: number, isModified: boolean, tooltip: string, sortLabel: string }[]}
 */
export function buildSkillDisplayRows(computed, typedValuesSource) {
  const typedValues = typedValuesSource ?? computed.typedValues ?? {};
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
      tooltip: buildSkillTooltip("dialog", null, {
        kind: "fixed",
        key: r.key,
      }),
    })),
    ...typedRows.map((r) => {
      const data = typedValues[r.storageKey];
      return {
        rowId: r.storageKey,
        label: r.label,
        value: r.value,
        sortLabel: r.sortLabel,
        isModified: modifiedTyped.has(r.storageKey),
        tooltip: buildSkillTooltip("dialog", null, {
          kind: "typed",
          group: data?.group ?? "",
          label: r.label,
        }),
      };
    }),
  ]);
}

/**
 * @param {{ rowId: string, label: string, value: number, isModified: boolean, tooltip: string }[]} rows
 * @returns {string}
 */
export function renderSkillGridHtml(rows) {
  return rows
    .map((r) => {
      const modifiedClass = r.isModified ? " is-modified" : "";
      const tooltipAttr = r.tooltip
        ? ` data-tooltip="${foundry.utils.escapeHTML(r.tooltip)}"`
        : "";
      return `<div class="dg-dialog__skill-entry${modifiedClass}" data-skill-row="${foundry.utils.escapeHTML(
        r.rowId,
      )}"><span class="dg-dialog__skill-label"${tooltipAttr}>${foundry.utils.escapeHTML(
        r.label,
      )}</span><span class="dg-dialog__skill-value" data-skill-value>${
        r.value
      }%</span></div>`;
    })
    .join("");
}

/**
 * @param {HTMLElement} body
 * @param {{ rowId: string, label: string, value: number, isModified: boolean, tooltip: string }[]} rows
 */
export function updateSkillGridBody(body, rows) {
  if (!body) return;
  body.innerHTML = renderSkillGridHtml(rows);
  applySkillTooltipDisplayMode(body);
}

/**
 * @param {string[]} validationErrors
 * @param {object} [options]
 * @param {string} [options.bonusSkillRequiredKey]
 * @param {string} [options.bonusSkillWasteTooHighKey]
 * @returns {string[]}
 */
export function formatBonusPickValidationMessages(
  validationErrors,
  {
    bonusSkillRequiredKey = "DG.Profession.Dialog.BonusSkillRequired",
    bonusSkillWasteTooHighKey = "DG.Profession.Dialog.BonusSkillWasteTooHigh",
  } = {},
) {
  const messages = [];

  if (validationErrors.some((code) => /^bonus\d+$/.test(code))) {
    messages.push(game.i18n.localize(bonusSkillRequiredKey));
  }
  if (validationErrors.some((code) => code.startsWith("bonusType"))) {
    messages.push(
      game.i18n.localize("DG.Profession.Dialog.BonusSkillTypeRequired"),
    );
  }

  /** @type {Set<string>} */
  const bonusWasteTrackKeys = new Set();
  for (const code of validationErrors) {
    const match = code.match(/^bonusWaste:\d+\|(\d+)\|(.+)$/);
    if (match) bonusWasteTrackKeys.add(match[2]);
  }

  for (const trackKey of bonusWasteTrackKeys) {
    messages.push(
      game.i18n.format(bonusSkillWasteTooHighKey, {
        skill: getBonusTrackLabel(trackKey),
      }),
    );
  }

  return messages;
}

/**
 * @param {string[]} messages
 * @returns {string}
 */
export function renderValidationMessagesHtml(messages) {
  return messages
    .map(
      (message) =>
        `<p class="dg-dialog__message--error">${foundry.utils.escapeHTML(
          message,
        )}</p>`,
    )
    .join("");
}
