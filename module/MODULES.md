# Delta Green system — `module/` layout

Entry point: [`deltagreen.js`](deltagreen.js) (registered in `system.json`).

## Folder responsibilities

| Path                                 | Purpose                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`config/`](config/)                 | System constants (`DG`, skill list, template paths)                                                                                                                                                                                                                                                                   |
| [`data/`](data/)                     | TypeDataModels (`actor/`, `item/`, `derived/`)                                                                                                                                                                                                                                                                        |
| [`active-effect/`](active-effect/)   | Active effect metadata, data model, document class, runtime sync                                                                                                                                                                                                                                                      |
| [`profession/`](profession/)         | Profession catalog, validation, character-creation math, deferred commit ([`commit-character-creation.js`](profession/commit-character-creation.js)), Damaged Veteran modifiers ([`damaged-veteran-modifiers.js`](profession/damaged-veteran-modifiers.js)), disorder IDs ([`disorders.js`](profession/disorders.js)) |
| [`roll/`](roll/)                     | Dice roll subclasses, roll pipeline, and roll UX. [`roll/roll.js`](roll/roll.js) is the public API. Internal Roll subclasses live in [`roll/classes/`](roll/classes/).                                                                                                                                                |
| [`sheets/`](sheets/)                 | ApplicationV2 sheets and mixins                                                                                                                                                                                                                                                                                       |
| [`applications/`](applications/)     | Standalone dialogs, chargen orchestrator ([`profession-setup-flow.js`](applications/profession-setup-flow.js)), shared dialog UI ([`character-creation-ui.js`](applications/character-creation-ui.js)), and dialog factory ([`dg-dialog.js`](applications/dg-dialog.js))                                              |
| [`actor/`](actor/), [`item/`](item/) | Document subclasses                                                                                                                                                                                                                                                                                                   |
| [`chat/`](chat/)                     | Chat cards ([`dg-chat-card.js`](chat/dg-chat-card.js)) and inline actions                                                                                                                                                                                                                                             |
| [`integrations/`](integrations/)     | Optional module hooks (Dice So Nice)                                                                                                                                                                                                                                                                                  |
| [`utils/`](utils/)                   | Generic helpers only (Handlebars, migration, skill layout/tooltips)                                                                                                                                                                                                                                                   |

Root-level modules: [`settings.js`](settings.js), [`templates.js`](templates.js).

## Import conventions

- **Roll types and pipeline:** import `DGRoll`, `DGPercentileRoll`, `createDGRollFromDataset`, `processDGRoll`, etc. from [`roll/roll.js`](roll/roll.js) only — not from [`roll/classes/`](roll/classes/).
- **Roll modifier dialogs:** import from [`roll/roll-dialogs.js`](roll/roll-dialogs.js) only when calling dialogs directly (today only used from roll classes).
- **Skill improvement rolls:** import from [`roll/skill-improvement-roll.js`](roll/skill-improvement-roll.js) (used by agent sheet).
- **Profession logic:** import from [`profession/index.js`](profession/index.js) (includes `commitProfessionSetup`, `getDisorderLabel`, etc.).
- **Profession setup flow:** import `assignProfessionToAgent` from [`applications/profession-setup-flow.js`](applications/profession-setup-flow.js).
- **Dialog factory:** feature dialogs use [`showDgDialog`](applications/dg-dialog.js) — not raw `DialogV2`.
- **Chat cards:** rolls via [`createDGRollChatMessage`](chat/dg-chat-card.js); non-roll cards via [`createDGChatMessage`](chat/dg-chat-card.js).
- **Active effect runtime:** import exhaustion/stimulant sync from [`active-effect/runtime/`](active-effect/runtime/).
- **Derived actor math:** import from [`data/derived/actor-derived.js`](data/derived/actor-derived.js).
- **Agent skill defaults:** single source in [`data/actor/base/agent-skill-defaults.js`](data/actor/base/agent-skill-defaults.js) (used by human actor schema and profession code).

## Profession setup flow

[`profession-setup-flow.js`](applications/profession-setup-flow.js) orchestrates: Pick Statistics → Roll/Assign Stats → Character Creation → Damaged Veterans → (optional follow-ups) → `commitProfessionSetup`. Dialogs return `{ outcome: 'submitted' | 'back', ... }` or `null` (window close aborts). Character Creation alone uses **Cancel** to abort the entire assignment.
