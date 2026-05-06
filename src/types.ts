
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
  municipio: string; // MUNICÍPIO
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
