/** @typedef {typeof DISORDER_OPTIONS[number]["id"]} DisorderId */

export const DISORDER_OPTIONS = /** @type {const} */ ([
  {
    id: "amnesia",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.Amnesia",
  },
  {
    id: "depersonalizationDisorder",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.DepersonalizationDisorder",
  },
  {
    id: "depression",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.Depression",
  },
  {
    id: "dissociativeIdentityDisorder",
    labelKey:
      "DG.DamagedVeterans.ThingsMan.Disorder.DissociativeIdentityDisorder",
  },
  {
    id: "fugues",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.Fugues",
  },
  {
    id: "megalomania",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.Megalomania",
  },
  {
    id: "paranoia",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.Paranoia",
  },
  {
    id: "sleepDisorder",
    labelKey: "DG.DamagedVeterans.ThingsMan.Disorder.SleepDisorder",
  },
]);

/** @type {Map<string, string>} */
const LABEL_KEY_BY_ID = new Map(
  DISORDER_OPTIONS.map((entry) => [entry.id, entry.labelKey]),
);

/** Legacy English display strings from earlier builds. */
/** @type {Map<string, string>} */
const LEGACY_LABEL_TO_ID = new Map([
  ["Amnesia", "amnesia"],
  ["Depersonalization Disorder", "depersonalizationDisorder"],
  ["Depression", "depression"],
  ["Dissociative Identity Disorder", "dissociativeIdentityDisorder"],
  ["Fugues", "fugues"],
  ["Megalomania", "megalomania"],
  ["Paranoia", "paranoia"],
  ["Sleep Disorder", "sleepDisorder"],
]);

/**
 * @param {string} value
 * @returns {string|null}
 */
export function resolveDisorderId(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (LABEL_KEY_BY_ID.has(trimmed)) return trimmed;
  return LEGACY_LABEL_TO_ID.get(trimmed) ?? null;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isKnownDisorderId(value) {
  return resolveDisorderId(value) !== null;
}

/**
 * @param {string} value Stored disorder id or legacy display string.
 * @returns {string}
 */
export function getDisorderLabel(value) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const id = resolveDisorderId(trimmed) ?? trimmed;
  const labelKey = LABEL_KEY_BY_ID.get(id);
  if (labelKey) return game.i18n.localize(labelKey);

  return trimmed;
}
