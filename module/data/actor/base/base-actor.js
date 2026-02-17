import { resourceField, statisticsField } from "./general.js";

const { SchemaField } = foundry.data.fields;

export default class BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      health: resourceField(10, 10),
      wp: resourceField(10, 10),
      statistics: new SchemaField({
        str: statisticsField(10),
        con: statisticsField(10),
        dex: statisticsField(10),
        int: statisticsField(10),
        pow: statisticsField(10),
        cha: statisticsField(10),
      }),
    };
  }
}
