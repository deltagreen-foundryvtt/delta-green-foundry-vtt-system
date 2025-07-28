/**
 * In config.js we can create constants that may be used all around the code base.
 * I tried to get some of these values from `game.system` but it seems they
 * aren't loaded yet when this is called. Oh well, this shouldn't really ever
 * change.
 */

const DG = /** @type {const} */ ({
  ID: "deltagreen",

  // All the base skills
  skills: [
    "accounting",
    "alertness",
    "anthropology",
    "archeology",
    "artillery",
    "athletics",
    "bureaucracy",
    "computer_science",
    "criminology",
    "demolitions",
    "disguise",
    "dodge",
    "drive",
    "firearms",
    "first_aid",
    "forensics",
    "heavy_machiner",
    "heavy_weapons",
    "history",
    "humint",
    "law",
    "medicine",
    "melee_weapons",
    "navigate",
    "occult",
    "persuade",
    "pharmacy",
    "psychotherapy",
    "ride",
    "search",
    "sigint",
    "stealth",
    "surgery",
    "survival",
    "swim",
    "unarmed_combat",
    "unnatural",
    "ritual",
  ],

  skillImprovementFormulas: {
    // If choices are defined, the resulting setting will be a select menu
    1: "DG.Settings.improvementroll.1",
    d3: "DG.Settings.improvementroll.2",
    d4: "DG.Settings.improvementroll.3",
    "d4-1": "DG.Settings.improvementroll.4",
  },

  // All the base rollable stats.
  statistics: ["str", "con", "dex", "int", "pow", "cha"],
});

// Set base template path for single source of truth for hbs locations.
const BASE_TEMPLATE_PATH = /** @type {const} */ (`systems/${DG.ID}/templates`);

export default DG;
export { BASE_TEMPLATE_PATH };
