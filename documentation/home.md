# System Documentation: Delta Green for Foundry VTT

## Table of Contents

1. [Agent Sheeet](#agent-sheet)
2. [Rolls](#rolls)
3. [Compendia](#compendia)
4. [Item Macros](#item-macros)
5. [Frequently Asked Questions](./faqs.md)

## Agent Sheet

The Agent sheet is divided into several tabs. For more information on the Agent sheet and examples of each tab, [see here](./agent_sheet_sample.md).

![Character Sheet Skills Section Screenshot](./images/agent_sheet_program_skills_tab.webp)

The system automates most of the calculations on the sheet such as maximum HP/WP/SAN. Recalculating break points can be done by clicking a button.

### Sheet Themes

There is a system setting that controls the styling of the sheets. The current default is "Program" which gives a more modern look. To look more like the way the system looked prior to v1.3.0, choose the 'Cowboys' option.

![Config Screenshot](./images/system-settings.webp)

## Rolls

Clicking on labels for skills, sanity, x5 skill tests or weapon damage/lethality will automatically roll those tests or damage.

![Example Rolls In Chat Window](./images/chat_rolls.webp)

### Modifying Rolls

Right-clicking or shift-clicking on a field will bring up a dialogue to modify that roll (default: +20%).

![Modify Roll Window](./images/modify_roll_dialogue.webp)

### Types of Rolls

- Click on _SAN_ (label above current/max sanity) to roll a Sanity check.
- Click on any of the skill labels (such as _Accounting_) to roll a skill test.
- Click on the name of a physical statistic (such as _STR_, on the _Physical_ tab) to roll a test.
- Click on a weapon name (on the _Gear_ tab) to roll the skill test associated with it (e.g. _Firearms_).
- Click on the Damage/Lethality associated with a weapon to roll it.

![Sanity Roll](./images/sanity_roll.webp)

## Compendia

There is a compendium with numerous sample agents (parsed from the work of _jets_or_chasm_ and _morlock_) of all the professions. These can be used to get players started quickly if they do not wish to build an Agent themselves, or quickly need a replacement:

![Pregenerated Agent Compendium](./images/pregen-compendium.webp)

There are also compendia which contain some of the more commonly used Items. These Items can be dragged directly onto a character sheet (and then be modified as necessary).

![Available Compendium Items](./images/compendiums.webp)

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

**Note:** Both of these macros search **_the currently selected token_** for the first instance of an Item matching the indicated name passed to the function.

## Frequently Asked Questions

[FAQs](./faqs.md)
