import DG from "../config/index.js";

const { ForcedDeletion } = foundry.data.operators;

const MIGRATION_VERSION = 2;
const ACTOR_TYPES_WITH_SKILLS = ["agent", "npc", "unnatural"];
const OBSOLETE_WORLD_SETTINGS = [
  "characterSheetFont",
  "characterSheetBackgroundImageSetting",
];

/**
 * @returns {void}
 */
function removeObsoleteWorldSettings() {
  const worldConfig = game.settings.storage.get("world")?.document?.config;
  const dgConfig = worldConfig?.[DG.ID];
  if (!dgConfig) return;

  for (const key of OBSOLETE_WORLD_SETTINGS) {
    delete dgConfig[key];
  }
}

/**
 * Run one-time world migrations for the Delta Green system.
 *
 * @returns {Promise<void>}
 */
export default async function runWorldMigration() {
  if (!game.user.isGM) return;

  const currentVersion =
    game.settings.get(DG.ID, "schemaMigrationVersion") ?? 0;
  if (currentVersion >= MIGRATION_VERSION) return;

  let migratedActors = 0;

  const actors = game.actors.filter((actor) =>
    ACTOR_TYPES_WITH_SKILLS.includes(actor.type),
  );

  for (const actor of actors) {
    if (actor.system.skills?.ritual) {
      await actor.update({
        system: {
          skills: {
            ritual: new ForcedDeletion(),
          },
          schemaVersion: MIGRATION_VERSION,
        },
      });
      migratedActors += 1;
    }
  }

  removeObsoleteWorldSettings();

  await game.settings.set(DG.ID, "schemaMigrationVersion", MIGRATION_VERSION);

  console.log(
    `Delta Green | World migration v${MIGRATION_VERSION} complete. Removed legacy ritual skill from ${migratedActors} actor(s).`,
  );
}
