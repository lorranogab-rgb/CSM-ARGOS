/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utilitários de normalização e cruzamento multi-identificador de veículos e laudos periciais.
 * CSM:ARGOS - CBMPR
 */

export const cleanIdStr = (s: any): string => {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
};

export const cleanDigitsOnly = (s: any): string => {
  if (s === null || s === undefined) return '';
  const digits = String(s).replace(/\D/g, '').replace(/^0+/, '');
  return digits;
};

export const matchVehicleWithInspection = (v: any, r: any): boolean => {
  if (!v || !r) return false;
  
  // 1. Cruzamento por Placa
  const vPlaca = cleanIdStr(v.placa);
  const rPlaca = cleanIdStr(r.placa || r.fullData?.vehicle?.placa || r.fullData?.placa);
  if (vPlaca && rPlaca && vPlaca === rPlaca) return true;

  // 2. Cruzamento por Chassi (total ou sufixo com 6+ caracteres)
  const vChassi = cleanIdStr(v.chassi);
  const rChassi = cleanIdStr(r.chassi || r.fullData?.vehicle?.chassi || r.fullData?.chassi);
  if (vChassi && rChassi && vChassi.length >= 6 && (vChassi === rChassi || vChassi.endsWith(rChassi) || rChassi.endsWith(vChassi))) return true;

  // 3. Cruzamento por Patrimônio / GPM / Tombamento (normalizado com ou sem prefixo GPM)
  const vPat = cleanIdStr(v.patrimonio || v.gpm);
  const rPat = cleanIdStr(r.patrimonio || r.gpm || r.fullData?.vehicle?.patrimonio || r.fullData?.vehicle?.gpm);
  if (vPat && rPat) {
    if (vPat === rPat) return true;
    const vPatNum = cleanDigitsOnly(vPat);
    const rPatNum = cleanDigitsOnly(rPat);
    if (vPatNum && rPatNum && vPatNum === rPatNum) return true;
  }

  // 4. Cruzamento por Renavam (com ou sem zeros à esquerda)
  const vRenavam = cleanDigitsOnly(v.renavam);
  const rRenavam = cleanDigitsOnly(r.renavam || r.fullData?.vehicle?.renavam);
  if (vRenavam && rRenavam && vRenavam === rRenavam) return true;

  // 5. Cruzamento por Identificador Único do Registro
  if (v.id && (r.id === v.id || r.vehicleId === v.id || r.fullData?.vehicle?.id === v.id)) return true;

  return false;
};

export const getTimestampMillis = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val.toMillis === 'function') {
    try {
      const res = val.toMillis();
      return typeof res === 'number' && !isNaN(res) ? res : 0;
    } catch {
      return 0;
    }
  }
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
    } catch {
      return 0;
    }
  }
  if (val.seconds !== undefined && typeof val.seconds === 'number') {
    return val.seconds * 1000;
  }
  if (val._seconds !== undefined && typeof val._seconds === 'number') {
    return val._seconds * 1000;
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
    const num = Number(val);
    if (!isNaN(num)) return num;
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? 0 : val.getTime();
  }
  return 0;
};

export const areVehiclesSame = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  return matchVehicleWithInspection(a, b);
};

export const areInspectionsSame = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  return matchVehicleWithInspection(a, b);
};

/**
 * Desduplica a lista de veículos de forma determinística preservando dados mais completos.
 */
export const deduplicateVehicles = (list: any[]): any[] => {
  if (!Array.isArray(list)) return [];
  const result: any[] = [];
  for (const item of list) {
    if (!item) continue;
    const existingIndex = result.findIndex(existing => areVehiclesSame(existing, item));
    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      // Merge properties if current item has better/newer values
      result[existingIndex] = {
        ...item,
        ...existing,
        id: existing.id || item.id,
        placa: existing.placa || item.placa || '',
        chassi: existing.chassi || item.chassi || '',
        modelo: (existing.modelo && !existing.modelo.includes('Identificado')) ? existing.modelo : (item.modelo || existing.modelo || ''),
        patrimonio: existing.patrimonio || item.patrimonio || '',
        renavam: existing.renavam || item.renavam || '',
        municipio: existing.municipio || item.municipio || '',
        fileira: existing.fileira && existing.fileira !== '-' ? existing.fileira : (item.fileira || existing.fileira || '-'),
        posicao: existing.posicao && existing.posicao !== '-' ? existing.posicao : (item.posicao || existing.posicao || '-'),
        fipe: (existing.fipe && existing.fipe > 0) ? existing.fipe : (item.fipe || 0),
        uploadedAt: getTimestampMillis(existing.uploadedAt) >= getTimestampMillis(item.uploadedAt) ? existing.uploadedAt : item.uploadedAt
      };
    } else {
      result.push({ ...item });
    }
  }
  return result;
};

/**
 * Desduplica a lista de laudos periciais mantendo a versão mais recente/completa.
 */
export const deduplicateInspections = (list: any[]): any[] => {
  if (!Array.isArray(list)) return [];
  const result: any[] = [];
  for (const item of list) {
    if (!item) continue;
    const existingIndex = result.findIndex(existing => areInspectionsSame(existing, item));
    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      const existingTime = getTimestampMillis(existing.inspectedAt || existing.data);
      const itemTime = getTimestampMillis(item.inspectedAt || item.data);
      
      // Se o novo registro tiver data mais recente ou tiver fullData onde o existente não tem
      if (itemTime > existingTime || (!existing.fullData && item.fullData)) {
        result[existingIndex] = {
          ...item,
          id: existing.id || item.id
        };
      }
    } else {
      result.push({ ...item });
    }
  }
  return result;
};

export const findInspectionForVehicle = (v: any, inspections: any[]): any | undefined => {
  if (!v || !inspections || inspections.length === 0) return undefined;
  return inspections.find(r => matchVehicleWithInspection(v, r));
};



