<a href="https://satisfactory-logistics.xyz" target="_blank"><img src="./public/images/logo/satisfactory-logistics-logo.png" alt="Satisfactory Logistics" width="600" /></a>

## Description

A web application to help you plan your factory in the game Satisfactory.
Main features include:

- Logistics tracking with factories inputs and outputs
- Calculator for production planning and power generation
- Game saving & sharing

## Development

### Requirements

- Node.js v22 or higher. Use [nvm](https://nvm.sh) to manage Node.js versions easily. `nvm use` will automatically select the correct version.
- NPM as the package manager.
- A code editor like [VSCode](https://code.visualstudio.com/).

### Setup

1. Clone the repository.
2. Install the dependencies with `npm install`.
3. Run the development server with `npm run dev`.

### Code Style

This project uses [Biome](https://biomejs.dev/) to format the code. You can run `npm run format` to apply the code style.

## Contributing

1. Fork the repository.
2. Create a new branch with your feature or fix, like `feature/my-feature` or `fix/my-fix`.
3. Commit your changes and push the branch to your fork.
4. Create a pull request to the `main` branch of this repository.
5. Wait for the review and approval of your pull request.

## Releases & Deployment

The project runs a single-trunk model on the `main` branch:

- **Preview** (`dev.satisfactory-logistics.xyz`) auto-deploys on every push to `main`.
- **Production** (`satisfactory-logistics.xyz`) is deployed only when a release is cut from the GitHub Actions UI.

### Cutting a release

Releases are run from the GitHub Actions tab via the [Release workflow](.github/workflows/release.yml):

1. Open the repository on GitHub → **Actions** → **Release** → **Run workflow**.
2. Pick the bump type (`patch` / `minor` / `major`) and run.

The workflow checks out `main`, runs [release-it](https://github.com/release-it/release-it), and on success:

1. Runs `lint`, `check-types`, and tests as a pre-flight check.
2. Bumps the version in `package.json`.
3. Runs `npm run build` to verify the production build succeeds.
4. Updates `CHANGELOG.md` from conventional commits (`feat:`, `fix:`, `perf:`, `refactor:`).
5. Creates a `chore: release vX.Y.Z` commit and a `vX.Y.Z` annotated tag, pushes both back to `main`.
6. Publishes a matching GitHub Release.
7. Triggers the Render production deploy hook to rebuild `satisfactory-logistics.xyz`.

The Render deploy hook URL is stored as the `RENDER_PROD_DEPLOY_HOOK_URL` repository secret.

## Scripts

### Parse Game Data

This will generate the items, recipes, buildings, and resources data from the game files.

```bash
npm run parse-docs
```

### Image Generation

- Load the game inside _FModel_, as described in the [Satisfactory Modding documentation](https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html#_searching_for_files)
- Open the Packages > Search window and write `.*(_256|_512)` to filter the icons
- Press `Ctrl + A` to select all the icons
- Right-click on the selection and choose `Save Textures`
- Open the destination (as configured in FModel output settings) and copy the `FactoryGame` folder to `data/assets/`
- Copy the exported `FactoryGame` folder to `data/assets/` (FactoryGame should be a subfolder of `data/assets/`)
- Run the `npm run parse-docs -- --with-images` command to generate the images

### Resource Node Data (Map)

The map view in `src/map/` ships with a curated copy of every resource node, deposit, fracking core/satellite, and geyser placement at `src/recipes/WorldResourceNodes.json`. The list is rebuilt from the game's persistent level whenever the game updates.

To regenerate after a Satisfactory update:

1. Load the game in [FModel](https://fmodel.app) (same setup as Image Generation above).
2. Navigate to `FactoryGame/Content/FactoryGame/Map/GameLevel01/Persistent_Level.umap`.
3. Right-click → **Save Properties (.json)**.
4. Move the resulting `Persistent_Level.json` (~100MB) to `data/Persistent_Level.json` in this repo. The file is gitignored so it stays out of commits.
5. Run:

   ```bash
   npm run extract-world-nodes
   ```

   The script does a two-pass walk over the export: first to collect every `BP_ResourceNode_C` / `BP_ResourceDeposit_C` / `BP_FrackingCore_C` / `BP_FrackingSatellite_C` / `BP_ResourceNodeGeyser_C` actor with its resource and purity, then to bind each one's `RootComponent` transform for world coordinates. The output is sorted deterministically and a diff vs. the previous bundled file is printed.

   Useful flags:

   - `--dry-run` — parse and report without writing.
   - `--input <path>` / `--output <path>` — override defaults.
   - `--verbose` — log every emitted node (debug).

6. Review the diff in the script's summary output, then commit `src/recipes/WorldResourceNodes.json`.

> **Heads up:** the parser holds the entire 100MB JSON in memory. If you see out-of-memory errors, prefix the command with `NODE_OPTIONS="--max-old-space-size=4096"`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
