import { BASE_TEMPLATE_PATH } from "../../config/index.js";
import { PROFESSION_OPTION_PICKS_KEY } from "../../data/item/profession.js";
import {
  allocateProfessionSkillStorageKey,
  buildSkillCatalog,
  catalogIdToSkillRef,
  findTypedSkillNameConflict,
  prepareProfessionSkillRows,
  splitProfessionSkillMap,
} from "../../profession/index.js";
import {
  getDialogContentRoot,
  showDgDialog,
} from "../../applications/dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;
const { ForcedDeletion } = foundry.data.operators;

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function ProfessionItemMixin(Base) {
  return class extends Base {
    /** @inheritdoc */
    async _preparePartContext(partId, context, options) {
      const partContext = await super._preparePartContext(
        partId,
        context,
        options,
      );
      if (this.item.type !== "profession" || partId !== "skills") {
        return partContext;
      }

      const automatic = this.item.system.automaticSkills ?? {};
      const automaticMeta = this.item.system.automaticSkillMeta ?? {};
      const { optionPicks, skills: optionSkillMap } = splitProfessionSkillMap(
        this.item.system.optionSkills ?? {},
      );
      const optionMeta = this.item.system.optionSkillMeta ?? {};

      partContext.automaticSkillRows = prepareProfessionSkillRows(
        automatic,
        automaticMeta,
      ).map((row) => ({
        ...row,
        isChooseOne: Boolean(automaticMeta[row.key]?.chooseOne),
      }));
      partContext.optionSkillRows = prepareProfessionSkillRows(
        optionSkillMap,
        optionMeta,
      ).map((row) => ({
        ...row,
        isChooseOne: Boolean(optionMeta[row.key]?.chooseOne),
      }));
      partContext.optionPicks = optionPicks;

      return partContext;
    }

    /** @param {PointerEvent} _event */
    static addAutomaticSkill(_event) {
      return this._showAddProfessionSkillDialog("automatic");
    }

    /** @param {PointerEvent} _event */
    static addOptionSkill(_event) {
      return this._showAddProfessionSkillDialog("option");
    }

    /**
     * @param {"automatic" | "option"} section
     */
    async _showAddProfessionSkillDialog(section) {
      const catalog = buildSkillCatalog();
      const content = await renderTemplate(
        `${BASE_TEMPLATE_PATH}/dialog/add-profession-skill.html`,
        { catalog, isTyped: false },
      );

      const confirmed = await showDgDialog({
        modifier: "add-profession-skill",
        content,
        position: { width: 300 },
        window: {
          title: game.i18n.localize("DG.ItemWindow.Profession.AddSkillTitle"),
        },
        form: { closeOnSubmit: false },
        onRender: (dialog) => {
          const root = getDialogContentRoot(dialog);
          const select = root?.querySelector('[name="skillCatalogId"]');
          const typedGroup = root?.querySelector(
            ".profession-typed-label-group",
          );
          const typeInput = root?.querySelector('[name="typedSkillLabel"]');
          const chooseOneInput = root?.querySelector('[name="chooseOne"]');

          const syncTypedVisibility = () => {
            const isTyped = select?.value.startsWith("typed:") ?? false;
            typedGroup?.classList.toggle("hidden", !isTyped);
            if (!isTyped) {
              if (chooseOneInput) chooseOneInput.checked = false;
              if (typeInput) {
                typeInput.value = "";
                typeInput.disabled = false;
              }
            }
          };

          const syncChooseOne = () => {
            const chooseOne = Boolean(chooseOneInput?.checked);
            if (typeInput) {
              typeInput.disabled = chooseOne;
              if (chooseOne) typeInput.value = "";
            }
          };

          select?.addEventListener("change", syncTypedVisibility);
          chooseOneInput?.addEventListener("change", syncChooseOne);
          syncTypedVisibility();
          syncChooseOne();
        },
        close: () => false,
        buttons: [
          {
            action: "ok",
            label: game.i18n.localize("DG.Profession.Dialog.Submit"),
            default: true,
            callback: async (_event, _button, dialog) => {
              const root = getDialogContentRoot(dialog);
              const select = root?.querySelector('[name="skillCatalogId"]');
              const ratingInput = root?.querySelector('[name="skillRating"]');
              const typeInput = root?.querySelector('[name="typedSkillLabel"]');
              const chooseOneInput = root?.querySelector('[name="chooseOne"]');

              const catalogId = select?.value ?? "";
              const rating = Number(ratingInput?.value);
              const typedLabel = typeInput?.value?.trim() ?? "";
              const chooseOne = Boolean(chooseOneInput?.checked);

              if (!catalogId || Number.isNaN(rating)) return false;

              const isTyped = catalogId.startsWith("typed:");
              if (isTyped && !chooseOne && !typedLabel) {
                ui.notifications.warn(
                  game.i18n.localize(
                    "DG.ItemWindow.Profession.TypedSkillRequired",
                  ),
                );
                return false;
              }

              const ref = catalogIdToSkillRef(
                catalogId,
                chooseOne ? "" : typedLabel,
                {
                  allowEmptyTypedLabel: chooseOne,
                },
              );
              if (!ref) return false;

              const skillKey = allocateProfessionSkillStorageKey(ref, {
                chooseOne,
              });

              const automaticSkills = {
                ...(this.item.system.automaticSkills ?? {}),
              };
              const optionSkills = { ...(this.item.system.optionSkills ?? {}) };
              const automaticMeta = {
                ...(this.item.system.automaticSkillMeta ?? {}),
              };
              const optionMeta = {
                ...(this.item.system.optionSkillMeta ?? {}),
              };

              const conflict =
                ref.kind === "typed"
                  ? findTypedSkillNameConflict({
                      group: ref.group,
                      label: chooseOne ? "" : typedLabel,
                      chooseOne,
                      automaticSkills,
                      optionSkills,
                      automaticMeta,
                      optionMeta,
                    })
                  : null;

              if (conflict) {
                ui.notifications.warn(
                  game.i18n.format(
                    "DG.ItemWindow.Profession.TypedSkillNameConflict",
                    { name: typedLabel },
                  ),
                  { localize: true },
                );
                return false;
              }

              const skillField =
                section === "automatic" ? "automaticSkills" : "optionSkills";
              const metaField =
                section === "automatic"
                  ? "automaticSkillMeta"
                  : "optionSkillMeta";

              const currentSkills =
                section === "automatic" ? automaticSkills : optionSkills;
              const currentMeta =
                section === "automatic" ? automaticMeta : optionMeta;

              if (
                section === "option" &&
                currentSkills[PROFESSION_OPTION_PICKS_KEY] === undefined
              ) {
                currentSkills[PROFESSION_OPTION_PICKS_KEY] = 0;
              }

              currentSkills[skillKey] = rating;
              if (chooseOne) currentMeta[skillKey] = { chooseOne: true };
              else delete currentMeta[skillKey];

              await this.item.update({
                [`system.${skillField}`]: currentSkills,
                [`system.${metaField}`]: currentMeta,
              });
              await dialog.close();
              return true;
            },
          },
          {
            action: "cancel",
            label: game.i18n.localize("Cancel"),
            callback: async (_event, _button, dialog) => {
              await dialog.close();
              return false;
            },
          },
        ],
      });

      if (confirmed) this.render();
    }

    /**
     * @param {HTMLElement} target
     * @returns {string|undefined}
     */
    #getProfessionSkillKeyFromTarget(target) {
      return target.closest("[data-skill-key]")?.dataset.skillKey;
    }

    /**
     * @param {"automaticSkills" | "optionSkills"} field
     * @param {string} skillKey
     */
    async #removeProfessionSkill(field, skillKey) {
      const metaField =
        field === "automaticSkills" ? "automaticSkillMeta" : "optionSkillMeta";

      await this.item.update({
        system: {
          [field]: {
            [skillKey]: new ForcedDeletion(),
          },
          [metaField]: {
            [skillKey]: new ForcedDeletion(),
          },
        },
      });
      return this.render();
    }

    /**
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static removeAutomaticSkill(event, target) {
      const skillKey = this.#getProfessionSkillKeyFromTarget(target);
      if (skillKey) {
        this.#removeProfessionSkill("automaticSkills", skillKey);
      }
    }

    /**
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static removeOptionSkill(event, target) {
      const skillKey = this.#getProfessionSkillKeyFromTarget(target);
      if (skillKey && skillKey !== PROFESSION_OPTION_PICKS_KEY) {
        this.#removeProfessionSkill("optionSkills", skillKey);
      }
    }
  };
}
