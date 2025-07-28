import * as DGRolls from "../roll/roll.js";

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export async function createDeltaGreenMacro(data, slot) {
  if (data.type !== "Item") {
    return;
  }

  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    ui.notifications.warn("You can only create macro buttons for owned Items");
    return;
  }

  const item = await fromUuid(data.uuid);

  if (item === null || typeof item === "undefined") {
    ui.notifications.warn("Bad item passed to macro hotbar.");
    return;
  }

  let command = "";
  if (item.type !== "weapon") {
    // this should just open the item sheet for this item
    command = `(await fromUuid("${data.uuid}")).sheet.render(true)`;
  } else {
    command =
      "// If a damage roll on a successful attack should not be automatically rolled, change the last argument from 'true' to 'false':";
    command += `\ngame.deltagreen.rollSkillTestAndDamageForOwnedItem("${data.uuid}", true);`;
  }

  // Create the weapon macro command
  const macro = await Macro.create({
    name: item.name,
    type: "script",
    img: item.img,
    thumbnail: item.img,
    command,
    flags: { "deltagreen.itemMacro": true },
  });

  await game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
export async function rollItemMacro(itemId) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);

  if (!actor)
    return ui.notifications.warn("Must have an Actor selected first.");

  let item = actor ? actor.items.find((i) => i._id === itemId) : null;

  // for backwards compatibility with older macros, where I unwisely set it to use name instead of id
  if (!item) {
    item = actor ? actor.items.find((i) => i.name === itemId) : null;
  }

  if (!item)
    return ui.notifications.warn(
      `Your controlled Actor does not have an item named ${itemId}`,
    );

  // Trigger the item roll
  const r = await item.roll();

  return r;
}

export function rollItemSkillCheckMacro(itemId) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);

  if (!actor)
    return ui.notifications.warn("Must have an Actor selected first.");

  let item = actor ? actor.items.find((i) => i._id === itemId) : null;

  // for backwards compatibility with older macros, where I unwisely set it to use name instead of id
  if (!item) {
    item = actor ? actor.items.find((i) => i.name === itemId) : null;
  }

  if (!item)
    return ui.notifications.warn(
      `Your controlled Actor does not have an item '${item.name}'`,
    );

  const skillName = item.system.skill.toString();

  const roll = new DGRolls.DGPercentileRoll(
    "1D100",
    {},
    { rollType: "weapon", key: skillName, actor, item },
  );
  return actor.sheet.processRoll({}, roll);
}

export function rollSkillMacro(skillName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);

  if (!actor)
    return ui.notifications.warn("Must have an Actor selected first.");

  const skill = actor.system.skills[skillName];

  if (!skill) return ui.notifications.warn("Bad skill name passed to macro.");

  const roll = new DGRolls.DGPercentileRoll(
    "1D100",
    {},
    { rollType: "skill", key: skillName, actor },
  );
  return actor.sheet.processRoll({}, roll);
  // sendPercentileTestToChat(actor, translatedSkillLabel, skill.proficiency);
}

/**
 * Roll a skill check for an item that is owned by a specific actor.
 * @param {*} itemId
 * @param {*} actorId
 * @returns {null|Boolean}
 */
export async function rollSkillTestAndDamageForOwnedItem(
  itemUuId,
  rollDamageOnSuccess,
) {
  let item;

  try {
    item = await fromUuid(itemUuId);

    if (item == null) {
      return ui.notifications.warn("Invalid item targeted in macro.");
    }

    if (item.type !== "weapon") {
      return ui.notifications.warn(
        "Can only roll weapons/attacks as item macros.",
      );
    }
  } catch {
    return ui.notifications.warn("Invalid item targeted in macro.");
  }

  const rollOptions = {
    rollType: "weapon",
    key: item.system.skill,
    actor: item.parent,
    specialTrainingName: null, // Only applies to Special Training Rolls
    item,
  };

  const roll = new DGRolls.DGPercentileRoll("1D100", {}, rollOptions);

  await roll.evaluate();

  roll.toChat();

  if (roll.isSuccess && rollDamageOnSuccess) {
    item.roll(roll.isCritical);
  }

  return roll.isSuccess;
}
