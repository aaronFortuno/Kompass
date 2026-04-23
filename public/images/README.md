# Kompass images

Estructura al disc: `public/images/{nivell}/{número-o-V-slug}/{slug}-{width}.webp`
Estructura al deploy: `https://<host>/Kompass/images/{nivell}/{…}/…`
(el segment `/Kompass/` el posa Vite via `base: '/Kompass/'`).

Per tant els `src` als JSON s'escriuen com a `/Kompass/images/…`.

Vegeu DATA-MODEL §3.9 (Visual beat) i §3.10 (TabImage) per detalls
de schema. Per generar variants responsives fes servir:

```bash
npm run add-image -- <topicId> <sourceFile> <slug> [--credit="..."]
```
