# System Documentation

## Table of Contents

1. [Frequently Asked Questions](./faqs.md)
1. [Rolling Checks](#rolling-checks)
2. [Modifying Rolls on the Fly](#modifying-rolls)
3. [Type Skills Such as Art or Piloting](#type-skills)
4. [Lethality Rolls and Damage](#lethality)
5. [Breaking Point](#breaking-point)
6. [Inhuman Rules (Stat Tests Over 100%)](#inhuman-rules)
7. [Ritual Skill](#ritual-skill)
8. [Protection Rating (e.g. the Shield Icon)](#protection-rating-calculation)
9. [Item Macros](#item-macros)

<a name="rolling=checks"></a>

## Rolling Checks

Most labels can be clicked to roll a check or test of some kind. If they can be clicked, they should glow red when the mouse is hovered over them.

![Sanity Roll](./images/sanity_roll.webp)

- Click on _SAN_ (label above current/max sanity) to roll a Sanity check.
- Click on any of the skill labels (such as _Accounting_) to roll a skill test.
- Click on the name of a physical statistic (such as _STR_, on the _Physical_ tab) to roll a test.
- Click on a weapon name (on the _Gear_ tab) to roll the skill test associated with it (e.g. _Firearms_).
- Click on the Damage/Lethality associated with a weapon to roll it.

<a name="modifying-rolls"></a>

## Modifying Rolls on the Fly

Shift-clicking or right-clicking will bring up a dialogue to allow modifying the roll.

![Modify Roll Window](./images/modify_roll_dialogue.webp)

<a name="item-macros"></a>

## Item Macros

Currently there are two built-in item macros, that allow rolling the associated skill check or damage roll for a weapon. Dragging a weapon (try clicking on 'Armor Piercing' to avoid rolling) onto the macro bar results in a macro like this that will roll damage:

```javascript
game.deltagreen.rollItemMacro("Combat Dagger");
```

![Armor Calculation](./images/item_damage_macro.webp)

You can get a macro that rolls the appropriate skill check instead however with this command:

```javascript
game.deltagreen.rollItemSkillCheckMacro("Combat Dagger");
```

Note that both of these macros search **the currently selected token** for the first instance of an item matching the indicated name passed to the function.
