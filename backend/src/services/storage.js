import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import config from '../config/index.js';
import logger from '../config/logger.js';

let s3Client = null;

const getS3Client = () => {
  if (!s3Client && config.storage.s3.bucket && config.storage.s3.accessKeyId && config.storage.s3.secretAccessKey) {
    s3Client = new S3Client({
      region: config.storage.s3.region,
      endpoint: config.storage.s3.endpoint,
      credentials: {
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
      },
    });
  }
  return s3Client;
};

const generateKey = (prefix, originalName) => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const hash = crypto.randomBytes(16).toString('hex');
  return `${prefix}/${Date.now()}-${hash}.${ext}`;
};

export const getPresignedUploadUrl = async (params) => {
  const { prefix, fileName, contentType, expiresIn = 3600 } = params;
  
  if (config.storage.provider !== 's3') {
    throw new Error('S3 storage not configured');
  }

  const client = getS3Client();
  if (!client) {
    throw new Error('S3 client not initialized');
  }

  const key = generateKey(prefix, fileName);
  const command = new PutObjectCommand({
    Bucket: config.storage.s3.bucket,
    Key: key,
    ContentType: contentType,
    // ACL: 'public-read', // Uncomment if you want public read by default
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  
  const publicUrl = config.storage.s3.publicUrl
    ? `${config.storage.s3.publicUrl}/${key}`
    : `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
    expiresIn,
  };
};

export const deleteObject = async (key) => {
  if (config.storage.provider !== 's3') return;

  const client = getS3Client();
  if (!client) return;

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
    }));
  } catch (err) {
    logger.error({ err, key }, 'Failed to delete S3 object');
  }
};

export const getObjectUrl = (key) => {
  if (!config.storage.s3.bucket) return null;
  
  if (config.storage.s3.publicUrl) {
    return `${config.storage.s3.publicUrl}/${key}`;
  }
  
  return `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${key}`;
};

export const isS3Configured = () => {
  return config.storage.provider === 's3' 
    && config.storage.s3.bucket 
    && config.storage.s3.accessKeyId 
    && config.storage.s3.secretAccessKey;
};

export default {
  getPresignedUploadUrl,
  deleteObject,
  getObjectUrl,
  isS3Configured,
};