/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export default class DeltaGreenActor extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    const actorData = this;
    const { system } = actorData;
    const { flags } = actorData;

    // console.log('actor.js prepareData');
    // console.log(this);

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    if (actorData.type === "agent") {
      this._prepareAgentData(this);
    } else if (actorData.type === "unnatural") {
      this._prepareUnnaturalData(this);
    } else if (actorData.type === "npc") {
      this._prepareNpcData(this);
    } else if (actorData.type === "vehicle") {
      this._prepareVehicleData(this);
    }
  }

  /**
   *
   * @param {*} agent
   */

  _prepareVehicleData(actor) {
    const actorData = actor;

    // calculate total armor rating
    let protection = 0;
    for (const i of actor.items) {
      if (i.type === "armor") {
        if (i.system.equipped === true) {
          protection += i.system.protection;
        }
      }
    }

    actorData.system.health.protection = protection;

    // console.log(actor);
  }

  _prepareNpcData(actor) {
    const { system } = actor;

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const [key, statistic] of Object.entries(system.statistics)) {
      // the x5 is just whatever the raw statistic is x 5 to turn it into a d100 percentile
      statistic.x5 = statistic.value * 5;
    }

    // initialize sanity, don't set these afterwards, as they need to be manually edited
    if (system.sanity.value >= 100) {
      system.sanity.value = system.statistics.pow.x5;
      system.sanity.currentBreakingPoint =
        system.sanity.value - system.statistics.pow.value;
    }

    system.sanity.max = 99 - system.skills.unnatural.proficiency;

    system.wp.max = system.statistics.pow.value;

    try {
      system.health.max = Math.ceil(
        (system.statistics.con.value + system.statistics.str.value) / 2,
      );
    } catch (ex) {
      system.health.max = 10;
    }

    /*
    system.skills.ritual = {
      label: "Ritual",
      proficiency: 99 - system.sanity.value,
      cannotBeImprovedByFailure: true,
      failure: false,
    };    

    if (system.skills.ritual.proficiency > 99) {
      system.skills.ritual.proficiency = 99;
    } else if (system.skills.ritual.proficiency < 1) {
      system.skills.ritual.proficiency = 1;
    }

    */

    try {
      delete system.skills.ritual; // try to remove legacy skill for ritual if it exists
    } catch {
      // do nothing
    }

    system.sanity.ritual = 99 - system.sanity.value;

    if (system.sanity.ritual > 99) {
      system.sanity.ritual = 99;
    } else if (system.sanity.ritual < 1) {
      system.sanity.ritual = 1;
    }

    // calculate total armor rating
    let protection = 0;
    for (const i of actor.items) {
      if (i.type === "armor") {
        if (i.system.equipped === true) {
          protection += i.system.protection;
        }
      }
    }

    system.health.protection = protection;

    for (const [_key, skill] of Object.entries(system.skills)) {
      skill.targetProficiency = skill.proficiency;
    }
  }

  /**
   *
   * @param {*} agent
   */
  _prepareUnnaturalData(actor) {
    const { system } = actor;

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const [key, statistic] of Object.entries(system.statistics)) {
      // the x5 is just whatever the raw statistic is x 5 to turn it into a d100 percentile
      statistic.x5 = statistic.value * 5;
    }

    // calculate total armor rating
    let protection = 0;
    for (const i of actor.items) {
      if (i.type === "armor") {
        if (i.system.equipped === true) {
          protection += i.system.protection;
        }
      }
    }

    system.health.protection = protection;

    for (const [_key, skill] of Object.entries(system.skills)) {
      skill.targetProficiency = skill.proficiency;
    }
  }

  /**
   * Prepare Agent type specific data
   */
  _prepareAgentData(agent) {
    const { system } = agent;

    // Make modifications to data here. For example:

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const [key, statistic] of Object.entries(system.statistics)) {
      // the x5 is just whatever the raw statistic is x 5 to turn it into a d100 percentile
      statistic.x5 = statistic.value * 5;
    }

    // The ritual skill is from the Handler's Guide, it is for activating a ritual and is always equal to 99 - current sanity.
    // The rules can be found on page 166, under 'Ritual Activation'.
    /*
    system.skills.ritual = {
      label: "Ritual",
      proficiency: 99 - system.sanity.value,
      cannotBeImprovedByFailure: true,
      failure: false,
    };    

    if (system.skills.ritual.proficiency > 99) {
      system.skills.ritual.proficiency = 99;
    } else if (system.skills.ritual.proficiency < 1) {
      system.skills.ritual.proficiency = 1;
    }

    */

    try {
      delete system.skills.ritual; // try to remove legacy skill for ritual if it exists
    } catch {
      // do nothing
    }

    system.sanity.ritual = 99 - system.sanity.value;

    if (system.sanity.ritual > 99) {
      system.sanity.ritual = 99;
    } else if (system.sanity.ritual < 1) {
      system.sanity.ritual = 1;
    }

    // The unnatural skill is sort of special
    // It cannot be improved via failure, so add in a special property to reflect this
    // Mostly to make it easy to deactivate the failure checkbox in the GUI
    for (const [key, skill] of Object.entries(system.skills)) {
      if (key === "unnatural") {
        skill.cannotBeImprovedByFailure = true;
      } else if (key === "luck") {
        skill.cannotBeImprovedByFailure = true;
      } else if (key === "ritual") {
        skill.cannotBeImprovedByFailure = true;
      } else {
        skill.cannotBeImprovedByFailure = false;
      }

      // For ritual skill, it's calculated, so add some logic to turn off changing that entirely.
      if (key === "ritual") {
        skill.isCalculatedValue = true;
      } else {
        skill.isCalculatedValue = false;
      }

      // Add field for calculation
      skill.targetProficiency = skill.proficiency;
    }

    system.wp.max = system.statistics.pow.value;

    system.health.max = Math.ceil(
      (system.statistics.con.value + system.statistics.str.value) / 2,
    );

    // initialize sanity, don't set these afterwards, as they need to be manually edited
    if (system.sanity.value >= 100) {
      system.sanity.value = system.statistics.pow.x5;
      system.sanity.currentBreakingPoint =
        system.sanity.value - system.statistics.pow.value;
    }

    system.sanity.max = 99 - system.skills.unnatural.proficiency;

    // Sanity Loss Adaptations Logic
    const { adaptations } = system.sanity;

    if (
      adaptations.violence.incident1 &&
      adaptations.violence.incident2 &&
      adaptations.violence.incident3
    ) {
      system.sanity.adaptations.violence.isAdapted = true;
    } else {
      system.sanity.adaptations.violence.isAdapted = false;
    }

    if (
      adaptations.helplessness.incident1 &&
      adaptations.helplessness.incident2 &&
      adaptations.helplessness.incident3
    ) {
      system.sanity.adaptations.helplessness.isAdapted = true;
    } else {
      system.sanity.adaptations.helplessness.isAdapted = false;
    }

    if (system.sanity.value <= system.sanity.currentBreakingPoint) {
      system.sanity.breakingPointHit = true;
    } else {
      system.sanity.breakingPointHit = false;
    }

    // calculate total armor rating
    let protection = 0;
    for (const i of agent.items) {
      if (i.type === "armor") {
        if (i.system.equipped === true) {
          protection += i.system.protection;
        }
      }
    }

    system.health.protection = protection;

    // Damage Bonus/Malus From Strength in Hand-to-hand Combat (melee/unarmed)
    let bonus = 0;
    let sbonus = "";
    const strength = system.statistics.str;

    if (strength.value < 5) {
      sbonus = "-2";
      bonus = -2;
    } else if (strength.value < 9) {
      sbonus = "-1";
      bonus = -1;
    } else if (strength.value > 12 && strength.value < 17) {
      sbonus = "+1";
      bonus = 1;
    } else if (strength.value > 16) {
      sbonus = "+2";
      bonus = 2;
    }

    system.statistics.str.meleeDamageBonus = bonus;
    system.statistics.str.meleeDamageBonusFormula = sbonus;

    if (system.physical.exhaustedPenalty > 0) {
      system.physical.exhaustedPenalty =
        -1 * Math.abs(system.physical.exhaustedPenalty);
    }

    // console.log(agent);
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
}
