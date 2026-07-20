
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the API .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function configureCors() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    console.error('❌ Missing R2 credentials in .env file');
    console.error('Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET');
    process.exit(1);
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  console.log(`🔧 Configuring CORS for bucket: ${bucket}`);

  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: [
              'https://mis.benedictcollege.com', 
              'https://api.benedictcollege.com',
              'http://localhost:5173', 
              'http://localhost:3000',
              '*' // Fallback for now to ensure it works
            ],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600
          }
        ]
      }
    });

    await s3.send(command);
    console.log('✅ Successfully updated CORS configuration for R2 bucket!');
    console.log('The changes might take a few minutes to propagate.');
  } catch (error) {
    console.error('❌ Failed to configure CORS:', error);
    process.exit(1);
  }
}

configureCors();
