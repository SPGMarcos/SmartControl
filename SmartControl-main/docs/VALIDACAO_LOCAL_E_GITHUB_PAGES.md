# Validacao local e GitHub Pages

## Frontend local

```bash
npm install
npm run dev
```

Abra:

```text
http://127.0.0.1:5173
```

Para validar billing, assinatura e rotas autenticadas com dados reais, mantenha o backend escolhido no `.env.local`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

## Backend local

```bash
npm run dev:backend
```

Com o backend ativo, valide:

```text
http://localhost:4000/health
```

## Build igual ao GitHub Pages

```bash
npm run build
npm run preview:pages
```

Abra:

```text
http://127.0.0.1:4173/SmartControl/
```

O workflow `.github/workflows/frontend-pages.yml` publica o conteudo de `dist` no GitHub Pages e preserva o fallback `dist/404.html` para rotas SPA.

## Variaveis no GitHub

Configure em `Settings > Secrets and variables > Actions > Variables`:

```text
VITE_BACKEND_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

No Supabase Auth, mantenha como redirect permitido:

```text
http://127.0.0.1:5173/auth/callback
http://localhost:5173/auth/callback
https://spgmarcos.github.io/SmartControl/auth/callback
```
