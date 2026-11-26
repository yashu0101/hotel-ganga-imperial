import { adminCollectionRoute } from "@/lib/admin-route";
import { getRooms, addRoom, updateRoom, deleteRoom } from "@/lib/db";
import { ROOM_SCHEMA } from "@/lib/validation";
import type { Room } from "@/lib/types";

// Rooms are addressed by id. Guests (the booking form) only receive visible rooms.
export const { GET, POST, PATCH, DELETE } = adminCollectionRoute<Room>({
  schema: ROOM_SCHEMA,
  list: getRooms,
  add: addRoom,
  update: updateRoom,
  remove: deleteRoom,
  publicFilter: r => !r.hidden,
});
