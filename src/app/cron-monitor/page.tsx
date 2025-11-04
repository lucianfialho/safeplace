'use client';

import { useEffect, useState } from 'react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
  checks: {
    isCronRunning: boolean;
    lastExecution: {
      startedAt: string;
      status: string;
      durationMs: number;
      recordsNew: number;
      recordsFailed: number;
    } | null;
  };
  stats: {
    last24Hours: {
      totalExecutions: number;
      failures: number;
      successRate: number;
      avgDurationMs: number;
    };
    lifetime: {
      totalExecutions: number;
    };
  };
}

interface ScraperLog {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PARTIAL_SUCCESS';
  recordsFound: number;
  recordsNew: number;
  recordsDuplicate: number;
  recordsFailed: number;
  errorMessage: string | null;
  scraperVersion: string;
}

interface LogsResponse {
  success: boolean;
  data: {
    logs: ScraperLog[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export default function CronMonitorPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [healthRes, logsRes] = await Promise.all([
        fetch('/api/health/cron'),
        fetch(
          `/api/cron/logs?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`
        ),
      ]);

      const healthData = await healthRes.json();
      const logsData = await logsRes.json();

      setHealth(healthData);
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, page, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando monitoramento...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'SUCCESS':
        return 'bg-green-100 text-green-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      case 'PARTIAL_SUCCESS':
        return 'bg-yellow-100 text-yellow-700';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoramento de Cron Jobs</h1>
            <p className="text-gray-600 mt-2">
              Sistema de scraping OTT - Execução a cada hora
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🔄 Atualizar Agora
            </button>
          </div>
        </div>

        {/* Health Status Card */}
        {health && (
          <div
            className={`mb-8 p-6 rounded-lg border-2 ${getStatusColor(health.status)}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Status: {health.status.toUpperCase()}
                </h2>
                <p className="text-lg mb-4">{health.message}</p>
                <p className="text-sm opacity-75">
                  Última atualização: {formatDate(health.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl mb-2">
                  {health.status === 'healthy'
                    ? '✅'
                    : health.status === 'degraded'
                    ? '⚠️'
                    : '❌'}
                </div>
                <div className="text-sm font-medium">
                  {health.checks.isCronRunning ? '🟢 Ativo' : '🔴 Inativo'}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <div className="text-sm opacity-75 mb-1">Execuções (24h)</div>
                <div className="text-2xl font-bold">
                  {health.stats.last24Hours.totalExecutions}
                </div>
              </div>
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <div className="text-sm opacity-75 mb-1">Taxa de Sucesso</div>
                <div className="text-2xl font-bold">
                  {health.stats.last24Hours.successRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <div className="text-sm opacity-75 mb-1">Tempo Médio</div>
                <div className="text-2xl font-bold">
                  {formatDuration(health.stats.last24Hours.avgDurationMs)}
                </div>
              </div>
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <div className="text-sm opacity-75 mb-1">Total Lifetime</div>
                <div className="text-2xl font-bold">
                  {health.stats.lifetime.totalExecutions}
                </div>
              </div>
            </div>

            {/* Last Execution */}
            {health.checks.lastExecution && (
              <div className="mt-4 bg-white bg-opacity-50 rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Última Execução:</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="opacity-75">Início</div>
                    <div className="font-medium">
                      {formatDate(health.checks.lastExecution.startedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-75">Status</div>
                    <div className="font-medium">
                      {health.checks.lastExecution.status}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-75">Duração</div>
                    <div className="font-medium">
                      {formatDuration(health.checks.lastExecution.durationMs)}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-75">Novos</div>
                    <div className="font-medium">
                      {health.checks.lastExecution.recordsNew}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-75">Falhados</div>
                    <div className="font-medium">
                      {health.checks.lastExecution.recordsFailed}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Histórico de Execuções</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('SUCCESS');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'SUCCESS'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sucesso
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('FAILED');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'FAILED'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Falhas
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          {logs && logs.success && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Início
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duração
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Encontrados
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Novos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duplicados
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Falhados
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Versão
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.data.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.startedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(log.durationMs)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.recordsFound}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {log.recordsNew}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.recordsDuplicate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {log.recordsFailed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.scraperVersion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando página {logs.data.pagination.page} de{' '}
                  {logs.data.pagination.totalPages} ({logs.data.pagination.totalCount}{' '}
                  registros)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!logs.data.pagination.hasPreviousPage}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!logs.data.pagination.hasNextPage}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
