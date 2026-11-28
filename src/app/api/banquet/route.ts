import { adminCollectionRoute } from "@/lib/admin-route";
import { getBanquetPackages, addBanquetPackage, updateBanquetPackage, deleteBanquetPackage } from "@/lib/db";
import { BANQUET_SCHEMA } from "@/lib/validation";
import type { BanquetPackage } from "@/lib/types";

// Guests (the booking form) only receive active packages.
export const { GET, POST, PATCH, DELETE } = adminCollectionRoute<BanquetPackage>({
  name: "banquet",
  schema: BANQUET_SCHEMA,
  list: getBanquetPackages,
  add: addBanquetPackage,
  update: updateBanquetPackage,
  remove: deleteBanquetPackage,
  publicFilter: p => p.active,
});
