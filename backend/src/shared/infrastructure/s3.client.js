import { S3Client } from "@aws-sdk/client-s3";

const esEntornoLocal = Boolean(process.env.AWS_ENDPOINT_URL);

const config = {
  region: process.env.AWS_REGION || "us-east-1",
};

if (esEntornoLocal) {
  config.endpoint = process.env.AWS_ENDPOINT_URL;
  config.forcePathStyle = true;

  config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  };
}

const s3Client = new S3Client(config);

export default s3Client;