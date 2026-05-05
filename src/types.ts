
export interface Vehicle {
  id: string;
  _ord?: number | string;
  orgao?: string;
  placa: string;
  modelo: string;
  tipo?: string;
  avaliacao?: number | string;
  chassi: string;
  motor: string;
  ano: string;
  comb?: string;
  patrimonio: string;
  cor: string;
  origem?: string;
  renavam?: string;
  fipe: number | string;
  pctFipe?: number | string;
  precoMinimo?: number | string;
  situacaoDetran?: string;
  endereco_patio?: string;
  municipio: string;
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
  updatedAt?: { toMillis: () => number } | null;
  inspectorEmail?: string;
  status?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: { toMillis: () => number } | null;
  reviewNotes?: string;
  history?: InspectionHistory[];
}
