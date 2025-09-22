import { skillField } from "./general.js";

const { SchemaField, NumberField, StringField, ArrayField } =
  foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

export default class HumanSkillsActorData extends TypeDataModel {
  static defineSchema() {
    return {
      skills: new SchemaField({
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
        unnatural: new SchemaField({
          proficiency: new NumberField({ initial: 0 }),
          label: new StringField({ initial: "Unnatural" }),
        }),
      }),
      typedSkills: new SchemaField({}),
      specialTraining: new ArrayField(new StringField()),
    };
  }
}
