const { HTMLField } = foundry.data.fields;

/**
 * Standard Delta Green HTML / ProseMirror field defaults.
 * @param {Partial<foundry.data.fields.StringFieldOptions>} [options]
 * @returns {foundry.data.fields.HTMLField}
 */
export default function DGHTMLField(options = {}) {
  return new HTMLField({
    required: false,
    blank: true,
    initial: "",
    ...options,
  });
}
