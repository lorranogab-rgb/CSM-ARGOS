import React, { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

export interface Vehicle {
  id: string;
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
  isDark: boolean;
}

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ onSave, isDark }) => {
  const createEmptyRow = (): Vehicle => ({
    id: 'new-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    orgao: '',
    placa: '',
    modelo: '',
    tipo: '',
    avaliacao: '',
    chassi: '',
    motor: '',
    ano: '',
    comb: 'G',
    patrimonio: '',
    cor: '',
    origem: '',
    renavam: '',
    fipe: '',
    pctFipe: '',
    precoMinimo: '',
    situacaoDetran: '',
    endereco_patio: '',
    municipio: ''
  });

  const [data, setData] = useState<Vehicle[]>(() => [createEmptyRow()]);

  // We don't watch frota changes because this editor is purely for inserting NEW vehicles.
  // The 'frota' prop is only used to pull one example vehicle for demonstration.

  const handleAddRow = () => {
    setData([...data, createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    setData(data.filter(v => v.id !== id));
  };

  const handleChange = (id: string, field: keyof Vehicle, value: string) => {
    setData(data.map(v => {
      if (v.id === id) {
        let formattedValue = value;
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
        }
        return { ...v, [field]: formattedValue };
      }
      return v;
    }));
  };

  const handleSave = async () => {
    let hasInvalidRow = false;
    let hasValidData = false;

    for (const row of data) {
      // Check if row is completely empty (ignoring 'comb' as it defaults to 'G')
      const isEmpty = !row.orgao && !row.placa && !row.modelo && !row.tipo && !row.avaliacao && 
                      !row.chassi && !row.motor && !row.ano && !row.patrimonio && !row.cor && 
                      !row.origem && !row.renavam && !row.fipe && !row.pctFipe && !row.precoMinimo && 
                      !row.situacaoDetran && !row.endereco_patio && !row.municipio;
                      
      if (isEmpty) continue;
      
      // Fields that are required (everything except pctFipe and precoMinimo)
      const isMissingRequired = !row.orgao || !row.placa || !row.modelo || !row.tipo || !row.avaliacao || 
                                !row.chassi || !row.motor || !row.ano || !row.comb || !row.patrimonio || !row.cor || 
                                !row.origem || !row.renavam || !row.fipe || !row.situacaoDetran || 
                                !row.endereco_patio || !row.municipio;
                                
      if (isMissingRequired) {
        hasInvalidRow = true;
        break; 
      }
      
      hasValidData = true;
    }
    
    if (hasInvalidRow) {
      alert("Por favor, preencha todos os campos obrigatórios (exceto % Fipe e Preço Mínimo) para os veículos informados.");
      return;
    }
    
    if (!hasValidData) {
      alert("Nenhum dado informado para salvar.");
      return;
    }

    const success = await onSave(data.filter(row => {
      return !(!row.orgao && !row.placa && !row.modelo && !row.tipo && !row.avaliacao && 
               !row.chassi && !row.motor && !row.ano && !row.patrimonio && !row.cor && 
               !row.origem && !row.renavam && !row.fipe && !row.pctFipe && !row.precoMinimo && 
               !row.situacaoDetran && !row.endereco_patio && !row.municipio);
    }));

    if (success) {
      setData([createEmptyRow()]);
    }
  };

  const inputClass = `w-full min-w-[100px] px-2 py-1.5 text-sm rounded bg-transparent border ${isDark ? 'border-slate-700 focus:border-blue-500 text-slate-200' : 'border-gray-300 focus:border-blue-500 text-gray-800'} focus:ring-1 focus:ring-blue-500 outline-none`;

  return (
    <div className={`px-0 md:px-4 lg:px-4 pb-4 pt-0 h-full flex flex-col ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
      <div className="flex justify-between flex-wrap gap-4 items-center mb-2 mt-4 md:mt-0 lg:mt-0">
        <div>
          <h2 className="text-2xl font-bold">Cadastro de Veículos (Anexo J)</h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Insira ou edite veículos seguindo os critérios de formatação.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddRow} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
            <Plus size={16} /> Adicionar Linha
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-[#003B95] text-white hover:bg-blue-800">
            <Save size={16} /> Salvar Alterações
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-auto rounded-lg border ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <table className="w-max min-w-full text-sm text-left">
          <thead className={`text-xs uppercase sticky top-0 z-10 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-700'} shadow-sm`}>
            <tr>
              <th className="px-3 py-3 font-semibold">Órgão</th>
              <th className="px-3 py-3 font-semibold">Placa</th>
              <th className="px-3 py-3 font-semibold">Marca/Modelo</th>
              <th className="px-3 py-3 font-semibold">Tipo</th>
              <th className="px-3 py-3 font-semibold">Avaliação</th>
              <th className="px-3 py-3 font-semibold">Chassi</th>
              <th className="px-3 py-3 font-semibold min-w-[120px]">Núm. Motor</th>
              <th className="px-3 py-3 font-semibold min-w-[90px]">Ano</th>
              <th className="px-3 py-3 font-semibold min-w-[90px]">Comb.</th>
              <th className="px-3 py-3 font-semibold">Patrimônio</th>
              <th className="px-3 py-3 font-semibold min-w-[110px]">Cor/Doc.</th>
              <th className="px-3 py-3 font-semibold">Origem</th>
              <th className="px-3 py-3 font-semibold">Renavam</th>
              <th className="px-3 py-3 font-semibold">Fipe</th>
              <th className="px-3 py-3 font-semibold min-w-[90px]">% Fipe</th>
              <th className="px-3 py-3 font-semibold min-w-[120px]">Preço Mín.</th>
              <th className="px-3 py-3 font-semibold min-w-[140px]">Situação Detran</th>
              <th className="px-3 py-3 font-semibold min-w-[180px]">Endereço do Pátio</th>
              <th className="px-3 py-3 font-semibold min-w-[120px]">Município</th>
              <th className="px-3 py-3 font-semibold text-center sticky right-0 bg-inherit shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className={`border-b ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/80' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                <td className="px-2 py-1.5"><input type="text" value={row.orgao || ''} onChange={(e) => handleChange(row.id, 'orgao', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.placa || ''} onChange={(e) => handleChange(row.id, 'placa', e.target.value)} className={inputClass} placeholder="ABC1234"/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.modelo || ''} onChange={(e) => handleChange(row.id, 'modelo', e.target.value)} className={`${inputClass} min-w-[200px]`}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.tipo || ''} onChange={(e) => handleChange(row.id, 'tipo', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.avaliacao || ''} onChange={(e) => handleChange(row.id, 'avaliacao', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.chassi || ''} onChange={(e) => handleChange(row.id, 'chassi', e.target.value)} className={`${inputClass} min-w-[150px]`}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.motor || ''} onChange={(e) => handleChange(row.id, 'motor', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.ano || ''} onChange={(e) => handleChange(row.id, 'ano', e.target.value)} className={inputClass} placeholder="YY/YY"/></td>
                <td className="px-2 py-1.5">
                  <select value={row.comb || ''} onChange={(e) => handleChange(row.id, 'comb', e.target.value)} className={inputClass}>
                    <option value=""></option>
                    <option value="D">D</option>
                    <option value="G">G</option>
                    <option value="A/G">A/G</option>
                  </select>
                </td>
                <td className="px-2 py-1.5"><input type="text" value={row.patrimonio || ''} onChange={(e) => handleChange(row.id, 'patrimonio', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.cor || ''} onChange={(e) => handleChange(row.id, 'cor', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.origem || ''} onChange={(e) => handleChange(row.id, 'origem', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.renavam || ''} onChange={(e) => handleChange(row.id, 'renavam', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.fipe || ''} onChange={(e) => handleChange(row.id, 'fipe', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.pctFipe || ''} onChange={(e) => handleChange(row.id, 'pctFipe', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.precoMinimo || ''} onChange={(e) => handleChange(row.id, 'precoMinimo', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.situacaoDetran || ''} onChange={(e) => handleChange(row.id, 'situacaoDetran', e.target.value)} className={inputClass}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.endereco_patio || ''} onChange={(e) => handleChange(row.id, 'endereco_patio', e.target.value)} className={`${inputClass} min-w-[200px]`}/></td>
                <td className="px-2 py-1.5"><input type="text" value={row.municipio || ''} onChange={(e) => handleChange(row.id, 'municipio', e.target.value)} className={inputClass}/></td>
                <td className={`px-2 py-1.5 text-center align-middle sticky right-0 ${isDark ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-gray-100'} shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}>
                  <button onClick={() => handleRemoveRow(row.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors mx-auto block" title="Remover veículo">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={20} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                  Nenhum veículo editável. Clique em "Adicionar Linha" para começar a inserir.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

