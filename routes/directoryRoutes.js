import express from "express";
import validateId from "../middleware/validateId.js";
import {
  createDirectory,
  deleteDirectory,
  getDirectoryById,
  renameDirectory,
} from "../controllers/directoryController.js";

const router = express.Router();

router.param("parentDirId", validateId);
router.param("id", validateId);

//Read
router.get("/{:id}", getDirectoryById);

//Create
router.post("/{:parentDirId}", createDirectory);

//Update
router.patch("/:id", renameDirectory);

//delete
router.delete("/:id", deleteDirectory);

export default router;
