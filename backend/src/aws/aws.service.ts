import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

@Injectable()
export class AwsService implements OnModuleInit {
  private readonly logger = new Logger(AwsService.name)
  private sqsClient?: SQSClient
  private snsClient?: SNSClient
  private ssmClient?: SSMClient

  private readonly region = process.env.AWS_REGION || 'us-east-1'
  private readonly queueUrl = process.env.AWS_SQS_ORDER_QUEUE_URL
  private readonly topicArn = process.env.AWS_SNS_TOPIC_ARN

  onModuleInit() {
    try {
      const config: any = { region: this.region }
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      }

      this.sqsClient = new SQSClient(config)
      this.snsClient = new SNSClient(config)
      this.ssmClient = new SSMClient(config)

      this.logger.log(`AWS Service initialized in region: ${this.region}`)
    } catch (err: any) {
      this.logger.warn(`AWS Service initialization deferred or skipped: ${err.message}`)
    }
  }

  /**
   * Publish an order or background job message to Amazon SQS
   */
  async enqueueOrderMessage(payload: Record<string, any>): Promise<string | null> {
    if (!this.sqsClient || !this.queueUrl) {
      this.logger.debug('AWS SQS queue not configured; skipping enqueue')
      return null
    }

    try {
      const res = await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString(),
          }),
        }),
      )
      this.logger.log(`Message enqueued to SQS: ${res.MessageId}`)
      return res.MessageId ?? null
    } catch (error: any) {
      this.logger.error(`Failed to send message to SQS: ${error.message}`)
      return null
    }
  }

  /**
   * Publish a notification or operational alert to Amazon SNS
   */
  async publishNotification(subject: string, message: string): Promise<string | null> {
    if (!this.snsClient || !this.topicArn) {
      this.logger.debug('AWS SNS topic not configured; skipping notification')
      return null
    }

    try {
      const res = await this.snsClient.send(
        new PublishCommand({
          TopicArn: this.topicArn,
          Subject: subject.slice(0, 100),
          Message: message,
        }),
      )
      this.logger.log(`Notification published to SNS: ${res.MessageId}`)
      return res.MessageId ?? null
    } catch (error: any) {
      this.logger.error(`Failed to publish to SNS: ${error.message}`)
      return null
    }
  }

  /**
   * Retrieve a secret or configuration value from AWS Systems Manager Parameter Store
   */
  async getParameter(name: string, withDecryption = true): Promise<string | null> {
    if (!this.ssmClient) return null
    try {
      const res = await this.ssmClient.send(
        new GetParameterCommand({
          Name: name,
          WithDecryption: withDecryption,
        }),
      )
      return res.Parameter?.Value ?? null
    } catch (err: any) {
      this.logger.warn(`Could not fetch SSM parameter ${name}: ${err.message}`)
      return null
    }
  }
}
