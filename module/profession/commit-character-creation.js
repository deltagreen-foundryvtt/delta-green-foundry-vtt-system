import { applyDamagedVeteranModifications } from "./damaged-veteran-modifiers.js";
import { finalizeAgentStartingResources } from "../data/derived/actor-derived.js";

/**
 * @typedef {object} CharacterCreationBond
 * @property {string} name
 * @property {string} relationship
 */

/**
 * @typedef {object} CharacterCreationPayload
 * @property {Record<string, number>} fixedValues
 * @property {Record<string, { group: string, label: string, value: number }>} typedValues
 * @property {string} professionName
 * @property {CharacterCreationBond[]} bonds
 */

/**
 * @param {ReturnType<import("./compute.js").default>} computed
 * @param {Item} professionItem
 * @param {{ bondNames: string[], bondRelationships: string[] }} formState
 * @returns {CharacterCreationPayload}
 */
export function buildCharacterCreationPayload(
  computed,
  professionItem,
  formState,
) {
  const bonds = [];
  const bondCount = Math.max(
    1,
    Math.trunc(Number(professionItem.system.bonds) || 1),
  );

  for (let i = 0; i < bondCount; i++) {
    bonds.push({
      name: formState.bondNames?.[i]?.trim() ?? "",
      relationship: formState.bondRelationships?.[i]?.trim() ?? "",
    });
  }

  return {
    fixedValues: { ...computed.fixedValues },
    typedValues: foundry.utils.deepClone(computed.typedValues),
    professionName: professionItem.name,
    bonds,
  };
}

/**
 * @param {Actor} actor
 * @param {CharacterCreationPayload} payload
 * @param {{ skipBondIndices?: number[] }} [options]
 */
export async function applyCharacterCreationPayload(
  actor,
  payload,
  { skipBondIndices = [] } = {},
) {
  const skipSet = new Set(skipBondIndices);
  const updateData = {};

  for (const [key, value] of Object.entries(payload.fixedValues)) {
    updateData[`system.skills.${key}.proficiency`] = value;
    updateData[`system.skills.${key}.failure`] = false;
  }

  const typedSkills = { ...(actor.system.typedSkills ?? {}) };
  for (const [, data] of Object.entries(payload.typedValues)) {
    const id = foundry.utils.randomID();
    typedSkills[id] = {
      label: data.label,
      group: data.group,
      proficiency: data.value,
      failure: false,
    };
  }
  updateData["system.typedSkills"] = typedSkills;
  updateData["system.biography.profession"] = payload.professionName;

  await actor.update(updateData);

  const chaScore =
    actor.system.statistics.cha.effectiveValue ??
    actor.system.statistics.cha.value;

  /** @type {object[]} */
  const bondDocs = [];
  payload.bonds.forEach((bond, index) => {
    if (skipSet.has(index)) return;
    bondDocs.push({
      name: bond.name,
      type: "bond",
      system: {
        score: chaScore,
        relationship: bond.relationship,
      },
    });
  });

  if (bondDocs.length) {
    await actor.createEmbeddedDocuments("Item", bondDocs);
  }
}

/**
 * @param {Item} professionStub
 * @param {Actor} actor
 * @param {CharacterCreationPayload} payload
 * @param {object} veteranResult
 */
export async function commitProfessionSetup(
  actor,
  professionStub,
  payload,
  veteranResult,
) {
  const skipBondIndices =
    veteranResult.path === "hardExperience" &&
    Number.isInteger(veteranResult.removedBondIndex)
      ? [veteranResult.removedBondIndex]
      : [];

  await applyCharacterCreationPayload(actor, payload, { skipBondIndices });

  await applyDamagedVeteranModifications(actor, veteranResult, payload);

  await finalizeAgentStartingResources(actor, veteranResult.path);

  const createData = professionStub.toObject();
  delete createData._id;
  const created = await actor.createEmbeddedDocuments("Item", [createData]);
  return created[0] ?? null;
}
