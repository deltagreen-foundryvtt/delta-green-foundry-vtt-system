# Delta Green system — `module/` layout

Entry point: [`deltagreen.js`](deltagreen.js) (registered in `system.json`).

## Folder responsibilities

| Path                                 | Purpose                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`config/`](config/)                 | System constants (`DG`, skill list, template paths)                                                                                                                    |
| [`data/`](data/)                     | TypeDataModels (`actor/`, `item/`, `derived/`)                                                                                                                         |
| [`active-effect/`](active-effect/)   | Active effect metadata, data model, document class, runtime sync                                                                                                       |
| [`profession/`](profession/)         | Profession item skill catalog, validation, and character-creation math                                                                                                 |
| [`roll/`](roll/)                     | Dice roll subclasses, roll pipeline, and roll UX. [`roll/roll.js`](roll/roll.js) is the public API. Internal Roll subclasses live in [`roll/classes/`](roll/classes/). |
| [`sheets/`](sheets/)                 | ApplicationV2 sheets and mixins                                                                                                                                        |
| [`applications/`](applications/)     | Standalone dialogs (profession setup, stats, active effect config)                                                                                                     |
| [`actor/`](actor/), [`item/`](item/) | Document subclasses                                                                                                                                                    |
| [`chat/`](chat/)                     | Chat cards and inline actions                                                                                                                                          |
| [`integrations/`](integrations/)     | Optional module hooks (Dice So Nice)                                                                                                                                   |
| [`utils/`](utils/)                   | Generic helpers only (Handlebars, migration, skill layout/tooltips)                                                                                                    |

## Import conventions

- **Roll types and pipeline:** import `DGRoll`, `DGPercentileRoll`, `createDGRollFromDataset`, `processDGRoll`, etc. from [`roll/roll.js`](roll/roll.js) only — not from [`roll/classes/`](roll/classes/).
- **Roll modifier dialogs:** import from [`roll/roll-dialogs.js`](roll/roll-dialogs.js) only when calling dialogs directly (today only used from roll classes).
- **Skill improvement rolls:** import from [`roll/skill-improvement-roll.js`](roll/skill-improvement-roll.js) (used by agent sheet).
- **Profession logic:** import from [`profession/index.js`](profession/index.js).
- **Active effect runtime:** import exhaustion/stimulant sync from [`active-effect/runtime/`](active-effect/runtime/).
- **Derived actor math:** import from [`data/derived/actor-derived.js`](data/derived/actor-derived.js).
- **Agent skill defaults:** single source in [`data/actor/base/agent-skill-defaults.js`](data/actor/base/agent-skill-defaults.js) (used by human actor schema and profession code).
