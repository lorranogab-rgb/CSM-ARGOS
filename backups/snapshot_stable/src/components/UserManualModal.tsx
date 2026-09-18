import React, { useState } from 'react';
import { 
  BookOpen, Download, X, CheckCircle2, Shield, 
  Car, LayoutDashboard, MapPin, QrCode, FileText, Printer, 
  UploadCloud, Sparkles, Database, Smartphone, ShieldCheck
} from 'lucide-react';
import { generateSystemManualPDF } from '../utils/manualPdfGenerator';
import { toast } from 'sonner';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState<string>('intro');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    toast.info("Gerando documento oficial do Manual em PDF...");
    try {
      generateSystemManualPDF();
      toast.success("Manual baixado com sucesso no formato PDF!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Ocorreu um erro ao gerar o PDF do manual.");
    } finally {
      setIsGenerating(false);
    }
  };

  const menuSections = [
    { id: 'intro', label: '1. Visão Geral & Offline', icon: Shield },
    { id: 'inicio', label: '2. Centro de Comando', icon: LayoutDashboard },
    { id: 'patios', label: '3. Mapa de Pátios', icon: MapPin },
    { id: 'frota', label: '4. Frota & QR Code', icon: QrCode },
    { id: 'wizard', label: '5. Wizard de Vistoria', icon: Car },
    { id: 'mimico', label: '6. Módulo Mímico', icon: Printer },
    { id: 'laudos', label: '7. Gestão de Laudos', icon: ShieldCheck },
    { id: 'carga', label: '8. Carga de Frota', icon: UploadCloud },
    { id: 'tabela', label: '9. Critérios IN 002/2023', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-5xl h-[90vh] max-h-[850px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'}`}>
        
        {/* MODAL TOP BAR */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-blue-900 text-white border-blue-800'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">MANUAL DE OPERAÇÃO E USO</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950">
                  v2.6 PDF
                </span>
              </div>
              <p className="text-[11px] opacity-80 leading-tight">
                CSM:ARGOS | Corpo de Bombeiros Militar do Paraná (CBMPR)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
              title="Baixar Manual completo em arquivo PDF de 8 páginas"
            >
              <Download size={16} />
              <span className="hidden sm:inline">{isGenerating ? 'Gerando...' : 'Baixar Manual em PDF'}</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-blue-800 text-white/80 hover:text-white'}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT AREA (2 COLUMNS: NAV SIDEBAR + DETAIL BODY) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* SECTION SIDEBAR */}
          <div className={`w-full md:w-64 shrink-0 border-r p-3 overflow-y-auto flex md:flex-col gap-1.5 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50/80 border-gray-100'}`}>
            <p className="hidden md:block text-[10px] font-black uppercase tracking-widest px-3 py-2 opacity-50">
              Navegação por Telas
            </p>
            {menuSections.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    isSelected 
                      ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-[#003B95] text-white shadow-md')
                      : (isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* DETAIL CONTENT */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
            
            {/* 1. VISÃO GERAL & OFFLINE */}
            {activeTab === 'intro' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 1</span>
                  <h3 className="text-xl font-black tracking-tight">Visão Geral & Arquitetura Offline-First</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Como o sistema opera com segurança em pátios remotos sem dependência contínua de sinal de internet.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2 text-emerald-500 font-bold text-sm">
                      <Smartphone size={18} />
                      <span>Buffer Local (LocalStorage)</span>
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed">
                      Ao concluir um laudo, todos os dados, notas e fotos de chassi e motor são armazenados de imediato no armazenamento local do navegador. Mesmo que o navegador seja fechado ou a bateria acabe, nada é perdido.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2 text-blue-500 font-bold text-sm">
                      <Database size={18} />
                      <span>Nuvem Central (Firebase)</span>
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed">
                      Quando a conexão é restabelecida, a sincronização em lote envia com segurança os laudos para a nuvem central do CBMPR, permitindo a consolidação e emissão dos lotes de leilão.
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border-l-4 border-l-amber-500 ${isDark ? 'bg-amber-950/20 border-slate-800 text-amber-200' : 'bg-amber-50/80 border-gray-200 text-amber-900'}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles size={14} /> Dica de Campo:
                  </h4>
                  <p className="text-xs opacity-90">
                    Observe o indicador no canto superior direito: <strong>Verde</strong> indica conectado à nuvem e <strong>Laranja</strong> indica modo desconectado seguro. Você pode vistoriar dezenas de veículos tranquilamente em modo desconectado.
                  </p>
                </div>
              </div>
            )}

            {/* 2. CENTRO DE COMANDO */}
            {activeTab === 'inicio' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 2</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 1: Centro de Comando (Início)</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Painel executivo com visão holística do desfazimento de bens e linha do tempo de auditoria.
                  </p>
                </div>

                <div className="space-y-3 text-xs leading-relaxed opacity-85">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Métricas em Tempo Real:</strong> Cartões no topo exibem a contagem exata de Veículos Cadastrados, Vistoriados, Pendentes e Bens com Impedimentos Legais.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Gráficos de Distribuição:</strong> Visualize o percentual de veículos classificados como Recuperáveis (circulação), Sucata Aproveitável (peças) ou Sucata Inservível (prensagem).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Histórico e Auditoria:</strong> Rastreie quem realizou cada vistoria, com data e horário precisos dos registros homologados.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Ações Rápidas:</strong> Acesse com 1 clique a inclusão de veículos, a consulta dos laudos prontos ou inicie uma nova inspeção.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. MAPA DE PÁTIOS */}
            {activeTab === 'patios' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 3</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 2: Gestão Geográfica e Mapa de Pátios</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Distribuição dos lotes conforme a jurisdição dos Comandos Regionais do CBMPR.
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs opacity-85 leading-relaxed">
                    O Estado do Paraná é segmentado operacionalmente por Comandos Regionais de Bombeiro Militar (CRBMs). Ao clicar em um pátio no mapa ou na lista, todo o inventário do sistema é filtrado para aquela unidade:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <strong>1º CRBM (Curitiba/RMC):</strong> Pátio Central - Rua Nunes Machado, 100
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <strong>2º CRBM (Londrina/Norte):</strong> Pátio 2º CRBM - Av. Juscelino Kubitschek, 800
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <strong>3º CRBM (Cascavel/Oeste):</strong> Pátio 3º CRBM - Rua Paraná, 1200
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <strong>4º CRBM (Ponta Grossa/Campos Gerais):</strong> Pátio 4º CRBM - Rua Dr. Paula Xavier, 300
                    </div>
                    <div className={`p-3 rounded-xl border sm:col-span-2 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <strong>5º CRBM (Maringá/Noroeste):</strong> Pátio 5º CRBM - Av. Duque de Caxias, 450
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FROTA & QR CODE */}
            {activeTab === 'frota' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 4</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 3: Veículos em Pátio & Identidade Digital</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Localização rápida, triagem por status e leitura por QR Code.
                  </p>
                </div>

                <div className="space-y-3 text-xs leading-relaxed opacity-85">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Busca Universal:</strong> Digite qualquer fragmento de Placa, Chassi, Renavam, Marca ou Município na barra de pesquisa superior.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Localização de Fileira e Vaga:</strong> O cartão indica onde o veículo está estacionado (ex: <em>Fileira C, Vaga 08</em>).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Identidade Digital com QR Code:</strong> Cada lote possui QR Code exclusivo para identificação rápida por tablet ou celular em pátio.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Botão "Iniciar Vistoria":</strong> Carrega automaticamente os dados do veículo no Wizard pericial.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. WIZARD DE VISTORIA */}
            {activeTab === 'wizard' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 5</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 4: Wizard de Vistoria Técnica (6 Fases)</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Roteiro pericial guiado para homologação técnica conforme a IN 002/2023 - SEAP/DETO.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <strong className="text-blue-500">Fase 1 - Dados do Bem:</strong> Tipo (Automóvel, Caminhão, etc.), Placa, Chassi, Renavam, Ano, Cor e Valor FIPE de referência.
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <strong className="text-amber-500">Fase 2 - Impedimentos Legais:</strong> Sinistro sem sindicância, Bloqueios judiciais, Chassi ilegível e verificação obrigatória de descaracterização (remoção de giroflex e plotagens institucionais).
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <strong className="text-blue-500">Fase 3 - Comissão Avaliadora:</strong> Designação do CRBM, Portaria de nomeação, DIOE e e-Protocolo estadual.
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <strong className="text-blue-500">Fase 4 - Matriz de Scores (0 a 100):</strong> Pontuação dos 10 subsistemas mecânicos e estéticos, com diagnósticos técnicos detalhados.
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <strong className="text-blue-500">Fase 5 - Checklist 360° (38 Itens):</strong> Avaliação física individual de cada componente (Vidros, Capô, Portas, Rodas, Bancos, Bateria, etc.).
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <strong className="text-emerald-500">Fase 6 - Evidências Fotográficas:</strong> Captura obrigatória das fotos nítidas do Chassi e do Motor com ferramenta de enquadramento/recorte e compressão inteligente.
                  </div>
                </div>
              </div>
            )}

            {/* 6. MÓDULO MÍMICO */}
            {activeTab === 'mimico' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 6</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 5: Módulo Mímico Oficial SESP/CBMPR</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Fidelidade regulamentar aos formulários padronizados para desfazimento e leilão.
                  </p>
                </div>

                <div className="space-y-4 text-xs opacity-85 leading-relaxed">
                  <p>
                    O <strong>Módulo Mímico</strong> foi desenhado com dimensões milimétricas precisas (210mm x 297mm - Padrão A4) para gerar diretamente os formulários exigidos pelo Departamento de Gestão do Transporte Oficial (DETO):
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <h4 className="font-bold text-sm mb-1 text-blue-500">Formulário I (Ficha Geral)</h4>
                      <p className="text-xs opacity-80">
                        Contém o cabeçalho oficial do Estado do Paraná, identificação do bem, pontuação técnica de 0 a 100, valor de avaliação FIPE, cálculo de depreciação, preço mínimo sugerido e campo para assinatura dos 3 integrantes da comissão.
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <h4 className="font-bold text-sm mb-1 text-blue-500">Formulário IV (Checklist & Fotos)</h4>
                      <p className="text-xs opacity-80">
                        Apresenta a tabela detalhada dos 38 itens físicos vistoriados e as fotos periciais das gravações dos números de chassi e motor com carimbos e identificadores do veículo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                    <Printer size={16} />
                    <span>Clique em "Imprimir / Salvar PDF" para gerar a versão oficial para instrução processual.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. GESTÃO DE LAUDOS */}
            {activeTab === 'laudos' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 7</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 6: Central de Gestão de Laudos e Exportações</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Auditoria de laudos prontos, exportação em lote ZIP e geração da Planilha Base Anexo J.
                  </p>
                </div>

                <div className="space-y-3 text-xs leading-relaxed opacity-85">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Exportação da Planilha Base Anexo J:</strong> Cria em 1 clique a planilha em formato Excel (.XLSX) contendo todos os veículos com suas respectivas notas, avaliações, valores mínimos e comissões para o leilão.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Exportação em Lote (.ZIP):</strong> Selecione múltiplos laudos para baixar um arquivo comprimido contendo cada laudo individualizado em formato PDF pronto para envio.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Carregar Testes:</strong> Carrega instantaneamente laudos fictícios completos com fotos de chassi e motor para testes de estresse de armazenamento.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. CARGA DE FROTA */}
            {activeTab === 'carga' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capítulo 8</span>
                  <h3 className="text-xl font-black tracking-tight">Tela 7: Carga e Inclusão da Frota</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Importação em massa através de planilhas Excel (.XLSX) ou cadastro manual.
                  </p>
                </div>

                <div className="space-y-4 text-xs opacity-85 leading-relaxed">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className="font-bold text-sm mb-1 text-blue-500">Importador Inteligente com Auto-Mapeamento</h4>
                    <p>
                      Arraste ou selecione qualquer arquivo Excel (.xlsx ou .xls). O sistema reconhece sinônimos de colunas automaticamente (ex: "PLACA", "CHASSI", "RENAVAM", "MODELO", "VALOR FIPE", "FILEIRA").
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className="font-bold text-sm mb-1 text-blue-500">Grade Interativa de Pré-Visualização</h4>
                    <p>
                      Antes de gravar na base, você pode editar diretamente qualquer célula na tabela de pré-visualização, corrigir números e validar inconsistências.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 9. CRITÉRIOS IN 002/2023 */}
            {activeTab === 'tabela' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Apêndice Normativo</span>
                  <h3 className="text-xl font-black tracking-tight">Critérios Oficiais da IN nº 002/2023 - SEAP/DETO</h3>
                  <p className="text-sm opacity-70 mt-1">
                    Tabela de enquadramento de bens móveis, percentuais de avaliação e destinação legal.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className={`${isDark ? 'bg-slate-800 text-slate-200' : 'bg-blue-900 text-white'}`}>
                        <th className="p-3 font-bold rounded-tl-xl">Classificação</th>
                        <th className="p-3 font-bold">Faixa de Pontos</th>
                        <th className="p-3 font-bold">% Mínimo FIPE</th>
                        <th className="p-3 font-bold rounded-tr-xl">Destinação Legal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      <tr className={isDark ? 'bg-slate-900/50' : 'bg-white'}>
                        <td className="p-3 font-bold text-emerald-500">RECUPERÁVEL</td>
                        <td className="p-3">60 a 100 pontos</td>
                        <td className="p-3">40% a 50%</td>
                        <td className="p-3">Permitida circulação e transferência ao arrematante.</td>
                      </tr>
                      <tr className={isDark ? 'bg-slate-900/30' : 'bg-gray-50'}>
                        <td className="p-3 font-bold text-amber-500">SUCATA APROVEITÁVEL</td>
                        <td className="p-3">20 a 59 pontos</td>
                        <td className="p-3">15% a 30%</td>
                        <td className="p-3">Desmonte e reuso exclusivo de peças; vedada circulação.</td>
                      </tr>
                      <tr className={isDark ? 'bg-slate-900/50' : 'bg-white'}>
                        <td className="p-3 font-bold text-orange-600">SUCATA INSERVÍVEL</td>
                        <td className="p-3">0 a 19 pontos</td>
                        <td className="p-3">5% a 10%</td>
                        <td className="p-3">Reciclagem e prensagem; inutilização total do chassi.</td>
                      </tr>
                      <tr className={isDark ? 'bg-red-950/20' : 'bg-red-50'}>
                        <td className="p-3 font-bold text-red-600">IMPEDIMENTOS</td>
                        <td className="p-3">Qualquer nota</td>
                        <td className="p-3">Bloqueado</td>
                        <td className="p-3 font-semibold text-red-600">Alienação vedada até baixa jurídica ou sindicância.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleDownloadPdf}
                    className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Download size={16} />
                    <span>Baixar Manual Completo em PDF</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
