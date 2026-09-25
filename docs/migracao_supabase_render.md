# 🚀 GUIA DE MIGRAÇÃO: SUPABASE + RENDER (DADOS REAIS EM PRODUÇÃO)

Este guia contém o passo a passo exato para migrar o **Combate Portaria** do ambiente de testes local para a infraestrutura de produção com **banco de dados real no Supabase** e **servidor na nuvem no Render.com**, sem dados fictícios.

---

## 1. 🧹 O que foi preparado no projeto (Sem dados mocados)

1. **Schema PostgreSQL Oficial**:
   - Criado [`backend/prisma/schema.postgresql.prisma`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/backend/prisma/schema.postgresql.prisma), preparado nativamente para o PostgreSQL do Supabase (com suporte a `DATABASE_URL` e `DIRECT_URL`).
2. **Script de Inicialização Real**:
   - Criado [`backend/prisma/init-real-admin.ts`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/backend/prisma/init-real-admin.ts):
     - Cria a Organização oficial (**Grupo Combate Portaria**).
     - Cria os templates oficiais de mensagens WhatsApp.
     - Cria a conta de Administrador oficial e a conta da Portaria.
     - **Zero dados falsos**: o banco inicia limpo, sem visitantes fictícios, sem carros fake e sem moradores teste.
3. **Blueprint do Render na Raiz**:
   - Criado [`render.yaml`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/render.yaml) na raiz do repositório com provisionamento de **Persistent Disk** para que a sessão do WhatsApp (Baileys) nunca caia, mesmo ao reiniciar o servidor.
4. **App Mobile Limpo**:
   - Simulador de teste recolhido; foco 100% na leitura do QR Code do WhatsApp real.

---

## 2. 🗄️ Passo a Passo no SUPABASE

### Passo 2.1 — Criar o Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e faça login.
2. Clique em **"New Project"**.
3. Preencha:
   - **Name**: `combate-portaria`
   - **Database Password**: Defina uma senha forte (guarde esta senha, você precisará dela!).
   - **Region**: `South America (São Paulo)` (para menor latência no Brasil).
4. Clique em **"Create new project"** e aguarde 1 a 2 minutos.

### Passo 2.2 — Copiar as Strings de Conexão do Banco
1. No menu lateral esquerdo, clique no ícone de engrenagem ⚙️ (**Project Settings**) > **Database**.
2. Role até a seção **"Connection string"**:
   - Selecione a aba **URI**.
   - Marque a opção **Use connection pooling** (Modo Transaction - porta `6543`).
   - Copie a URL. Esta será sua **`DATABASE_URL`**:
     ```text
     postgresql://postgres.[SEU-REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - Desmarque a opção **Use connection pooling** (Modo Direct - porta `5432`).
   - Copie a URL. Esta será sua **`DIRECT_URL`**:
     ```text
     postgresql://postgres.[SEU-REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
     ```
   *(Substitua `[SUA-SENHA]` pela senha que você criou no passo 2.1).*

### Passo 2.3 — Criar o Bucket de Armazenamento para Fotos
1. No menu lateral, clique em **Storage**.
2. Clique em **"New bucket"**.
3. Nomeie como: `visitor-photos`.
4. Marque como **Public bucket** (para que as fotos dos visitantes possam ser exibidas na portaria).
5. Clique em **Save**.

---

## 3. ☁️ Passo a Passo no RENDER.COM

### Passo 3.1 — Conectar o Repositório
1. Acesse [render.com](https://render.com) e faça login.
2. Certifique-se de que o código deste projeto foi commitado no seu GitHub ou GitLab.
3. No painel do Render, clique no botão azul **"New +"** no topo e selecione **"Blueprint"**.
4. Conecte sua conta do GitHub e selecione o repositório **Combate Portaria**.

### Passo 3.2 — O Render Detectará o `render.yaml`
1. O Render lerá automaticamente o arquivo [`render.yaml`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/render.yaml) configurado na raiz.
2. Ele identificará:
   - Nome do serviço: `combate-portaria-backend`
   - Persistent Disk: `whatsapp-sessions` (1 GB)
   - Variáveis pendentes: `DATABASE_URL` e `DIRECT_URL`.

### Passo 3.3 — Inserir as Variáveis do Supabase
Na tela do Blueprint antes de aplicar, cole:
- **`DATABASE_URL`**: A URL com porta `6543` copiada do Supabase.
- **`DIRECT_URL`**: A URL com porta `5432` copiada do Supabase.

### Passo 3.4 — Deploy Automático
Clique em **"Apply"**! O Render irá:
1. Instalar as dependências.
2. Gerar o cliente Prisma PostgreSQL.
3. Compilar a API TypeScript (`tsc`).
4. Criar automaticamente todas as tabelas no Supabase (`npx prisma db push`).
5. Rodar o script de inicialização real (`init-real-admin.ts`).
6. Montar o disco persistente e ligar o servidor.

Ao finalizar, o Render exibirá a URL pública da sua API (ex: `https://combate-portaria-backend.onrender.com`).

---

## 4. 📱 Conectar o App Mobile à Nuvem

Com a API rodando no Render:

1. Abra o arquivo [`mobile/.env`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/mobile/.env) e aponte para o domínio do Render:
   ```env
   EXPO_PUBLIC_API_URL=https://combate-portaria-backend.onrender.com/api/v1
   ```

2. Pronto! O aplicativo mobile (seja via Expo Go ou APK instalado) agora conversará diretamente com a nuvem, acessível de qualquer lugar (4G, 5G ou Wi-Fi externo).

---

## 5. 🔑 Credenciais Iniciais de Produção (Criadas Automaticamente)

Assim que o Render subir pela primeira vez com o Supabase:

- **Organização**: Grupo Combate Portaria
- **Admin**:
  - **E-mail**: `admin@grupocombate.com.br`
  - **Senha**: `Combate@2026`
- **Portaria**:
  - **E-mail**: `porteiro@grupocombate.com.br`
  - **Senha**: `Porteiro@2026`

*(Você pode alterar estas senhas assim que fizer o primeiro login no sistema).*
