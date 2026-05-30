import { AGENT_SKILL_DEFAULTS } from "./agent-skill-defaults.js";
import { skillField } from "./general.js";

const { SchemaField, NumberField, StringField, ArrayField, ObjectField } =
  foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

export default class HumanSkillsActorData extends TypeDataModel {
  static defineSchema() {
    const d = AGENT_SKILL_DEFAULTS;
    return {
      skills: new SchemaField({
        accounting: skillField(d.accounting, "Accounting"),
        alertness: skillField(d.alertness, "Alertness"),
        anthropology: skillField(d.anthropology, "Anthropology"),
        archeology: skillField(d.archeology, "Archeology"),
        artillery: skillField(d.artillery, "Artillery"),
        athletics: skillField(d.athletics, "Athletics"),
        bureaucracy: skillField(d.bureaucracy, "Bureaucracy"),
        computer_science: skillField(d.computer_science, "Computer Science"),
        criminology: skillField(d.criminology, "Criminology"),
        demolitions: skillField(d.demolitions, "Demolitions"),
        disguise: skillField(d.disguise, "Disguise"),
        dodge: skillField(d.dodge, "Dodge"),
        drive: skillField(d.drive, "Drive"),
        firearms: skillField(d.firearms, "Firearms"),
        first_aid: skillField(d.first_aid, "First Aid"),
        forensics: skillField(d.forensics, "Forensics"),
        heavy_machiner: skillField(d.heavy_machiner, "Heavy Machinery"),
        heavy_weapons: skillField(d.heavy_weapons, "Heavy Weapons"),
        history: skillField(d.history, "History"),
        humint: skillField(d.humint, "HUMINT"),
        law: skillField(d.law, "Law"),
        medicine: skillField(d.medicine, "Medicine"),
        melee_weapons: skillField(d.melee_weapons, "Melee Weapons"),
        navigate: skillField(d.navigate, "Navigate"),
        occult: skillField(d.occult, "Occult"),
        persuade: skillField(d.persuade, "Persuade"),
        pharmacy: skillField(d.pharmacy, "Pharmacy"),
        psychotherapy: skillField(d.psychotherapy, "Psychotherapy"),
        ride: skillField(d.ride, "Ride"),
        search: skillField(d.search, "Search"),
        sigint: skillField(d.sigint, "SIGINT"),
        stealth: skillField(d.stealth, "Stealth"),
        surgery: skillField(d.surgery, "Surgery"),
        survival: skillField(d.survival, "Survival"),
        swim: skillField(d.swim, "Swim"),
        unarmed_combat: skillField(d.unarmed_combat, "Unarmed Combat"),
        unnatural: new SchemaField({
          proficiency: new NumberField({ initial: 0, min: 0, max: 99, integer: true }),
          label: new StringField({ initial: "Unnatural" }),
        }),
      }),
      typedSkills: new ObjectField({}),
      specialTraining: new ArrayField(
        new SchemaField({
          attribute: new StringField(),
          id: new StringField(),
          name: new StringField(),
        }),
      ),
    };
  }
}
