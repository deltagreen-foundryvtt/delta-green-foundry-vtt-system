# Contributing

> 👋 **Need Help**?
>
> This guide is meant to help you get started with contributing to this project. It provides links to many useful resources and you are encouraged to read them. Of course, there will still be questions.
>
> If you have any questions about contributing to this project, or are confused about a step in this guide, please visit [our Discord](https://discord.gg/QRK6a28692) for help.

## Tooling

**If you don't already know what a formatter and linter are, read the following guide, the sections "Formatters" and "Linters", especially: [Formatters, linters, and compilers: Oh my!](https://github.com/readme/guides/formatters-linters-compilers)**

### Formatters

- JavaScript, JSON, CSS: [Prettier](https://prettier.io/docs/install)
- Handlebars: [DJLint](https://djlint.com/docs/getting-started/)

### Linters

- JavaScript: [Eslint](https://eslint.org/docs/latest/use/getting-started)
- Markdown: [Markdownlint](https://github.com/markdownlint/markdownlint)
- Handlebars: DJLint (see above)
- CSS: VSCode Built-in

### Misc

- [EditorConfig](https://editorconfig.org/) - Used to standardize file configurations like tabs vs. spaces, end-of-line characters, etc.
- [FVTT CLI](https://github.com/foundryvtt/foundryvtt-cli) - Used to package document JSON files into LevelDB packs, and vice-versa. In simpler terms, this lets us convert documents in compendia into JSON files, OR turn those JSON files back into documents in the compendia.

### VSCode Extensions

These extensions will be auto-recommended to install. If you do not use VSCode, there are likely integrations with your code editor.

- [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [esbenp.prettier-vscode](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [monosans.djlint](https://marketplace.visualstudio.com/items?itemName=monosans.djlint)
- [DavidAnson.vscode-markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)
- [EditorConfig.EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)

## Setting up a Development Environment

To test or develop for the system, you want a local environment where you can test and make your changes safely. This section will help you get everything set up.

### 1. Install Git

If you haven’t already, install [Git](https://git-scm.com/). It allows you to clone the repository and contribute code.

In a terminal, navigate to the directory where you want to keep the repository. Then, clone the repository:

- via HTTPS:
  `git clone https://github.com/TheLastScrub/delta-green-foundry-vtt-system.git`
- via SSH (preferred if you have SSH keys set up):
  `git clone git@github.com:TheLastScrub/delta-green-foundry-vtt-system.git`

Then navigate into the cloned folder:

```bash
cd delta-green-foundry-vtt-system
```

### 2. Install Node.js and NPM

Download and install the [LTS version of Node.js](https://nodejs.org/en/download/), which includes `npm` (Node Package Manager). This is used to install dependencies and run project tooling like linters and formatters.

Verify installation:

```bash
node -v
npm -v
```

### 3. Install Project Dependencies

1. Navigate to the project directory and run the following:

   ```bash
   npm install
   ```

   This installs all required development packages, such as `prettier`, `eslint`, and the others listed in `package.json`.

2. Install `djlint` (doesn't come through NPM). This requires `Python` and `pip`; instructions for installing these are specific to your operating system, and beyond the scope of this guide.

### 4. Set Up Your Code Editor

We recommend [Visual Studio Code](https://code.visualstudio.com/) for working on this project, but you're welcome to use any editor. The following extensions are **auto-recommended** by VSCode, but here they are again for special instructions, manual installation, or reference.

- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) – Code formatter
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) – JavaScript linter
- [DJLint](https://marketplace.visualstudio.com/items?itemName=monosans.djlint) – Handlebars linter/formatter

  - If you used a Python virtual environment to install DJLint, make sure to set the VSCode extension's setting `djlint.pythonPath` to the path to your virtual environment. For example:

    ```bash
    # Windows
    C:/Users/<username>/.virtualenvs/djlint/bin/python

    # Linux
    /home/<username>/.virtualenvs/djlint/bin/python
    ```

- [Markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) – Linter for Markdown
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) – Honors `.editorconfig` file rules

Once these extensions are installed, your editor should automatically highlight formatting or linting issues.

Your pull request will automatically be checked for linting and formatting via GitHub Actions. If your changes don't pass, they can't be merged (see [Branching and Pull Requests](#branching-and-pull-requests)).

### 5. Set Up a Local Foundry VTT Test World

1. We **highly** recommend setting up a separate instance of Foundry from your main installation. This way you are not at risk of breaking things in live worlds.

   - There are several ways to do this, but the easiest is to download the NodeJS version of Foundry (make sure to replace `<your-username>` in the following link): `https://foundryvtt.com/community/<your-username>/licenses`
   - Follow the rest of the instructions in [this youtube video](https://youtu.be/B74ZAp3xx3o) to get it up and running (make sure to look at the comment there by `@Makofueled` because Foundry's folder structure has changed slightly since the video was posted).

1. [Symlink](https://en.wikipedia.org/wiki/Symbolic_link) the cloned system folder to Foundry’s `Data/systems` directory.

   - This is the folder you chose to store your data in the previous step.
   - Otherwise, if you are not using the NodeJS version of Foundry, this directory is likely located at:

     - **Windows**: `%localappdata%/FoundryVTT/Data/systems/`
     - **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems/`
     - **Linux**: `~/.local/share/FoundryVTT/Data/systems/`

   Symlinking allows developers to choose where to keep our system repos, while also allowing Foundry to see them.

   Example:

   ```bash
   # Mac/Linux
   ln -s /path/to/your/cloned/delta-green-foundry-vtt-system /path/to/FoundryVTT/Data/systems/deltagreen
   ```

   ```bash
   # Windows (Command Prompt, requires admin privileges)
   mklink /D "%localappdata%/FoundryVTT/Data/systems/deltagreen" "%cd%/delta-green-foundry-vtt-system"
   ```

### 6. Start Developing

- Use the developer console (`F12` in most browsers) to inspect logs and debug issues.
- Make changes to code and refresh the browser to see them take effect.

## Branching, Commits, and Pull Requests

Work should always happen on a new branch, i.e., not `master`.

### Branch Naming

Branch names should conform to the following format:

`author-identifier/issue-number/short-description`

The `author-identifier` could be your username, or your first name followed by your last initial, just try to keep it short but identifiable.

Examples:

- `jalenml/420/fix-sanity-rolls`
- `snake-eater/69/add-token-config`
- `tiff123/101/lint-pass`

If there's no GitHub issue yet, you can omit the number:
`author-identifier/short-description` is acceptable. However, it is usually best to make a GitHub issue first to track its progress and leave it open for comment.

### Commit Messages

- Please try to follow [the Seven Rules of a Great Commit Messages](https://gist.github.com/julienbourdeau/e605e4b8b47da97c249a0f72598529c8) as much as possible.
- Slight deviations from the above are okay, but this is what we should be going for.

### Keeping Your Branch Up-To-Date

We prefer a **rebase** workflow to keep history clean and avoid merge commits. If changes have been made to `master` while you've been working:

````bash
git checkout your-branch-name
git fetch origin
git rebase origin/master
```every developer is going to

If you’re new to rebasing, GitLab has a solid primer:
[About Git rebase](https://docs.gitlab.com/topics/git/git_rebase/)

If you run into conflicts, Git will guide you through resolving them. After a successful rebase, you'll need to force-push:

- `git push --force-with-lease`

```text
⚠️ Never force-push to a shared branch without coordinating with the other contributor(s) to that branch.
````

### Before Opening a Pull Request

Make sure your code is clean and ready:

- ✅ You’ve manually tested your change in a local Foundry world.
- ✅ `npm run lint` shows no errors
- ✅ `npm run format:check` passes
- ✅ Your editor doesn’t show linting/formatting warnings.

We use a GitHub Action to enforce code quality. If your code doesn’t meet the linting and formatting standards, your PR cannot be merged until those checks pass.

Screenshots or gifs are **highly encouraged** for visual/UI changes!

## Working with Compendia

- Tell the FVTT CLI that we are working on our delta green package: `fvtt package workon fvtt package workon "deltagreen" --type "System"`
- To **export** JSON files to a compendium pack: `fvtt package pack "armor" --in "packs/source/armor" --out "packs"`
- To **extract** a compendium pack to JSON files: `fvtt package pack "armor" --in "packs" --out "packs/source/armor"`
- Replace `armor` with the name of the compendium pack you are working on.
- This allows you to make changes to either the JSON files themselves, OR to the in-game compendium packs, whichever makes most sense for the task. It also allows the developers to not have to commit binary LevelDB data to our repo, which is not adviced.

## Localization

We use [Foundry VTT’s built-in localization system](https://foundryvtt.com/article/localization/) to support multiple languages.

### Best Practices

- See this [Foundry VTT Community Wiki article](https://foundryvtt.wiki/en/development/guides/localization/localization-best-practices).

### Where to Add Translations

Localization files live in `lang/` as JSON files. **The `en.json` file is the source of truth.** If you are adding new strings, they must first appear in `en.json`.

To translate, add the matching keys to the appropriate language file (e.g., `fr.json`, `de.json`) with the translated value.

### How to Reference Localized Strings

Do **not** hardcode text directly into HTML or JavaScript. Instead, use localization keys like so:

- **Handlebars**:

  ```handlebars
  {{localize "DG.Skills.accounting"}}
  <!-- Or for string interpolation: -->
  {{localize "DG.FallbackText.newItem" type="TYPES.Item.weapon"}}
  ```

- **JavaScript**:

  ```js
  game.i18n.localize("DG.Skills.accounting");
  // Or for string interpolation:
  game.i18n.format("DG.FallbackText.newItem", {
    type: "TYPES.Item.weapon",
  });
  ```

If you're unsure whether a string should be localized, it probably should be.

## Bug Reports and Feature Requests

If you're reporting a bug or requesting a feature:

- Use [GitHub Issues](https://github.com/TheLastScrub/delta-green-foundry-vtt-system/issues)
- Be descriptive. Include screenshots, steps to reproduce, Foundry version, system version, and browser if applicable.

---

**Disclaimer:**
This contribution guide was made with the partial help of ChatGPT, which assisted in the phrasing and formatting of some lines.
