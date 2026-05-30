import DG from "../config/index.js";
import { ROLL_TARGET_FIELD_KEYS } from "../active-effect/effect-fields.js";
import { clampPercentileRollTarget } from "../active-effect/runtime/derived.js";
import DGUtils from "./utility-functions.js";

/** @typedef {"system.rollTarget.allSkills"|"system.rollTarget.sanity"|"system.rollTarget.statistics"} RollTargetFieldKey */

/**
 * @param {ActiveEffect} effect
 * @returns {boolean}
 */
function isRollTargetEffectActive(effect) {
  if (effect.disabled) return false;
  if (effect.duration?.expired) return false;
  if (effect.isSuppressed) return false;
  return true;
}

/**
 * @param {ActiveEffect} effect
 * @returns {string}
 */
function getRollTargetEffectLabel(effect) {
  if (effect.getFlag(DG.ID, "exhaustion")) {
    return game.i18n.localize("DG.Physical.ExhaustionEffectName");
  }

  if (effect.name?.trim()) return effect.name;

  const parent = effect.parent;
  if (parent?.documentName === "Item") return parent.name ?? "";

  return effect.name ?? "";
}

/**
 * @param {Actor} actor
 * @param {RollTargetFieldKey} rollTargetFieldKey
 * @returns {Array<{ name: string, modifier: number }>}
 */
export function collectRollTargetContributions(actor, rollTargetFieldKey) {
  if (actor.type !== "agent" || !ROLL_TARGET_FIELD_KEYS.includes(rollTargetFieldKey)) {
    return [];
  }

  const contributions = [];

  for (const effect of actor.appliedEffects ?? []) {
    if (!isRollTargetEffectActive(effect)) continue;

    const change = (effect.changes ?? []).find(
      (entry) => entry.key === rollTargetFieldKey && entry.type === "add",
    );
    if (!change) continue;

    const modifier = Number(change.value);
    if (!Number.isFinite(modifier) || modifier === 0) continue;

    contributions.push({
      name: getRollTargetEffectLabel(effect),
      modifier,
    });
  }

  return contributions;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatTargetPercent(value) {
  return `${Math.round(value)}%`;
}

/**
 * @param {number} modifier
 * @returns {string}
 */
function formatModifierPercent(modifier) {
  return `${DGUtils.formatStringWithLeadingPlus(modifier)}%`;
}

/**
 * @param {number} base
 * @param {Array<{ name: string, modifier: number }>} contributions
 * @param {{ allowOver99?: boolean }} [options]
 * @returns {string}
 */
function buildRollTargetBreakdownTable(
  base,
  contributions,
  { allowOver99 = false } = {},
) {
  const rows = [
    [
      game.i18n.localize("DG.Tooltip.RollTarget.BaseTarget"),
      formatTargetPercent(base),
    ],
  ];

  for (const { name, modifier } of contributions) {
    rows.push([name, formatModifierPercent(modifier)]);
  }

  const totalModifier = contributions.reduce(
    (sum, entry) => sum + entry.modifier,
    0,
  );
  const finalTarget = clampPercentileRollTarget(base, totalModifier, {
    allowOver99,
  });

  rows.push([
    game.i18n.localize("DG.Tooltip.RollTarget.FinalTarget"),
    formatTargetPercent(finalTarget),
  ]);

  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td>${foundry.utils.escapeHTML(label)}</td><td>${foundry.utils.escapeHTML(value)}</td></tr>`,
    )
    .join("");

  return `<table class="dg-roll-target-tooltip"><tbody>${body}</tbody></table>`;
}

/**
 * @param {number} base
 * @returns {string}
 */
function buildRollTargetTargetLine(base) {
  return game.i18n.format("DG.Tooltip.RollTarget.Target", {
    value: Math.round(base),
  });
}

/**
 * @param {string} existingTooltip
 * @param {Actor} actor
 * @param {RollTargetFieldKey} rollTargetFieldKey
 * @param {number} base
 * @param {{ allowOver99?: boolean, showTargetWhenUnmodified?: boolean }} [options]
 * @returns {string}
 */
export function appendRollTargetTooltipSection(
  existingTooltip,
  actor,
  rollTargetFieldKey,
  base,
  options = {},
) {
  if (actor.type !== "agent") return existingTooltip;

  const { showTargetWhenUnmodified = true, ...tableOptions } = options;

  const contributions = collectRollTargetContributions(
    actor,
    rollTargetFieldKey,
  );

  let appendix = "";
  if (contributions.length > 0) {
    appendix = buildRollTargetBreakdownTable(base, contributions, tableOptions);
  } else if (showTargetWhenUnmodified) {
    appendix = buildRollTargetTargetLine(base);
  }

  if (!appendix) return existingTooltip;
  if (!existingTooltip) return appendix;
  return `${existingTooltip}<br><br>${appendix}`;
}

/**
 * Stat and sanity roll-target tooltips for the agent sheet left bar (not skills).
 *
 * @param {Actor} actor
 * @returns {void}
 */
export function prepareAgentStatSanityTooltips(actor) {
  if (actor.type !== "agent") return;

  const system = actor.system;

  for (const [key, stat] of Object.entries(system.statistics ?? {})) {
    const base = Number(stat.x5) || 0;
    const existing = game.i18n.localize(`DG.Attributes.Tooltip.${key}`);
    stat.tooltip = appendRollTargetTooltipSection(
      existing,
      actor,
      "system.rollTarget.statistics",
      base,
      { allowOver99: base > 99 },
    );
  }

  const sanity = system.sanity;
  if (sanity) {
    const existing = `${game.i18n.localize("DG.Tooltip.CurrentSanityPartOne")}${sanity.currentBreakingPoint}${game.i18n.localize("DG.Tooltip.CurrentSanityPartTwo")}`;
    const base = Number(sanity.value) || 0;
    sanity.tooltip = appendRollTargetTooltipSection(
      existing,
      actor,
      "system.rollTarget.sanity",
      base,
    );
  }
}
