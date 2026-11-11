import { useEffect, useState } from 'react';
import { GameScene } from './game/GameScene';
import { unlockAudio } from './game/audio';
import { useGameStore } from './game/gameStore';
import { setVirtualKey } from './game/Player';

const touchKeys = [
  { code: 'KeyW', label: 'Mover para frente', glyph: '↑', className: 'touch-up' },
  { code: 'KeyA', label: 'Mover para esquerda', glyph: '←', className: 'touch-left' },
  { code: 'KeyS', label: 'Mover para trás', glyph: '↓', className: 'touch-down' },
  { code: 'KeyD', label: 'Mover para direita', glyph: '→', className: 'touch-right' },
];

export default function App() {
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const phase = useGameStore((state) => state.phase);
  const collected = useGameStore((state) => state.collected.length);
  const start = useGameStore((state) => state.start);
  const pause = useGameStore((state) => state.pause);
  const resume = useGameStore((state) => state.resume);
  const restart = useGameStore((state) => state.restart);

  useEffect(() => {
    const updateGamepadStatus = () => {
      if (typeof navigator.getGamepads !== 'function') {
        setGamepadConnected(false);
        return;
      }
      setGamepadConnected(Array.from(navigator.getGamepads()).some((gamepad) => gamepad?.connected));
    };

    window.addEventListener('gamepadconnected', updateGamepadStatus);
    window.addEventListener('gamepaddisconnected', updateGamepadStatus);
    updateGamepadStatus();
    return () => {
      window.removeEventListener('gamepadconnected', updateGamepadStatus);
      window.removeEventListener('gamepaddisconnected', updateGamepadStatus);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || event.repeat) return;
      if (phase === 'playing') pause();
      else if (phase === 'paused') resume();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, pause, resume]);

  const begin = () => {
    unlockAudio();
    if (phase === 'paused') resume();
    else if (phase === 'won') restart();
    else start();
  };

  return (
    <main className="game-shell">
      <GameScene />
      <div className="screen-grain" aria-hidden="true" />

      <header className={`hud ${phase === 'title' ? 'hud-hidden' : ''}`}>
        <div className="mission-mark"><span className="mark-dot" /> ORBITAL / SALVAGE</div>
        <div className="objective">
          <span className="eyebrow">OBJETIVO DE RECUPERAÇÃO</span>
          <strong>Núcleos de energia <span>{String(collected).padStart(2, '0')} <i>/ 06</i></span></strong>
          <div className="progress-track" role="progressbar" aria-label="Núcleos coletados" aria-valuenow={collected} aria-valuemin={0} aria-valuemax={6}>
            <span style={{ width: `${(collected / 6) * 100}%` }} />
          </div>
        </div>
        <button className="icon-button pause-button" onClick={phase === 'paused' ? resume : pause} disabled={phase !== 'playing' && phase !== 'paused'} aria-label={phase === 'paused' ? 'Continuar' : 'Pausar'} title={phase === 'paused' ? 'Continuar' : 'Pausar'}>
          {phase === 'paused' ? '▶' : 'Ⅱ'}
        </button>
      </header>

      {phase === 'title' && (
        <section className="title-screen" aria-label="Menu principal">
          <div className="title-copy">
            <div className="eyebrow title-eyebrow"><span /> MISSÃO 01 <span className="eyebrow-line" /> SETOR ABANDONADO</div>
            <h1>ORBITAL<br /><em>SALVAGE</em></h1>
            <p>Uma estação silenciada. Seis núcleos perdidos.<br />Traga a energia de volta antes que a órbita feche.</p>
            <button className="primary-button" onClick={begin}><span>INICIAR MISSÃO</span><b>↗</b></button>
            <div className="control-legend"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>mover</span><kbd>ESPAÇO</kbd><span>pular</span><kbd>ESC</kbd><span>pausar</span></div>
            <div className={`gamepad-hint ${gamepadConnected ? 'gamepad-connected' : ''}`} role="status">
              <span className="gamepad-indicator" />
              {gamepadConnected ? 'CONTROLE CONECTADO' : 'CONTROLE: ANALÓGICO ESQUERDO · A / X PARA PULAR'}
            </div>
          </div>
          <div className="title-coordinate">ESTAÇÃO 07 <span>·</span> ÓRBITA BAIXA</div>
        </section>
      )}

      {phase === 'playing' && (
        <>
          <div className="mission-status"><span className="status-pulse" /> SISTEMA ONLINE{gamepadConnected && <span className="gamepad-online"> · CONTROLE</span>}</div>
          <div className="touch-controls" aria-label="Controles direcionais">
            {touchKeys.map(({ code, label, glyph, className }) => (
              <button
                key={code}
                className={`touch-key ${className}`}
                aria-label={label}
                onPointerDown={(event) => { event.preventDefault(); setVirtualKey(code, true); }}
                onPointerUp={() => setVirtualKey(code, false)}
                onPointerLeave={() => setVirtualKey(code, false)}
                onPointerCancel={() => setVirtualKey(code, false)}
              >{glyph}</button>
            ))}
          </div>
          <div className="jump-control">
            <button
              className="jump-key"
              aria-label="Pular"
              onPointerDown={(event) => { event.preventDefault(); setVirtualKey('Space', true); }}
              onPointerUp={() => setVirtualKey('Space', false)}
              onPointerLeave={() => setVirtualKey('Space', false)}
              onPointerCancel={() => setVirtualKey('Space', false)}
            >PULAR</button>
          </div>
        </>
      )}

      {phase === 'paused' && (
        <section className="modal-layer" aria-label="Jogo pausado">
          <div className="modal-panel">
            <div className="eyebrow">SINAL EM ESPERA</div>
            <h2>MISSÃO<br /><em>PAUSADA</em></h2>
            <p>A estação continua à deriva.</p>
            <button className="primary-button" onClick={begin}><span>RETOMAR</span><b>↗</b></button>
            <button className="text-button" onClick={() => { unlockAudio(); restart(); }}>REINICIAR MISSÃO</button>
          </div>
        </section>
      )}

      {phase === 'won' && (
        <section className="modal-layer" aria-label="Missão concluída">
          <div className="modal-panel success-panel">
            <div className="success-seal">06 / 06</div>
            <div className="eyebrow">SINAL RESTABELECIDO</div>
            <h2>ÓRBITA<br /><em>SEGURA</em></h2>
            <p>Todos os núcleos recuperados.<br />A estação voltou a respirar.</p>
            <button className="primary-button" onClick={begin}><span>JOGAR NOVAMENTE</span><b>↗</b></button>
          </div>
        </section>
      )}

      {phase !== 'title' && (
        <footer className="ambient-caption">
          <span>RECUPERAÇÃO DE ENERGIA</span><span className="caption-divider" /><span>EST. 07</span>
        </footer>
      )}
    </main>
  );
}
