/**
 * Alert Manager
 *
 * Manages alerts for cron job failures and issues
 * Supports multiple notification channels
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertChannel = 'console' | 'webhook' | 'email';

export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  webhookUrl?: string;
  emailRecipients?: string[];
  minSeverity?: AlertSeverity;
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const severityLevels: Record<AlertSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class AlertManager {
  private config: AlertConfig;

  constructor(config: AlertConfig) {
    this.config = {
      minSeverity: 'medium',
      ...config,
    };
  }

  /**
   * Send an alert through configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Check if alert meets minimum severity threshold
    if (
      this.config.minSeverity &&
      severityLevels[alert.severity] < severityLevels[this.config.minSeverity]
    ) {
      return;
    }

    const promises = this.config.channels.map((channel) => {
      switch (channel) {
        case 'console':
          return this.sendToConsole(alert);
        case 'webhook':
          return this.sendToWebhook(alert);
        case 'email':
          return this.sendToEmail(alert);
        default:
          return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Log alert to console
   */
  private async sendToConsole(alert: Alert): Promise<void> {
    const emoji = this.getSeverityEmoji(alert.severity);
    const prefix = `[ALERT ${alert.severity.toUpperCase()}]`;

    console.error(`${emoji} ${prefix} ${alert.title}`);
    console.error(`  Message: ${alert.message}`);
    console.error(`  Time: ${alert.timestamp.toISOString()}`);

    if (alert.metadata) {
      console.error('  Metadata:', JSON.stringify(alert.metadata, null, 2));
    }
  }

  /**
   * Send alert to webhook (e.g., Slack, Discord, custom endpoint)
   */
  private async sendToWebhook(alert: Alert): Promise<void> {
    if (!this.config.webhookUrl) {
      console.error('Webhook URL not configured');
      return;
    }

    try {
      const payload = {
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        metadata: alert.metadata,
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send alert via email
   * Note: This is a placeholder. In production, integrate with a service like SendGrid, SES, etc.
   */
  private async sendToEmail(alert: Alert): Promise<void> {
    if (!this.config.emailRecipients || this.config.emailRecipients.length === 0) {
      console.error('Email recipients not configured');
      return;
    }

    // TODO: Integrate with email service
    console.log(
      `[EMAIL ALERT] Would send to: ${this.config.emailRecipients.join(', ')}`
    );
    console.log(`Subject: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`Body: ${alert.message}`);
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'low':
        return 'ℹ️';
      case 'medium':
        return '⚠️';
      case 'high':
        return '🚨';
      case 'critical':
        return '🔥';
      default:
        return '📢';
    }
  }
}

/**
 * Create alerts based on cron job health status
 */
export function createCronHealthAlerts(health: {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  stats: {
    last24Hours: {
      totalExecutions: number;
      failures: number;
      successRate: number;
      avgDurationMs: number;
    };
  };
  checks: {
    isCronRunning: boolean;
    lastExecution: any;
  };
}): Alert[] {
  const alerts: Alert[] = [];

  // Critical: Cron not running
  if (!health.checks.isCronRunning) {
    alerts.push({
      severity: 'critical',
      title: 'Cron Job Parado',
      message: 'O cron job não executou nas últimas 2 horas. Sistema de scraping pode estar inativo.',
      timestamp: new Date(),
      metadata: {
        lastExecution: health.checks.lastExecution,
        stats: health.stats.last24Hours,
      },
    });
  }

  // High: Success rate below 50%
  if (health.stats.last24Hours.successRate < 50) {
    alerts.push({
      severity: 'high',
      title: 'Taxa de Falha Crítica',
      message: `Taxa de sucesso nas últimas 24h: ${health.stats.last24Hours.successRate.toFixed(1)}%. ${health.stats.last24Hours.failures} falhas detectadas.`,
      timestamp: new Date(),
      metadata: {
        stats: health.stats.last24Hours,
      },
    });
  }

  // Medium: Success rate below 90%
  else if (health.stats.last24Hours.successRate < 90 && health.stats.last24Hours.successRate >= 50) {
    alerts.push({
      severity: 'medium',
      title: 'Falhas Detectadas',
      message: `Sistema apresentando falhas intermitentes. Taxa de sucesso: ${health.stats.last24Hours.successRate.toFixed(1)}%.`,
      timestamp: new Date(),
      metadata: {
        stats: health.stats.last24Hours,
      },
    });
  }

  // Medium: Slow execution times (over 5 minutes average)
  if (health.stats.last24Hours.avgDurationMs > 5 * 60 * 1000) {
    alerts.push({
      severity: 'medium',
      title: 'Execução Lenta',
      message: `Tempo médio de execução acima do esperado: ${(health.stats.last24Hours.avgDurationMs / 1000 / 60).toFixed(1)} minutos.`,
      timestamp: new Date(),
      metadata: {
        avgDurationMs: health.stats.last24Hours.avgDurationMs,
      },
    });
  }

  // Low: Last execution failed
  if (health.checks.lastExecution?.status === 'FAILED') {
    alerts.push({
      severity: 'low',
      title: 'Última Execução Falhou',
      message: 'A execução mais recente do cron job falhou.',
      timestamp: new Date(),
      metadata: {
        lastExecution: health.checks.lastExecution,
      },
    });
  }

  return alerts;
}

/**
 * Default alert manager instance
 * Configure via environment variables
 */
export const defaultAlertManager = new AlertManager({
  enabled: process.env.ALERTS_ENABLED === 'true',
  channels: (process.env.ALERT_CHANNELS?.split(',') as AlertChannel[]) || ['console'],
  webhookUrl: process.env.ALERT_WEBHOOK_URL,
  emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
  minSeverity: (process.env.ALERT_MIN_SEVERITY as AlertSeverity) || 'medium',
});
