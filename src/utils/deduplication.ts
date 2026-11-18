import { Vehicle } from '../types';
import { canonicalizeRegisteredYardAddress, normalizePatio } from './patioPermissions';

export const MOCK_VEHICLE_PLACAS = new Set([
  'ABC-1234',
  'XYZ-9876',
  'DEF-5678',
  'JKL-3456',
  'MNO-7890',
]);

export const isMockVehicleRecord = (v?: Partial<Vehicle> | null): boolean => {
  if (!v?.placa) return false;
  return MOCK_VEHICLE_PLACAS.has(String(v.placa).trim().toUpperCase());
};

/**
 * Normaliza códigos identificadores de veículo (placa, chassi, renavam, patrimônio)
 * removendo espaços, hífens, barras e acentos.
 */
export const normalizeVehicleToken = (val?: unknown): string => {
  if (val === undefined || val === null) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .trim();
};

const IGNORED_TOKENS = new Set([
  'SP',
  'SN',
  'NA',
  'NAO',
  'SEM',
  'SEMPLACA',
  'SEMCHASSI',
  'SEMMOTOR',
  'SEMPATRIMONIO',
  'SEMRENAVAM',
  'NAOINFORMADO',
  'INEXISTENTE',
  'NULL',
  'UNDEFINED',
]);

export const isUsableIdentifierToken = (token: string, minLength: number): boolean => {
  if (!token || token.length < minLength) return false;
  if (IGNORED_TOKENS.has(token)) return false;
  if (/^0+$/.test(token)) return false;
  return true;
};

/**
 * Gera todas as chaves únicas de identidade de um veículo com prefixo por tipo de campo
 * para evitar colisões entre campos distintos e detectar duplicidades por placa, chassi,
 * renavam ou patrimônio.
 */
export const getVehicleFingerprintKeys = (v?: Partial<Vehicle> | null): string[] => {
  if (!v) return [];
  const keys: string[] = [];

  const placa = normalizeVehicleToken(v.placa);
  if (isUsableIdentifierToken(placa, 5)) {
    keys.push(`PLACA:${placa}`);
  }

  const chassi = normalizeVehicleToken(v.chassi);
  if (isUsableIdentifierToken(chassi, 6)) {
    keys.push(`CHASSI:${chassi}`);
  }

  const renavam = normalizeVehicleToken(v.renavam);
  if (isUsableIdentifierToken(renavam, 6)) {
    keys.push(`RENAVAM:${renavam}`);
  }

  const patrimonio = normalizeVehicleToken(v.patrimonio);
  if (isUsableIdentifierToken(patrimonio, 4)) {
    keys.push(`PATRIMONIO:${patrimonio}`);
  }

  return keys;
};

/**
 * Gera um ID determinístico seguro para Firestore (`^[a-zA-Z0-9_\-]+$`, <= 128 chars)
 * baseado no identificador único principal do veículo, impedindo criação de múltiplos
 * documentos para o mesmo veículo em gravações concorrentes.
 */
export const getDeterministicVehicleDocId = (v?: Partial<Vehicle> | null): string | null => {
  if (!v) return null;
  const placa = normalizeVehicleToken(v.placa);
  if (isUsableIdentifierToken(placa, 5)) {
    return `veh_p_${placa}`.slice(0, 120);
  }
  const chassi = normalizeVehicleToken(v.chassi);
  if (isUsableIdentifierToken(chassi, 6)) {
    return `veh_c_${chassi}`.slice(0, 120);
  }
  const renavam = normalizeVehicleToken(v.renavam);
  if (isUsableIdentifierToken(renavam, 6)) {
    return `veh_r_${renavam}`.slice(0, 120);
  }
  const patrimonio = normalizeVehicleToken(v.patrimonio);
  if (isUsableIdentifierToken(patrimonio, 4)) {
    return `veh_g_${patrimonio}`.slice(0, 120);
  }
  return null;
};

/**
 * Normaliza o nome de pátio/município para eliminar duplicidade causada por acentuação,
 * caixa mista, espaços extras ou sufixos estaduais ("/PR", "- PR").
 */
export const normalizeYardKey = (rawName?: string): string => {
  if (!rawName) return '';
  return rawName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/(\s*[/\-–]\s*PR|\s+PR)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export interface CanonicalYardIdentity {
  key: string;
  displayName: string;
  address: string;
}

/**
 * Resolve a identidade canônica única de pátio para um veículo, evitando criação de
 * cartões duplicados para o mesmo pátio.
 */
export const getCanonicalYardIdentity = (
  municipio?: string,
  enderecoPatio?: string
): CanonicalYardIdentity => {
  const canonicalAddress = canonicalizeRegisteredYardAddress(enderecoPatio);
  const rawCityClean = String(municipio || '')
    .trim()
    .replace(/(\s*[/\-–]\s*PR|\s+PR)$/i, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const normCity = normalizeYardKey(rawCityClean);

  if (
    canonicalAddress === 'CCT - Ponta Grossa' &&
    (!normCity || normCity === 'NAO INFORMADO' || normCity.includes('PONTA GROSSA') || normCity.includes('CARA'))
  ) {
    return {
      key: 'PONTA GROSSA',
      displayName: 'PONTA GROSSA',
      address: 'CCT - Ponta Grossa',
    };
  }

  if (
    canonicalAddress === 'Patio Cachoeira - 6 BBM' &&
    (!normCity || normCity === 'NAO INFORMADO' || normCity.includes('CACHOEIRA') || normCity.includes('6 BBM'))
  ) {
    return {
      key: 'PATIO CACHOEIRA - 6 BBM',
      displayName: 'PÁTIO CACHOEIRA - 6 BBM',
      address: 'Patio Cachoeira - 6 BBM',
    };
  }

  if (normCity && normCity !== 'NAO INFORMADO') {
    return {
      key: normCity,
      displayName: rawCityClean || normCity,
      address: canonicalAddress || (enderecoPatio || '').trim(),
    };
  }

  if (canonicalAddress) {
    const addrKey = normalizePatio(canonicalAddress);
    return {
      key: addrKey,
      displayName: canonicalAddress.toUpperCase(),
      address: canonicalAddress,
    };
  }

  return {
    key: 'NAO INFORMADO',
    displayName: 'NÃO INFORMADO',
    address: '',
  };
};

const countPopulatedFields = (v: Record<string, unknown>): number => {
  let count = 0;
  for (const [k, val] of Object.entries(v)) {
    if (k === 'id' || k === '_ord' || k === 'uploadedAt' || k === 'uploadedBy' || k === 'uploadedByEmail') continue;
    if (val === undefined || val === null || val === '') continue;
    if (typeof val === 'number' && val === 0) continue;
    count++;
  }
  return count;
};

const getTimestampMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null) {
    const maybe = ts as { toMillis?: () => number; seconds?: number };
    if (typeof maybe.toMillis === 'function') return maybe.toMillis();
    if (typeof maybe.seconds === 'number') return maybe.seconds * 1000;
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const mergeVehicleMetadata = (primary: Vehicle, secondary: Vehicle): Vehicle => {
  const merged: Vehicle = { ...primary };
  const mergeIfMissing = <K extends keyof Vehicle>(field: K) => {
    const curr = merged[field];
    const alt = secondary[field];
    const isCurrEmpty = curr === undefined || curr === null || curr === '' || curr === 0;
    const isAltFilled = alt !== undefined && alt !== null && alt !== '' && alt !== 0;
    if (isCurrEmpty && isAltFilled) {
      merged[field] = alt;
    }
  };

  mergeIfMissing('placa');
  mergeIfMissing('modelo');
  mergeIfMissing('chassi');
  mergeIfMissing('motor');
  mergeIfMissing('ano');
  mergeIfMissing('comb');
  mergeIfMissing('patrimonio');
  mergeIfMissing('cor');
  mergeIfMissing('origem');
  mergeIfMissing('renavam');
  mergeIfMissing('fipe');
  mergeIfMissing('pctFipe');
  mergeIfMissing('precoMinimo');
  mergeIfMissing('situacaoDetran');
  mergeIfMissing('enderecoPatio');
  mergeIfMissing('municipio');
  mergeIfMissing('fileira');
  mergeIfMissing('posicao');
  mergeIfMissing('notes');
  mergeIfMissing('orgao');
  mergeIfMissing('tipo');
  mergeIfMissing('avaliacao');

  return merged;
};

export interface VehicleDeduplicationResult {
  uniqueVehicles: Vehicle[];
  duplicateDocIds: string[];
  updatedPrimaryVehicles: Vehicle[];
  removedCount: number;
}

/**
 * Deduplica uma lista de veículos preservando o registro principal mais completo
 * (priorizando veículos com vistoria já realizada e IDs persistidos no Firestore)
 * e identificando IDs excedentes para higienização da base.
 */
export const deduplicateVehicles = (
  vehicles: Vehicle[],
  inspectedPlacas: Set<string> = new Set()
): VehicleDeduplicationResult => {
  const normalizedInspected = new Set(
    Array.from(inspectedPlacas).map((p) => normalizeVehicleToken(p)).filter(Boolean)
  );

  const isLocalTempId = (id?: string) =>
    !id || id.startsWith('upload-') || id.startsWith('new-') || id.startsWith('local-');

  // Ordena para que o registro canônico preferido apareça primeiro
  const ranked = [...vehicles].sort((a, b) => {
    const aInspected = normalizedInspected.has(normalizeVehicleToken(a.placa)) ? 1 : 0;
    const bInspected = normalizedInspected.has(normalizeVehicleToken(b.placa)) ? 1 : 0;
    if (aInspected !== bInspected) return bInspected - aInspected;

    const aReal = !isLocalTempId(a.id) ? 1 : 0;
    const bReal = !isLocalTempId(b.id) ? 1 : 0;
    if (aReal !== bReal) return bReal - aReal;

    const aFields = countPopulatedFields(a as unknown as Record<string, unknown>);
    const bFields = countPopulatedFields(b as unknown as Record<string, unknown>);
    if (aFields !== bFields) return bFields - aFields;

    return getTimestampMillis(b.uploadedAt) - getTimestampMillis(a.uploadedAt);
  });

  const uniqueVehicles: Vehicle[] = [];
  const keyToIndex = new Map<string, number>();
  const duplicateDocIds: string[] = [];
  const updatedPrimaryIndices = new Set<number>();
  let removedCount = 0;

  for (const veh of ranked) {
    const keys = getVehicleFingerprintKeys(veh);
    let matchedIndex: number | undefined;

    for (const k of keys) {
      const idx = keyToIndex.get(k);
      if (idx !== undefined) {
        matchedIndex = idx;
        break;
      }
    }

    if (matchedIndex !== undefined) {
      removedCount++;
      const existing = uniqueVehicles[matchedIndex];
      const merged = mergeVehicleMetadata(existing, veh);
      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        uniqueVehicles[matchedIndex] = merged;
        updatedPrimaryIndices.add(matchedIndex);
      }
      // Registra novas chaves também apontando para o registro único
      for (const k of keys) {
        if (!keyToIndex.has(k)) {
          keyToIndex.set(k, matchedIndex);
        }
      }
      if (veh.id && !isLocalTempId(veh.id) && veh.id !== existing.id) {
        duplicateDocIds.push(veh.id);
      }
    } else {
      const idx = uniqueVehicles.length;
      uniqueVehicles.push(veh);
      for (const k of keys) {
        keyToIndex.set(k, idx);
      }
    }
  }

  const updatedPrimaryVehicles = Array.from(updatedPrimaryIndices).map((idx) => uniqueVehicles[idx]);

  return {
    uniqueVehicles,
    duplicateDocIds: Array.from(new Set(duplicateDocIds)),
    updatedPrimaryVehicles,
    removedCount,
  };
};

/**
 * Deduplica laudos por placa normalizada mantendo o registro mais recente.
 */
export const deduplicateInspections = <T extends { id?: string; placa?: string; inspectedAt?: unknown }>(
  inspections: T[]
): T[] => {
  const sorted = [...inspections].sort(
    (a, b) => getTimestampMillis(b.inspectedAt) - getTimestampMillis(a.inspectedAt)
  );
  const seenPlates = new Set<string>();
  const seenIds = new Set<string>();
  const unique: T[] = [];

  for (const insp of sorted) {
    const normPlaca = normalizeVehicleToken(insp.placa);
    const id = insp.id || '';
    if (id && seenIds.has(id)) continue;
    if (isUsableIdentifierToken(normPlaca, 5) && seenPlates.has(normPlaca)) continue;

    if (id) seenIds.add(id);
    if (isUsableIdentifierToken(normPlaca, 5)) seenPlates.add(normPlaca);
    unique.push(insp);
  }

  return unique;
};
