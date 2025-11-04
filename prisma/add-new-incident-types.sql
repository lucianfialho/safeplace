-- Migration: Add new incident types to IncidentType enum
-- Run this in Neon SQL Editor before running npm run db:generate

-- Add new incident types
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ASSALTO';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ARRASTAO';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'MANIFESTACAO';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'TOQUE_DE_RECOLHER';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'PERSEGUICAO_POLICIAL';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ROUBO_DE_CARGA';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'CARROS_NA_CONTRAMAO';
