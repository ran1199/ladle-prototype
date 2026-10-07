// A recipe's small picture: the plate photo the user chose to keep, or the
// flat illustration until then. (A recipe card photo stays on the recipe page.)

import type { Recipe } from "@/lib/types";
import { DishIllustration } from "./DishIllustration";

export function RecipeThumb({ recipe, size }: { recipe: Recipe; size: number }) {
  if (recipe.photo?.fromPlate) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small local data URL or bundled photo
      <img
        src={recipe.photo.src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[16px] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DishIllustration kind={recipe.illustration} seed={recipe.id} size={size} />;
}
