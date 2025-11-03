-- Add OPERACAO_POLICIAL to IncidentType enum
-- Run this in Neon SQL Editor

ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'OPERACAO_POLICIAL';
