import path from "node:path";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import {
  createGetSignedUrl,
  createUploadSignedUrl,
  deleteS3File,
  getS3FileMetaData,
} from "../config/s3.js";

export const updateDirectoriesSize = async (parentId, deltaSize) => {
  while (parentId) {
    const dir = await Directory.findById(parentId);
    dir.size += deltaSize;
    await dir.save();
    parentId = dir.parentDirId;
  }
};

export const getFiles = async (req, res, next) => {
  const { id } = req.params;

  const fileData = await File.findOne({ _id: id, userId: req.user._id }).lean();

  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    if (req.query.action === "download") {
      const fileUrl = await createGetSignedUrl({
        key: `${id}${fileData.extension}`,
        download: true,
        filename: fileData.name,
      });
      return res.redirect(fileUrl);
    }

    const fileUrl = await createGetSignedUrl({
      key: `${id}${fileData.extension}`,
      filename: fileData.name,
    });
    return res.redirect(fileUrl);
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const renameFile = async (req, res, next) => {
  const { id } = req.params;

  const file = await File.findOne({ _id: id, userId: req.user._id });

  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    file.name = req.body.newFilename;
    await file.save();

    return res.status(200).json({ message: "File Renamed" });
  } catch (err) {
    err.status = 500;
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  const { id } = req.params;

  const file = await File.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    await file.deleteOne();
    await updateDirectoriesSize(file.parentDirId, -file.size);
    const res = await deleteS3File(`${file.id}${file.extension}`);

    return res.status(200).json({ message: "File Deleted Successfully" });
  } catch (err) {
    next(err);
  }
};

export const uploadInitiate = async (req, res) => {
  const parentDirId = req.body.parentDirId || req.user.rootDirId;
  try {
    const parentDirData = await Directory.findOne({
      _id: parentDirId,
      userId: req.user._id,
    });

    // Check if parent directory exists
    if (!parentDirData) {
      return res.status(404).json({ error: "Parent directory not found!" });
    }

    const filename = req.body.name || "untitled";
    const filesize = req.body.size;

    const user = await User.findById(req.user._id);
    const rootDir = await Directory.findById(req.user.rootDirId);

    const remainingSpace = user.maxStorageInBytes - rootDir.size;

    if (filesize > remainingSpace) {
      console.log("File is too large");
      return res.status(507).json({ error: "Not enough storage" });
    }

    const extension = path.extname(filename);

    const insertedFile = await File.insertOne({
      extension,
      name: filename,
      size: filesize,
      parentDirId: parentDirData._id,
      userId: req.user._id,
      isUploading: true,
    });

    const uploadedSignedUrl = await createUploadSignedUrl({
      key: `${insertedFile.id}${insertedFile.extension}`,
      contentType: req.body.contentType,
    });

    return res.json({ uploadedSignedUrl, fileId: insertedFile.id });
  } catch (err) {
    console.dir(err, { depth: null });
  }
};

export const uploadComplete = async (req, res) => {
  const fileData = await File.findById(req.body.fileId);
  if (!fileData) {
    return res.status(404).json({ error: "File not found in our records!" });
  }

  try {
    const fileMetaData = await getS3FileMetaData(`${fileData.id}${fileData.extension}`);
    if (fileData.size !== fileMetaData.ContentLength) {
      await fileData.deleteOne();
      return res.status(400).json({ error: "File size doesn't match" });
    }
    fileData.isUploading = false;
    await fileData.save();
    await updateDirectoriesSize(fileData.parentDirId, fileData.size);
    return res.json({ message: "upload completed" });
  } catch (err) {
    await fileData.deleteOne();
    return res.status(404).json({ error: "File couldn't upload properly" });
  }
};
