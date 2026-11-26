import { adminCollectionRoute } from "@/lib/admin-route";
import { getDiningOptions, addDiningOption, updateDiningOption, deleteDiningOption } from "@/lib/db";
import { DINING_SCHEMA } from "@/lib/validation";
import type { DiningOption } from "@/lib/types";

// Admin only: guests see the menu on the server-rendered /dining page.
export const { GET, POST, PATCH, DELETE } = adminCollectionRoute<DiningOption>({
  schema: DINING_SCHEMA,
  list: getDiningOptions,
  add: addDiningOption,
  update: updateDiningOption,
  remove: deleteDiningOption,
});
