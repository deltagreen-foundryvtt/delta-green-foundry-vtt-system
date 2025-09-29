const { SchemaField, NumberField, StringField, BooleanField } =
  foundry.data.fields;

export function skillField(initialValue, label) {
  return new SchemaField({
    proficiency: new NumberField({ initial: initialValue }),
    label: new StringField({ initial: label }),
    failure: new BooleanField({ initial: false }),
  });
}

export function resourceField(initialValue, initialMax) {
  return new SchemaField({
    min: new NumberField({ initial: 0 }),
    value: new NumberField({ initial: initialValue }),
    max: new NumberField({ initial: initialMax }),
  });
}

export function statisticsField(initialValue) {
  return new SchemaField({
    value: new NumberField({ initial: initialValue }),
    distinguishing_feature: new StringField({ initial: "" }),
  });
}
