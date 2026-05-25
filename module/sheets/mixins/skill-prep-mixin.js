import DG from "../../config.js";
import { reorderForColumnSorting } from "../../utils/skill-layout.js";

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

      for (const [key, skill] of Object.entries(this.actor.system.typedSkills)) {
        skill.type = "typeSkill";
        skill.key = key;
        skill.sortLabel = `${skill.group}.${skill.label}`;
        skill.sortLabel = skill.sortLabel.toUpperCase();
        skill.actorType = this.actor.type;

        if (skill.sortLabel === "" || skill.sortLabel === `DG.Skills.${key}`) {
          skill.sortLabel = skill.key;
        }

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
        skill.tooltip = game.i18n.localize(`DG.Skills.Tooltip.${skill.key}`);
        if (!skill.proficiency) {
          skill.tooltip = skill.tooltip.concat(
            "<br><br>",
            game.i18n.localize("DG.Tooltip.CannotRollSkillLabel"),
          );
        }
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
        simplifiedTraining.displayLabel = `${simplifiedTraining.name} (${attributeLabel}, ${simplifiedTraining.targetNumber}%)`;

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
      const mode = game.settings.get("deltagreen", "skillTooltipDisplay");

      if (mode !== "hoverShift" && mode !== "never") return;

      const nodes = root.querySelectorAll("[data-tooltip],[title]");

      if (mode === "never") {
        nodes.forEach((el) => {
          if (el.dataset.shiftTooltipInstalled === "true") return;
          el.removeAttribute("data-tooltip");
          el.removeAttribute("title");
          el.dataset.shiftTooltipInstalled = "true";
        });
        return;
      }

      nodes.forEach((el) => {
        if (el.dataset.shiftTooltipInstalled === "true") return;

        let html = el.getAttribute("data-tooltip");
        let isHtml = true;

        if (!html) {
          const title = el.getAttribute("title");
          if (title) {
            html = foundry.utils.escapeHTML(title);
            isHtml = false;
          }
        }

        if (!html) return;

        el.removeAttribute("data-tooltip");
        el.removeAttribute("title");
        el.dataset.shiftTooltipInstalled = "true";

        const opts = isHtml ? { html } : { text: html };

        const show = () => game.tooltip.activate(el, opts);
        const hide = () => game.tooltip.deactivate();

        const onKey = (ev) => {
          if (ev.key !== "Shift") return;
          if (!document.body.contains(el)) {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            return;
          }
          if (ev.type === "keydown") show();
          else hide();
        };

        const onEnter = (ev) => {
          if (ev.shiftKey) show();
          window.addEventListener("keydown", onKey);
          window.addEventListener("keyup", onKey);
        };

        const onLeave = () => {
          hide();
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("keyup", onKey);
        };

        el.addEventListener("pointerenter", onEnter, { passive: true });
        el.addEventListener("pointerleave", onLeave, { passive: true });
      });
    }
  };
}
