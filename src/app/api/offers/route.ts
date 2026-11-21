import { adminCollectionRoute } from "@/lib/admin-route";
import { getOffers, addOffer, updateOffer, deleteOffer } from "@/lib/db";
import { OFFER_SCHEMA } from "@/lib/validation";
import type { Offer } from "@/lib/types";

// Admin only: guests see offers on the server-rendered homepage.
export const { GET, POST, PATCH, DELETE } = adminCollectionRoute<Offer>({
  schema: OFFER_SCHEMA,
  list: getOffers,
  add: addOffer,
  update: updateOffer,
  remove: deleteOffer,
});
