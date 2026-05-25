const { SchemaField, NumberField, StringField, BooleanField } =
  foundry.data.fields;

export function skillField(initialValue, label) {
  return new SchemaField({
    proficiency: new NumberField({
      initial: initialValue,
      min: 0,
      max: 99,
      integer: true,
    }),
    label: new StringField({ initial: label }),
    failure: new BooleanField({ initial: false }),
  });
}

export function resourceField(initialValue, initialMax) {
  return new SchemaField({
    min: new NumberField({ initial: 0, min: 0, integer: true }),
    value: new NumberField({ initial: initialValue, min: 0, integer: true }),
    max: new NumberField({ initial: initialMax, min: 0, integer: true }),
  });
}

/** Agent resources that support Active Effect maximum bonuses. */
export function agentResourceField(initialValue, initialMax) {
  return new SchemaField({
    min: new NumberField({ initial: 0, min: 0, integer: true }),
    value: new NumberField({ initial: initialValue, min: 0, integer: true }),
    max: new NumberField({ initial: initialMax, min: 0, integer: true }),
    maxBonus: new NumberField({ initial: 0, integer: true }),
  });
}

export function statisticsField(initialValue) {
  return new SchemaField({
    value: new NumberField({ initial: initialValue, min: 0, integer: true }),
    modifier: new NumberField({ initial: 0, integer: true }),
    distinguishing_feature: new StringField({ initial: "" }),
  });
}
