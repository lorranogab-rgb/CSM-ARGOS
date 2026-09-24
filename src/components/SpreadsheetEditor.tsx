/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, UploadCloud, Download, Search, Filter, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Vehicle {
  id: string;
  _ord?: any;
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
  enderecoPatio?: string;
  endereco_patio?: string;
  municipio: string;
  fileira?: string;
  posicao?: string;
  notes?: string;
  uploadedAt?: any;
  uploadedBy?: string;
  uploadedByEmail?: string;
  endereco?: {
    rua: string;
    bairro: string;
    num: string;
    cidade: string;
  };
}

interface SpreadsheetEditorProps {
  frota: Vehicle[];
  onSave: (data: Vehicle[]) => Promise<boolean | void>;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport?: () => void;
  isDark: boolean;
}

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ 
  frota, 
  onSave, 
  onUpload, 
  onExport, 
  isDark 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEmptyRow = (): Vehicle => ({
    id: 'new-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    orgao: 'CBMPR',
    placa: '',
    modelo: '',
    tipo: 'AUTOMÓVEL',
    avaliacao: '',
    chassi: '',
    motor: '',
    ano: '',
    comb: 'G',
    patrimonio: '',
    cor: '',
    origem: 'ESTADUAL',
    renavam: '',
    fipe: '',
    pctFipe: '',
    precoMinimo: '',
    situacaoDetran: 'REGULAR',
    enderecoPatio: '',
    endereco_patio: '',
    municipio: '',
    fileira: '',
    posicao: ''
  });

  const normalizeVehicle = (v: Vehicle): Vehicle => ({
    ...v,
    id: v.id || ('veh-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)),
    orgao: v.orgao || 'CBMPR',
    placa: v.placa || '',
    modelo: v.modelo || '',
    tipo: v.tipo || 'AUTOMÓVEL',
    avaliacao: v.avaliacao !== undefined ? v.avaliacao : '',
    chassi: v.chassi || '',
    motor: v.motor || '',
    ano: v.ano || '',
    comb: v.comb || 'G',
    patrimonio: v.patrimonio || '',
    cor: v.cor || '',
    origem: v.origem || 'ESTADUAL',
    renavam: v.renavam || '',
    fipe: v.fipe !== undefined ? v.fipe : '',
    pctFipe: v.pctFipe !== undefined ? v.pctFipe : '',
    precoMinimo: v.precoMinimo !== undefined ? v.precoMinimo : '',
    situacaoDetran: v.situacaoDetran || 'REGULAR',
    enderecoPatio: v.enderecoPatio || v.endereco_patio || (v.endereco ? `${v.endereco.rua || ''}, ${v.endereco.num || ''} - ${v.endereco.bairro || ''}`.replace(/^[,\s-]+|[,\s-]+$/g, '') : ''),
    municipio: v.municipio || (v.endereco?.cidade || ''),
    fileira: v.fileira || '',
    posicao: v.posicao || ''
  });

  // Load from frota initial state
  const [data, setData] = useState<Vehicle[]>(() => {
    if (frota && frota.length > 0) {
      return frota.map(normalizeVehicle);
    }
    return [createEmptyRow()];
  });

  const [isDirty, setIsDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('TODOS');
  const [isSaving, setIsSaving] = useState(false);
  const prevFrotaCountRef = useRef(frota?.length || 0);

  // Synchronize when frota updates (e.g. from async fetch or upload) if user hasn't made unsaved manual edits
  useEffect(() => {
    if (!isDirty && frota && frota.length !== prevFrotaCountRef.current) {
      prevFrotaCountRef.current = frota.length;
      setData(frota.map(normalizeVehicle));
    }
  }, [frota, isDirty]);

  // Unique list of cities/yards for filtering
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    data.forEach(v => {
      if (v.municipio && v.municipio.trim()) {
        set.add(v.municipio.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered rows for display
  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (selectedCity !== 'TODOS' && String(row.municipio || '').toUpperCase() !== selectedCity) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        String(row.placa || '').toLowerCase().includes(term) ||
        String(row.modelo || '').toLowerCase().includes(term) ||
        String(row.chassi || '').toLowerCase().includes(term) ||
        String(row.patrimonio || '').toLowerCase().includes(term) ||
        String(row.motor || '').toLowerCase().includes(term) ||
        String(row.municipio || '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, selectedCity]);

  const handleAddRow = () => {
    const newRow = createEmptyRow();
    if (selectedCity !== 'TODOS') {
      newRow.municipio = selectedCity;
    }
    setData(prev => [newRow, ...prev]);
    setIsDirty(true);
  };

  const handleRemoveRow = (id: string) => {
    setData(prev => prev.filter(v => v.id !== id));
    setIsDirty(true);
  };

  const handleResetToFleet = () => {
    if (frota && frota.length > 0) {
      setData(frota.map(normalizeVehicle));
      setIsDirty(false);
    } else {
      setData([createEmptyRow()]);
      setIsDirty(false);
    }
  };

  const handleChange = (id: string, field: keyof Vehicle, value: string) => {
    setIsDirty(true);
    setData(prev => prev.map(v => {
      if (v.id === id) {
        let formattedValue: any = value;
        if (field === 'placa') {
          formattedValue = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
        } else if (field === 'patrimonio' || field === 'renavam') {
          formattedValue = String(value).replace(/[^0-9]/g, '');
        } else if (field === 'ano') {
          const val = String(value).replace(/[^0-9]/g, '');
          if (val.length > 2) {
             formattedValue = val.slice(0, 2) + '/' + val.slice(2, 4);
          } else {
             formattedValue = val;
          }
        } else if (field === 'enderecoPatio') {
          return { ...v, enderecoPatio: formattedValue, endereco_patio: formattedValue };
        }
        return { ...v, [field]: formattedValue };
      }
      return v;
    }));
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpload) {
      onUpload(e);
      return;
    }
    // Fallback direct parse if onUpload is not passed
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileData = event.target?.result;
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        if (rawRows.length > 0) {
          const headerKeywords = ['placa', 'modelo', 'veiculo', 'chassi', 'ord', 'item', 'nº', 'patrimonio', 'gpm'];
          let headerIndex = 0;
          let maxMatches = 0;

          for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
            const row = rawRows[i];
            if (!row || !Array.isArray(row)) continue;
            let matches = 0;
            row.forEach(cell => {
              if (typeof cell === 'string') {
                const normalized = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (headerKeywords.some(kw => normalized.includes(kw))) matches++;
              }
            });
            if (matches > maxMatches) {
              maxMatches = matches;
              headerIndex = i;
            }
          }

          const headers = rawRows[headerIndex] || [];
          const dataRows = rawRows.slice(headerIndex + 1);

          const jsonData = dataRows.map(row => {
            const obj: Record<string, string | number> = {};
            headers.forEach((h, i) => {
              if (h !== undefined && h !== null) {
                obj[String(h)] = row[i];
              }
            });
            return obj;
          }).filter(obj => Object.values(obj).some(v => v !== undefined && v !== null && v !== ''));

          const getVal = (row: Record<string, any>, keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of keys) {
              const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
              const found = rowKeys.find(rk => rk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === normalizedK);
              if (found && row[found] !== undefined && row[found] !== null) return String(row[found]).trim();
            }
            return '';
          };

          const importedVehicles: Vehicle[] = jsonData.map((row, idx) => ({
            id: `upload-${Date.now()}-${idx}`,
            orgao: getVal(row, ['orgao', 'órgão', 'unidade']) || 'CBMPR',
            placa: getVal(row, ['placa', 'prefixo']),
            modelo: getVal(row, ['modelo', 'marca/modelo', 'veiculo', 'especificacao']),
            tipo: getVal(row, ['tipo', 'categoria']) || 'AUTOMÓVEL',
            avaliacao: getVal(row, ['avaliacao', 'avaliação']),
            fipe: getVal(row, ['fipe', 'valor fipe']),
            pctFipe: getVal(row, ['% da fipe', '% fipe', 'pct fipe']),
            precoMinimo: getVal(row, ['preco minimo', 'preço mínimo']),
            chassi: getVal(row, ['chassi', 'chassis']),
            motor: getVal(row, ['motor', 'núm. do motor', 'num. do motor']),
            municipio: getVal(row, ['municipio', 'município', 'cidade']),
            cor: getVal(row, ['cor', 'cor/doc.', 'cor/doc']),
            ano: getVal(row, ['ano', 'ano/mod']),
            comb: getVal(row, ['comb', 'comb.', 'combustivel']),
            origem: getVal(row, ['origem']) || 'ESTADUAL',
            renavam: getVal(row, ['renavam']),
            situacaoDetran: getVal(row, ['situacao detran', 'situação detran']) || 'REGULAR',
            patrimonio: getVal(row, ['patrimonio', 'patrimônio', 'gpm']),
            enderecoPatio: getVal(row, ['endereco do patio', 'endereço do pátio', 'endereco patio']),
            fileira: getVal(row, ['fileira', 'fila']),
            posicao: getVal(row, ['posicao', 'posição'])
          })).filter(v => v.placa || v.chassi || v.modelo || v.patrimonio);

          if (importedVehicles.length > 0) {
            setData(importedVehicles);
            setIsDirty(true);
          }
        }
      } catch (err) {
        console.error("Erro ao ler arquivo:", err);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportSpreadsheet = () => {
    if (onExport) {
      onExport();
      return;
    }
    const exportRows = data.map((v, idx) => ({
      'ORD.': idx + 1,
      'ORGÃO': v.orgao || 'CBMPR',
      'PLACA': v.placa || '',
      'MARCA/MODELO': v.modelo || '',
      'TIPO': v.tipo || 'AUTOMÓVEL',
      'AVALIAÇÃO': v.avaliacao || '',
      'CHASSI': v.chassi || '',
      'NÚM. DO MOTOR': v.motor || '',
      'ANO': v.ano || '',
      'COMB.': v.comb || 'G',
      'PATRIMÔNIO': v.patrimonio || '',
      'COR/DOC.': v.cor || '',
      'ORIGEM': v.origem || 'ESTADUAL',
      'RENAVAM': v.renavam || '',
      'FIPE': v.fipe || '',
      '% DA FIPE': v.pctFipe || '',
      'PREÇO MÍNIMO': v.precoMinimo || '',
      'SITUAÇÃO DETRAN': v.situacaoDetran || 'REGULAR',
      'ENDEREÇO DO PÁTIO': v.enderecoPatio || v.endereco_patio || '',
      'MUNICÍPIO': v.municipio || '',
      'FILEIRA': v.fileira || '',
      'POSIÇÃO': v.posicao || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Item J - Frota");
    XLSX.writeFile(wb, `Item_J_Veiculos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  };

  const handleSave = async () => {
    // Keep only rows that have at least some basic information
    const validRows = data.filter(row => {
      return Boolean(
        (row.placa && row.placa.trim()) || 
        (row.chassi && row.chassi.trim()) || 
        (row.modelo && row.modelo.trim()) || 
        (row.patrimonio && row.patrimonio.trim()) || 
        (row.renavam && row.renavam.trim())
      );
    });

    if (validRows.length === 0) {
      alert("Nenhum veículo com dados válidos (Placa, Chassi, Modelo ou Patrimônio) para salvar.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSave(validRows);
      if (result !== false) {
        setIsDirty(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full min-w-[110px] px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-transparent border transition-all ${
    isDark 
      ? 'border-slate-800 focus:border-blue-500 focus:bg-slate-800/60 text-slate-200' 
      : 'border-gray-200 focus:border-[#003B95] focus:bg-blue-50/20 text-gray-800'
  } outline-none focus:ring-1 focus:ring-blue-500`;

  return (
    <div className={`px-0 md:px-2 pb-6 pt-0 h-full flex flex-col ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4 mt-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <Layers size={22} />
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Cadastro de Veículos (Item J / Anexo J)
              </h2>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Visualize, cadastre e edite toda a frota de veículos do leilão em formato de planilha dinâmica.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for Excel/CSV */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleLocalUpload} 
          />

          <button 
            onClick={() => fileInputRef.current?.click()} 
            className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all border shadow-sm ${
              isDark ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Importar planilha do Item J em formato Excel ou CSV"
          >
            <UploadCloud size={16} /> Importar Planilha
          </button>

          <button 
            onClick={handleExportSpreadsheet} 
            className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all border shadow-sm ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title="Exportar dados atuais para arquivo Excel (.xlsx)"
          >
            <Download size={16} /> Exportar
          </button>

          <button 
            onClick={handleAddRow} 
            className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30' : 'bg-blue-50 text-[#003B95] hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Plus size={16} /> Nova Linha
          </button>

          {isDirty && (
            <button 
              onClick={handleResetToFleet} 
              className={`px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
              title="Descartar alterações locais e recarregar a frota"
            >
              <RefreshCw size={14} /> Restaurar
            </button>
          )}

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all ${
              isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'
            } ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40' : 'bg-[#003B95] hover:bg-[#002868] text-white shadow-blue-500/20'}`}
          >
            <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className={`p-3 mb-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className={`flex items-center px-3 py-1.5 rounded-xl border flex-1 min-w-[200px] ${
            isDark ? 'bg-slate-800/80 border-slate-700 focus-within:border-blue-500' : 'bg-gray-50 border-gray-200 focus-within:border-blue-500'
          }`}>
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar por placa, modelo, chassi, patrimônio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs font-semibold placeholder:text-gray-400"
            />
          </div>

          {/* City / Yard Filter */}
          <div className={`flex items-center px-3 py-1.5 rounded-xl border ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <Filter size={14} className="text-blue-500 mr-2 shrink-0" />
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-black uppercase tracking-wider cursor-pointer pr-1"
            >
              <option value="TODOS">Todos os Pátios ({availableCities.length})</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' : 'bg-blue-50 text-[#003B95] border border-blue-100'
          }`}>
            <CheckCircle2 size={13} /> {filteredData.length} {filteredData.length === 1 ? 'veículo' : 'veículos'} exibidos
          </span>
          {data.length !== filteredData.length && (
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold opacity-60 ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
            }`}>
              Total: {data.length}
            </span>
          )}
          {isDirty && (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
              <AlertCircle size={12} /> Não salvo
            </span>
          )}
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className={`flex-1 overflow-auto rounded-2xl border shadow-inner ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-gray-200 bg-white'}`}>
        <table className="w-max min-w-full text-xs text-left border-collapse">
          <thead className={`text-[10px] uppercase font-black tracking-wider sticky top-0 z-20 ${
            isDark ? 'bg-slate-900 text-slate-400 shadow-md shadow-black/20' : 'bg-gray-100 text-gray-700 shadow-sm'
          }`}>
            <tr>
              <th className="px-2.5 py-3 text-center w-12 border-b border-r border-gray-200 dark:border-slate-800">Nº</th>
              <th className="px-2.5 py-3 font-semibold min-w-[90px] border-b border-gray-200 dark:border-slate-800">Órgão</th>
              <th className="px-2.5 py-3 font-semibold min-w-[110px] border-b border-gray-200 dark:border-slate-800">Placa</th>
              <th className="px-2.5 py-3 font-semibold min-w-[240px] border-b border-gray-200 dark:border-slate-800">Marca/Modelo</th>
              <th className="px-2.5 py-3 font-semibold min-w-[130px] border-b border-gray-200 dark:border-slate-800">Tipo</th>
              <th className="px-2.5 py-3 font-semibold min-w-[120px] border-b border-gray-200 dark:border-slate-800">Avaliação</th>
              <th className="px-2.5 py-3 font-semibold min-w-[180px] border-b border-gray-200 dark:border-slate-800">Chassi</th>
              <th className="px-2.5 py-3 font-semibold min-w-[140px] border-b border-gray-200 dark:border-slate-800">Núm. Motor</th>
              <th className="px-2.5 py-3 font-semibold min-w-[90px] border-b border-gray-200 dark:border-slate-800">Ano</th>
              <th className="px-2.5 py-3 font-semibold min-w-[90px] border-b border-gray-200 dark:border-slate-800">Comb.</th>
              <th className="px-2.5 py-3 font-semibold min-w-[120px] border-b border-gray-200 dark:border-slate-800">Patrimônio</th>
              <th className="px-2.5 py-3 font-semibold min-w-[110px] border-b border-gray-200 dark:border-slate-800">Cor/Doc.</th>
              <th className="px-2.5 py-3 font-semibold min-w-[130px] border-b border-gray-200 dark:border-slate-800">Origem</th>
              <th className="px-2.5 py-3 font-semibold min-w-[120px] border-b border-gray-200 dark:border-slate-800">Renavam</th>
              <th className="px-2.5 py-3 font-semibold min-w-[110px] border-b border-gray-200 dark:border-slate-800">Fipe (R$)</th>
              <th className="px-2.5 py-3 font-semibold min-w-[90px] border-b border-gray-200 dark:border-slate-800">% Fipe</th>
              <th className="px-2.5 py-3 font-semibold min-w-[120px] border-b border-gray-200 dark:border-slate-800">Preço Mín.</th>
              <th className="px-2.5 py-3 font-semibold min-w-[140px] border-b border-gray-200 dark:border-slate-800">Situação Detran</th>
              <th className="px-2.5 py-3 font-semibold min-w-[220px] border-b border-gray-200 dark:border-slate-800">Endereço do Pátio</th>
              <th className="px-2.5 py-3 font-semibold min-w-[150px] border-b border-gray-200 dark:border-slate-800">Município</th>
              <th className="px-2.5 py-3 font-semibold min-w-[90px] border-b border-gray-200 dark:border-slate-800">Fileira</th>
              <th className="px-2.5 py-3 font-semibold min-w-[90px] border-b border-gray-200 dark:border-slate-800">Posição</th>
              <th className={`px-2.5 py-3 font-semibold text-center sticky right-0 z-20 ${
                isDark ? 'bg-slate-900 border-l border-slate-800 text-slate-400' : 'bg-gray-100 border-l border-gray-200 text-gray-700'
              } shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}>
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {filteredData.map((row, index) => (
              <tr 
                key={row.id} 
                className={`transition-colors ${
                  isDark ? 'bg-slate-900/40 hover:bg-slate-800/70' : 'bg-white hover:bg-blue-50/30'
                }`}
              >
                {/* Index # */}
                <td className={`px-2 py-1.5 text-center font-bold text-[10px] opacity-50 border-r ${
                  isDark ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'
                }`}>
                  {index + 1}
                </td>

                {/* Órgão */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.orgao || ''} 
                    onChange={(e) => handleChange(row.id, 'orgao', e.target.value)} 
                    className={inputClass}
                    placeholder="CBMPR"
                  />
                </td>

                {/* Placa */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.placa || ''} 
                    onChange={(e) => handleChange(row.id, 'placa', e.target.value)} 
                    className={`${inputClass} font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400`} 
                    placeholder="ABC1D23"
                  />
                </td>

                {/* Marca/Modelo */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.modelo || ''} 
                    onChange={(e) => handleChange(row.id, 'modelo', e.target.value)} 
                    className={`${inputClass} min-w-[240px] font-bold`} 
                    placeholder="Ex: FIAT PALIO FIRE 1.0"
                  />
                </td>

                {/* Tipo */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.tipo || ''} 
                    onChange={(e) => handleChange(row.id, 'tipo', e.target.value)} 
                    className={inputClass}
                    placeholder="AUTOMÓVEL"
                  />
                </td>

                {/* Avaliação */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.avaliacao || ''} 
                    onChange={(e) => handleChange(row.id, 'avaliacao', e.target.value)} 
                    className={inputClass}
                    placeholder="RECUPERÁVEL"
                  />
                </td>

                {/* Chassi */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.chassi || ''} 
                    onChange={(e) => handleChange(row.id, 'chassi', e.target.value)} 
                    className={`${inputClass} min-w-[180px] font-mono text-[11px]`} 
                    placeholder="9BW..."
                  />
                </td>

                {/* Motor */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.motor || ''} 
                    onChange={(e) => handleChange(row.id, 'motor', e.target.value)} 
                    className={`${inputClass} font-mono text-[11px]`}
                    placeholder="Núm. Motor"
                  />
                </td>

                {/* Ano */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.ano || ''} 
                    onChange={(e) => handleChange(row.id, 'ano', e.target.value)} 
                    className={`${inputClass} text-center`} 
                    placeholder="20/20"
                  />
                </td>

                {/* Combustível */}
                <td className="px-1.5 py-1">
                  <select 
                    value={row.comb || 'G'} 
                    onChange={(e) => handleChange(row.id, 'comb', e.target.value)} 
                    className={inputClass}
                  >
                    <option value="G">G (Gasolina)</option>
                    <option value="D">D (Diesel)</option>
                    <option value="A/G">A/G (Flex)</option>
                    <option value="FLEX">FLEX</option>
                    <option value="A">A (Álcool)</option>
                    <option value="E">E (Elétrico)</option>
                    <option value="H">H (Híbrido)</option>
                  </select>
                </td>

                {/* Patrimônio */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.patrimonio || ''} 
                    onChange={(e) => handleChange(row.id, 'patrimonio', e.target.value)} 
                    className={inputClass}
                    placeholder="GPM / Tombo"
                  />
                </td>

                {/* Cor */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.cor || ''} 
                    onChange={(e) => handleChange(row.id, 'cor', e.target.value)} 
                    className={inputClass}
                    placeholder="BRANCA"
                  />
                </td>

                {/* Origem */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.origem || ''} 
                    onChange={(e) => handleChange(row.id, 'origem', e.target.value)} 
                    className={inputClass}
                    placeholder="ESTADUAL"
                  />
                </td>

                {/* Renavam */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.renavam || ''} 
                    onChange={(e) => handleChange(row.id, 'renavam', e.target.value)} 
                    className={`${inputClass} font-mono`}
                    placeholder="00000000000"
                  />
                </td>

                {/* Fipe */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.fipe || ''} 
                    onChange={(e) => handleChange(row.id, 'fipe', e.target.value)} 
                    className={inputClass}
                    placeholder="Ex: 45000"
                  />
                </td>

                {/* % Fipe */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.pctFipe || ''} 
                    onChange={(e) => handleChange(row.id, 'pctFipe', e.target.value)} 
                    className={inputClass}
                    placeholder="Ex: 50%"
                  />
                </td>

                {/* Preço Mínimo */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.precoMinimo || ''} 
                    onChange={(e) => handleChange(row.id, 'precoMinimo', e.target.value)} 
                    className={inputClass}
                    placeholder="Ex: 22500"
                  />
                </td>

                {/* Situação Detran */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.situacaoDetran || ''} 
                    onChange={(e) => handleChange(row.id, 'situacaoDetran', e.target.value)} 
                    className={inputClass}
                    placeholder="REGULAR"
                  />
                </td>

                {/* Endereço do Pátio */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.enderecoPatio || row.endereco_patio || ''} 
                    onChange={(e) => handleChange(row.id, 'enderecoPatio', e.target.value)} 
                    className={`${inputClass} min-w-[220px]`}
                    placeholder="Rua / Pátio..."
                  />
                </td>

                {/* Município */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.municipio || ''} 
                    onChange={(e) => handleChange(row.id, 'municipio', e.target.value)} 
                    className={`${inputClass} font-bold uppercase`}
                    placeholder="CURITIBA/PR"
                  />
                </td>

                {/* Fileira */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.fileira || ''} 
                    onChange={(e) => handleChange(row.id, 'fileira', e.target.value)} 
                    className={`${inputClass} text-center`} 
                    placeholder="01"
                  />
                </td>

                {/* Posição */}
                <td className="px-1.5 py-1">
                  <input 
                    type="text" 
                    value={row.posicao || ''} 
                    onChange={(e) => handleChange(row.id, 'posicao', e.target.value)} 
                    className={`${inputClass} text-center`} 
                    placeholder="05"
                  />
                </td>

                {/* Ações */}
                <td className={`px-2 py-1.5 text-center align-middle sticky right-0 z-10 ${
                  isDark ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-gray-100'
                } shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}>
                  <button 
                    onClick={() => handleRemoveRow(row.id)} 
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors mx-auto block cursor-pointer" 
                    title="Remover veículo"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan={23} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle size={32} className="opacity-40" />
                    <p className="font-bold text-sm">Nenhum veículo encontrado para os filtros selecionados.</p>
                    <p className="text-xs opacity-60">Clique em "Nova Linha" ou "Importar Planilha" para adicionar veículos ao Item J.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
