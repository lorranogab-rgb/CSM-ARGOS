/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Serviço de Integração com Google Drive API v3
 * Permite listar, ler e cruzar laudos periciais salvos no Google Drive com a frota do CSM:ARGOS.
 */

import { cleanIdStr, cleanDigitsOnly } from '../utils/vehicleMatcher';
import { Vehicle } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parsedData?: any;
  extractedPlaca?: string;
  extractedChassi?: string;
  extractedPatrimonio?: string;
}

export interface DriveCrossReferenceResult {
  file: DriveFileItem;
  matchedVehicle?: Vehicle;
  status: 'CORRESPONDENCIA_ENCONTRADA' | 'VEICULO_NAO_ENCONTRADO_NA_FROTA' | 'ERRO_DE_LEITURA';
  matchKey?: 'PLACA' | 'CHASSI' | 'PATRIMONIO' | 'NOME_ARQUIVO';
  details?: string;
}

export interface DriveCrossReferenceSummary {
  folderId: string;
  totalFiles: number;
  matchedCount: number;
  unmatchedCount: number;
  results: DriveCrossReferenceResult[];
  uninspectedFleetCount: number;
}

/**
 * Extrai o ID da pasta a partir da URL do Google Drive ou retorna o próprio ID
 */
export function extractFolderId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  const idMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return trimmed;
}

/**
 * Lista os arquivos contidos em uma pasta do Google Drive
 */
export async function listDriveFolderFiles(folderId: string, accessToken: string): Promise<DriveFileItem[]> {
  const cleanId = extractFolderId(folderId);
  if (!cleanId) throw new Error('ID ou link da pasta do Google Drive inválido.');
  if (!accessToken) throw new Error('Token de autorização do Google Drive não fornecido. Faça login com a Conta Google.');

  const query = encodeURIComponent(`'${cleanId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao acessar o Google Drive (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Lê o conteúdo textual/binário de um arquivo do Google Drive
 */
export async function fetchDriveFileContent(fileId: string, accessToken: string): Promise<string | any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao baixar arquivo ${fileId} do Google Drive: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
}

/**
 * Extrai identificadores veiculares (Placa, Chassi, Patrimônio) a partir do nome do arquivo ou conteúdo
 */
export function extractIdentifiersFromFileName(filename: string): { placa?: string; chassi?: string; patrimonio?: string } {
  const upper = filename.toUpperCase();
  
  // Padrão Placa Mercosul ou Tradicional (ex: ABC-1234, ABC1D23, ABC 1234, ABC1234)
  const plateMatch = upper.match(/([A-Z]{3}[-\s]?[0-9][0-9A-Z][0-9]{2})/);
  const placa = plateMatch ? cleanIdStr(plateMatch[1]) : undefined;

  // Padrão Chassi VIN de 17 caracteres ou sufixo
  const vinMatch = upper.match(/([A-HJ-NPR-Z0-9]{17})/);
  const chassi = vinMatch ? vinMatch[1] : undefined;

  // Padrão GPM / Tombamento (ex: GPM-1234, GPM1234, PAT-9876, 284719)
  const gpmMatch = upper.match(/(?:GPM|PAT|TOMB)[-\s]?([0-9]{4,8})/);
  const patrimonio = gpmMatch ? gpmMatch[1] : undefined;

  return { placa, chassi, patrimonio };
}

/**
 * Cruza os arquivos identificados no Google Drive com a base de veículos a avaliar
 */
export function crossReferenceDriveFilesWithFleet(
  files: DriveFileItem[],
  fleet: Vehicle[]
): DriveCrossReferenceSummary {
  const results: DriveCrossReferenceResult[] = [];
  const matchedFleetIds = new Set<string>();

  for (const file of files) {
    let extractedPlaca = file.extractedPlaca;
    let extractedChassi = file.extractedChassi;
    let extractedPatrimonio = file.extractedPatrimonio;

    // Se tiver payload JSON parseado do ARGOS
    if (file.parsedData?.vehicle) {
      extractedPlaca = file.parsedData.vehicle.placa || extractedPlaca;
      extractedChassi = file.parsedData.vehicle.chassi || extractedChassi;
      extractedPatrimonio = file.parsedData.vehicle.patrimonio || file.parsedData.vehicle.gpm || extractedPatrimonio;
    }

    // Se ainda não tiver identificadores, tenta extrair do nome do arquivo
    if (!extractedPlaca && !extractedChassi && !extractedPatrimonio) {
      const parsedFromFileName = extractIdentifiersFromFileName(file.name);
      extractedPlaca = parsedFromFileName.placa;
      extractedChassi = parsedFromFileName.chassi;
      extractedPatrimonio = parsedFromFileName.patrimonio;
    }

    let matchedVehicle: Vehicle | undefined;
    let matchKey: 'PLACA' | 'CHASSI' | 'PATRIMONIO' | 'NOME_ARQUIVO' | undefined;

    // 1. Cruzamento por Placa
    if (extractedPlaca) {
      const cleanTargetPlate = cleanIdStr(extractedPlaca);
      matchedVehicle = fleet.find(v => cleanIdStr(v.placa) === cleanTargetPlate);
      if (matchedVehicle) matchKey = 'PLACA';
    }

    // 2. Cruzamento por Chassi
    if (!matchedVehicle && extractedChassi) {
      const cleanTargetChassi = cleanIdStr(extractedChassi);
      matchedVehicle = fleet.find(v => {
        const vChassi = cleanIdStr(v.chassi);
        return vChassi && cleanTargetChassi.length >= 6 && (vChassi === cleanTargetChassi || vChassi.endsWith(cleanTargetChassi) || cleanTargetChassi.endsWith(vChassi));
      });
      if (matchedVehicle) matchKey = 'CHASSI';
    }

    // 3. Cruzamento por Patrimônio / GPM
    if (!matchedVehicle && extractedPatrimonio) {
      const targetPatDigits = cleanDigitsOnly(extractedPatrimonio);
      matchedVehicle = fleet.find(v => {
        const vPat = cleanDigitsOnly(v.patrimonio || (v as any).gpm);
        return vPat && vPat === targetPatDigits;
      });
      if (matchedVehicle) matchKey = 'PATRIMONIO';
    }

    // 4. Cruzamento por busca textual no nome do arquivo contra placas da frota
    if (!matchedVehicle) {
      const normFileName = cleanIdStr(file.name);
      matchedVehicle = fleet.find(v => {
        const vPlaca = cleanIdStr(v.placa);
        return vPlaca && vPlaca.length >= 6 && normFileName.includes(vPlaca);
      });
      if (matchedVehicle) matchKey = 'NOME_ARQUIVO';
    }

    if (matchedVehicle) {
      matchedFleetIds.add(matchedVehicle.id || matchedVehicle.placa);
      results.push({
        file,
        matchedVehicle,
        status: 'CORRESPONDENCIA_ENCONTRADA',
        matchKey,
        details: `Veículo identificado: ${matchedVehicle.placa} - ${matchedVehicle.modelo}`
      });
    } else {
      results.push({
        file,
        status: 'VEICULO_NAO_ENCONTRADO_NA_FROTA',
        details: `Identificadores extraídos (Placa: ${extractedPlaca || 'N/D'}, Chassi: ${extractedChassi || 'N/D'}, Pat: ${extractedPatrimonio || 'N/D'}) não constam na frota atual de ${fleet.length} veículos.`
      });
    }
  }

  const matchedCount = results.filter(r => r.status === 'CORRESPONDENCIA_ENCONTRADA').length;
  const unmatchedCount = results.filter(r => r.status !== 'CORRESPONDENCIA_ENCONTRADA').length;
  const uninspectedFleetCount = fleet.length - matchedFleetIds.size;

  return {
    folderId: files[0]?.id || '',
    totalFiles: files.length,
    matchedCount,
    unmatchedCount,
    results,
    uninspectedFleetCount
  };
}
