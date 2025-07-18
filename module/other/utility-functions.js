export default class DGUtils {
  /**
   * Attempt to localize a keyword, and gracefully fallback to something else if the key does not exist.
   * This way people using incomplete translations will not as many crashes or bugs when playing against a newly updated system.
   *
   * @param {String} key - localization key
   * @param {String} fallback - string to fall back to if translation does not exist for key
   * @returns
   */
  static localizeWithFallback(key, fallback) {
    try {
      const translatedValue = game.i18n.localize(key);
      if (translatedValue !== key) {
        return translatedValue;
      }
      console.warn(`Untranslated localization key '${key}'.`);
      // can't have single quotes in a handlebars string literal input, so sort of hack in an escape character for them.
      fallback = fallback.replace("&#39;", "'");
      return fallback;
    } catch (ex) {
      console.warn(ex);
      return fallback;
    }
  }

  /**
   * Format a number with a leading plus.
   *
   * @param {Number} number
   * @returns {String} - the stringified number with a leading plus if applicable
   *
   */
  static formatStringWithLeadingPlus(number) {
    return number > 0 ? `+${number}` : number.toString();
  }

  static htmlClosest(element, selectors) {
    if (element instanceof Element) {
      return element.closest(selectors);
    }
    return null
  }
}
