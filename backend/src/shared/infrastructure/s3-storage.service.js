import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import s3Client from "./s3.client.js";

const obtenerBucket = () => {
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET no está configurado");
  }

  return bucket;
};

export class S3StorageService {

  async subirArchivo({ key, contenido, contentType }) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: obtenerBucket(),
        Key: key,
        Body: contenido,
        ContentType: contentType,
      })
    );

    return key;
  }

  async obtenerArchivo(key) {
    return s3Client.send(
      new GetObjectCommand({
        Bucket: obtenerBucket(),
        Key: key,
      })
    );
  }

  async eliminarArchivo(key) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: obtenerBucket(),
        Key: key,
      })
    );
  }
}