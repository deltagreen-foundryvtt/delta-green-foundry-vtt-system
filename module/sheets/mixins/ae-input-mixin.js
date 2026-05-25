/** Copy typographic layout from the real input so the overlay matches except color. */
function syncAeDisplayTypography(input, display) {
  const cs = getComputedStyle(input);
  display.style.inset = "auto";
  display.style.top = cs.borderTopWidth;
  display.style.left = cs.borderLeftWidth;
  display.style.right = cs.borderRightWidth;
  display.style.bottom = cs.borderBottomWidth;
  display.style.font = cs.font;
  display.style.lineHeight = cs.lineHeight;
  display.style.padding = cs.padding;
  display.style.textAlign = cs.textAlign;
  display.style.letterSpacing = cs.letterSpacing;
  display.style.boxSizing = cs.boxSizing;
}

/** @type {WeakMap<HTMLElement, ResizeObserver>} */
const hostObservers = new WeakMap();

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function AeInputMixin(Base) {
  return class AeInputHost extends Base {
    /** @param {HTMLElement} root */
    _bindAeBackedInputs(root) {
      for (const host of root.querySelectorAll(".ae-input-host")) {
        hostObservers.get(host)?.disconnect();

        const input = host.querySelector("input");
        const display = host.querySelector(".ae-input-display");
        if (!input || !display) continue;

        const modifier = Number(display.dataset.aeModifier) || 0;

        const syncTypography = () => syncAeDisplayTypography(input, display);

        const syncDisplay = () => {
          if (host.matches(":focus-within")) return;
          const base = Number(input.value);
          if (Number.isFinite(base)) {
            const effective = Math.max(0, Math.round(base + modifier));
            display.textContent = String(effective);
          }
        };

        input.addEventListener("focus", () => input.select());
        input.addEventListener("blur", () => {
          syncTypography();
          syncDisplay();
        });

        syncTypography();
        requestAnimationFrame(syncTypography);
        syncDisplay();

        const observer = new ResizeObserver(syncTypography);
        observer.observe(input);
        hostObservers.set(host, observer);
      }
    }
  };
}
