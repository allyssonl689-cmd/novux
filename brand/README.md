# Novux Finance — identidade visual (cópia de consumo)

> **Não editar.** Gerado pelo repositório de marca `novux-brand`.
> Para alterar a identidade, edite `scripts/brands.mjs` lá e rode
> `node scripts/build.mjs`.

Esta pasta contém apenas o que o código deste app consome:

```
brand/
  tokens/     colors.css · colors.json · tailwind.tokens.cjs · typography.json
  fonts/      fonts.css
  logo/svg/   as 17 variações vetoriais
```

**PNGs, brandbook e material de referência** vivem no repositório de marca,
em `brands/finance/` — não são versionados aqui porque não entram no
build e pesam ~2 MB.

## Consumo

```css
@import './brand/tokens/colors.css';
@import './brand/fonts/fonts.css';
```

Regra de cor: **cor de marca preenche, token `-text` escreve.**
`color: hsl(var(--success))` rende 2.9:1 no light — use `--success-text`.
