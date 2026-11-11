# Instruções do projeto

- Este projeto é um jogo 3D para navegador com Vite, React, TypeScript, React Three Fiber e Rapier.
- Mantenha lógica de estado, configuração de gameplay, física, cena e interface em módulos separados.
- Use colliders e sensores Rapier para interações físicas; não substitua colisões por verificações visuais.
- Centralize parâmetros de movimento e posições de coleta em `src/game/config.ts`.
- Execute `npm run typecheck` e `npm run build` após alterações quando Node.js estiver disponível.
