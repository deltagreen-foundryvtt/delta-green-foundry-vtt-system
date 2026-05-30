const { HTMLField } = foundry.data.fields;

/**
 * Build toggled ProseMirror markup for a system schema HTML field (App V2).
 * @param {Actor|Item} document
 * @param {string} fieldPath   Path within `document.system` (e.g. "physical.description")
 * @param {object} [options]   Additional options passed to DataField#toInput
 * @returns {Promise<string>}
 */
export async function prepareProseMirrorInput(
  document,
  fieldPath,
  options = {},
) {
  const field = document.system.schema.getField(fieldPath);
  if (!(field instanceof HTMLField)) {
    throw new Error(
      `Rich text field "system.${fieldPath}" must be an HTMLField on ${document.documentName} ${document.name}`,
    );
  }

  const value = foundry.utils.getProperty(document.system, fieldPath) ?? "";
  const enriched =
    await foundry.applications.ux.TextEditor.implementation.enrichHTML(value, {
      async: true,
      rollData: document.getRollData?.() ?? {},
      relativeTo: document,
    });

  const input = field.toInput({
    name: `system.${fieldPath}`,
    value,
    enriched,
    toggled: true,
    documentUUID: document.uuid,
    ...options,
  });

  return input.outerHTML;
}

/**
 * Populate `context.richText` from a list of field specs.
 * @param {Actor|Item} document
 * @param {{ path: string, key: string }[]} fieldSpecs
 * @returns {Promise<Record<string, string>>}
 */
export async function prepareRichTextContext(document, fieldSpecs) {
  const richText = {};
  for (const { path, key } of fieldSpecs) {
    richText[key] = await prepareProseMirrorInput(document, path);
  }
  return richText;
}
