const fields = foundry.data.fields;

function resourceField(initialValue, initialMax) {
  return {
    min: new fields.NumberField({ initial: 0 }),
    value: new fields.NumberField({ initial: initialValue }),
    max: new fields.NumberField({ initial: initialMax }),
  };
}

function statisticsField(initialValue) {
  return {
    value: new fields.NumberField({ initial: initialValue }),
    distinguishing_feature: new fields.StringField({ initial: "" }),
  };
}

function skillField(initialValue, label) {
  return {
    value: new fields.NumberField({ initial: initialValue }),
    label: new fields.StringField({ initial: label }),
    failure: new fields.BooleanField({ initial: false }),
  };
}

class UnnaturalSkillsActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      unnatural_skills: new fields.SchemaField({
        skills: new fields.SchemaField({
          accounting: skillField(0, "Accounting"),
          alertness: skillField(50, "Alertness"),
          anthropology: skillField(0, "Anthropology"),
          archeology: skillField(0, "Archeology"),
          artillery: skillField(0, "Artillery"),
          athletics: skillField(50, "Athletics"),
          bureaucracy: skillField(0, "Bureaucracy"),
          computer_science: skillField(0, "Computer Science"),
          criminology: skillField(0, "Criminology"),
          demolitions: skillField(0, "Demolitions"),
          disguise: skillField(0, "Disguise"),
          dodge: skillField(50, "Dodge"),
          drive: skillField(0, "Drive"),
          firearms: skillField(0, "Firearms"),
          first_aid: skillField(0, "First Aid"),
          forensics: skillField(0, "Forensics"),
          heavy_machiner: skillField(0, "Heavy Machinery"),
          heavy_weapons: skillField(0, "Heavy Weapons"),
          history: skillField(0, "History"),
          humint: skillField(0, "HUMINT"),
          law: skillField(0, "Law"),
          medicine: skillField(0, "Medicine"),
          melee_weapons: skillField(50, "Melee Weapons"),
          navigate: skillField(0, "Navigate"),
          occult: skillField(0, "Occult"),
          persuade: skillField(0, "Persuade"),
          pharmacy: skillField(0, "Pharmacy"),
          psychotherapy: skillField(0, "Psychotherapy"),
          ride: skillField(0, "Ride"),
          search: skillField(0, "Search"),
          sigint: skillField(0, "SIGINT"),
          stealth: skillField(50, "Stealth"),
          surgery: skillField(0, "Surgery"),
          survival: skillField(0, "Survival"),
          swim: skillField(0, "Swim"),
          unarmed_combat: skillField(50, "Unarmed Combat"),
          unnatural: {
            value: new fields.NumberField({ initial: 0 }),
            label: new fields.StringField({ initial: "Unnatural" }),
          },
        }),
        typedSkills: new fields.SchemaField({}),
        specialTraining: new fields.ArrayField({}),
      }),
    };
  }
}

class HumanSkillsActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      human_skills: new fields.SchemaField({
        skills: new fields.SchemaField({
          accounting: skillField(10, "Accounting"),
          alertness: skillField(20, "Alertness"),
          anthropology: skillField(0, "Anthropology"),
          archeology: skillField(0, "Archeology"),
          artillery: skillField(0, "Artillery"),
          athletics: skillField(30, "Athletics"),
          bureaucracy: skillField(10, "Bureaucracy"),
          computer_science: skillField(0, "Computer Science"),
          criminology: skillField(10, "Criminology"),
          demolitions: skillField(0, "Demolitions"),
          disguise: skillField(10, "Disguise"),
          dodge: skillField(30, "Dodge"),
          drive: skillField(20, "Drive"),
          firearms: skillField(20, "Firearms"),
          first_aid: skillField(10, "First Aid"),
          forensics: skillField(0, "Forensics"),
          heavy_machiner: skillField(10, "Heavy Machinery"),
          heavy_weapons: skillField(0, "Heavy Weapons"),
          history: skillField(10, "History"),
          humint: skillField(10, "HUMINT"),
          law: skillField(0, "Law"),
          medicine: skillField(0, "Medicine"),
          melee_weapons: skillField(30, "Melee Weapons"),
          navigate: skillField(10, "Navigate"),
          occult: skillField(10, "Occult"),
          persuade: skillField(20, "Persuade"),
          pharmacy: skillField(0, "Pharmacy"),
          psychotherapy: skillField(10, "Psychotherapy"),
          ride: skillField(10, "Ride"),
          search: skillField(20, "Search"),
          sigint: skillField(0, "SIGINT"),
          stealth: skillField(10, "Stealth"),
          surgery: skillField(0, "Surgery"),
          survival: skillField(10, "Survival"),
          swim: skillField(20, "Swim"),
          unarmed_combat: skillField(40, "Unarmed Combat"),
          unnatural: {
            value: new fields.NumberField({ initial: 0 }),
            label: new fields.StringField({ initial: "Unnatural" }),
          },
        }),
        typedSkills: new fields.SchemaField({}),
        specialTraining: new fields.ArrayField({}),
      }),
    };
  }
}

class SheetSettingsActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      "sheet-settings": new fields.SchemaField({
        sorting: new fields.SchemaField({
          weaponSortAlphabetical: new fields.BooleanField({ initial: false }),
          armorSortAlphabetical: new fields.BooleanField({ initial: false }),
          gearSortAlphabetical: new fields.BooleanField({ initial: false }),
          tomeSortAlphabetical: new fields.BooleanField({ initial: false }),
          ritualSortAlphabetical: new fields.BooleanField({ initial: false }),
        }),
        rolling: new fields.SchemaField({
          defaultPercentileModifier: new fields.NumberField({ initial: 20 }),
        }),
      }),
    };
  }
}

class BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      base: new fields.SchemaField({
        health: new fields.SchemaField(resourceField(10, 10)),
        wp: new fields.SchemaField(resourceField(10, 10)),
        statistics: new fields.SchemaField({
          str: statisticsField(10),
          con: statisticsField(10),
          dex: statisticsField(10),
          int: statisticsField(10),
          pow: statisticsField(10),
          cha: statisticsField(10),
        }),
      }),
    };
  }
}

class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...BaseActorData.defineSchema(),
      ...SheetSettingsActorData.defineSchema(),
    };
  }
}

export class AgentData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new fields.NumberField({ initial: 1.0 }),
      sanity: new fields.SchemaField({
        value: new fields.NumberField({ initial: 100 }),
        currentBreakingPoint: new fields.NumberField({ initial: 101 }),
        adaptations: new fields.SchemaField({
          violence: new fields.SchemaField({
            incident1: new fields.BooleanField({ initial: false }),
            incident2: new fields.BooleanField({ initial: false }),
            incident3: new fields.BooleanField({ initial: false }),
          }),
          helplessness: new fields.SchemaField({
            incident1: new fields.BooleanField({ initial: false }),
            incident2: new fields.BooleanField({ initial: false }),
            incident3: new fields.BooleanField({ initial: false }),
          }),
        }),
      }),
      physical: new fields.SchemaField({
        description: new fields.StringField({
          initial: "(Physical description of agent)",
        }),
        wounds: new fields.StringField({ initial: "" }),
        firstAidAttempted: new fields.BooleanField({ initial: false }),
        exhausted: new fields.BooleanField({ initial: false }),
        exhaustedPenalty: new fields.NumberField({ initial: -20 }),
      }),
      biography: new fields.SchemaField({
        profession: new fields.StringField({ initial: "" }),
        employer: new fields.StringField({ initial: "" }),
        nationality: new fields.StringField({ initial: "" }),
        sex: new fields.StringField({ initial: "" }),
        age: new fields.StringField({ initial: "" }),
        education: new fields.StringField({ initial: "" }),
      }),
      corruption: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        haveSeenTheYellowSign: new fields.BooleanField({ initial: false }),
        gift: new fields.StringField({ initial: "" }),
        insight: new fields.StringField({ initial: "" }),
      }),
    };
  }
}

export class NPCData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new fields.NumberField({ initial: 1.0 }),
      sanity: new fields.SchemaField({
        value: new fields.NumberField({ initial: 100 }),
        currentBreakingPoint: new fields.NumberField({ initial: 101 }),
      }),
      notes: new fields.StringField({ initial: "" }),
      shortDescription: new fields.StringField({ initial: "" }),
      showUntrainedSkills: new fields.BooleanField({ initial: true }),
    };
  }
}

export class UnnaturalData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...UnnaturalSkillsActorData.defineSchema(),
      sanity: new fields.SchemaField({
        notes: new fields.StringField({ initial: "" }),
        failedLoss: new fields.StringField({ initial: "1D4" }),
        successLoss: new fields.StringField({ initial: "1" }),
      }),
      schemaVersion: new fields.NumberField({ initial: 1.0 }),
      notes: new fields.StringField({ initial: "" }),
      shortDescription: new fields.StringField({ initial: "" }),
      showUntrainedSkills: new fields.BooleanField({ initial: true }),
    };
  }
}

export class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...SheetSettingsActorData.defineSchema(),
      name: new fields.StringField({ initial: "" }),
      description: new fields.StringField({ initial: "" }),
      shortDescription: new fields.StringField({ initial: "" }),
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10 }),
        min: new fields.NumberField({ initial: 0 }),
        max: new fields.NumberField({ initial: 10 }),
      }),
      speed: new fields.StringField({ initial: "" }),
      expense: new fields.StringField({ initial: "Standard" }),
      passengers: new fields.ArrayField({}),
    };
  }
}
