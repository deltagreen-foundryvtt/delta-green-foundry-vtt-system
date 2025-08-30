# _Delta Green: The Role-Playing Game_ System for Foundry VTT

Officially supported rules implementation for [Delta Green: The Role-Playing Game](https://www.deltagreen.com), based on the _Agent's Handbook_ rule set from Arc Dream Publishing, for [Foundry Virtual Tabletop](https://foundryvtt.com/).

> ## Disclaimers
>
> ### Delta Green Community License
>
> Published by Arc Dream Publishing by arrangement with the Delta Green Partnership. The intellectual property known as Delta Green is a trademark and copyright owned by the Delta Green Parternship, who has licensed its use here.
>
> The contents of this system are licensed under the terms of the included [license](LICENSE.txt) file, excepting those elements that are components of the Delta Green intellectual property.
>
> **Please support Arc Dream by purchasing one of their publications:**
>
> - [All publications](https://www.delta-green.com/publications/)
> - [Agent's Handbook (Hardback)](https://shop.arcdream.com/collections/role-playing-games/products/delta-green-agents-handbook)
> - [Agent's Handbook (PDF)](https://www.drivethrurpg.com/product/181674/Delta-Green-Agents-Handbook)
> - [Agent's Handbook (with _The Complex_) **for Foundry VTT**](https://www.drivethrurpg.com/product/181674/Delta-Green-Agents-Handbook)
>
> ---
>
> ### Foundry VTT License
>
> This code uses the Foundry VTT and its API under the terms of the Limited License Agreement for Module Development.
>
> Foundry VTT is a Copyright of Foundry Gaming, LLC.

## Installation Guide

The system is included in the list of official Foundry VTT game systems, and as such can be installed directly from within Foundry.

If there is a need to manually install the system, go to _Game Systems_ and click _Install System_. Then in the _Manifest URL_ input field, paste the following link. Finally, click _Install_:

<https://github.com/deltagreen-foundryvtt/delta-green-foundry-vtt-system/releases/latest/download/system.json>

## System Overview

You may find additional system documentation in the [documentation folder](https://github.com/TheLastScrub/delta-green-foundry-vtt-system/blob/master/documentation/home.md).

_NOTE_ - There is a system setting that controls the styling of the sheets. The current default is "Program" which gives a more modern look. To look more like the way the system looked prior to v1.3.0, choose the 'Cowboys' option.

![Config Screenshot](./documentation/images/system-settings.webp)

See samples of all tabs in the main agent character sheet [here](./documentation/agent_sheet_sample.md).

![Character Sheet Skills Section Screenshot](./documentation/images/agent_sheet_program_skills_tab.webp)

The system automates most of the calculations on the sheet such as maximum HP/WP/SAN. Recalculating break points can be done by clicking a button. Clicking on labels for skills, sanity, x5 skill tests or weapon damage/lethality will automatically roll those tests or damage.

![Example Rolls In Chat Window](./documentation/images/chat_rolls.webp)

Likewise, right-clicking or shift-clicking on a field will bring up a dialogue to modify that roll (default: +20).

![Modify Roll Window](./documentation/images/modify_roll_dialogue.webp)

There is a compendium with numerous sample agents (parsed from the work of _jets_or_chasm_ and _morlock_) of all the professions to get players started quickly if they do not wish to build an Agent themselves, or quickly need a replacement:

![Pregenerated Agent Compendium](./documentation/images/pregen-compendium.webp)

There are also some compendiums currently available with some of the more commonly used items that can be dragged directly onto a character sheet (and then modified as necessary).

![Available Compendium Items](./documentation/images/compendiums.webp)
