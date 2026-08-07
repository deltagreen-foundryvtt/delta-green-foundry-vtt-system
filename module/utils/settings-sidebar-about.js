import { BASE_TEMPLATE_PATH } from "../config/index.js";
import DGLegalDialog from "../applications/legal-dialog.js";
import DGSupportDialog from "../applications/support-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

const ABOUT_TEMPLATE = `${BASE_TEMPLATE_PATH}/sidebar/settings-about.html`;
const SECTION_CLASS = "dg-settings-about";

/**
 * @param {HTMLElement} element
 */
export default function injectSettingsAboutSection(element) {
  if (!element || element.querySelector(`.${SECTION_CLASS}`)) return;

  // Insert synchronously so a second render cannot slip past the guard above.
  const section = document.createElement("section");
  section.classList.add(SECTION_CLASS, "flexcol");

  const anchor =
    element.querySelector("section.documentation") ??
    element.querySelector("section.settings");

  if (anchor) anchor.insertAdjacentElement("afterend", section);
  else element.appendChild(section);

  renderTemplate(ABOUT_TEMPLATE, {}).then((html) => {
    section.innerHTML = html;

    section.querySelector(".dg-support-open")?.addEventListener("click", () => {
      new DGSupportDialog().render({ force: true });
    });
    section.querySelector(".dg-legal-open")?.addEventListener("click", () => {
      new DGLegalDialog().render({ force: true });
    });
  });
}
