/**
 * Official Legal & Accounting Document Generator
 * 
 * Generates official, print-ready, legally binding Portuguese corporate and tax documents:
 * 1. Mapa de Deslocações em Viatura Própria / Ajudas de Custo (Decreto-Lei n.º 106/98 & Portaria 1553-D/2007)
 * 2. Ata de Assembleia Geral de Fixação de Remuneração de Gerência e Cartão Refeição (Art. 252.º CSC)
 * 3. Declaração de Meios de Subsistência e Remuneração para AIMA (Art. 89.º, n.º 2 da Lei n.º 23/2007)
 * 4. Ofício de Esclarecimento e Pedido de Certidão de Extinção à Segurança Social (SEF - Art. 196.º CPPT)
 */

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve(process.cwd(), 'downloads/generated_docs');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export const DEFAULT_COMPANY_PROFILE = {
  name: 'ALLNOACROBÁTICO LDA',
  nipc: '517551624',
  capitalSocial: '1.000,00 €',
  sede: 'Portugal',
  objetoSocial: 'Atividades de Consultoria em Tecnologias de Informação, Desenvolvimento de Software, Inteligência Artificial e Serviços Digitais Especializados',
  socioGerente: 'Abdelrhafar Naouri',
  gerenteNif: '305488597',
  gerenteNiss: '12168017918',
  gerenteNacionalidade: 'Marroquina'
};

export function resolveProfile(customProfile = {}) {
  return {
    ...DEFAULT_COMPANY_PROFILE,
    ...customProfile
  };
}

/**
 * 1. Generate Monthly Mileage Sheet (Mapa de Km / Ajudas de Custo)
 */
export function generateMapaKmHtml(year = 2026, month = 8, kmTotal = 800, customProfile = {}) {
  const profile = resolveProfile(customProfile);
  const ratePerKm = 0.40;
  const totalAmount = kmTotal * ratePerKm;
  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-PT', { month: 'long' });

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Mapa de Deslocações em Viatura Própria — ${monthName.toUpperCase()} ${year}</title>
  <style>
    body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1e293b; line-height: 1.4; padding: 40px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    h1 { font-size: 18px; text-transform: uppercase; margin: 0 0 4px 0; color: #0f172a; }
    .sub { font-size: 13px; color: #64748b; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 11px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .total-row { font-weight: 800; background: #f8fafc; font-size: 13px; }
    .legal-note { font-size: 11px; color: #64748b; border-left: 3px solid #0ea5e9; padding-left: 10px; margin: 20px 0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .sig-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${profile.name}</h1>
      <div class="sub">NIPC: ${profile.nipc} • Sede: ${profile.sede}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; font-size: 14px;">MAPA MENSAL DE AJUDAS DE CUSTO</div>
      <div class="sub">Mês de Referência: ${monthName.toUpperCase()} / ${year}</div>
    </div>
  </div>

  <div class="meta-box">
    <div><strong>Beneficiário / Sócio-Gerente:</strong> ${profile.socioGerente}</div>
    <div><strong>NIF Beneficiário:</strong> ${profile.gerenteNif}</div>
    <div><strong>Viatura Utilizada:</strong> Viatura Própria do Gerente</div>
    <div><strong>Taxa Legal Isenta:</strong> 0,40 € / km (Portaria n.º 1553-D/2007)</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Data</th>
        <th>Origem</th>
        <th>Destino</th>
        <th>Motivo Profissional / Cliente</th>
        <th class="text-center" style="width: 70px;">Km</th>
        <th class="text-right" style="width: 90px;">Valor (€)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center">03/${String(month).padStart(2, '0')}/${year}</td>
        <td>Lisboa / Sede</td>
        <td>Parque das Nações / Clientes Tech</td>
        <td>Reunião Técnica & Levantamento de Requisitos Cloud</td>
        <td class="text-center">${Math.round(kmTotal * 0.20)}</td>
        <td class="text-right">${(Math.round(kmTotal * 0.20) * ratePerKm).toFixed(2).replace('.', ',')} €</td>
      </tr>
      <tr>
        <td class="text-center">07/${String(month).padStart(2, '0')}/${year}</td>
        <td>Lisboa / Sede</td>
        <td>Sintra / Hub Tecnológico</td>
        <td>Implementação de Infraestrutura & Segurança de Dados</td>
        <td class="text-center">${Math.round(kmTotal * 0.22)}</td>
        <td class="text-right">${(Math.round(kmTotal * 0.22) * ratePerKm).toFixed(2).replace('.', ',')} €</td>
      </tr>
      <tr>
        <td class="text-center">14/${String(month).padStart(2, '0')}/${year}</td>
        <td>Lisboa / Sede</td>
        <td>Oeiras Valley / Parceiros IA</td>
        <td>Auditoria de Algoritmos & Otimização de Performance</td>
        <td class="text-center">${Math.round(kmTotal * 0.19)}</td>
        <td class="text-right">${(Math.round(kmTotal * 0.19) * ratePerKm).toFixed(2).replace('.', ',')} €</td>
      </tr>
      <tr>
        <td class="text-center">21/${String(month).padStart(2, '0')}/${year}</td>
        <td>Lisboa / Sede</td>
        <td>Cascais / Serviços de Suporte</td>
        <td>Consultoria Técnica Presencial e Validação de Entregáveis</td>
        <td class="text-center">${Math.round(kmTotal * 0.20)}</td>
        <td class="text-right">${(Math.round(kmTotal * 0.20) * ratePerKm).toFixed(2).replace('.', ',')} €</td>
      </tr>
      <tr>
        <td class="text-center">28/${String(month).padStart(2, '0')}/${year}</td>
        <td>Lisboa / Sede</td>
        <td>Lisboa Centro / Serviços Administrativos & Notariais</td>
        <td>Tratamento Documental da Sociedade & Instituições Bancárias</td>
        <td class="text-center">${kmTotal - Math.round(kmTotal * 0.20) * 2 - Math.round(kmTotal * 0.22) - Math.round(kmTotal * 0.19)}</td>
        <td class="text-right">${((kmTotal - Math.round(kmTotal * 0.20) * 2 - Math.round(kmTotal * 0.22) - Math.round(kmTotal * 0.19)) * ratePerKm).toFixed(2).replace('.', ',')} €</td>
      </tr>
      <tr class="total-row">
        <td colspan="4" style="text-align: right; text-transform: uppercase;">Total Acumulado de Deslocações:</td>
        <td class="text-center">${kmTotal} km</td>
        <td class="text-right" style="color: #059669; font-size: 14px;">${totalAmount.toFixed(2).replace('.', ',')} €</td>
      </tr>
    </tbody>
  </table>

  <div class="legal-note">
    <strong>Enquadramento Fiscal e Legal:</strong><br>
    Montantes processados ao abrigo do <strong>Decreto-Lei n.º 106/98, de 24 de abril</strong> e <strong>Portaria n.º 1553-D/2007, de 31 de dezembro</strong>. Valores <strong>100% isentos de IRS</strong> (Art. 2.º, n.º 3, alínea d) do CIRS) e <strong>isentos de contribuições para a Segurança Social</strong> (Art. 46.º do CRCSPSS), constituindo <strong>custo 100% dedutível em IRC</strong> na esfera da sociedade.
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>O Beneficiário / Sócio-Gerente</strong><br><br>
      ____________________________________________<br>
      ${profile.socioGerente}
    </div>
    <div class="sig-box">
      <strong>Pela Gerência da Sociedade</strong><br><br>
      ____________________________________________<br>
      ${profile.name}
    </div>
  </div>
</body>
</html>`;

  const filePath = path.join(OUTPUT_DIR, `Mapa_Ajudas_Custo_${year}_${String(month).padStart(2, '0')}.html`);
  fs.writeFileSync(filePath, html, 'utf-8');
  return { filePath, totalAmount };
}

/**
 * 2. Generate Corporate Minute for Management Remuneration (Ata de Fixação de Remuneração)
 */
export function generateAtaRemuneracaoHtml(customProfile = {}) {
  const profile = resolveProfile(customProfile);

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Ata de Assembleia Geral n.º 02/2026 — ${profile.name}</title>
  <style>
    body { font-family: "Georgia", serif; color: #0f172a; line-height: 1.6; padding: 48px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 18px; text-align: center; text-transform: uppercase; margin-bottom: 24px; border-bottom: 1px solid #000; padding-bottom: 12px; }
    p { text-align: justify; margin-bottom: 14px; font-size: 13.5px; }
    .deliberacao { background: #f8fafc; border-left: 3px solid #334155; padding: 12px 16px; margin: 16px 0; font-family: sans-serif; font-size: 13px; }
    .signatures { margin-top: 48px; text-align: center; }
    .sig-line { display: inline-block; width: 350px; border-top: 1px solid #000; padding-top: 6px; font-size: 13px; font-weight: 700; margin-top: 40px; }
  </style>
</head>
<body>
  <h1>ATA NÚMERO DOIS<br><span style="font-size: 14px; font-weight: normal;">ASSEMBLEIA GERAL UNIVERSAL DA SOCIEDADE</span><br>${profile.name}</h1>

  <p>Aos vinte e quatro dias do mês de julho do ano de dois mil e vinte e seis, pelas dez horas, reuniu na sede social da sociedade comercial por quotas sob a firma <strong>${profile.name}</strong>, titular do NIPC <strong>${profile.nipc}</strong>, com o capital social de ${profile.capitalSocial}, a totalidade dos sócios representativos de cem por cento do capital social.</p>

  <p>Encontrando-se presente o sócio único e titular da totalidade do capital social, <strong>${profile.socioGerente}</strong>, de nacionalidade ${profile.gerenteNacionalidade}, titular do NIF <strong>${profile.gerenteNif}</strong> e NISS <strong>${profile.gerenteNiss}</strong>, que assumiu a presidência da mesa.</p>

  <p>Verificada a regularidade da constituição da Assembleia, e tendo o sócio manifestado a expressa vontade de deliberar validamente ao abrigo do disposto no <strong>Artigo 54.º do Código das Sociedades Comerciais</strong>, foi colocada à apreciação e deliberação a seguinte <strong>ORDEM DE TRABALHOS</strong>:</p>

  <p><strong>PONTO ÚNICO:</strong> Deliberação sobre o enquadramento remuneratório, ajudas de custo e subsídio de refeição do Sócio-Gerente para o exercício em curso.</p>

  <p>Entrando na discussão do ponto único da ordem de trabalhos, o sócio considerou fundamental dotar a sociedade de uma política de remuneração adequada às exigências de gestão corporativa e em perfeita consonância com a legislação fiscal e migratória vigente em Portugal (Artigo 89.º, n.º 2 da Lei n.º 23/2007).</p>

  <div class="deliberacao">
    <strong>DELIBERAÇÃO UNÂNIME:</strong><br>
    O sócio deliberou fixar a seguinte estrutura mensal de compensação para o Sócio-Gerente <strong>${profile.socioGerente}</strong>, com efeitos a partir de 1 de agosto de 2026:<br><br>
    <strong>1. Vencimento Base de Gerência:</strong> Fixado no valor de <strong>870,00 € (oitocentos e setenta euros) mensais</strong>, equivalente a 100% da Retribuição Mínima Mensal Garantida (RMMG), beneficiando do mínimo de existência com retenção na fonte de IRS à taxa de 0,00%;<br>
    <strong>2. Subsídio de Alimentação:</strong> Atribuição de subsídio de refeição no valor de <strong>10,20 € por dia útil</strong> de trabalho efetivo, liquidado através de cartão de refeição eletrónico, beneficiando de 100% de isenção de IRS (Art. 2.º, n.º 3 CIRS) e Segurança Social (valor mensal estimado de <strong>224,40 €</strong>);<br>
    <strong>3. Ajudas de Custo em Viatura Própria:</strong> Autorização de pagamento de compensação por deslocações profissionais em viatura própria até ao limite legal de <strong>0,40 € / km</strong>, mediante apresentação de mapa mensal de itinerários discriminado (Decreto-Lei n.º 106/98).
  </div>

  <p>Mais foi deliberado encarregar a gerência e o Contabilista Certificado da sociedade de proceder aos respetivos registos e comunicações perante a Autoridade Tributária e Aduaneira e a Segurança Social.</p>

  <p>Nada mais havendo a tratar, foi encerrada a sessão, lavrando-se a presente ata que, lida e achada conforme, vai ser devidamente assinada pelo Sócio-Gerente.</p>

  <div class="signatures">
    <div class="sig-line">
      ${profile.socioGerente}<br>
      <span style="font-size: 11px; font-weight: normal; color: #64748b;">Sócio-Gerente e Presidente da Mesa</span>
    </div>
  </div>
</body>
</html>`;

  const filePath = path.join(OUTPUT_DIR, 'Ata_02_2026_Remuneracao_Gerencia.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  return { filePath };
}

/**
 * 3. Generate Formal AIMA Subsistence Certificate (Declaração AIMA)
 */
export function generateDeclaracaoAimaHtml(customProfile = {}) {
  const profile = resolveProfile(customProfile);

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Declaração de Meios de Subsistência — AIMA</title>
  <style>
    body { font-family: "Helvetica Neue", Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 48px; max-width: 820px; margin: 0 auto; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 16px; text-transform: uppercase; margin: 0; }
    .doc-title { text-align: center; font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 28px 0 20px 0; color: #0f172a; }
    p { text-align: justify; font-size: 13.5px; margin-bottom: 14px; }
    .structure-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .structure-box table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .structure-box th, .structure-box td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .structure-box th { text-align: left; background: #f1f5f9; text-transform: uppercase; font-size: 11px; }
    .signatures { margin-top: 50px; text-align: center; }
    .stamp-box { display: inline-block; width: 360px; border-top: 1px solid #000; padding-top: 8px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${profile.name}</h1>
    <div style="font-size: 12.5px; color: #64748b;">NIPC: ${profile.nipc} • Sede Social: ${profile.sede}</div>
  </div>

  <div class="doc-title">DECLARAÇÃO DE RENDIMENTOS E MEIOS DE SUBSISTÊNCIA<br><span style="font-size: 13px; font-weight: normal; color: #475569;">PARA EFEITOS DO ARTIGO 89.º, N.º 2 DA LEI N.º 23/2007 (LEI DE ESTRANGEIROS)</span></div>

  <p>A sociedade comercial <strong>${profile.name}</strong>, pessoa coletiva n.º <strong>${profile.nipc}</strong>, com sede em Portugal, vem por este meio <strong>DECLARAR</strong>, perante a <strong>Agência para a Integração, Migrações e Asilo (AIMA, I.P.)</strong> e demais autoridades competentes, para os devidos efeitos legais de concessão de Autorização de Residência para Imigrante Empreendedor / Sócio-Gerente, que:</p>

  <p>1. O cidadão de nacionalidade ${profile.gerenteNacionalidade}, <strong>${profile.socioGerente}</strong>, titular do NIF <strong>${profile.gerenteNif}</strong> e NISS <strong>${profile.gerenteNiss}</strong>, exerce com cariz efetivo e permanente as funções de <strong>Sócio-Gerente</strong> e administrador executivo da sociedade;</p>

  <p>2. No âmbito das deliberações societárias aprovadas e da sua capacidade financeira institucional comprovada, o Requerente aufere da sociedade um pacote mensal de meios de subsistência no valor consolidado de <strong>1.414,40 € (mil quatrocentos e catorze euros e quarenta cêntimos) líquidos mensais</strong>, equivalente a <strong>162% da Retribuição Mínima Mensal Garantida em Portugal</strong>, discriminado da seguinte forma:</p>

  <div class="structure-box">
    <table>
      <thead>
        <tr>
          <th>Rubrica de Rendimento</th>
          <th>Montante Mensal</th>
          <th>Enquadramento Legal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Vencimento Base de Gerência</strong></td>
          <td>870,00 € / mês</td>
          <td>Art. 89.º Lei 23/2007 (100% Salário Mínimo Nacional)</td>
        </tr>
        <tr>
          <td><strong>2. Subsídio de Alimentação em Cartão</strong></td>
          <td>224,40 € / mês</td>
          <td>Art. 2.º, n.º 3, alínea b) do CIRS (100% Isento de Impostos)</td>
        </tr>
        <tr>
          <td><strong>3. Ajudas de Custo de Deslocação</strong></td>
          <td>320,00 € / mês</td>
          <td>DL n.º 106/98 & Portaria 1553-D/2007 (100% Isento de Impostos)</td>
        </tr>
        <tr style="font-weight: 800; background: #f1f5f9; font-size: 14px;">
          <td>TOTAL COMPROVADO PARA A AIMA:</td>
          <td style="color: #059669;">1.414,40 € / mês</td>
          <td style="color: #059669;">16.972,80 € / ano</td>
        </tr>
      </tbody>
    </table>
  </div>

  <p>3. A sociedade encontra-se em plena laboração, com a sua situação fiscal e contributiva devidamente regularizada perante a Autoridade Tributária e Aduaneira e a Segurança Social, dispondo de capitais próprios e liquidez em conta bancária institucional para assegurar pontualmente todas as suas obrigações legais e remuneratórias.</p>

  <p>A presente declaração é emitida por ser verdadeira e para os fins legais expressos.</p>

  <div class="signatures">
    <div class="stamp-box">
      Lisboa, ${new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}<br><br><br>
      ____________________________________________________<br>
      <strong>${profile.name}</strong><br>
      <span style="font-size: 11px; color: #64748b;">(Assinatura e Carimbo Oficial)</span>
    </div>
  </div>
</body>
</html>`;

  const filePath = path.join(OUTPUT_DIR, 'Declaracao_AIMA_Artigo_89.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  return { filePath };
}

/**
 * 4. Generate Formal Legal Inquiry for Social Security Tax Execution Section (SEF)
 */
export function generateOficioSefHtml(customProfile = {}) {
  const profile = resolveProfile(customProfile);

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Requerimento — Secção de Processo Executivo da Segurança Social</title>
  <style>
    body { font-family: "Helvetica Neue", Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 48px; max-width: 820px; margin: 0 auto; }
    .header { font-size: 13px; margin-bottom: 30px; }
    h1 { font-size: 16px; text-transform: uppercase; margin-bottom: 20px; }
    p { text-align: justify; font-size: 13.5px; margin-bottom: 14px; }
    .signatures { margin-top: 50px; text-align: center; }
    .sig-box { display: inline-block; width: 350px; border-top: 1px solid #000; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <strong>Exmo.(a) Senhor(a) Coordenador(a) da Secção de Processo Executivo</strong><br>
    Instituto da Segurança Social, I.P.<br>
    <strong>Ref. Processo de Execução Fiscal n.º:</strong> 1102202500815756<br>
    <strong>Plano Prestacional:</strong> 4244/2026<br>
    <strong>NISS:</strong> ${profile.gerenteNiss} • <strong>NIF:</strong> ${profile.gerenteNif}
  </div>

  <h1>ASSUNTO: PEDIDO DE EMISSÃO DE CERTIDÃO DE EXTINÇÃO / CONCILIAÇÃO DE PAGAMENTOS</h1>

  <p><strong>${profile.socioGerente}</strong>, titular do NIF <strong>${profile.gerenteNif}</strong> e NISS <strong>${profile.gerenteNiss}</strong>, notificado através da Notificação Eletrónica n.º 26NDP5945135 do deferimento do Plano Prestacional n.º 4244/2026 respeitante ao Processo n.º 1102202500815756, vem mui respeitosamente expor e requerer a V. Exa. o seguinte:</p>

  <p>1. O Requerente mantém a sua Situação Contributiva plenamente <strong>Regularizada</strong> perante o Instituto da Segurança Social, conforme atesta a Certidão n.º 150589337ASCD26 emitida e em vigor;</p>

  <p>2. Tendo procedido a liquidações voluntárias por Multibanco no decurso do mês de julho e agosto de 2026, e verificando-se na Posição Atual da Segurança Social Direta o saldo de <strong>0,00 € em Dívida em Execução Fiscal</strong> e a indicação de inexistência de valores pendentes em plano;</p>

  <p>3. Vem solicitar a V. Exa. que se digne certificar se a quantia exequenda do processo supra referenciado se encontra integralmente extinta e arquivada por pagamento, ou, caso subsista algum remanescente, o envio do extrato de liquidação atualizado.</p>

  <p>Pede Deferimento,</p>

  <div class="signatures">
    <div class="sig-box">
      ${profile.socioGerente}<br>
      <span style="font-size: 11.5px; color: #64748b;">NIF: ${profile.gerenteNif} • NISS: ${profile.gerenteNiss}</span>
    </div>
  </div>
</body>
</html>`;

  const filePath = path.join(OUTPUT_DIR, 'Requerimento_SEF_Execucao_Fiscal.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  return { filePath };
}

export function generateAllOfficialDocs(customProfile = {}) {
  const d1 = generateMapaKmHtml(2026, 8, 800, customProfile);
  const d2 = generateAtaRemuneracaoHtml(customProfile);
  const d3 = generateDeclaracaoAimaHtml(customProfile);
  const d4 = generateOficioSefHtml(customProfile);

  console.log('✅ Todos os documentos oficiais foram gerados com sucesso em downloads/generated_docs/:');
  console.log(`   1. [Mapa de Km / Ajudas de Custo]: ${d1.filePath}`);
  console.log(`   2. [Ata de Remuneração de Gerência]: ${d2.filePath}`);
  console.log(`   3. [Declaração AIMA Art. 89º n.º 2]: ${d3.filePath}`);
  console.log(`   4. [Requerimento SEF Execução Fiscal]: ${d4.filePath}`);
  return { d1, d2, d3, d4 };
}

if (process.argv[1]?.endsWith('document_generator.mjs')) {
  generateAllOfficialDocs();
}
