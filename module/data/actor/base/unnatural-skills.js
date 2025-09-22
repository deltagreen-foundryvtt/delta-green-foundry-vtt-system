import { skillField } from "./general.js";

const { SchemaField, NumberField, StringField, ArrayField } =
  foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

export default class UnnaturalSkillsActorData extends TypeDataModel {
  static defineSchema() {
    return {
      skills: new SchemaField({
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
