
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Vehicle {
  id: string;
  _ord?: number | string;
  orgao?: string; // ORGÃO
  placa: string; // PLACA
  modelo: string; // MARCA/MODELO
  tipo?: string; // TIPO
  avaliacao?: number | string; // AVALIAÇÃO
  chassi: string; // CHASSI
  motor: string; // NÚM. DO MOTOR
  ano: string; // ANO
  comb?: string; // COMB.
  patrimonio: string; // PATRIMÔNIO
  cor: string; // COR/DOC.
  origem?: string; // ORIGEM
  renavam?: string; // RENAVAM
  fipe: number | string; // FIPE
  pctFipe?: number | string; // % DA FIPE
  precoMinimo?: number | string; // PREÇO MÍNIMO
  situacaoDetran?: string; // SITUAÇÃO DETRAN
  enderecoPatio?: string; // ENDEREÇO DO PÁTIO
  endereco_patio?: string;
  municipio: string; // MUNICÍPIO
  fileira?: string;
  posicao?: string;
  notes?: string; // NOTAS DO VEÍCULO
  uploadedAt?: { toMillis: () => number } | null; // Firestore Timestamp
  uploadedBy?: string;
  uploadedByEmail?: string;
  endereco?: {
    rua: string;
    bairro: string;
    num: string;
    cidade: string;
  };
}

export interface InspectionHistory {
  updatedAt: { toMillis: () => number } | null;
  inspectorEmail: string;
  action?: 'create' | 'edit' | 'review';
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface Inspection {
  id?: string;
  placa: string;
  modelo: string;
  nota: number;
  class: string;
  data: string;
  fullData: Record<string, unknown>;
  valuationPercent?: number;
  hasImpediment?: boolean;
  items?: any[];
  inspectedAt?: { toMillis: () => number } | null | any;
  inspectedBy?: string;
  updatedAt?: { toMillis: () => number } | null;
  inspectorEmail?: string;
  status?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: { toMillis: () => number } | null;
  reviewNotes?: string;
  history?: InspectionHistory[];
  [key: string]: any;
}

export interface SystemUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'vistoriador' | 'visualizador';
  status: 'active' | 'inactive' | 'pending';
  cargo?: string;
  postoGrad?: string;
  matricula?: string;
  telefone?: string;
  lotacao?: string;
  allowedPatios?: string[]; // Lista de pátios autorizados (ex: ['ARAUCÁRIA'] ou ['TODOS'])
  inspectionsCount?: number;
  vehiclesCount?: number;
  samplePlacas?: string[];
  createdAt?: any;
  updatedAt?: any;
  lastLogin?: any;
  requestedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  rejectionReason?: string;
  preRegId?: string;
}

