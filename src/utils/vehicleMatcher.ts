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

export const findInspectionForVehicle = (v: any, inspections: any[]): any | undefined => {
  if (!v || !inspections || inspections.length === 0) return undefined;
  return inspections.find(r => matchVehicleWithInspection(v, r));
};
