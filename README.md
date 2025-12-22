# PokeRogue Move Effectiveness Extension
This is a Chrome extension that adds an overlay that shows the effectiveness of each available move against the enemy's types.

## Current state
The extension is still under development and is not yet ready for use. It's missing:
- A way to discern which are the active pokemon envolved in the battle
- (maybe) positioning the effectiveness badges next to each move in the UI

The moves DB was sourced from [pokemon-data.json](https://github.com/Purukitto/pokemon-data.json).

## Local Development with TypeScript
Since this project uses TypeScript, you're required to compile it to JavaScript before you can load it into Chrome. The `build` script in `package.json` will do this for you while automatically watching for changes.

1. Install dev dependencies:
```powershell
npm install
```

2. Compile the TypeScript files:
```powershell
npm run build
```

3. While the build script is running, open Chrome and navigate to `chrome://extensions/`. Enable "Developer mode" and click "Load unpacked". Select the root directory of this project.

4. Every time you make a change to the TypeScript files, the build script will automatically recompile them but you'll still need to reload the extension in Chrome.

## Credits
This extension is heavily "inspired" by the [RogueDex extension](https://github.com/roguedex-dev/roguedex). While no code was directly copied, many ideas and techniques were borrowed from it.
