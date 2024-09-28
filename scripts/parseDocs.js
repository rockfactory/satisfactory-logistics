import fs from "node:fs";

const ImageRegex = /(?:UI|QuantumEnergy)\/(?:IconDesc_)?(.*)_256\./;

const docsJson = JSON.parse(fs.readFileSync("./data/docs-en.json", "utf8"));
const toolsJson = JSON.parse(fs.readFileSync("./data/docs-tools.json", "utf8"));

function parseDocs() {
  const rawItems = docsJson.flatMap((nativeClass) => {
    console.log(nativeClass.NativeClass);
    if (
      nativeClass.NativeClass?.includes("FGItemDescriptor") ||
      nativeClass.NativeClass?.includes("FGResourceDescriptor")
    ) {
      return nativeClass.Classes;
    }

    return [];
  });

  const items = rawItems.map(parseFactoryItem).filter((item) => item !== null);
  fs.writeFileSync(
    "./src/recipes/FactoryItems.json",
    JSON.stringify(items, null, 2)
  );
}

parseDocs();

// from `Desc_NuclearWaste_C` to `nuclear-waste.png`
// should convert to kebab-case and append `.png`, remove `Desc` prefix and `_C` suffix
function convertImageName(className) {
  const mappedSlug = toolsJson.items[className].slug + "_256.png";
  return mappedSlug;
}

function parseFactoryItem(json) {
  if (!toolsJson.items[json.ClassName]) {
    console.log(`Missing item: ${json.ClassName}`);
    return null;
  }

  return {
    id: json.ClassName,
    name: json.mDisplayName,
    displayName: json.mDisplayName,
    description: json.mDescription,
    form: parseFactoryItemForm(json.mForm),
    sinkPoints: parseFloat(json.mResourceSinkPoints),
    sinkable: json.mCanBeDiscarded === "True",
    powerConsumption: parseFloat(json.mEnergyValue),
    radioactiveDecay: parseFloat(json.mRadioactiveDecay),
    canBeDiscarded: json.mCanBeDiscarded === "True",
    color: json.mFluidColor, // Assuming color is from mFluidColor
    // es. from `Desc_NuclearWaste_C` to `nuclear-waste.png`
    imagePath: "./public/images/" + convertImageName(json.ClassName),
  };
}

function parseFactoryItemForm(form) {
  switch (form) {
    case "RF_SOLID":
      return "Solid";
    case "RF_LIQUID":
      return "Liquid";
    case "RF_GAS":
      return "Gas";
    default:
      throw new Error(`Unknown form: ${form}`);
  }
}
