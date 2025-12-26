# PokeRogue Move Effectiveness Extension
This is a Chrome extension that adds an overlay that shows the effectiveness of each available move against the enemy's types.

## Current state
The extension is working and published on the [Chrome Web Store](https://chromewebstore.google.com/detail/pokerogue-move-effectiven/eddppccaklpaijbchhhilfghgnigflco). It currently supports single and double battles against wild pokemon and trainers.

## Local Development
Since this project uses TypeScript, you're required to compile it to JavaScript before you can load it into Chrome. The `build` script in `package.json` will do this for you while automatically watching for changes.

1. Install dev dependencies:
    ```powershell
    npm install
    ```

2. Compile the TypeScript files:
    ```powershell
    npm run build
    ```
    This will start a watch process that recompiles the TypeScript files whenever they change.

3. Open Chrome and navigate to `chrome://extensions/`. Enable "Developer mode" and click "Load unpacked". Select the root directory of this project.

4. Every time you make a change to the TypeScript files, the build script will automatically recompile them but you'll still need to reload the extension in Chrome.

## Strategies and Implementation Details
Please refer to the [notes.md](notes.md) file for a detailed explanation of the strategies considered and the implementation details.

## Credits
This extension is heavily "inspired" by the [RogueDex extension](https://github.com/roguedex-dev/roguedex). While no code was directly copied, many ideas and techniques were borrowed from it.
The moves and pokedex DBs were sourced from [pokemon-data.json](https://github.com/Purukitto/pokemon-data.json).