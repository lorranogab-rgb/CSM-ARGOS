// Dados permanentes de contingência da Frota e Laudos de Ponta Grossa
// 47 Veículos e 22 Laudos Técnicos Reais do CBMPR
import vehiclesRaw from './pontaGrossaVehicles.json';
import inspectionsRaw from './pontaGrossaInspections.json';

export const PONTA_GROSSA_VEHICLES: Array<Record<string, unknown>> = vehiclesRaw as unknown as Array<Record<string, unknown>>;
export const PONTA_GROSSA_INSPECTIONS: Array<Record<string, unknown>> = inspectionsRaw as unknown as Array<Record<string, unknown>>;
