# Satisfactory Logistics

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

This project uses [Prettier](https://prettier.io/) to format the code. You can run `npm run format` to apply the code style.

## Contributing

1. Fork the repository.
2. Create a new branch with your feature or fix, like `feature/my-feature` or `fix/my-fix`.
3. Commit your changes and push the branch to your fork.
4. Create a pull request to the `dev` branch of this repository.
5. Wait for the review and approval of your pull request.

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
