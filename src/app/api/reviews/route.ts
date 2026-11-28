import { adminCollectionRoute } from "@/lib/admin-route";
import { getReviews, addReview, updateReview, deleteReview } from "@/lib/db";
import { REVIEW_SCHEMA } from "@/lib/validation";
import type { Review } from "@/lib/types";

// Admin only. Reviews are not shown on the public site until verified reviews exist.
export const { GET, POST, PATCH, DELETE } = adminCollectionRoute<Review>({
  name: "reviews",
  // Reviewers are guests: the activity log names reviews by id only.
  logNames: false,
  schema: REVIEW_SCHEMA,
  list: getReviews,
  add: addReview,
  update: updateReview,
  remove: deleteReview,
});
