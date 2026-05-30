import DG from "../../config/index.js";
import { reorderForColumnSorting } from "../../utils/skill-layout.js";
import { getRollTargetDisplayClassFromModifier } from "../../active-effect/runtime/derived.js";
import {
  applySkillTooltipDisplayMode,
  buildAgentSpecialTrainingTooltip,
  buildSkillTooltip,
} from "../../utils/skill-tooltip.js";

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function SkillPrepMixin(Base) {
  return class extends Base {
    /**
     * Prepares the subname info placeholder based on the actor type.
     *
     * @returns {string}
     */
    _prepareSubnameInfoPlaceholder() {
      let subnameInfoPlaceholder = "";
      switch (this.actor.type) {
        case "unnatural":
          subnameInfoPlaceholder =
            "DG.UnnaturalSheet.ShortDescriptionPlaceholder";
          break;
        case "vehicle":
          subnameInfoPlaceholder = "DG.VehicleSheet.DescriptionPlaceHolder";
          break;
        default:
          subnameInfoPlaceholder = "DG.AgentSheet.ProfessionPlaceholder";
          break;
      }
      return game.i18n.localize(subnameInfoPlaceholder);
    }

    /** @returns {void} */
    _sortSkills() {
      const sortedSkills = [];
      for (const [key, skill] of Object.entries(this.actor.system.skills)) {
        skill.key = key;

        if (game.i18n.lang === "ja") {
          skill.sortLabel = game.i18n.localize(`DG.Skills.ruby.${key}`);
        } else {
          skill.sortLabel = game.i18n.localize(`DG.Skills.${key}`);
        }

        if (skill.sortLabel === "" || skill.sortLabel === `DG.Skills.${key}`) {
          skill.sortLabel = skill.key;
        }

        if (
          !(
            (this.actor.type === "npc" || this.actor.type === "unnatural") &&
            this.actor.system.showUntrainedSkills &&
            skill.proficiency < 1
          )
        ) {
          sortedSkills.push(skill);
        }
      }

      sortedSkills.sort((a, b) => {
        return a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang);
      });

      if (game.settings.get("deltagreen", "sortSkills")) {
        const columnSortedSkills = reorderForColumnSorting(sortedSkills, 3);
        this.actor.system.sortedSkills = columnSortedSkills;
      } else {
        this.actor.system.sortedSkills = sortedSkills;
      }
    }

    /** @returns {void} */
    _sortCustomSkills() {
      const specialTrainings = this._prepareSpecialTrainings();
      const sortedCustomSkills = [];

      for (const [key, skill] of Object.entries(
        this.actor.system.typedSkills,
      )) {
        skill.type = "typeSkill";
        skill.key = key;
        skill.sortLabel = `${skill.group}.${skill.label}`;
        skill.sortLabel = skill.sortLabel.toUpperCase();
        skill.actorType = this.actor.type;

        if (skill.sortLabel === "" || skill.sortLabel === `DG.Skills.${key}`) {
          skill.sortLabel = skill.key;
        }

        skill.tooltip = buildSkillTooltip(
          "sheet",
          this.actor,
          { kind: "typed", group: skill.group, label: skill.label },
          { proficiency: Number(skill.proficiency) || 0 },
        );

        sortedCustomSkills.push(skill);
      }

      for (let i = 0; i < specialTrainings.length; i++) {
        const training = specialTrainings[i];

        training.type = "training";
        training.sortLabel = training.name.toUpperCase();
        training.actorType = this.actor.type;

        sortedCustomSkills.push(training);
      }

      sortedCustomSkills.sort((a, b) => {
        return a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang);
      });

      if (game.settings.get("deltagreen", "sortSkills")) {
        const columnSortedSkills = reorderForColumnSorting(
          sortedCustomSkills,
          2,
        );

        this.actor.system.sortedCustomSkills = columnSortedSkills;
      } else {
        this.actor.system.sortedCustomSkills = sortedCustomSkills;
      }
    }

    /** @returns {void} */
    _prepareSkillTooltips() {
      for (const skill of Object.values(this.actor.system.sortedSkills)) {
        skill.tooltip = buildSkillTooltip(
          "sheet",
          this.actor,
          { kind: "fixed", key: skill.key },
          { proficiency: Number(skill.proficiency) || 0 },
        );
      }
    }

    /** @returns {object[]} */
    _prepareSpecialTrainings() {
      return this.actor.system.specialTraining.map((training) => {
        const simplifiedTraining = {
          name: training.name,
          id: training.id,
          key: training.attribute,
        };
        let attributeLabel;
        let attributeTooltip = null;

        switch (true) {
          case DG.statistics.includes(training.attribute):
            attributeLabel = `${training.attribute.toUpperCase()}x5`;
            attributeTooltip = `DG.Attributes.Tooltip.${training.attribute}`;
            simplifiedTraining.attribute = attributeLabel;
            simplifiedTraining.targetNumber =
              this.actor.system.statistics[training.attribute].x5;
            break;
          case DG.skills.includes(training.attribute):
            attributeLabel = game.i18n.localize(
              `DG.Skills.${training.attribute}`,
            );
            if (attributeLabel === `DG.Skills.${training.attribute}`) {
              attributeLabel =
                this.actor.system.skills[training.attribute].label;
            }
            attributeTooltip = `DG.Skills.Tooltip.${training.attribute}`;
            simplifiedTraining.attribute = attributeLabel;
            simplifiedTraining.targetNumber =
              this.actor.system.skills[training.attribute].proficiency;
            break;
          default:
            attributeLabel =
              this.actor.system.typedSkills[training.attribute].label;
            simplifiedTraining.attribute = attributeLabel;
            simplifiedTraining.targetNumber =
              this.actor.system.typedSkills[training.attribute].proficiency;
            break;
        }

        simplifiedTraining.attributeLabel = attributeLabel;
        simplifiedTraining.attributeTooltip = attributeTooltip;

        if (this.actor.type === "agent") {
          const { rollTarget } = this.actor.system;
          let modifier = 0;

          if (rollTarget) {
            if (DG.statistics.includes(training.attribute)) {
              modifier = Number(rollTarget.statistics) || 0;
            } else {
              modifier = Number(rollTarget.allSkills) || 0;
            }
          }

          simplifiedTraining.rollTargetDisplayClass =
            getRollTargetDisplayClassFromModifier(modifier);
        }

        simplifiedTraining.displayLabel = `${simplifiedTraining.name} (${attributeLabel}, ${simplifiedTraining.targetNumber}%)`;

        if (this.actor.type === "agent" && attributeTooltip) {
          const rollTargetKey = DG.statistics.includes(training.attribute)
            ? "system.rollTarget.statistics"
            : "system.rollTarget.allSkills";
          simplifiedTraining.tooltip = buildAgentSpecialTrainingTooltip(
            this.actor,
            attributeTooltip,
            rollTargetKey,
            simplifiedTraining.targetNumber,
          );
        }

        return simplifiedTraining;
      });
    }

    shouldShowHyperGeometrySection(actor) {
      if (game.user.isGM) {
        return true;
      }

      if (
        game.settings.get(
          "deltagreen",
          "alwaysShowHypergeometrySectionForPlayers",
        )
      ) {
        return true;
      }

      for (const i of actor.items) {
        if (i.type === "tome" || i.type === "ritual") {
          return true;
        }
      }

      return false;
    }

    /**
     * Require Shift while hovering to show tooltips.
     *
     * @param {HTMLElement} root
     */
    _tooltipsSettings(root) {
      applySkillTooltipDisplayMode(root);
    }
  };
}
