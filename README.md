# Satisfactory Logistics

## Image Generation

- Load the game inside _FModel_, as described in the [Satisfactory Modding documentation](https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html#_searching_for_files)
- Open the Packages > Search window and write `.*(_256|_512)` to filter the icons
- Press `Ctrl + A` to select all the icons
- Right-click on the selection and choose `Save Textures`
- Open the destination (as configured in FModel output settings) and copy the `FactoryGame` folder to `data/assets/`
- Copy the exported `FactoryGame` folder to `data/assets/` (FactoryGame should be a subfolder of `data/assets/`)
- Run the `npm run parse-docs -- --with-images` command to generate the images
