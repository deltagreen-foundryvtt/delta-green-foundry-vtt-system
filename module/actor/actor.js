import { refreshDerivedAfterActiveEffects } from "../active-effect/runtime/derived.js";
import { prepareAgentStatSanityTooltips } from "../utils/roll-target-tooltip.js";
import {
  syncExhaustionEffect,
  updateTouchesExhaustionPhysical,
} from "../active-effect/runtime/exhaustion-effect.js";
import { pruneExpiredStimulantEffects } from "../active-effect/runtime/stimulant-effect.js";
import sanitizeActiveEffectBackedUpdateData from "../active-effect/runtime/submit.js";

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export default class DeltaGreenActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
    refreshDerivedAfterActiveEffects(this);
    if (this.type === "agent") prepareAgentStatSanityTooltips(this);
  }

  /** @override */
  async update(data, options = {}) {
    const sanitized = sanitizeActiveEffectBackedUpdateData(
      this,
      foundry.utils.deepClone(data),
    );
    const shouldSyncExhaustion =
      this.type === "agent" && updateTouchesExhaustionPhysical(sanitized);
    const chaChanged =
      this.type === "agent" &&
      foundry.utils.hasProperty(sanitized, "system.statistics.cha");
    // Capture the pre-update CHA cap so we can shift Bonds by the change.
    const oldMaxBondScore = chaChanged ? this._getMaxBondScore() : null;
    const result = await super.update(sanitized, options);
    if (shouldSyncExhaustion) await syncExhaustionEffect(this);
    // A Bond's score tracks the agent's CHA: each Bond keeps its gap below the
    // cap (its accumulated Bond damage), so a CHA change shifts every Bond score
    // by the same amount, floored at 0. E.g. 12/14 -> CHA 16 becomes 14/16, and
    // -> CHA 12 becomes 10/12.
    if (chaChanged) await this.shiftBondScoresByChaDelta(oldMaxBondScore);
    return result;
  }

  /**
   * The current maximum Bond score (the agent's effective CHA).
   * @returns {number|null}
   */
  _getMaxBondScore() {
    const cha =
      this.system.statistics?.cha?.effectiveValue ??
      this.system.statistics?.cha?.value;
    return typeof cha === "number" ? cha : null;
  }

  /**
   * Shift every Bond's score by the change in the CHA cap, floored at 0, so each
   * Bond preserves its gap below the maximum.
   * @param {number|null} oldMax  the CHA cap before the update
   */
  async shiftBondScoresByChaDelta(oldMax) {
    const newMax = this._getMaxBondScore();
    if (typeof oldMax !== "number" || typeof newMax !== "number") return;
    const delta = newMax - oldMax;
    if (delta === 0) return;
    const updates = this.itemTypes.bond
      .map((bond) => {
        const shifted = Math.max(0, bond.system.score + delta);
        return shifted === bond.system.score
          ? null
          : { _id: bond.id, "system.score": shifted };
      })
      .filter(Boolean);
    if (updates.length) await this.updateEmbeddedDocuments("Item", updates);
  }

  /** @override */
  static async create(data, options = {}) {
    data.prototypeToken = data.prototypeToken || {};
    if (data.type === "agent") {
      foundry.utils.mergeObject(
        data.prototypeToken,
        {
          actorLink: true, // this will make the 'Link Actor Data' option for a token is checked by default. So changes to the token sheet will reflect to the actor sheet.
          sight: { enabled: true },
          disposition: 1, // friendly, this is a dangerous assumption to make in the agency
        },
        { overwrite: false },
      );
    }
    return super.create(data, options);
  }

  async AddUnarmedAttackItemIfMissing() {
    try {
      let alreadyAdded = false;

      for (const item of this.items) {
        const flag = await item.getFlag("deltagreen", "SystemName");

        if (flag === "unarmed-attack" || item.name === "Unarmed Attack") {
          alreadyAdded = true;
          break;
        }
      }

      if (alreadyAdded === true) {
        return;
      }

      const handToHandPack = await game.packs.get(
        "deltagreen.hand-to-hand-weapons",
      );
      const itemIndex = await handToHandPack.getIndex();
      const toAdd = []; // createEmbeddedDocument expects an array

      for (const idx of itemIndex) {
        const _temp = await handToHandPack.getDocument(idx._id);

        if (_temp.name === "Unarmed Attack") {
          toAdd.push(_temp);
        }
      }

      const newItems = await this.createEmbeddedDocuments("Item", toAdd);

      for (const item of newItems) {
        await item.setFlag("deltagreen", "AutoAdded", true);

        if (item.name === "Unarmed Attack") {
          await item.setFlag("deltagreen", "SystemName", "unarmed-attack");
        }
      }
    } catch (ex) {
      console.log("Error adding unarmed strike item to Actor.");
      console.log(ex);
    }
  }

  async AddBaseVehicleItemsIfMissing() {
    try {
      const flag = await this.getFlag("deltagreen", "DefaultVehicleArmorAdded");

      if (flag !== null && flag !== undefined && flag !== true) {
        console.log("found a flag");
        console.log(flag);
      } else {
        // mark the actor so that we don't accidently do this again later, or if we want to fix/change something on it in the future
        this.setFlag("deltagreen", "DefaultVehicleArmorAdded", true);

        const toAdd = []; // createEmbeddedDocument expects an array

        const armor = await Item.create({
          type: "armor",
          name: "Vehicle Frame",
        });

        // this is the current default, but set it anyways in case it gets changed later.
        armor.system.protection = 3;

        toAdd.push(armor);

        // create the item on the actor
        const newItems = await this.createEmbeddedDocuments("Item", toAdd);

        for (const item of newItems) {
          await item.setFlag("deltagreen", "AutoAdded", true);
        }
      }
    } catch (ex) {
      console.log(ex);
    }
  }

  async AddArmorItemToSheet(
    name,
    description,
    protection,
    isEquipped,
    expense = "NA",
  ) {
    const armorData = {
      type: "armor",
      name,
      system: {
        description,
        protection,
        equipped: isEquipped,
        expense,
      },
    };

    await this.createEmbeddedDocuments("Item", [armorData]);
  }

  async AddWeaponItemToSheet(
    name,
    description,
    damage,
    skill = "custom",
    skillModifier = 0,
    customSkillTarget = 50,
    armorPiercing = 0,
    lethality = 0,
    isLethal = false,
    range = "10M",
    killRadius = "N/A",
    ammo = "",
    expense = "NA",
    equipped = true,
  ) {
    const weaponData = {
      type: "weapon",
      name,
      system: {
        description,
        skill, // custom
        skillModifier,
        customSkillTarget,
        range,
        damage,
        armorPiercing,
        lethality,
        isLethal,
        killRadius,
        ammo,
        expense,
        equipped,
      },
    };

    await this.createEmbeddedDocuments("Item", [weaponData]);
  }

  /** @override */
  async onUpdateEffectDurations(effects, event, context) {
    await super.onUpdateEffectDurations(effects, event, context);
    if (!game.user.isActiveGM || this.type !== "agent") return;
    if (!effects.some((effect) => effect.parent === this)) return;
    await pruneExpiredStimulantEffects(this);
    await syncExhaustionEffect(this);
  }
}
