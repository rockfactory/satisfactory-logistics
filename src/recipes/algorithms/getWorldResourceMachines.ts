import { AllFactoryBuildings } from '@/recipes/FactoryBuilding';
import type { FactoryItem } from '@/recipes/FactoryItem';

export function getWorldResourceMachines(resource: FactoryItem) {
  const machines = AllFactoryBuildings.filter(building => {
    if (!building.extractor) return false;
    if (
      building.extractor.allowedResources != null &&
      !building.extractor.allowedResources.includes(resource.id)
    ) {
      return false;
    }
    if (!building.extractor.allowedForms.includes(resource.form)) {
      return false;
    }
    return true;
  });

  return machines;
}
