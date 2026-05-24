const { DialogV2 } = foundry.applications.api;

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function TypedSkillMixin(Base) {
  return class extends Base {
    static _onTypedSkillAction(event, target) {
      const { actionType, typedskill } = target.dataset;
      switch (actionType) {
        case "create":
          this._showNewTypeSkillDialog();
          break;
        case "edit":
          this._showNewEditTypeSkillDialog(typedskill);
          break;
        case "delete":
          this.actor.update({ [`system.typedSkills.-=${typedskill}`]: null });
          break;
        default:
          break;
      }
    }

    _showNewEditTypeSkillDialog(targetSkill) {
      const { typedSkills } = this.actor.system;
      const currentLabel = typedSkills[targetSkill].label;
      const currentGroup = typedSkills[targetSkill].group;

      let htmlContent = `<div>`;
      htmlContent += `     <label>${
        game.i18n.translations.DG?.Skills?.SkillGroup ?? "Skill Group"
      }:</label>`;
      htmlContent += `     <select name="new-type-skill-group" />`;

      if (currentGroup === game.i18n.translations.DG?.TypeSkills?.Art ?? "Art") {
        htmlContent += `          <option value="Art" selected>${
          game.i18n.translations.DG?.TypeSkills?.Art ?? "Art"
        }</option>`;
      } else {
        htmlContent += `          <option value="Art">${
          game.i18n.translations.DG?.TypeSkills?.Art ?? "Art"
        }</option>`;
      }

      if (
        currentGroup === game.i18n.translations.DG?.TypeSkills?.Craft ??
        "Craft"
      ) {
        htmlContent += `          <option value="Craft" selected>${
          game.i18n.translations.DG?.TypeSkills?.Craft ?? "Craft"
        }</option>`;
      } else {
        htmlContent += `          <option value="Craft">${
          game.i18n.translations.DG?.TypeSkills?.Craft ?? "Craft"
        }</option>`;
      }

      if (
        currentGroup ===
        (game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
          "Foreign Language")
      ) {
        htmlContent += `          <option value="ForeignLanguage" selected>${
          game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
          "Foreign Language"
        }</option>`;
      } else {
        htmlContent += `          <option value="ForeignLanguage">${
          game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
          "Foreign Language"
        }</option>`;
      }

      if (
        currentGroup ===
        (game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
          "Military Science")
      ) {
        htmlContent += `          <option value="MilitaryScience" selected>${
          game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
          "Military Science"
        }</option>`;
      } else {
        htmlContent += `          <option value="MilitaryScience">${
          game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
          "Military Science"
        }</option>`;
      }

      if (
        currentGroup === game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
      ) {
        htmlContent += `          <option value="Pilot" selected>${
          game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
        }</option>`;
      } else {
        htmlContent += `          <option value="Pilot">${
          game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
        }</option>`;
      }

      if (
        currentGroup ===
        (game.i18n.translations.DG?.TypeSkills?.Science ?? "Science")
      ) {
        htmlContent += `          <option value="Science" selected>${
          game.i18n.translations.DG?.TypeSkills?.Science ?? "Science"
        }</option>`;
      } else {
        htmlContent += `          <option value="Science">${
          game.i18n.translations.DG?.TypeSkills?.Science ?? "Science"
        }</option>`;
      }

      if (
        currentGroup === game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
      ) {
        htmlContent += `          <option value="Other" selected>${
          game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
        }</option>`;
      } else {
        htmlContent += `          <option value="Other">${
          game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
        }</option>`;
      }

      htmlContent += `     </select>`;
      htmlContent += `</div>`;

      htmlContent += `<div>`;
      htmlContent += `     <label>${
        game.i18n.translations.DG?.Skills.SkillName ?? "Skill Name"
      }</label>`;
      htmlContent += `     <input type="text" name="new-type-skill-label" value="${currentLabel}" />`;
      htmlContent += `</div>`;

      new DialogV2({
        content: htmlContent,
        window: {
          title:
            game.i18n.translations.DG?.Skills?.EditTypedOrCustomSkill ??
            "Edit Typed or Custom Skill",
        },
        buttons: [
          {
            default: true,
            action: "add",
            label: game.i18n.translations.DG?.Skills?.EditSkill ?? "Edit Skill",
            callback: (event, button, dialog) => {
              const newTypeSkillLabel = dialog.element.querySelector(
                "[name='new-type-skill-label']",
              )?.value;
              const newTypeSkillGroup = dialog.element.querySelector(
                "[name='new-type-skill-group']",
              )?.value;
              this._updateTypedSkill(
                targetSkill,
                newTypeSkillLabel,
                newTypeSkillGroup,
              );
            },
          },
        ],
      }).render(true);
    }

    _showNewTypeSkillDialog() {
      let htmlContent = "";

      htmlContent += `<div>`;
      htmlContent += `     <label>${
        game.i18n.translations.DG?.Skills?.SkillGroup ?? "Skill Group"
      }:</label>`;
      htmlContent += `     <select name="new-type-skill-group" />`;
      htmlContent += `          <option value="Art">${
        game.i18n.translations.DG?.TypeSkills?.Art ?? "Art"
      }</option>`;
      htmlContent += `          <option value="Craft">${
        game.i18n.translations.DG?.TypeSkills?.Craft ?? "Craft"
      }</option>`;
      htmlContent += `          <option value="ForeignLanguage">${
        game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
        "Foreign Language"
      }</option>`;
      htmlContent += `          <option value="MilitaryScience">${
        game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
        "Military Science"
      }</option>`;
      htmlContent += `          <option value="Pilot">${
        game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
      }</option>`;
      htmlContent += `          <option value="Science">${
        game.i18n.translations.DG?.TypeSkills?.Science ?? "Science"
      }</option>`;
      htmlContent += `          <option value="Other">${
        game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
      }</option>`;
      htmlContent += `     </select>`;
      htmlContent += `</div>`;

      htmlContent += `<div>`;
      htmlContent += `     <label>${
        game.i18n.translations.DG?.Skills.SkillName ?? "Skill Name"
      }</label>`;
      htmlContent += `     <input type="text" name="new-type-skill-label" />`;
      htmlContent += `</div>`;

      new DialogV2({
        content: htmlContent,
        window: {
          title:
            game.i18n.translations.DG?.Skills?.AddTypedOrCustomSkill ??
            "Add Typed or Custom Skill",
        },
        default: "add",
        buttons: [
          {
            default: true,
            action: "add",
            label: game.i18n.translations.DG?.Skills?.AddSkill ?? "Add Skill",
            callback: (event, button, dialog) => {
              const newTypeSkillLabel = dialog.element.querySelector(
                "[name='new-type-skill-label']",
              )?.value;
              const newTypeSkillGroup = dialog.element.querySelector(
                "[name='new-type-skill-group']",
              )?.value;
              this._addNewTypedSkill(newTypeSkillLabel, newTypeSkillGroup);
            },
          },
        ],
      }).render(true);
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
