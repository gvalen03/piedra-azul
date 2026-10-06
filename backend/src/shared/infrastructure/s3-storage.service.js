import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import s3Client from "./s3.client.js";

const BUCKET = process.env.AWS_S3_BUCKET;

export class S3StorageService {

  async subirArchivo({ key, contenido, contentType }) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
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
        Bucket: BUCKET,
        Key: key,
      })
    );
  }

  async eliminarArchivo(key) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  }
}