import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { updateDirectoriesSize } from "./filesController.js";
import { deleteS3Files } from "../config/s3.js";

export const getDirectoryById = async (req, res) => {
  const user = req.user;
  const _id = req.params.id || user.rootDirId.toString();

  // Find the directory and verify ownership
  const directoryData = await Directory.findOne({ _id, userId: req.user._id }).lean();

  if (!directoryData) {
    return res.status(404).json({ error: "Directory not found or you do not have access to it!" });
  }

  const files = await File.find({ parentDirId: directoryData._id, userId: user._id }).lean();
  const directories = await Directory.find({ parentDirId: _id, userId: user._id }).lean();

  return res.status(200).json({
    ...directoryData,
    files: files.map((file) => ({ ...file, id: file._id })),
    directories: directories.map((dir) => ({ ...dir, id: dir._id })),
  });
};

export const createDirectory = async (req, res, next) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId || user.rootDirId.toString();

  const reqDirname = req.headers.dirname;

  const dirname =
    typeof reqDirname === "string" && reqDirname.trim() ? reqDirname.trim() : "New Folder";

  if (dirname.length > 255) {
    return res.status(400).json({ error: "Invalid directory name" });
  }

  try {
    const parentDir = await Directory.findOne({ _id: parentDirId, userId: user._id });

    if (!parentDir) {
      return res.status(404).json({ message: "Parent Directory Does not exist!" });
    }

    await Directory.insertOne({
      name: dirname,
      parentDirId,
      userId: user._id,
    });

    return res.status(200).json({ message: "Directory Created!" });
  } catch (err) {
    if (err.code === 121) {
      return res.status(400).json({ error: "Invalid input, please enter valid details" });
    }
    return next(err);
  }
};

export const renameDirectory = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;

  if (typeof newDirName !== "string" || !newDirName.trim() || newDirName.trim().length > 255) {
    return res.status(400).json({ error: "Invalid directory name" });
  }

  try {
    const directory = await Directory.findOneAndUpdate(
      { _id: id, userId: user._id },
      { name: newDirName.trim() },
    );

    if (!directory) {
      return res.status(404).json({ error: "Directory not found!" });
    }

    return res.status(200).json({ message: "Directory Renamed!" });
  } catch (err) {
    next(err);
  }
};

export const deleteDirectory = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const directoryData = await Directory.findOne({ _id: id, userId: req.user._id }).lean();

    if (!directoryData) {
      return res.status(404).json({ error: "Directory not found!" });
    }

    async function getDirectoriesContent(id) {
      let directories = await Directory.find({ parentDirId: id, userId: user._id }).select("_id");
      let files = await File.find({ parentDirId: id, userId: user._id }).select("extension");

      for (const { _id } of directories) {
        const { directories: childDirectories, files: childFiles } =
          await getDirectoriesContent(_id);
        directories = [...directories, ...childDirectories];
        files = [...files, ...childFiles];
      }

      return { directories, files };
    }

    const { directories, files } = await getDirectoriesContent(id);

    if (files.length > 0) {
      const keys = files.map(({ _id, extension }) => ({
        Key: `${_id}${extension}`,
      }));

      await deleteS3Files(keys);
    }

    await File.deleteMany({ _id: { $in: files.map(({ _id }) => _id) }, userId: user._id });

    await Directory.deleteMany({
      _id: { $in: [...directories.map(({ _id }) => _id), id] },
      userId: user._id,
    });

    await updateDirectoriesSize(directoryData.parentDirId, -directoryData.size);

    return res.json({ message: "Files deleted successfully" });
  } catch (err) {
    next(err);
  }
};
