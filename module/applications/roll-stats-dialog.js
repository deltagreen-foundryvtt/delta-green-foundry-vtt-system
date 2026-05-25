import { BASE_TEMPLATE_PATH } from "../config.js";
import { createDGChatMessage } from "../chat/dg-chat-card.js";
import {
  STAT_KEYS,
  applyAgentStatistics,
  buildRollStatsChatContent,
  buildStatisticRows,
  rollStatisticScores,
} from "../utils/profession-stat-setup.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

/** @typedef {'submitted' | 'cancelled'} RollStatsResult */

/**
 * @param {DialogV2} dialog
 * @returns {HTMLElement|null}
 */
function contentRoot(dialog) {
  return dialog.element?.querySelector(".dialog-content") ?? null;
}

/**
 * @param {object} state
 * @param {DialogV2} dialog
 * @param {number|null} rollIndex
 * @returns {string|null}
 */
function findStatKeyForRollIndex(state, rollIndex) {
  for (const key of STAT_KEYS) {
    if (state.assignments[key] === rollIndex) return key;
  }
  return null;
}

/**
 * @param {object} state
 * @param {DialogV2} dialog
 */
function syncDomFromAssignments(state, dialog) {
  const root = contentRoot(dialog);
  if (!root) return;

  const pool = root.querySelector("[data-roll-stats-pool]");
  if (!pool) return;

  root.querySelectorAll(".roll-stat-token").forEach((token) => {
    pool.appendChild(token);
  });

  for (const key of STAT_KEYS) {
    const rollIndex = state.assignments[key];
    if (rollIndex === null) continue;

    const slot = root.querySelector(`[data-stat-slot][data-stat-key="${key}"]`);
    const token = pool.querySelector(`[data-roll-index="${rollIndex}"]`);
    if (slot && token) {
      slot.appendChild(token);
    }
  }
}

/**
 * @param {object} state
 * @param {DialogV2} dialog
 */
function refreshRollStatsUi(state, dialog) {
  const submitBtn = dialog.element?.querySelector(
    'button[data-action="submit"]',
  );
  if (submitBtn) {
    submitBtn.disabled = !STAT_KEYS.every(
      (key) => state.assignments[key] !== null,
    );
  }
}

/**
 * @param {object} state
 * @param {DialogV2} dialog
 */
function bindRollStatsListeners(state, dialog) {
  const root = contentRoot(dialog);
  if (!root) return;

  root.querySelectorAll(".roll-stat-token").forEach((token) => {
    token.addEventListener("dragstart", (event) => {
      const rollIndex = Number(token.dataset.rollIndex);
      state.dragRollIndex = rollIndex;
      token.classList.add("is-dragging");
      event.dataTransfer?.setData("text/plain", String(rollIndex));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    token.addEventListener("dragend", () => {
      token.classList.remove("is-dragging");
      state.dragRollIndex = null;
      root
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
    });
  });

  const readDragRollIndex = (event) => {
    const fromData = event.dataTransfer?.getData("text/plain");
    if (fromData !== undefined && fromData !== "") {
      const parsed = Number(fromData);
      if (Number.isInteger(parsed)) return parsed;
    }
    if (state.dragRollIndex !== null) return state.dragRollIndex;
    return null;
  };

  root.querySelectorAll("[data-stat-slot]").forEach((slot) => {
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", () =>
      slot.classList.remove("drag-over"),
    );
    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("drag-over");

      const rollIndex = readDragRollIndex(event);
      if (rollIndex === null) return;

      const { statKey } = slot.dataset;
      if (!statKey) return;

      const sourceStatKey = findStatKeyForRollIndex(state, rollIndex);
      const displacedIndex = state.assignments[statKey];

      if (sourceStatKey === statKey) return;

      if (sourceStatKey) {
        state.assignments[sourceStatKey] = null;
      }

      if (displacedIndex !== null && displacedIndex !== rollIndex) {
        if (sourceStatKey) {
          state.assignments[sourceStatKey] = displacedIndex;
        }
      }

      state.assignments[statKey] = rollIndex;
      syncDomFromAssignments(state, dialog);
      refreshRollStatsUi(state, dialog);
    });
  });

  const pool = root.querySelector("[data-roll-stats-pool]");
  if (!pool) return;

  pool.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    pool.classList.add("drag-over");
  });
  pool.addEventListener("dragleave", (event) => {
    if (
      event.currentTarget === event.target ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      pool.classList.remove("drag-over");
    }
  });
  pool.addEventListener("drop", (event) => {
    event.preventDefault();
    pool.classList.remove("drag-over");

    const rollIndex = readDragRollIndex(event);
    if (rollIndex === null) return;

    const sourceStatKey = findStatKeyForRollIndex(state, rollIndex);
    if (sourceStatKey) {
      state.assignments[sourceStatKey] = null;
      syncDomFromAssignments(state, dialog);
      refreshRollStatsUi(state, dialog);
    }
  });
}

/**
 * @param {Actor} actor
 * @param {object} [options]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<RollStatsResult>}
 */
export async function showRollStatsDialog(actor, { token = null } = {}) {
  const rolled = await rollStatisticScores({ actor, token });
  const rolls = rolled.map((entry, index) => ({
    index,
    total: entry.total,
  }));

  await createDGChatMessage({
    actor,
    token,
    label: game.i18n.localize("DG.ProfessionSetup.RollStats.ChatLabel"),
    content: buildRollStatsChatContent(rolls),
  });

  const state = {
    rolls,
    assignments: Object.fromEntries(STAT_KEYS.map((key) => [key, null])),
    dragRollIndex: null,
  };
  /** @type {RollStatsResult} */
  let result = "cancelled";

  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/roll-stats.html`,
    {
      rolls: state.rolls,
      stats: buildStatisticRows(),
    },
  );

  return DialogV2.wait({
    content,
    window: {
      title: game.i18n.localize("DG.ProfessionSetup.RollStats.Title"),
    },
    position: { width: 520 },
    classes: ["roll-stats-dialog-app"],
    form: { closeOnSubmit: false },
    render: (_event, dialog) => {
      bindRollStatsListeners(state, dialog);
      refreshRollStatsUi(state, dialog);
    },
    close: () => result,
    buttons: [
      {
        action: "cancel",
        label: game.i18n.localize("Cancel"),
        callback: async (_event, _button, dialog) => {
          result = "cancelled";
          await dialog.close();
        },
      },
      {
        action: "submit",
        label: game.i18n.localize("DG.ProfessionSetup.RollStats.Submit"),
        default: true,
        disabled: true,
        callback: async (_event, _button, dialog) => {
          const isComplete = STAT_KEYS.every(
            (key) => state.assignments[key] !== null,
          );
          if (!isComplete) return false;

          /** @type {Record<string, number>} */
          const valuesByKey = {};
          for (const key of STAT_KEYS) {
            const rollIndex = state.assignments[key];
            const roll = state.rolls.find((entry) => entry.index === rollIndex);
            if (!roll) return false;
            valuesByKey[key] = roll.total;
          }

          await applyAgentStatistics(actor, valuesByKey);
          result = "submitted";
          await dialog.close();
          return false;
        },
      },
    ],
  });
}

export default { showRollStatsDialog };
