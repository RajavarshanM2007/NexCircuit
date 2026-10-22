import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

@Processor('media')
export class MediaProcessorWorker extends WorkerHost {
  private s3 = (() => {
    const awsConfig: any = { region: process.env.AWS_REGION || 'us-east-1' }
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      awsConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    }
    return new S3Client(awsConfig)
  })()

  async process(job: Job) {
    const { buffer, productSlug, filename } = job.data
    const sizes = [
      { suffix: 'hero',   width: 1200 },
      { suffix: 'medium', width: 800  },
      { suffix: 'thumb',  width: 400  },
    ]

    const bucket = process.env.AWS_S3_BUCKET || 'vitelectronics-media'
    for (const { suffix, width } of sizes) {
      const webp = await sharp(Buffer.from(buffer))
        .resize(width).webp({ quality: 90 }).toBuffer()
      const key = `products/${productSlug}/${Date.now()}-${suffix}.webp`
      await this.s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key, Body: webp,
        ContentType: 'image/webp',
      }))
    }

    console.log(`✅ Media processed for ${productSlug}`)
  }
}