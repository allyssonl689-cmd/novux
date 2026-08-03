# Novux Finance — Identidade visual

> Gerado por `scripts/brand/build.mjs` (no repositório Novux Forge).
> **Não editar os arquivos desta pasta à mão** — eles são sobrescritos a cada build.
> Para mudar a marca, edite `scripts/brand/brands.mjs` e rode o build de novo.

Abra **[brandbook.html](./brandbook.html)** no navegador para o material visual completo.

## Estrutura

```
brand/
  brandbook.html          material visual (logos + paleta + tipografia + regras)
  logo/
    svg/                  todas as variações, vetoriais
    png/                  rasterizações prontas (ícones, marks, lockups)
  tokens/
    colors.json           todos os tokens em hex + hsl, escalas 50-900
    colors.css            custom properties (:root dark, .light)
    tailwind.tokens.cjs   fragmento de theme.extend para Tailwind
    typography.json       papéis tipográficos em dados
  fonts/
    fonts.css             @import + classes utilitárias
```

## Cores-chave

| Papel | Hex |
|---|---|
| Primary | `#16C7FF` |
| Accent | `#8B5CF6` |
| Background | `#050816` |
| Card | `#121933` |
| Success | `#19D38A` |
| Warning | `#F59E0B` |
| Destructive | `#FF5A5F` |

Gradiente da marca: `#16C7FF` → `#8B5CF6`

## Tipografia

- **Syne** — Branding / Títulos. Wordmark, page titles, headlines de marketing. Nunca em texto corrido.
- **Poppins** — UI / Body. Interface inteira: labels, parágrafos, botões, navegação. É a voz padrão.
- **Outfit** — Números / Métricas. Valores grandes de KPI. Finance: saldos. Forge: carga, séries, volume.
- **Fira Code** — Monospace. Números inline que precisam alinhar em coluna, IDs, código.
- **Inter** — Fallback. Substitui Poppins onde ela não carregar. Não usar deliberadamente.

## Consumo

**CSS puro / Vite**
```css
@import './brand/tokens/colors.css';
@import './brand/fonts/fonts.css';
```

**Tailwind**
```js
const brand = require('./brand/tokens/tailwind.tokens.cjs')
module.exports = { theme: { extend: { colors: brand.colors, fontFamily: brand.fontFamily } } }
```

**React Native / Expo** — consuma `tokens/colors.json` (campo `.hex`) diretamente.

## Notas

- Paleta VALIDADA — não alterar sem decisão de marca.
- Extraída de novux-finance/src/index.css e public/icon.svg.
- O Novux Mobile consome esta mesma identidade.

## Compartilhada com

- Novux Mobile (c:/all/novux-mobile) — mesmo produto, mesma marca
