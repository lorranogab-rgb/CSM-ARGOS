import jsPDF from 'jspdf';

/**
 * Professional PDF Generator for CSM:ARGOS User Manual.
 * Generates an official, comprehensive multi-page operational guide 
 * demonstrating every screen, feature, and workflow in the system.
 */
export function generateSystemManualPDF(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = 0;
  let currentPage = 1;

  // Colors
  const COLOR_PRIMARY = [0, 59, 149];       // #003B95 (CBMPR Navy Blue)
  const COLOR_SECONDARY = [15, 23, 42];     // #0F172A (Slate 900)
  const COLOR_MUTED = [71, 85, 105];        // #475569 (Slate 600)
  const COLOR_LIGHT_BG = [241, 245, 249];   // #F1F5F9 (Slate 100)
  const COLOR_ACCENT = [217, 119, 6];       // #D97706 (Amber 600)
  const COLOR_BORDER = [203, 213, 225];     // #CBD5E1 (Slate 300)

  // Helper: check page break and draw header/footer on content pages
  const checkPageBreak = (neededHeight: number): void => {
    if (currentY + neededHeight > pageHeight - 20) {
      drawFooter();
      doc.addPage();
      currentPage++;
      drawHeader();
      currentY = 26;
    }
  };

  const drawHeader = (): void => {
    // Top banner line
    doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Running title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text('ESTADO DO PARANÁ | CORPO DE BOMBEIROS MILITAR DO PARANÁ - CBMPR', marginX, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text('CSM:ARGOS - MANUAL DE OPERAÇÃO E USO DO SISTEMA', pageWidth - marginX, 12, { align: 'right' });

    // Subtle divider
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, 15, pageWidth - marginX, 15);
  };

  const drawFooter = (): void => {
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text('Instrução Normativa nº 002/2023 - SEAP/DETO | Gestão e Desfazimento de Bens Móveis e Frota', marginX, pageHeight - 9);
    doc.text(`Página ${currentPage}`, pageWidth - marginX, pageHeight - 9, { align: 'right' });
  };

  const drawSectionHeading = (title: string, subtitle?: string): void => {
    checkPageBreak(18);
    doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
    doc.roundedRect(marginX, currentY, contentWidth, subtitle ? 14 : 10, 2, 2, 'F');

    // Left accent strip
    doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.roundedRect(marginX, currentY, 3.5, subtitle ? 14 : 10, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(title.toUpperCase(), marginX + 7, currentY + 6.5);

    if (subtitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(subtitle, marginX + 7, currentY + 11.5);
      currentY += 17;
    } else {
      currentY += 13;
    }
  };

  const drawCardBox = (title: string, items: { label: string; desc: string }[]): void => {
    const estimatedHeight = 12 + (items.length * 9);
    checkPageBreak(estimatedHeight);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, currentY, contentWidth, estimatedHeight, 2, 2, 'FD');

    // Header strip
    doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.roundedRect(marginX, currentY, contentWidth, 7, 2, 2, 'F');
    doc.rect(marginX, currentY + 4, contentWidth, 3, 'F'); // square bottom corners

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, marginX + 4, currentY + 5);

    let itemY = currentY + 12;
    items.forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.text(`• ${item.label}:`, marginX + 4, itemY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      const labelWidth = doc.getTextWidth(`• ${item.label}: `);
      const wrappedDesc = doc.splitTextToSize(item.desc, contentWidth - labelWidth - 8);
      doc.text(wrappedDesc, marginX + 4 + labelWidth, itemY);

      itemY += (wrappedDesc.length * 4.2) + 2.5;
    });

    currentY += estimatedHeight + 4;
  };

  const drawParagraph = (text: string, isBold: boolean = false): void => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(isBold ? COLOR_SECONDARY[0] : COLOR_MUTED[0], isBold ? COLOR_SECONDARY[1] : COLOR_MUTED[1], isBold ? COLOR_SECONDARY[2] : COLOR_MUTED[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 4.5);
    doc.text(lines, marginX, currentY);
    currentY += (lines.length * 4.5) + 2;
  };

  // ==========================================
  // PÁGINA 1: CAPA INSTITUCIONAL
  // ==========================================
  // Header background decorative block
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, pageWidth, 115, 'F');

  // Decorative subtle accent bars
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 113, pageWidth, 4, 'F');

  // Title elements
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('ESTADO DO PARANÁ', marginX, 28);
  doc.text('SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA - SESP', marginX, 34);
  doc.text('CORPO DE BOMBEIROS MILITAR DO PARANÁ - CBMPR', marginX, 40);

  doc.setFontSize(28);
  doc.text('CSM:ARGOS', marginX, 64);

  doc.setFontSize(14);
  doc.setTextColor(255, 215, 0); // Golden yellow
  doc.text('SISTEMA AUTOMATIZADO DE VISTORIA E DESFAZIMENTO DE FROTA', marginX, 74);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(226, 232, 240);
  doc.text('MANUAL COMPLETO DO USUÁRIO & GUIA DE OPERAÇÃO EM CAMPO', marginX, 84);
  doc.setFontSize(8.5);
  doc.text('Em conformidade com a Instrução Normativa nº 002/2023 - SEAP/DETO', marginX, 92);
  doc.text('Formulários Oficiais Formulário I e Formulário IV padronizados', marginX, 98);

  // Cover body content
  currentY = 130;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('APRESENTAÇÃO DO SISTEMA', marginX, currentY);
  currentY += 6;

  drawParagraph(
    'O CSM:ARGOS é a plataforma corporativa oficial de engenharia pericial e gestão de desfazimento da frota do Corpo de Bombeiros Militar do Paraná (CBMPR). Projetado especificamente para atuar no ambiente desafiador de pátios e oficinas regionais, o sistema combina inteligência operacional, operação desconectada (Offline-First) e automação rigorosa das diretrizes da Instrução Normativa nº 002/2023 - SEAP/DETO.'
  );

  drawParagraph(
    'Este manual orienta oficiais avaliadores, presidentes e membros de Comissões Regionais de Avaliação (1º ao 5º CRBM), vistoriadores técnicos e gestores logísticos no correto manuseio de todas as telas, fluxos de trabalho, registro de evidências e exportação documental do sistema.'
  );

  currentY += 4;
  drawCardBox('FICHA TÉCNICA E CONTROLE DE VERSÃO', [
    { label: 'Sistema', desc: 'CSM:ARGOS - Centro de Serviços e Manutenção / Vistoria Automotiva' },
    { label: 'Versão Homologada', desc: 'Release 2.6 (Edição Especial PWA com Sincronização Híbrida Firestore)' },
    { label: 'Órgão Gestor', desc: 'Comando do Corpo de Bombeiros Militar do Paraná' },
    { label: 'Amparo Legal', desc: 'Instrução Normativa nº 002/2023 - SEAP/DETO, Lei Estadual nº 15.608/2007' },
    { label: 'Tecnologia', desc: 'Progressive Web App (PWA), Local Storage Seguro e Google Firebase Firestore' }
  ]);

  currentY += 6;
  doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
  doc.roundedRect(marginX, pageHeight - 34, contentWidth, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('IMPORTANTE:', marginX + 4, pageHeight - 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('Os laudos gerados pelo sistema possuem validade técnico-administrativa no âmbito estadual, com', marginX + 27, pageHeight - 27);
  doc.text('cálculos automáticos de depreciação e enquadramento de bens em Recuperável, Sucata ou Impedimento.', marginX + 27, pageHeight - 22);

  drawFooter();

  // ==========================================
  // PÁGINA 2: SUMÁRIO & ARQUITETURA
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('SUMÁRIO EXECUTIVO DO MANUAL', 'Estrutura das seções e navegação rápida');

  const summaryItems = [
    { num: 'CAPÍTULO 1', title: 'Visão Geral da Arquitetura e Operação Offline', page: 'Pág. 2' },
    { num: 'CAPÍTULO 2', title: 'Tela 1: Centro de Comando (Início & Dashboard Executivo)', page: 'Pág. 3' },
    { num: 'CAPÍTULO 3', title: 'Tela 2: Gestão Geográfica e Mapa de Pátios Regionais', page: 'Pág. 3' },
    { num: 'CAPÍTULO 4', title: 'Tela 3: Inventário da Frota & Identidade Digital (QR Code)', page: 'Pág. 4' },
    { num: 'CAPÍTULO 5', title: 'Tela 4: Wizard de Vistoria Técnica (Fluxo Guiado em 6 Fases)', page: 'Pág. 5' },
    { num: 'CAPÍTULO 6', title: 'Tela 5: Módulo Mímico Oficial SESP/CBMPR (Form I e Form IV)', page: 'Pág. 6' },
    { num: 'CAPÍTULO 7', title: 'Tela 6: Central de Gestão de Laudos & Exportação em Lote', page: 'Pág. 7' },
    { num: 'CAPÍTULO 8', title: 'Tela 7: Carga e Inclusão da Frota (Importação Excel & Manual)', page: 'Pág. 8' },
    { num: 'APÊNDICE A', title: 'Tabela de Pontuação, Depreciação e Critérios da IN 002/2023', page: 'Pág. 8' }
  ];

  summaryItems.forEach((item) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, 7.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(item.num, marginX + 3, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    doc.text(item.title, marginX + 28, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(item.page, pageWidth - marginX - 14, currentY + 5);

    currentY += 9;
  });

  currentY += 4;
  drawSectionHeading('1. ARQUITETURA OPERACIONAL E CONECTIVIDADE HÍBRIDA', 'Resiliência total para trabalho em pátios sem sinal de rede');

  drawParagraph(
    'O CSM:ARGOS foi concebido sob a filosofia Offline-First. O vistoriador em campo nunca é impedido de trabalhar por oscilações ou ausência de sinal de internet (Wi-Fi ou 4G/5G).'
  );

  drawCardBox('COMPONENTES DA RESILIÊNCIA OPERACIONAL', [
    {
      label: 'Buffer de Segurança Local (LocalStorage)',
      desc: 'Ao concluir qualquer laudo, os dados e fotos são gravados instantaneamente no armazenamento criptografado do próprio navegador do dispositivo, garantindo risco zero de perda de dados.'
    },
    {
      label: 'Sincronização em Nuvem (Firebase Firestore)',
      desc: 'Assim que a conectividade for detectada ou o usuário acionar o sincronizador, todos os laudos pendentes são transmitidos em lote seguro para a base central de dados do CBMPR.'
    },
    {
      label: 'Indicador de Status na Barra Superior',
      desc: 'Verde com pulso contínuo indica conexão ativa à nuvem. Laranja/Âmbar indica operação local desconectada segura.'
    },
    {
      label: 'Compressão Inteligente de Imagens',
      desc: 'Fotos de chassi e motor são processadas e otimizadas automaticamente no padrão de 800x800 a 0.65 de qualidade, garantindo documentação pericial límpida sem estourar os limites de transferência de rede.'
    }
  ]);

  drawFooter();

  // ==========================================
  // PÁGINA 3: CENTRO DE COMANDO & MAPA DE PÁTIOS
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('2. TELA 1: CENTRO DE COMANDO (DASHBOARD & INÍCIO)', 'Visão macro e indicadores estratégicos da operação');

  drawParagraph(
    'O Centro de Comando é a tela de boas-vindas do sistema. Reúne métricas consolidadas em tempo real, painéis gráficos de notas e auditoria de ações recentes executadas pelas comissões.'
  );

  drawCardBox('ELEMENTOS E FUNCIONALIDADES DO CENTRO DE COMANDO', [
    {
      label: 'Cartões de Resumo Estratégico',
      desc: 'Exibem os totais absolutos de Veículos Cadastrados, Vistorias Concluídas, Vistorias Pendentes e Veículos com Impedimentos Legais.'
    },
    {
      label: 'Gráficos de Distribuição de Estado e Notas',
      desc: 'Visualização da proporção de veículos Recuperáveis (circulação), Sucatas (aproveitamento de peças) e Inservíveis (prensagem/reciclagem).'
    },
    {
      label: 'Linha do Tempo de Atividades',
      desc: 'Histórico auditável contendo data, hora e responsável por cada vistoria homologada, inclusão de frota ou edição de registro.'
    },
    {
      label: 'Ações Rápidas de Acesso Imediato',
      desc: 'Atalhos de 1 clique para "Iniciar Nova Vistoria", "Importar Frota via Planilha" e "Consultar Laudos Prontos".'
    },
    {
      label: 'Alternador de Tema (Modo Escuro / Claro)',
      desc: 'Botão no cabeçalho superior para adaptar o contraste visual à iluminação solar direta em pátios ou ambientes de escritório.'
    }
  ]);

  currentY += 4;
  drawSectionHeading('3. TELA 2: GESTÃO GEOGRÁFICA E MAPA DE PÁTIOS', 'Organização por Comandos Regionais do Paraná');

  drawParagraph(
    'A tela de Mapa de Pátios permite navegar pelos depósitos operacionais vinculados aos Comandos Regionais de Bombeiro Militar (CRBMs) distribuídos no Estado do Paraná.'
  );

  drawCardBox('COMO UTILIZAR O MAPA DE PÁTIOS', [
    {
      label: '1. Seleção de Pátio Ativo',
      desc: 'Clique sobre o cartão ou pino do pátio desejado (Ex: Pátio Central 1º CRBM - Curitiba, 2º CRBM - Londrina, 3º CRBM - Cascavel, 4º CRBM - Ponta Grossa, 5º CRBM - Maringá). Toda a listagem da frota se ajustará automaticamente ao pátio selecionado.'
    },
    {
      label: '2. Estatísticas Locais por Pátio',
      desc: 'Cada pátio exibe a quantidade exata de lotes armazenados, porcentagem de vistorias concluídas e alertas de veículos impedidos.'
    },
    {
      label: '3. Edição Cadastral de Pátios',
      desc: 'Permite atualizar endereço oficial do pátio, telefone da seção de logística e responsável técnico da unidade.'
    }
  ]);

  drawFooter();

  // ==========================================
  // PÁGINA 4: INVENTÁRIO DA FROTA & QR CODE
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('4. TELA 3: INVENTÁRIO DA FROTA & IDENTIDADE DIGITAL', 'Listagem, localização espacial de vagas e triagem');

  drawParagraph(
    'A tela "Veículos em Pátio" é o coração da busca operacional. Nela, o vistoriador localiza qualquer veículo do inventário estadual em frações de segundo, visualiza a vaga no pátio e inicia a vistoria técnica com apenas um toque.'
  );

  drawCardBox('FERRAMENTAS DE BUSCA E FILTRAGEM', [
    {
      label: 'Barra de Busca Universal',
      desc: 'Pesquisa instantânea em tempo real digitando Placa, Chassi, Renavam, Modelo, Município ou Número de Patrimônio.'
    },
    {
      label: 'Filtros de Situação Operacional',
      desc: 'Abas para alternar entre "Todos os Veículos", "Vistoriados", "Pendentes de Vistoria" e "Com Impedimentos".'
    },
    {
      label: 'Filtro por Responsável de Carga',
      desc: 'Permite isolar veículos importados por determinado usuário ou comando específico.'
    },
    {
      label: 'Ordenação Inteligente',
      desc: 'Classifique a lista por Placa (A-Z), Maior Avaliação FIPE, Menor Preço Mínimo ou Ordem de Vaga no Pátio.'
    }
  ]);

  currentY += 2;
  drawCardBox('IDENTIDADE DIGITAL & LOCALIZAÇÃO EM VAGA', [
    {
      label: 'Localização Espacial (Fileira e Vaga)',
      desc: 'O cartão do veículo destaca a fileira física (Ex: Fileira B, Vaga 14) onde o bem se encontra estacionado no pátio do quartel.'
    },
    {
      label: 'Identidade Digital com QR Code',
      desc: 'Gera um código QR exclusivo para o veículo. Ao apontar a câmera do celular, o vistoriador abre diretamente a ficha técnica do bem no sistema.'
    },
    {
      label: 'Botão "Iniciar Vistoria"',
      desc: 'Aciona imediatamente o Wizard Pericial com todos os dados cadastrais pré-carregados, eliminando digitação redundante.'
    },
    {
      label: 'Tags de Impedimento Visual',
      desc: 'Veículos com sinistro, bloqueio judicial ou sindicância recebem uma insígnia vermelha chamativa para prevenir desfazimento indevido.'
    }
  ]);

  drawFooter();

  // ==========================================
  // PÁGINA 5: WIZARD DE VISTORIA TÉCNICA
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('5. TELA 4: WIZARD DE VISTORIA TÉCNICA (6 FASES)', 'Fluxo guiado à prova de falhas para homologação pericial');

  drawParagraph(
    'O Wizard de Vistoria Técnica padroniza a coleta pericial em 6 etapas sequenciais, garantindo conformidade absoluta com os critérios estaduais da IN 002/2023 - SEAP/DETO.'
  );

  drawCardBox('FASE 1: IDENTIFICAÇÃO E DADOS GERAIS', [
    { label: 'Tipo de Bem', desc: 'Classificação do lote: Automóvel, Caminhonete, Caminhão, Reboque, Embarcação ou Equipamento.' },
    { label: 'Dados de Cadastro', desc: 'Conferência de Placa, Chassi, Motor, Renavam, Ano/Modelo, Cor e Combustível.' },
    { label: 'Valor FIPE de Referência', desc: 'Inserção do valor de mercado base para aplicação da depreciação regulamentar.' }
  ]);

  drawCardBox('FASE 2: RESTRIÇÕES E IMPEDIMENTOS LEGAIS', [
    { label: 'Sinistrado sem Sindicância', desc: 'Se marcado "Sim", o bem é automaticamente bloqueado para leilão até a conclusão do processo.' },
    { label: 'Bloqueio Judicial / DETRAN', desc: 'Indica restrição de circulação, penhora ou restrição administrativa ativa.' },
    { label: 'Chassi / Motor Ilegível', desc: 'Identifica divergência de numeração ou corrosão profunda que exija remarcação pericial.' },
    { label: 'Descaracterização Obrigatória', desc: 'Verificação da remoção prévia de giroflex, sirene, adesivos institucionais e plotagem policial.' }
  ]);

  drawCardBox('FASE 3: COMISSÃO ESPECIAL DE AVALIAÇÃO', [
    { label: 'Comando Regional', desc: 'Seleção do CRBM competente (1º ao 5º CRBM), com preenchimento automático do Presidente e Membros.' },
    { label: 'Portaria & DIOE', desc: 'Número da Portaria de designação e Diário Oficial do Estado que instituiu a comissão.' },
    { label: 'Número de e-Protocolo', desc: 'Protocolo unificado do Sistema Integrado de Documentos (SID) do Estado do Paraná.' }
  ]);

  drawCardBox('FASE 4: MATRIZ DE SCORES (PONTUAÇÃO 0 A 100)', [
    { label: '10 Sistemas Avaliados', desc: 'Motor (15 pts), Câmbio (10 pts), Suspensão (10 pts), Lataria (15 pts), Pintura (10 pts), Faróis (5 pts), Pneus (10 pts), Rodas (5 pts), Estofamento (10 pts), Painel (10 pts).' },
    { label: 'Diagnósticos Específicos', desc: 'Permite selecionar apontamentos técnicos detalhados para cada componente (ex: vazamento de óleo, ruído interno).' }
  ]);

  drawFooter();

  // ==========================================
  // PÁGINA 6: CHECKLIST, EVIDÊNCIAS & MÓDULO MÍMICO
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('5. WIZARD (CONTINUAÇÃO: FASES 5 E 6) & MÓDULO MÍMICO', 'Checklist de 38 itens, evidências fotográficas e formulários oficiais');

  drawCardBox('FASE 5: CHECKLIST DE INTEGRIDADE FÍSICA (GIRO 360°)', [
    { label: '38 Itens Regulamentares', desc: 'Varredura completa: Vidro Para-brisa, Capô, Para-choques, Lanternas, Portas, Rodas, Bancos, Airbag, Bateria, Radiador, Caixa de Direção, Estepe, etc.' },
    { label: 'Classificação por Item', desc: 'Cada peça recebe: [S] Sim/Íntegro, [D] Danificado ou [N] Não Possui/Ausente.' },
    { label: 'Diagnósticos de Avaria', desc: 'Para itens com avaria, é possível vincular diagnósticos específicos (ex: trincado, amassado, quebrado, faltando).' }
  ]);

  drawCardBox('FASE 6: EVIDÊNCIAS FOTOGRÁFICAS MANDATÓRIAS', [
    { label: 'Foto do Chassi (Mandatória)', desc: 'Foto nítida em macro da gravação do número VIN gravado no aço/longarina do chassi.' },
    { label: 'Foto do Motor (Mandatória)', desc: 'Foto nítida do número e código gravados no bloco usinado do motor do veículo.' },
    { label: 'Ferramenta de Recorte Integrada', desc: 'Enquadramento e zoom interativo para focar exatamente sobre a gravação alfanumérica.' },
    { label: 'Salvamento Final e Homologação', desc: 'Ao clicar em "Homologar Laudo", o sistema grava imediatamente no buffer local e envia para a nuvem.' }
  ]);

  currentY += 2;
  drawSectionHeading('6. TELA 5: MÓDULO MÍMICO OFICIAL SESP/CBMPR', 'Geração estrita dos Formulários I e IV padronizados');

  drawParagraph(
    'O Módulo Mímico é um componente blindado do CSM:ARGOS. Reproduz com precisão milimétrica o leiaute gráfico padronizado dos formulários oficiais exigidos pela SEAP/DETO para alienação de veículos públicos.'
  );

  drawCardBox('FORMULÁRIOS DISPONÍVEIS E EXPORTAÇÃO', [
    { label: 'Formulário I (Ficha de Avaliação)', desc: 'Reúne os dados do bem, cálculo FIPE, percentual de depreciação, nota final, classificação e assinatura dos 3 membros da comissão.' },
    { label: 'Formulário IV (Checklist Pericial)', desc: 'Tabela pericial com os 38 itens avaliados, diagnósticos detalhados e as fotos do chassi e do motor inseridas automaticamente.' },
    { label: 'Impressão em Alta Definição', desc: 'Botão "Imprimir / Salvar PDF" que aciona a formatação A4 (210mm x 297mm) com diagramação pronta para juntada aos autos do processo.' }
  ]);

  drawFooter();

  // ==========================================
  // PÁGINA 7: GESTÃO DE LAUDOS & EXPORTAÇÃO
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('7. TELA 6: CENTRAL DE GESTÃO DE LAUDOS E AUDITORIA', 'Gerenciamento, filtragem e exportação em massa');

  drawParagraph(
    'A tela "Laudos Prontos" concentra todas as vistorias técnicas homologadas pelas comissões, oferecendo ferramentas avançadas de exportação coletiva para leiloeiros e contabilidade.'
  );

  drawCardBox('RECURSOS DA CENTRAL DE LAUDOS', [
    {
      label: 'Tabela Color-Coded de Vistorias',
      desc: 'Listagem de laudos com badges em cores: Verde (Recuperável), Âmbar/Laranja (Sucata Aproveitável) e Vermelho (Impedimentos Legais).'
    },
    {
      label: 'Visualização e Reimpressão Individual',
      desc: 'Clique em qualquer laudo para reabrir a pré-visualização completa dos Formulários I e IV e efetuar nova impressão.'
    },
    {
      label: 'Exportação da Planilha Base Anexo J (.XLSX)',
      desc: 'Gera com 1 clique a planilha oficial do Anexo J formatada para o leilão, incluindo todos os veículos vistoriados, valores de avaliação, preços mínimos e comissões.'
    },
    {
      label: 'Exportação em Lote (.ZIP) com PDFs Individuais',
      desc: 'Permite selecionar dezenas de laudos e exportar um único arquivo comprimido .ZIP contendo cada laudo em arquivo PDF individualizado nomeado pela placa.'
    },
    {
      label: 'Carregar Testes e Validação',
      desc: 'Botão técnico para carregar laudos simulados completos com fotos realistas de chassi e motor, permitindo aferir a capacidade de armazenamento local e nuvem.'
    },
    {
      label: 'Exclusão Auditada com Confirmação',
      desc: 'Permite exclusão individual ou em lote de vistorias com caixa de diálogo de confirmação para prevenir remoções acidentais.'
    }
  ]);

  drawFooter();

  // ==========================================
  // PÁGINA 8: INCLUSÃO DE VEÍCULOS & APÊNDICE
  // ==========================================
  doc.addPage();
  currentPage++;
  drawHeader();
  currentY = 24;

  drawSectionHeading('8. TELA 7: CARGA E INCLUSÃO DA FROTA', 'Importação em lote via Excel ou cadastro avulso');

  drawCardBox('MODALIDADES DE CADASTRO', [
    {
      label: 'Importador Inteligente de Excel (.XLSX)',
      desc: 'Faça upload de planilhas de inventário existentes. O motor de inteligência do sistema mapeia automaticamente colunas com variações de cabeçalhos (ex: "PLACA", "PLC", "CHASSI", "VIN", "MOTOR", "ENG", "VALOR FIPE").'
    },
    {
      label: 'Grade de Pré-Visualização e Edição de Células',
      desc: 'Antes de salvar no banco, o usuário visualiza uma grade interativa onde pode corrigir placas, valores ou endereços diretamente na tela.'
    },
    {
      label: 'Cadastro Manual Avulso',
      desc: 'Formulário direto para cadastrar veículos individuais com validação de campos obrigatórios.'
    }
  ]);

  currentY += 2;
  drawSectionHeading('APÊNDICE: CRITÉRIOS DE CLASSIFICAÇÃO - IN 002/2023', 'Regras oficiais para enquadramento e depreciação');

  // Mini Table
  const tableX = marginX;
  const colWidths = [38, 28, 40, 72];
  const tableHeaders = ['CLASSIFICAÇÃO', 'FAIXA DE PONTOS', '% MÍNIMO DA FIPE', 'DESTINAÇÃO LEGAL'];

  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(tableX, currentY, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  let curColX = tableX + 2;
  tableHeaders.forEach((th, idx) => {
    doc.text(th, curColX, currentY + 4.8);
    curColX += colWidths[idx];
  });

  currentY += 7;

  const tableRows = [
    ['RECUPERÁVEL', '60 a 100 pts', '40% a 50% da FIPE', 'Permitida circulação e transferência normal.'],
    ['SUCATA APROVEITÁVEL', '20 a 59 pts', '15% a 30% da FIPE', 'Desmonte de peças; vedada circulação.'],
    ['SUCATA INSERVÍVEL', '0 a 19 pts', '5% a 10% da FIPE', 'Destinação exclusiva para reciclagem/prensagem.'],
    ['IMPEDIMENTOS', 'Qualquer nota', 'Alienação Vedada', 'Retido no pátio até resolução jurídica/sindicância.']
  ];

  tableRows.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(tableX, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.line(tableX, currentY + 7, tableX + contentWidth, currentY + 7);

    doc.setFont('helvetica', rIdx === 3 ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(rIdx === 3 ? COLOR_ACCENT[0] : COLOR_SECONDARY[0], rIdx === 3 ? COLOR_ACCENT[1] : COLOR_SECONDARY[1], rIdx === 3 ? COLOR_ACCENT[2] : COLOR_SECONDARY[2]);

    let cX = tableX + 2;
    row.forEach((cell, cIdx) => {
      doc.text(cell, cX, currentY + 4.8);
      cX += colWidths[cIdx];
    });

    currentY += 7;
  });

  currentY += 6;
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CORPO DE BOMBEIROS MILITAR DO PARANÁ - ALIENAÇÃO E DESFAZIMENTO', marginX + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240);
  doc.text('Dúvidas técnicas ou suporte operacional: Seção de Logística e Patrimônio | CSM:ARGOS v2.6', marginX + 4, currentY + 10.5);

  drawFooter();

  // Save the generated document
  doc.save('Manual_de_Uso_CSM_ARGOS.pdf');
}
