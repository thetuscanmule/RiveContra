'use client';

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';
import { SETTINGS } from '@/lib/game/settings';

interface Props {
  scene:       number;           // 0=intro 1=avatar 2=dice 3=winlose
  jawOpen:     number;           // 0–1  (audio amplitude → mouth)
  roll:        number;           // 1–8  (active during dice scene)
  emotion:     number;           // 0=idle 1=win 2=lose
  diceOutcome: 'win' | 'fail' | null; // fires dicewin/dicefail trigger once at reveal
  flameLevel:  number;           // 0–2  (option hover: 0=none/safe, 1=medium, 2=risky)
  enterHover:  number;           // 0–2  (start screen: 0 idle, 1 hovered, 2 fired on Enter click)
  scale:       number;           // resolved desktop or mobile scale
}

export function GameRive({ scene, jawOpen, roll, emotion, diceOutcome, flameLevel, enterHover, scale }: Props) {
  const {
    artboard, stateMachine,
    inputScene, inputJawOpen, inputRoll, inputEmotion,
    inputDiceWin, inputDiceFail, inputFlameLevel, inputEnterHover,
  } = SETTINGS.rive;

  const { rive, RiveComponent } = useRive({
    src: '/SkullRive.riv',
    ...(artboard ? { artboard } : {}),
    stateMachines: stateMachine,
    autoplay: true,
    onLoadError: (e) => console.error('[GameRive] load error', e),
  });

  const sceneInput      = useStateMachineInput(rive, stateMachine, inputScene);
  const jawInput        = useStateMachineInput(rive, stateMachine, inputJawOpen);
  const rollInput       = useStateMachineInput(rive, stateMachine, inputRoll);
  const emotionInput    = useStateMachineInput(rive, stateMachine, inputEmotion);
  const diceWinInput    = useStateMachineInput(rive, stateMachine, inputDiceWin);
  const diceFailInput   = useStateMachineInput(rive, stateMachine, inputDiceFail);
  const flameLevelInput = useStateMachineInput(rive, stateMachine, inputFlameLevel);
  const enterHoverInput = useStateMachineInput(rive, stateMachine, inputEnterHover);

  useEffect(() => { if (sceneInput)      sceneInput.value      = scene;      }, [sceneInput,      scene]);
  useEffect(() => { if (jawInput)        jawInput.value        = jawOpen;    }, [jawInput,        jawOpen]);
  useEffect(() => { if (rollInput)       rollInput.value       = roll;       }, [rollInput,       roll]);
  useEffect(() => { if (emotionInput)    emotionInput.value    = emotion;    }, [emotionInput,    emotion]);
  useEffect(() => { if (flameLevelInput) flameLevelInput.value = flameLevel; }, [flameLevelInput, flameLevel]);
  useEffect(() => { if (enterHoverInput) enterHoverInput.value = enterHover; }, [enterHoverInput, enterHover]);

  // Triggers are one-shot — fire once when diceOutcome is set, not on every render.
  useEffect(() => {
    if (!diceOutcome) return;
    if (diceOutcome === 'win'  && diceWinInput)  diceWinInput.fire();
    if (diceOutcome === 'fail' && diceFailInput) diceFailInput.fire();
  }, [diceOutcome, diceWinInput, diceFailInput]);

  const size = Math.round(480 * scale);
  return (
    <div style={{ width: size, height: size }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
