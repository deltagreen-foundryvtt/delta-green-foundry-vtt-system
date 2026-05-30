/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export default async function preloadHandlebarsTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    "systems/deltagreen/templates/dialog/modify-percentile-roll.html",
    "systems/deltagreen/templates/partials/prose-mirror-host.html",
    "systems/deltagreen/templates/actor/parts/effects-tab.html",
    "systems/deltagreen/templates/item/parts/effects-tab.html",
    "systems/deltagreen/templates/active-effect/change-row.html",
    "systems/deltagreen/templates/actor/partials/ae-backed-input.html",
  ]);
}
