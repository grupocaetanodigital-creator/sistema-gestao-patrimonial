# Sistema Integrado de Gestão e Segurança Patrimonial / Condominial

Sistema completo de controle de acesso, portaria, rondas patrimoniais, ocorrências e gestão condominial com suporte a operação mobile/desktop, leitura de QR Code, validação de geolocalização (GPS), conferência de postos e exportação de backups em formato CSV (otimizado para Microsoft Excel).

---

## 🚀 Módulos do Sistema

1. **Módulo 01 - Cadastros & Administração**
   - Gestão de Condomínios e Postos (código único com autogeração inteligente anti-duplicação).
   - Cadastro de Usuários e Operadores (níveis Operador, Supervisor, ADM e Desenvolvedor Master).
   - Configuração de canais WhatsApp/grupos dedicados por tipo de alerta para cada condomínio.
   - Configuração de contatos de emergência e suporte direto ao desenvolvedor.
   - Central de Backup em CSV para Excel (individual por condomínio/módulo ou completo).

2. **Módulo 02 - Controle de Encomendas & Entregas**
   - Registro de recebimento, leitor de código de barras / etiquetas.
   - Notificação automática para moradores via WhatsApp.
   - Registro de foto do pacote e assinatura de retirada.
   - Exportação de histórico em CSV.

3. **Módulo 03 - Custódia de Volumes**
   - Guarda temporária de pertences e objetos de valor.
   - Comprovante de entrada e saída com foto e protocolo.
   - Exportação em CSV.

4. **Módulo 04 - Controle de Materiais & Ativos**
   - Registro de empréstimos e devoluções de ferramentas e equipamentos do posto.
   - Controle de estado de conservação e operador responsável.

5. **Módulo 05 - Claviculário / Controle de Chaves**
   - Retirada e devolução de chaves com registro de usuário, motivo e horário.
   - Alerta visual para chaves com devolução em atraso.

6. **Módulo 06 - Chamados de Manutenção**
   - Abertura de ordens de serviço (elétrica, hidráulica, segurança, elevadores, etc.).
   - Registro de fotos do problema e histórico de status.

7. **Módulo 07 - Rondas Patrimoniais & Checkpoints**
   - Validação obrigatória por leitura de QR Code ou Tag NFC.
   - Validação e conferência por Coordenadas GPS no momento do registro.
   - Cronômetro de tempo de ronda e rota pré-definida.
   - Cadastro rápido de pontos com gerador de código inteligente e captura direta de GPS no local.

8. **Módulo 08 - Livro de Ocorrências**
   - Relato de incidentes com fotos, anexos de áudio e classificação de gravidade.
   - Envio imediato do resumo da ocorrência para os canais configurados.

9. **Módulo 09 - Passagem de Serviço / Troca de Posto**
   - Checklist rigoroso de passagem de turno (armamento, rádio, câmeras, chaves).
   - Confirmação formal com assinatura do operador que assume e do que entrega.

10. **Módulo 10 - Visitantes e Prestadores Autorizados**
    - Cadastro prévio de visitantes e prestadores liberados por moradores/administração.
    - Leitura e conferência rápida de documentos na portaria.

11. **Módulo 11 - Relatórios Operacionais**
    - Filtros por condomínio, período e tipo de registro.
    - Exportação individual e consolidada em CSV compatível com Excel (separador `;` e codificação UTF-8 BOM).

---

## 🆕 Atualizações da Versão 1.0.5

- **Relatório Consolidado de Ocorrências em PDF (Módulo 08 e Módulo 09):** Novo botão oficial de emissão de relatório em PDF nos módulos de **Ocorrências** e **Passagem de Posto**. Permite filtrar por períodos rápidos (Hoje, 7 dias, 15 dias, Mês Atual, Mês Anterior ou Personalizado por data), tipo (Internas vs Moradores) e status (Resolvido vs Pendente). Gera documento oficial padrão A4 com cabeçalho do condomínio, CNPJ, dados da administradora, resumo estatístico, tabela detalhada de fatos e providências, e campos formais de assinatura. Inclui ainda exportação e cópia de resumo executivo para WhatsApp e e-mail.

---

## 🆕 Atualizações da Versão 1.0.4

- **Correção Definitiva da Câmera (Eliminação da Compressão Canvas):** A compressão automática em Canvas foi totalmente removida do fluxo de captura. O modal agora utiliza o leitor nativo padrão (`FileReader.readAsDataURL`), eliminando travamentos, telas pretas e spinners infinitos ao tirar fotos no celular. A imagem capturada pela câmera do aparelho é lida e exibida de forma instantânea e 100% estável.

---

## 🆕 Atualizações da Versão 1.0.3

- **Alerta de Ronda Condicionado a Feature Flag:** O timer e o banner de ronda só aparecem nos condomínios onde o módulo de ronda estiver expressamente ativo nas Feature Flags (`mod07_ronda`), permanecendo 100% oculto nos postos onde o serviço não foi contratado.
- **Painel Geral Mobile (Hub de Cards em 2 Colunas):** Novo dashboard inicial (`MobileHomeDashboard`) com card do posto ativo, operador de plantão e grade de módulos operacionais com ícones destacados e contadores (encomendas na guarita, chaves retiradas, chamados abertos).
- **Menu Lateral INFPORT (Drawer):** Acesso rápido a todos os módulos, seletor de condomínio autorizado e botão de encerramento de turno através do botão hambúrguer.
- **Barra de Navegação Inferior (Bottom Tab Bar):** Navegação rápida no rodapé do celular com acesso direto a Início, Encomendas, Chaves, Rondas/Ocorrências e Módulos.

---

## 🆕 Atualizações da Versão 1.0.2

- **Câmera Traseira Nativa para Celulares:** Disparo direto e confiável da câmera traseira de alta definição com compressão automática em Canvas para ~100KB, evitando travamentos ou telas pretas de WebRTC em smartphones.
- **Botões de Leitura no Cadastro de Checkpoints:** Botão dedicado para **escanear QR Code com a câmera** e botão para **ler Tag NFC/RFID**, preenchendo automaticamente o código identificador do ponto de ronda.
- **Barra Fixa de Alerta e Timer de Ronda:** Indicador persistente e dinâmico posicionado no topo de todas as telas com contagem regressiva da próxima ronda, alertas pulsantes de horário vencido e acesso direto com 1 clique para iniciar a ronda.
- **Otimização de Layout Mobile:** Seletor rápido de módulo para telas estreitas e botões com área de toque ampliada (mínimo 42px).
- **Ajuste de Botão de Emergência:** Remoção do botão flutuante duplicado, mantendo o acionamento oficial de pânico centralizado no cabeçalho.

---

## 🆕 Atualizações da Versão 1.0.1

- **Contador Diário de RE:** Sequenciador automático de recebimento de lotes (`RE${DD}${MM}${AA}${OPERADOR}${SEQ}`) que reinicia a contagem às 00:00 e encerra às 23:59 a cada dia (`01`, `02`, `03`...).
- **Câmera Traseira Nativa:** Viewfinder ao vivo com WebRTC priorizando a câmera traseira (`facingMode: { ideal: "environment" }`) e botão rápido para alternar entre câmeras.
- **Teclado Numérico para Guarita:** Inputs de senha/PIN, unidades de moradores e lotes otimizados com `inputMode="numeric"` e teclado touch rápido na tela de login.
- **Armazenamento de Fotos e WhatsApp:** Upload e persistência no Supabase Storage (`infport-fotos` / `fotos`) com URLs encurtadas para disparos no WhatsApp sem limite de caracteres.
- **Visualizador de Fotos em Alta Resolução:** Modal `PhotoViewerModal` para inspeção detalhada de etiquetas e anomalias de ronda.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS + Lucide React (ícones)
- **Câmera e Leitura:** Html5-Qrcode + WebRTC Camera API
- **Geolocalização:** Geolocation API com cálculo de distância (fórmula de Haversine)
- **Áudio:** Web Audio API / MediaRecorder
- **Armazenamento:** LocalStorage com isolamento por posto/condomínio e suporte offline-first

---

## 📦 Como Rodar o Projeto Localmente

```bash
# 1. Clonar o repositório
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# 2. Entrar no diretório
cd SEU_REPOSITORIO

# 3. Instalar as dependências
npm install
# ou
bun install

# 4. Iniciar o servidor de desenvolvimento
npm run dev
# ou
bun dev
```

---

## 🔒 Segurança e Privacidade

- Filtro estrito de visualização de dados: operadores não têm acesso a dados financeiros ou custos operacionais.
- Todos os backups gerados são limpos e focados exclusivamente na operação do condomínio.
