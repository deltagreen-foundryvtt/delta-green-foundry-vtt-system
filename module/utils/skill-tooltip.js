/** @typedef {import("../profession/index.js").ProfessionSkillRef} ProfessionSkillRef */
/** @typedef {"dialog" | "sheet"} SkillTooltipContext */

import { appendRollTargetTooltipSection } from "./roll-target-tooltip.js";

/**
 * Descriptive skill tooltip only (no roll target or 0% appendix).
 *
 * @param {ProfessionSkillRef} ref
 * @returns {string}
 */
export function getSkillDescriptiveTooltip(ref) {
  if (ref.kind === "fixed") {
    const key = `DG.Skills.Tooltip.${ref.key}`;
    const localized = game.i18n.localize(key);
    return localized === key ? "" : localized;
  }

  const key = `DG.TypeSkills.Tooltip.${ref.group}`;
  const localized = game.i18n.localize(key);
  return localized === key ? "" : localized;
}

/**
 * Build a skill tooltip for character creation or the agent sheet.
 *
 * @param {SkillTooltipContext} context
 * @param {Actor | null} actor
 * @param {ProfessionSkillRef} ref
 * @param {{ proficiency?: number }} [options]
 * @returns {string}
 */
export function buildSkillTooltip(
  context,
  actor,
  ref,
  { proficiency = 0 } = {},
) {
  let tooltip = getSkillDescriptiveTooltip(ref);

  if (ref.kind === "fixed" && !tooltip) {
    tooltip = game.i18n.localize(`DG.Skills.Tooltip.${ref.key}`);
  }

  if (context === "dialog") return tooltip;

  if (ref.kind === "fixed" && !proficiency) {
    tooltip = tooltip.concat(
      "<br><br>",
      game.i18n.localize("DG.Tooltip.CannotRollSkillLabel"),
    );
  }

  if (actor?.type === "agent") {
    tooltip = appendRollTargetTooltipSection(
      tooltip,
      actor,
      "system.rollTarget.allSkills",
      Number(proficiency) || 0,
      { showTargetWhenUnmodified: false },
    );
  }

  return tooltip;
}

/**
 * Agent sheet special-training row tooltip (attribute-based, not ProfessionSkillRef).
 *
 * @param {Actor} actor
 * @param {string} attributeTooltipKey i18n key for the underlying attribute/skill
 * @param {"system.rollTarget.allSkills"|"system.rollTarget.sanity"|"system.rollTarget.statistics"} rollTargetFieldKey
 * @param {number} base
 * @returns {string}
 */
export function buildAgentSpecialTrainingTooltip(
  actor,
  attributeTooltipKey,
  rollTargetFieldKey,
  base,
) {
  return appendRollTargetTooltipSection(
    game.i18n.localize(attributeTooltipKey),
    actor,
    rollTargetFieldKey,
    base,
    {
      allowOver99:
        rollTargetFieldKey === "system.rollTarget.statistics" && base > 99,
      showTargetWhenUnmodified: false,
    },
  );
}

/**
 * Apply client skillTooltipDisplay setting (hover / hoverShift / never).
 *
 * @param {HTMLElement} root
 * @returns {void}
 */
export function applySkillTooltipDisplayMode(root) {
  const mode = game.settings.get("deltagreen", "skillTooltipDisplay");

  if (mode !== "hoverShift" && mode !== "never") return;

  const nodes = root.querySelectorAll("[data-tooltip],[title]");

  if (mode === "never") {
    nodes.forEach((el) => {
      if (el.dataset.shiftTooltipInstalled === "true") return;
      el.removeAttribute("data-tooltip");
      el.removeAttribute("title");
      el.dataset.shiftTooltipInstalled = "true";
    });
    return;
  }

  nodes.forEach((el) => {
    if (el.dataset.shiftTooltipInstalled === "true") return;

    let html = el.getAttribute("data-tooltip");
    let isHtml = true;

    if (!html) {
      const title = el.getAttribute("title");
      if (title) {
        html = foundry.utils.escapeHTML(title);
        isHtml = false;
      }
    }

    if (!html) return;

    el.removeAttribute("data-tooltip");
    el.removeAttribute("title");
    el.dataset.shiftTooltipInstalled = "true";

    const opts = isHtml ? { html } : { text: html };

    const show = () => game.tooltip.activate(el, opts);
    const hide = () => game.tooltip.deactivate();

    const onKey = (ev) => {
      if (ev.key !== "Shift") return;
      if (!document.body.contains(el)) {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        return;
      }
      if (ev.type === "keydown") show();
      else hide();
    };

    const onEnter = (ev) => {
      if (ev.shiftKey) show();
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
    };

    const onLeave = () => {
      hide();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };

    el.addEventListener("pointerenter", onEnter, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
  });
}
