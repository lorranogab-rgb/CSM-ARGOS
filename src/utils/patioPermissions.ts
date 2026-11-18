import { Vehicle, SystemUser } from '../types';

/**
 * Normaliza o nome do pátio/endereço para comparação insensível a acentuação e caixa alta.
 * Ex: "Pátio Cachoeira - 6 BBM" -> "PATIO CACHOEIRA - 6 BBM"
 */
export const normalizePatio = (val?: string): string => {
  if (!val) return '';
  return val
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\/PR$/, '')
    .trim();
};

/**
 * Endereços de pátio padrão já cadastrados no sistema.
 * Atualmente existem 2 endereços principais: CCT - Ponta Grossa e Patio Cachoeira - 6 BBM.
 */
export const DEFAULT_SYSTEM_YARD_ADDRESSES: string[] = [
  'CCT - Ponta Grossa',
  'Patio Cachoeira - 6 BBM'
];

/**
 * Mantido para compatibilidade com código legado.
 */
export const PATIOS_PARANA_MASTER: string[] = DEFAULT_SYSTEM_YARD_ADDRESSES;

/**
 * Mapeia variações conhecidas de endereço de pátio para o nome canônico cadastrado no sistema.
 */
export const canonicalizeRegisteredYardAddress = (rawAddress?: string): string => {
  const trimmed = (rawAddress || '').trim();
  if (!trimmed) return '';
  const norm = normalizePatio(trimmed);

  if (
    !norm ||
    norm === 'TODOS' ||
    norm === 'NAO INFORMADO' ||
    norm === 'ENDERECO NAO INFORMADO'
  ) {
    return '';
  }

  // Correspondência canônica para CCT - Ponta Grossa
  if (
    norm === 'CCT - PONTA GROSSA' ||
    norm.includes('MAXIMILIANO MAGAGNIM') ||
    norm.includes('CARA-CARA') ||
    norm.includes('CARA CARA')
  ) {
    return 'CCT - Ponta Grossa';
  }

  // Correspondência canônica para Patio Cachoeira - 6 BBM
  if (
    norm === 'PATIO CACHOEIRA - 6 BBM' ||
    (norm.includes('CACHOEIRA') && norm.includes('6 BBM'))
  ) {
    return 'Patio Cachoeira - 6 BBM';
  }

  return trimmed;
};

/**
 * Extrai exclusivamente os endereços de pátio já cadastrados no sistema
 * (endereços oficiais padrão + endereços de pátio `enderecoPatio` reais existentes na frota).
 */
export const getRegisteredYardAddresses = (frota: Partial<Vehicle>[] = []): string[] => {
  const byNorm = new Map<string, string>();

  const addAddress = (addr?: string) => {
    const canonical = canonicalizeRegisteredYardAddress(addr);
    if (!canonical) return;
    const norm = normalizePatio(canonical);
    if (!norm) return;
    if (!byNorm.has(norm)) {
      byNorm.set(norm, canonical);
    }
  };

  DEFAULT_SYSTEM_YARD_ADDRESSES.forEach(addAddress);

  frota.forEach((v) => {
    if (v?.enderecoPatio) {
      addAddress(v.enderecoPatio);
    }
  });

  return Array.from(byNorm.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};

/**
 * Verifica se um usuário possui restrição de pátios (ou seja, não tem acesso irrestrito).
 * Administradores Master nunca são restritos.
 */
export const isUserRestrictedByPatio = (
  userProfile?: SystemUser | null,
  isAdminMaster: boolean = false
): boolean => {
  if (isAdminMaster) return false;
  if (!userProfile) return false;
  if (!userProfile.allowedPatios) {
    return false;
  }
  if (userProfile.allowedPatios.length === 0) {
    return true;
  }
  return !userProfile.allowedPatios.includes('TODOS');
};

/**
 * Retorna a lista de pátios permitidos para o usuário.
 * Se for ADM Master ou tiver acesso total, retorna ['TODOS'].
 */
export const getUserAllowedPatios = (
  userProfile?: SystemUser | null,
  isAdminMaster: boolean = false
): string[] => {
  if (isAdminMaster) return ['TODOS'];
  if (!userProfile || !userProfile.allowedPatios) {
    return ['TODOS'];
  }
  return userProfile.allowedPatios;
};

/**
 * Verifica se um veículo (exclusivamente pelo seu endereço de pátio cadastrado)
 * é permitido para a lista de pátios autorizados.
 */
export const isPatioAllowed = (
  vehicleCity?: string,
  vehicleAddress?: string,
  allowedPatios?: string[]
): boolean => {
  if (!allowedPatios) {
    return true;
  }
  if (allowedPatios.includes('TODOS')) {
    return true;
  }
  if (allowedPatios.length === 0) {
    return false;
  }

  const normAddr = normalizePatio(vehicleAddress);
  const canonicalVehicleAddr = normalizePatio(canonicalizeRegisteredYardAddress(vehicleAddress));
  const normCity = normalizePatio(vehicleCity);

  return allowedPatios.some((allowed) => {
    if (allowed === 'TODOS') return true;
    const normAllowed = normalizePatio(allowed);
    const canonicalAllowed = normalizePatio(canonicalizeRegisteredYardAddress(allowed));
    if (!normAllowed) return false;

    // 1. Comparação direta com o endereço do pátio cadastrado (exato ou canônico)
    if (normAddr) {
      if (
        normAddr === normAllowed ||
        normAddr.includes(normAllowed) ||
        normAllowed.includes(normAddr) ||
        (canonicalVehicleAddr && canonicalAllowed && canonicalVehicleAddr === canonicalAllowed)
      ) {
        return true;
      }
    }

    // 2. Fallback apenas quando não houver endereço de pátio preenchido e o identificador bater diretamente
    if (!normAddr && normCity && normCity === normAllowed) {
      return true;
    }

    // 3. Correspondência semântica estrita para os endereços oficiais cadastrados no sistema
    const isCachoeiraAllowed = normAllowed.includes('CACHOEIRA') || normAllowed.includes('6 BBM');
    if (isCachoeiraAllowed && normAddr) {
      if (normAddr.includes('CACHOEIRA') || normAddr.includes('6 BBM')) {
        return true;
      }
    }

    const isCCTAllowed = normAllowed.includes('CCT') || normAllowed.includes('PONTA GROSSA');
    if (isCCTAllowed && normAddr) {
      if (
        normAddr.includes('CCT') ||
        normAddr.includes('PONTA GROSSA') ||
        normAddr.includes('CARA-CARA') ||
        normAddr.includes('CARA CARA') ||
        normAddr.includes('MAXIMILIANO MAGAGNIM')
      ) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Verifica se o usuário tem permissão para acessar determinado veículo.
 * ADM Master sempre tem acesso irrestrito.
 */
export const isUserAllowedForVehicle = (
  vehicle?: Partial<Vehicle> | null,
  userProfile?: SystemUser | null,
  isAdminMaster: boolean = false
): boolean => {
  if (isAdminMaster) return true;
  if (!isUserRestrictedByPatio(userProfile, isAdminMaster)) {
    return true;
  }
  if (!vehicle) return false;

  const allowedPatios = getUserAllowedPatios(userProfile, isAdminMaster);
  if (allowedPatios.length === 0) return false;

  const fullAddress = [
    vehicle.enderecoPatio,
    vehicle.endereco
      ? `${vehicle.endereco.rua || ''} ${vehicle.endereco.num || ''} ${vehicle.endereco.bairro || ''} ${vehicle.endereco.cidade || ''}`
      : ''
  ]
    .filter(Boolean)
    .join(' ');

  return isPatioAllowed(vehicle.municipio, fullAddress, allowedPatios);
};
