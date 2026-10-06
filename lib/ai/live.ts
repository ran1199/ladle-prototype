// The live engine (Milestone 9, later): real Claude through Ladle's server routes.
// Not built yet; every call explains that.

import { AIError, type LadleAI } from "./types";

const notYet = async (): Promise<never> => {
  throw new AIError("Live AI isn’t available in this prototype yet.");
};

export const liveEngine: LadleAI = {
  extractRecipe: notYet,
  analyzePlate: notYet,
  estimateCorrection: notYet,
  searchFood: notYet,
  estimateRestaurantPlate: notYet,
};
