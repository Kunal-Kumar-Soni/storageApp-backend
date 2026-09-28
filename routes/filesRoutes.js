import express from "express";
import validateId from "../middleware/validateId.js";
import {
  deleteFile,
  getFiles,
  renameFile,
  uploadComplete,
  uploadInitiate,
} from "../controllers/filesController.js";

const router = express.Router();

router.param("parentDirId", validateId);
router.param("id", validateId);

router.post("/upload/initiate", uploadInitiate);
router.post("/upload/complete", uploadComplete);

//Read
router.get("/:id", getFiles);

//Update
router.patch("/:id", renameFile);

//Delete
router.delete("/:id", deleteFile);

export default router;
