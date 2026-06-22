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

  const { parent } = effect;
  if (parent?.documentName === "Item") return parent.name ?? "";

  return effect.name ?? "";
}

/**
 * @param {Actor} actor
 * @param {RollTargetFieldKey} rollTargetFieldKey
 * @returns {Array<{ name: string, modifier: number }>}
 */
export function collectRollTargetContributions(actor, rollTargetFieldKey) {
  if (
    actor.type !== "agent" ||
    !ROLL_TARGET_FIELD_KEYS.includes(rollTargetFieldKey)
  ) {
    return [];
  }

  const contributions = [];

  for (const effect of actor.appliedEffects ?? []) {
    if (isRollTargetEffectActive(effect)) {
      const change = (effect.changes ?? []).find(
        (entry) => entry.key === rollTargetFieldKey && entry.type === "add",
      );
      if (change) {
        const modifier = Number(change.value);
        if (Number.isFinite(modifier) && modifier !== 0) {
          contributions.push({
            name: getRollTargetEffectLabel(effect),
            modifier,
          });
        }
      }
    }
  }

  return contributions;
}

/**
 * @param {Actor|null} actor
 * @param {RollTargetFieldKey|null} rollTargetFieldKey
 * @param {number} [manualModifier]
 * @returns {Array<{ name: string, modifier: number }>}
 */
function collectChatRollTargetContributions(
  actor,
  rollTargetFieldKey,
  manualModifier = 0,
) {
  const contributions =
    actor && rollTargetFieldKey
      ? collectRollTargetContributions(actor, rollTargetFieldKey)
      : [];

  const numericManual = Number(manualModifier) || 0;
  if (numericManual) {
    contributions.push({
      name: game.i18n.localize("DG.Tooltip.RollTarget.RollModifier"),
      modifier: numericManual,
    });
  }

  return contributions;
}

/**
 * @param {Array<{ name: string, modifier: number }>} contributions
 * @returns {string}
 */
function buildRollTargetModifierIndicators(contributions) {
  const hasPositive = contributions.some((entry) => entry.modifier > 0);
  const hasNegative = contributions.some((entry) => entry.modifier < 0);
  const indicators = [];

  if (hasPositive) {
    indicators.push(
      `<i class="fa-solid fa-arrow-up dg-chat-card__ae-indicator ae-mod-increase" inert></i>`,
    );
  }
  if (hasNegative) {
    indicators.push(
      `<i class="fa-solid fa-arrow-down dg-chat-card__ae-indicator ae-mod-decrease" inert></i>`,
    );
  }

  return indicators.join("");
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
  { allowOver99 = false, finalTarget = null } = {},
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
  const resolvedFinal =
    finalTarget != null
      ? finalTarget
      : clampPercentileRollTarget(base, totalModifier, {
          allowOver99,
        });

  rows.push([
    game.i18n.localize("DG.Tooltip.RollTarget.FinalTarget"),
    formatTargetPercent(resolvedFinal),
  ]);

  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td>${foundry.utils.escapeHTML(
          label,
        )}</td><td>${foundry.utils.escapeHTML(value)}</td></tr>`,
    )
    .join("");

  return `<table class="dg-roll-target-tooltip"><tbody>${body}</tbody></table>`;
}

/**
 * Roll-target breakdown for chat cards, including Active Effects and manual roll modifiers.
 *
 * @param {Actor|null} actor
 * @param {RollTargetFieldKey|null} rollTargetFieldKey
 * @param {number} base
 * @param {{ manualModifier?: number, finalTarget?: number|null, allowOver99?: boolean }} [options]
 * @returns {string}
 */
export function buildChatRollTargetBreakdownTooltipHtml(
  actor,
  rollTargetFieldKey,
  base,
  { manualModifier = 0, finalTarget = null, allowOver99 = false } = {},
) {
  const contributions = collectChatRollTargetContributions(
    actor,
    rollTargetFieldKey,
    manualModifier,
  );

  if (!contributions.length) return "";

  return buildRollTargetBreakdownTable(base, contributions, {
    allowOver99,
    finalTarget,
  });
}

/**
 * Roll-target breakdown table for tooltips when active effects modify the target.
 *
 * @param {Actor} actor
 * @param {RollTargetFieldKey} rollTargetFieldKey
 * @param {number} base
 * @param {{ allowOver99?: boolean }} [options]
 * @returns {string}
 */
export function buildRollTargetBreakdownTooltipHtml(
  actor,
  rollTargetFieldKey,
  base,
  options = {},
) {
  return buildChatRollTargetBreakdownTooltipHtml(
    actor,
    rollTargetFieldKey,
    base,
    options,
  );
}

/**
 * AE-style target display for chat roll labels: effective value, optional arrow, breakdown tooltip.
 *
 * @param {object} params
 * @param {string} params.targetValue Pre-formatted target string (e.g. "65%" or "12")
 * @param {Actor|null} [params.actor]
 * @param {RollTargetFieldKey|null} [params.rollTargetFieldKey]
 * @param {number} [params.base]
 * @param {number} [params.manualModifier]
 * @param {number|null} [params.finalTarget]
 * @param {boolean} [params.allowOver99]
 * @returns {string}
 */
export function buildRollTargetDisplayHtml({
  targetValue,
  actor = null,
  rollTargetFieldKey = null,
  base = 0,
  manualModifier = 0,
  finalTarget = null,
  allowOver99 = false,
} = {}) {
  const contributions = collectChatRollTargetContributions(
    actor,
    rollTargetFieldKey,
    manualModifier,
  );

  if (!contributions.length) return targetValue;

  const breakdownTooltip = buildRollTargetBreakdownTable(base, contributions, {
    allowOver99,
    finalTarget,
  });

  const aeIndicator = buildRollTargetModifierIndicators(contributions);

  return `<span class="dg-chat-card__target-info" data-tooltip-html="${foundry.utils.escapeHTML(
    breakdownTooltip,
  )}">${targetValue}${aeIndicator}</span>`;
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
 * @param {string} existingTooltip
 * @param {string} [feature]
 * @returns {string}
 */
export function appendDistinguishingFeatureSection(existingTooltip, feature) {
  const trimmed = String(feature ?? "").trim();
  if (!trimmed) return existingTooltip;

  const label = game.i18n.localize("DG.EditStats.DistinguishingFeature");
  const escaped = foundry.utils.escapeHTML(trimmed);
  const section = `<br><br>${foundry.utils.escapeHTML(label)}: ${escaped}`;
  if (!existingTooltip) return section;
  return `${existingTooltip}${section}`;
}

/**
 * Stat and sanity roll-target tooltips for the agent sheet left bar (not skills).
 *
 * @param {Actor} actor
 * @returns {void}
 */
export function prepareAgentStatSanityTooltips(actor) {
  if (actor.type !== "agent") return;

  const { system } = actor;

  for (const [key, stat] of Object.entries(system.statistics ?? {})) {
    const base = Number(stat.x5) || 0;
    const existing = game.i18n.localize(`DG.Attributes.Tooltip.${key}`);
    const withFeature = appendDistinguishingFeatureSection(
      existing,
      stat.distinguishing_feature,
    );
    stat.tooltip = appendRollTargetTooltipSection(
      withFeature,
      actor,
      "system.rollTarget.statistics",
      base,
      { allowOver99: base > 99 },
    );
  }

  const { sanity } = system;
  if (sanity) {
    const existing = `${game.i18n.localize("DG.Tooltip.CurrentSanityPartOne")}${
      sanity.currentBreakingPoint
    }${game.i18n.localize("DG.Tooltip.CurrentSanityPartTwo")}`;
    const base = Number(sanity.value) || 0;
    sanity.tooltip = appendRollTargetTooltipSection(
      existing,
      actor,
      "system.rollTarget.sanity",
      base,
    );
  }
}
