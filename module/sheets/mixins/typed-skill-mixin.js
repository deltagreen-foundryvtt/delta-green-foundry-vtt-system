import { showDgDialog } from "../../applications/dg-dialog.js";
import { BASE_TEMPLATE_PATH } from "../../config/index.js";
import {
  TYPED_GROUP_I18N,
  TYPED_SKILL_TEMPLATE_GROUPS,
} from "../../profession/constants.js";

const { renderTemplate } = foundry.applications.handlebars;
const { ForcedDeletion } = foundry.data.operators;

/**
 * @param {string} [selectedGroup]
 * @returns {{ value: string, label: string, selected: boolean }[]}
 */
function buildTypedSkillGroupOptions(selectedGroup) {
  return TYPED_SKILL_TEMPLATE_GROUPS.map((value) => ({
    value,
    label: game.i18n.localize(TYPED_GROUP_I18N[value]),
    selected: value === selectedGroup,
  }));
}

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function TypedSkillMixin(Base) {
  return class extends Base {
    static _onTypedSkillAction(event, target) {
      const { actionType, typedskill } = target.dataset;
      switch (actionType) {
        case "create":
          this._showTypedSkillDialog({ mode: "create" }).catch((error) => {
            console.error(error);
          });
          break;
        case "edit":
          this._showTypedSkillDialog({
            mode: "edit",
            targetSkill: typedskill,
          }).catch((error) => {
            console.error(error);
          });
          break;
        case "delete":
          this.actor.update({
            system: {
              typedSkills: {
                [typedskill]: new ForcedDeletion(),
              },
            },
          });
          break;
        default:
          break;
      }
    }

    /**
     * @param {{ mode: "create" | "edit", targetSkill?: string }} options
     */
    async _showTypedSkillDialog({ mode, targetSkill }) {
      const isEdit = mode === "edit";
      const { typedSkills } = this.actor.system;
      const currentLabel = isEdit ? typedSkills[targetSkill].label : "";
      const currentGroup = isEdit
        ? typedSkills[targetSkill].group
        : TYPED_SKILL_TEMPLATE_GROUPS[0];

      const content = await renderTemplate(
        `${BASE_TEMPLATE_PATH}/dialog/typed-skill.html`,
        {
          groups: buildTypedSkillGroupOptions(currentGroup),
          label: currentLabel,
        },
      );

      const titleKey = isEdit
        ? "DG.Skills.EditTypedOrCustomSkill"
        : "DG.Skills.AddTypedOrCustomSkill";
      const buttonKey = isEdit ? "DG.Skills.EditSkill" : "DG.Skills.AddSkill";

      await showDgDialog({
        modifier: "typed-skill",
        content,
        position: { width: 320 },
        window: { title: game.i18n.localize(titleKey) },
        default: "submit",
        buttons: [
          {
            default: true,
            action: "submit",
            label: game.i18n.localize(buttonKey),
            callback: (_event, _button, dialog) => {
              const newTypeSkillLabel = dialog.element.querySelector(
                "[name='new-type-skill-label']",
              )?.value;
              const newTypeSkillGroup = dialog.element.querySelector(
                "[name='new-type-skill-group']",
              )?.value;
              if (isEdit) {
                this._updateTypedSkill(
                  targetSkill,
                  newTypeSkillLabel,
                  newTypeSkillGroup,
                );
              } else {
                this._addNewTypedSkill(newTypeSkillLabel, newTypeSkillGroup);
              }
            },
          },
        ],
      });
    }

    _addNewTypedSkill(newSkillLabel, newSkillGroup) {
      const updatedData = foundry.utils.duplicate(this.actor.system);
      const { typedSkills } = updatedData;

      const d = new Date();

      const newSkillPropertyName =
        d.getFullYear().toString() +
        (d.getMonth() + 1).toString() +
        d.getDate().toString() +
        d.getHours().toString() +
        d.getMinutes().toString() +
        d.getSeconds().toString();

      typedSkills[newSkillPropertyName] = {
        label: newSkillLabel,
        group: newSkillGroup,
        proficiency: 10,
        failure: false,
      };

      updatedData.typedSkills = typedSkills;

      this.actor.update({ system: updatedData });
    }

    _updateTypedSkill(targetSkill, newSkillLabel, newSkillGroup) {
      if (
        newSkillLabel !== null &&
        newSkillLabel !== "" &&
        newSkillGroup !== null &&
        newSkillGroup !== ""
      ) {
        const updatedData = foundry.utils.duplicate(this.actor.system);

        updatedData.typedSkills[targetSkill].label = newSkillLabel;
        updatedData.typedSkills[targetSkill].group = newSkillGroup;

        this.actor.update({ system: updatedData });
      }
    }
  };
}
