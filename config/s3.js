import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.AWS_S3_BUCKET;
if (!bucket) {
  throw new Error("Missing required environment variable: AWS_S3_BUCKET");
}

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

export const createUploadSignedUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
    signableHeaders: new Set(["content-type"]),
  });

  return url;
};

export const createGetSignedUrl = async ({ key, download = false, filename }) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename=${encodeURIComponent(filename)}`,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  return url;
};
export const getS3FileMetaData = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await s3Client.send(command);
};
export const deleteS3File = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await s3Client.send(command);
};
export const deleteS3Files = async (keys) => {
  const command = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: keys,
      Quiet: false,
    },
  });
  return await s3Client.send(command);
};
