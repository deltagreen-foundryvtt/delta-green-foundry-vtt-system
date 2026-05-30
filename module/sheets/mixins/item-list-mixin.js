import { showDgDialog } from "../../applications/dg-dialog.js";

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function ItemListMixin(Base) {
  return class extends Base {
    /** @param {object} [context] */
    _prepareCharacterItems() {
      const { actor } = this;

      const armor = [];
      const weapons = [];
      const gear = [];
      const tomes = [];
      const rituals = [];

      for (const i of actor.items) {
        if (i.type === "armor") {
          armor.push(i);
        } else if (i.type === "weapon") {
          weapons.push(i);
        } else if (i.type === "gear") {
          gear.push(i);
        } else if (i.type === "tome") {
          tomes.push(i);
        } else if (i.type === "ritual") {
          rituals.push(i);
        }
      }

      const nameSort = (a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) return -1;
        if (x > y) return 1;
        return 0;
      };

      const sortSort = (a, b) => a.sort - b.sort;

      if (actor.system.settings.sorting.armorSortAlphabetical) {
        armor.sort(nameSort);
      } else {
        armor.sort(sortSort);
      }

      if (actor.system.settings.sorting.weaponSortAlphabetical) {
        weapons.sort(nameSort);
      } else {
        weapons.sort(sortSort);
      }

      if (actor.system.settings.sorting.gearSortAlphabetical) {
        gear.sort(nameSort);
      } else {
        gear.sort(sortSort);
      }

      if (actor.system.settings.sorting.tomeSortAlphabetical) {
        tomes.sort(nameSort);
      } else {
        tomes.sort(sortSort);
      }

      if (actor.system.settings.sorting.ritualSortAlphabetical) {
        rituals.sort(nameSort);
      } else {
        rituals.sort(sortSort);
      }

      actor.armor = armor;
      actor.weapons = weapons;
      actor.gear = gear;
      actor.rituals = rituals;
      actor.tomes = tomes;
    }

    /** @returns {void} */
    _setupItemDragListeners() {
      const { element } = this;
      const handler = (ev) => this._onDragStart(ev);
      element.querySelectorAll("li.item").forEach((li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    /** @override */
    _onDragStart(event) {
      const li = event.currentTarget;
      if (event.target.classList.contains("content-link")) return;

      let dragData;

      if (li.dataset.itemId) {
        const item = this.actor.items.get(li.dataset.itemId);
        dragData = item.toDragData();
      }

      if (li.dataset.effectId) {
        const effect = this.actor.effects.get(li.dataset.effectId);
        dragData = effect.toDragData();
      }

      if (!dragData) return;

      if (li.dataset.itemId) {
        const item = this.actor.items.get(li.dataset.itemId);
        dragData.itemData = item;
      }

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    /** @override */
    async _onDrop(event) {
      super._onDrop(event);
      if (event.altKey) {
        const TextEditor = foundry.applications.ux.TextEditor.implementation;
        const dragData = TextEditor.getDragEventData(event);
        if (dragData.type === "Item") {
          const item = fromUuidSync(dragData.uuid);
          await item.delete();
        }
      }
    }

    static _onItemAction(event, target) {
      const li = target.closest(".item");
      const { itemId } = li.dataset;
      const { actionType, itemType } = target.dataset;

      switch (actionType) {
        case "create":
          this._onItemCreate(itemType);
          break;
        case "edit": {
          const item = this.actor.items.get(itemId);
          item.sheet.render(true);
          break;
        }
        case "delete": {
          this.actor.deleteEmbeddedDocuments("Item", [itemId]);
          break;
        }
        default:
          break;
      }
    }

    /** @param {String} type */
    _onItemCreate(type) {
      const name = game.i18n.format(
        game.i18n.translations.DOCUMENT?.New || "DG.FallbackText.newItem",
        {
          type: game.i18n.localize(`TYPES.Item.${type}`),
        },
      );

      const itemData = {
        name,
        type,
        system: {},
      };

      if (type === "bond") {
        itemData.system.score =
          this.actor.system.statistics.cha.effectiveValue ??
          this.actor.system.statistics.cha.value;
      }

      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    /** Handler for generic toggle events */
    static _toggleGeneric(event, target) {
      const { prop } = target.dataset;
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      this.toggle(prop, itemId);
    }

    /** Handler for item-sort-mode toggle events */
    static _toggleItemSortMode(event, target) {
      const itemType = target.dataset.gearType;
      const propString = `${itemType}SortAlphabetical`;
      const targetProp = `system.settings.sorting.${propString}`;
      this.toggle(targetProp);
    }

    static _browsePack(event, target) {
      const { packType } = target.dataset;
      if (packType === "weapon") {
        this._browseWeaponPack().catch((error) => {
          console.error(error);
        });
        return;
      }

      game.packs
        .find((k) => k.collection === `deltagreen.${packType}`)
        .render(true);
    }

    async _browseWeaponPack() {
      await showDgDialog({
        modifier: "browse-weapon-pack",
        window: {
          title: game.i18n.localize("DG.Gear.SelectCompendium"),
        },
        buttons: [
          {
            action: "firearms",
            label: game.i18n.localize("DG.Gear.WeaponTypes.Firearms"),
            icon: '<i class="fas fa-crosshairs"></i>',
            callback: () =>
              game.packs
                .find((k) => k.collection === "deltagreen.firearms")
                .render(true),
          },
          {
            action: "melee",
            label: game.i18n.localize("DG.Gear.WeaponTypes.Melee"),
            icon: '<i class="far fa-hand-rock"></i>',
            callback: () =>
              game.packs
                .find((k) => k.collection === "deltagreen.hand-to-hand-weapons")
                .render(true),
          },
        ],
      });
    }

    /**
     * @param {string} prop
     * @param {string} [itemId]
     */
    toggle(prop, itemId) {
      const item = this.actor.items.get(itemId);
      const targetDoc = item ?? this.actor;

      const currentVal = foundry.utils.getProperty(targetDoc, prop);
      targetDoc.update({ [prop]: !currentVal });
    }
  };
}
