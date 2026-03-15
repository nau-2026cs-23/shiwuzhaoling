import { Router, Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/s3';
import { UploadRepository } from '../repositories/upload';
import { AppError } from '../middleware/errorHandler';
import { insertUploadSchema } from '../db/schema';
import crypto from 'crypto';

const router = Router();
const uploadRepo = new UploadRepository();

// Generate presigned URL for simple upload
const generatePresignedUrlHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType || !fileSize) {
      throw new AppError(
        'Missing required fields: fileName, fileType, fileSize',
        400
      );
    }

    // Validate file size based on subscription tier
    const tier = process.env.SUBSCRIPTION_TIER || 'FREE';
    const tierLimits: Record<string, number> = {
      FREE: 10 * 1024 * 1024, // 10MB
      STARTER: 50 * 1024 * 1024, // 50MB
      PRO: 100 * 1024 * 1024, // 100MB
      BUSINESS: 500 * 1024 * 1024, // 500MB
      ENTERPRISE: 1000 * 1024 * 1024, // 1GB
    };

    const maxSize = tierLimits[tier.toUpperCase()] || tierLimits.FREE;

    if (fileSize > maxSize) {
      const limitText =
        maxSize === Infinity
          ? 'unlimited'
          : `${Math.round(maxSize / (1024 * 1024))}MB`;
      throw new AppError(
        `File size exceeds ${limitText} limit for ${tier} tier`,
        400
      );
    }

    // Generate unique upload ID and S3 key
    const uploadId = crypto.randomUUID();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const documentId = process.env.DOCUMENT_ID;
    const key = `${S3_CONFIG.FOLDER_PREFIX}/${process.env.FOLDER_NAME}/${documentId}/${timestamp}-${sanitizedFileName}`;

    // Create presigned URL for direct upload
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: S3_CONFIG.PRESIGNED_URL_EXPIRY,
    });

    res.json({
      success: true,
      data: {
        uploadId,
        presignedUrl,
        s3Key: key,
        expiresIn: S3_CONFIG.PRESIGNED_URL_EXPIRY,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Complete upload and save to database
const completeUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { uploadId, fileName, fileSize, fileType, s3Key } = req.body;

    if (!uploadId || !fileName || !fileSize || !fileType || !s3Key) {
      throw new AppError('Missing required fields', 400);
    }

    // Generate public S3 URL
    const s3Url = `https://${S3_CONFIG.BUCKET_NAME}.s3.${S3_CONFIG.REGION}.amazonaws.com/${s3Key}`;

    // Validate and normalize request data at the route boundary.
    const validated = insertUploadSchema.parse({
      fileName,
      fileSize,
      fileType,
      s3Key,
      s3Url,
      uploadId,
      status: 'completed',
    });

    const upload = await uploadRepo.create(validated);

    res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.post('/presigned-url', generatePresignedUrlHandler);
router.post('/complete', completeUpload);

export default router;
