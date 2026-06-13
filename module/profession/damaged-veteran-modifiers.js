import {
  HARD_EXPERIENCE_BONUS_COUNT,
  HARD_EXPERIENCE_BONUS_INCREMENT,
  HARD_EXPERIENCE_SKILL_CAP,
} from "./constants.js";
import { applyBonusSkillPicks } from "./catalog.js";
import { formatProfessionSkillKey } from "./keys.js";

function getPowRating(actor) {
  return (
    actor.system.statistics.pow.effectiveValue ??
    actor.system.statistics.pow.value
  );
}

function getChaRating(actor) {
  return (
    actor.system.statistics.cha.effectiveValue ??
    actor.system.statistics.cha.value
  );
}

const DEFAULT_SANITY_POW_MULTIPLIER = 5;
const THINGS_MAN_SANITY_POW_MULTIPLIER = 4;

/**
 * @param {Actor} actor
 * @param {number} [powMultiplier]
 * @returns {number}
 */
function getSanityFromPow(
  actor,
  powMultiplier = DEFAULT_SANITY_POW_MULTIPLIER,
) {
  const pow = getPowRating(actor);
  return Math.max(0, pow * powMultiplier);
}

function buildOccultSanityStatUpdate(actor, options) {
  const occult = Number(actor.system.skills.occult?.proficiency) || 0;
  const sanity = Math.max(
    0,
    getSanityFromPow(actor, DEFAULT_SANITY_POW_MULTIPLIER) +
      (options.sanityDelta ?? 0),
  );

  /** @type {Record<string, unknown>} */
  const updateData = {
    "system.skills.occult.proficiency": occult + (options.occultBonus ?? 0),
    "system.sanity.value": sanity,
  };

  if (options.chaDelta) {
    updateData["system.statistics.cha.value"] =
      getChaRating(actor) + options.chaDelta;
  }
  if (options.powDelta) {
    updateData["system.statistics.pow.value"] =
      getPowRating(actor) + options.powDelta;
  }

  return updateData;
}

async function adjustAllBondScores(actor, delta) {
  const bonds = actor.items.filter((item) => item.type === "bond");
  if (!bonds.length) return;

  const updates = bonds.map((bond) => ({
    _id: bond.id,
    system: {
      score: Math.max(0, Number(bond.system.score) + delta),
    },
  }));
  await actor.updateEmbeddedDocuments("Item", updates);
}

async function applyExtremeViolence(actor) {
  const updateData = buildOccultSanityStatUpdate(actor, {
    occultBonus: 10,
    sanityDelta: -5,
    chaDelta: -3,
  });
  updateData["system.sanity.adaptations.violence.incident1"] = true;
  updateData["system.sanity.adaptations.violence.incident2"] = true;
  updateData["system.sanity.adaptations.violence.incident3"] = true;

  await actor.update(updateData);
  await adjustAllBondScores(actor, -3);
}

async function applyCaptivity(actor) {
  const updateData = buildOccultSanityStatUpdate(actor, {
    occultBonus: 10,
    sanityDelta: -5,
    powDelta: -3,
  });
  updateData["system.sanity.adaptations.helplessness.incident1"] = true;
  updateData["system.sanity.adaptations.helplessness.incident2"] = true;
  updateData["system.sanity.adaptations.helplessness.incident3"] = true;

  await actor.update(updateData);
}

async function applyHardExperience(actor, veteranResult, payload) {
  const occultSanityUpdate = buildOccultSanityStatUpdate(actor, {
    occultBonus: 10,
    sanityDelta: -5,
  });

  const computed = applyBonusSkillPicks(
    payload.fixedValues,
    payload.typedValues,
    {
      bonusCatalogIds: veteranResult.bonusCatalogIds,
      bonusTypedLabels: veteranResult.bonusTypedLabels,
    },
    {
      count: HARD_EXPERIENCE_BONUS_COUNT,
      increment: HARD_EXPERIENCE_BONUS_INCREMENT,
      cap: HARD_EXPERIENCE_SKILL_CAP,
      maxWaste: HARD_EXPERIENCE_BONUS_INCREMENT,
    },
  );

  const updateData = { ...occultSanityUpdate };
  for (const [key, value] of Object.entries(computed.fixedValues)) {
    updateData[`system.skills.${key}.proficiency`] = value;
  }

  const typedSkills = { ...(actor.system.typedSkills ?? {}) };
  const existingByKey = new Map();
  for (const [id, skill] of Object.entries(typedSkills)) {
    const storageKey = formatProfessionSkillKey({
      kind: "typed",
      group: skill.group,
      label: skill.label,
    });
    existingByKey.set(storageKey, id);
  }

  for (const [storageKey, data] of Object.entries(computed.typedValues)) {
    const existingId = existingByKey.get(storageKey);
    if (existingId) {
      typedSkills[existingId].proficiency = data.value;
    } else {
      const id = foundry.utils.randomID();
      typedSkills[id] = {
        label: data.label,
        group: data.group,
        proficiency: data.value,
        failure: false,
      };
    }
  }
  updateData["system.typedSkills"] = typedSkills;

  await actor.update(updateData);
}

async function applyThingsMan(actor, veteranResult) {
  const sanity = getSanityFromPow(actor, THINGS_MAN_SANITY_POW_MULTIPLIER);

  const occult = Number(actor.system.skills.occult?.proficiency) || 0;
  const unnatural = Number(actor.system.skills.unnatural?.proficiency) || 0;

  await actor.update({
    "system.skills.unnatural.proficiency": unnatural + 10,
    "system.skills.occult.proficiency": occult + 20,
    "system.sanity.value": sanity,
  });

  await actor.createEmbeddedDocuments("Item", [
    {
      name: game.i18n.localize("DG.DamagedVeterans.ThingsMan.MotivationName"),
      type: "motivation",
      system: {
        crossedOut: true,
        disorder: veteranResult.disorder,
      },
    },
  ]);
}

export async function applyDamagedVeteranModifications(
  actor,
  veteranResult,
  payload,
) {
  if (veteranResult.path === "freshRecruit") {
    return;
  }
  if (veteranResult.path === "extremeViolence") {
    await applyExtremeViolence(actor);
    return;
  }
  if (veteranResult.path === "captivity") {
    await applyCaptivity(actor);
    return;
  }
  if (veteranResult.path === "hardExperience") {
    await applyHardExperience(actor, veteranResult, payload);
    return;
  }
  if (veteranResult.path === "thingsMan") {
    await applyThingsMan(actor, veteranResult);
  }
}

export function computeHardExperienceSkillValues(payload, formState) {
  return applyBonusSkillPicks(
    payload.fixedValues,
    payload.typedValues,
    formState,
    {
      count: HARD_EXPERIENCE_BONUS_COUNT,
      increment: HARD_EXPERIENCE_BONUS_INCREMENT,
      cap: HARD_EXPERIENCE_SKILL_CAP,
      maxWaste: HARD_EXPERIENCE_BONUS_INCREMENT,
    },
  );
}
