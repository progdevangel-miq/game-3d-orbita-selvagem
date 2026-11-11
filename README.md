# Orbital Salvage

Jogo 3D de arena em React, TypeScript, Three.js e Rapier. Recupere os seis núcleos da estação para concluir a missão.

## Requisitos

- Node.js 20 ou superior
- npm
- Navegador com WebGL 2

## Executar

```sh
npm install
npm run dev
```

Abra a URL local apresentada pelo Vite. Para validar a tipagem e gerar a versão de produção:

```sh
npm run typecheck
npm run build
```

## Controles

- `WASD` ou setas: movimentar
- `Espaço`: pular
- `Esc`: pausar ou retomar
- Controle Xbox/PlayStation: analógico esquerdo ou direcional para mover; `A`/`Cruz (X)` para pular
- Toque: direcional e botão de pulo na tela

A arena, o personagem e os colecionáveis usam geometria procedural. As colisões e sensores são simulados pelo Rapier; o efeito sonoro de coleta é sintetizado via Web Audio.
