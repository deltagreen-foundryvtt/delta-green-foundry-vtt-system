/**
 * @param {object} submittedData
 * @param {Actor} actor
 * @returns {void}
 */
export function flagUnnaturalResourceMaxUpdates(submittedData, actor) {
  submittedData.system.wp.maxNeedsUpdate =
    submittedData.system?.statistics.pow.value !==
    actor.system.statistics.pow.value;

  submittedData.system.health.maxNeedsUpdate =
    submittedData.system?.statistics.str.value !==
      actor.system.statistics.str.value ||
    submittedData.system?.statistics.con.value !==
      actor.system.statistics.con.value;
}
