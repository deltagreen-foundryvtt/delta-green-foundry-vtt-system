import { showDgDialog } from "../../applications/dg-dialog.js";

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function SpecialTrainingMixin(Base) {
  return class extends Base {
    static _onSpecialTrainingAction(event, target) {
      const { actionType, id } = target.dataset;
      switch (actionType) {
        case "delete":
          {
            const specialTrainingArray = foundry.utils.duplicate(
              this.actor.system.specialTraining,
            );

            const index = specialTrainingArray.findIndex(
              (training) => training.id === id,
            );

            specialTrainingArray.splice(index, 1);
            this.actor.update({
              "system.specialTraining": specialTrainingArray,
            });
          }
          break;
        default:
          void this._showSpecialTrainingDialog(actionType, id);
          break;
      }
    }

    async _showSpecialTrainingDialog(action, targetID) {
      const specialTraining = this.actor.system.specialTraining.find(
        (training) => training.id === targetID,
      );

      const optionGroups = {
        stats: game.i18n.localize(
          "DG.SpecialTraining.Dialog.DropDown.Statistics",
        ),
        skills: game.i18n.localize("DG.SpecialTraining.Dialog.DropDown.Skills"),
        typedSkills: game.i18n.localize(
          "DG.SpecialTraining.Dialog.DropDown.CustomSkills",
        ),
      };

      const statList = Object.entries(this.actor.system.statistics).map(
        ([key, stat]) => ({
          value: key,
          group: optionGroups.stats,
          label: game.i18n.localize(`DG.Attributes.${key}`),
          targetNumber: stat.value * 5,
        }),
      );

      const skillList = Object.entries(this.actor.system.skills).map(
        ([key, skill]) => ({
          value: key,
          group: optionGroups.skills,
          label: game.i18n.localize(`DG.Skills.${key}`),
          targetNumber: skill.proficiency,
        }),
      );

      const typedSkillList = Object.entries(this.actor.system.typedSkills).map(
        ([key, skill]) => ({
          value: key,
          group: optionGroups.typedSkills,
          label: `${game.i18n.localize(`DG.TypeSkills.${skill.group}`)} (${
            skill.label
          })`,
          targetNumber: skill.proficiency,
        }),
      );

      const selectElement = foundry.applications.fields.createSelectInput({
        name: "special-training-skill",
        options: [...statList, ...skillList, ...typedSkillList],
        groups: Object.values(optionGroups),
      }).outerHTML;

      const { renderTemplate } = foundry.applications.handlebars;
      const content = await renderTemplate(
        "systems/deltagreen/templates/dialog/special-training.html",
        {
          name: specialTraining?.name || "",
          selectElement,
          currentAttribute: specialTraining?.attribute || "",
          statList,
          skillList,
          typedSkillList,
        },
      );

      const buttonLabel = game.i18n.localize(
        `DG.SpecialTraining.Dialog.${action.capitalize()}SpecialTraining`,
      );

      await showDgDialog({
        modifier: "special-training",
        content,
        window: {
          title: game.i18n.localize("DG.SpecialTraining.Dialog.Title"),
        },
        default: "confirm",
        buttons: [
          {
            default: true,
            action: "confirm",
            label: buttonLabel,
            callback: (_event, _button, dialog) => {
              const specialTrainingLabel = dialog.element.querySelector(
                "[name='special-training-label']",
              )?.value;
              const specialTrainingAttribute = dialog.element.querySelector(
                "[name='special-training-skill']",
              )?.value;
              if (action === "create")
                this._createSpecialTraining(
                  specialTrainingLabel,
                  specialTrainingAttribute,
                );
              if (action === "edit")
                this._editSpecialTraining(
                  specialTrainingLabel,
                  specialTrainingAttribute,
                  targetID,
                );
            },
          },
        ],
      });
    }

    _createSpecialTraining(label, attribute) {
      const specialTrainingArray = foundry.utils.duplicate(
        this.actor.system.specialTraining,
      );
      specialTrainingArray.push({
        name: label,
        attribute,
        id: foundry.utils.randomID(),
      });
      this.actor.update({ "system.specialTraining": specialTrainingArray });
    }

    _editSpecialTraining(label, attribute, id) {
      const specialTrainingArray = foundry.utils.duplicate(
        this.actor.system.specialTraining,
      );
      const specialTraining = specialTrainingArray.find(
        (training) => training.id === id,
      );
      specialTraining.name = label;
      specialTraining.attribute = attribute;
      this.actor.update({ "system.specialTraining": specialTrainingArray });
    }
  };
}
