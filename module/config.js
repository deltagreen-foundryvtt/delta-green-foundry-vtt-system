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

  // All the base rollable stats.
  statistics: ["str", "con", "dex", "int", "pow", "cha"],
});

export default DG;
