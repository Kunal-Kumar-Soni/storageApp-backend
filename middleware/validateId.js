import { Types } from "mongoose";

export default function validateId(req, res, next, id) {
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: `Invalid ID ${id}` });
  }
  next();
}
