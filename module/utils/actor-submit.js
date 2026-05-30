/**
 * @param {object} submittedData
 * @param {Actor} actor
 * @returns {void}
 */
export default function flagUnnaturalResourceMaxUpdates(submittedData, actor) {
  const sourceStats = actor._source?.system?.statistics;

  submittedData.system.wp.maxNeedsUpdate =
    submittedData.system?.statistics?.pow?.value !== sourceStats?.pow?.value;

  submittedData.system.health.maxNeedsUpdate =
    submittedData.system?.statistics?.str?.value !== sourceStats?.str?.value ||
    submittedData.system?.statistics?.con?.value !== sourceStats?.con?.value;
}
