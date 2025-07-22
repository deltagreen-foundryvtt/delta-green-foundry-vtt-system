/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export default async function preloadHandlebarsTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    "systems/deltagreen/templates/actor/limited-sheet.html",
    "systems/deltagreen/templates/actor/unnatural-sheet.html",
    "systems/deltagreen/templates/actor/npc-sheet.html",
    "systems/deltagreen/templates/actor/npc-limited-sheet.html",
    "systems/deltagreen/templates/dialog/modify-percentile-roll.html",
    "systems/deltagreen/templates/actor/vehicle-sheet.html",
    "systems/deltagreen/templates/actor/partials/sanity-partial.html",
    "systems/deltagreen/templates/actor/partials/custom-skills-partial.html",
    "systems/deltagreen/templates/actor/partials/cv-partial.html",
    "systems/deltagreen/templates/actor/partials/help-and-licensing-partial.html",
    "systems/deltagreen/templates/actor/partials/attributes-grid-partial.html",
  ]);
}
