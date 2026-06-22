'use client';

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';
import { SETTINGS } from '@/lib/game/settings';

interface Props {
  scene:   number; // 0=intro 1=avatar 2=dice 3=winlose
  jawOpen: number; // 0–1  (audio amplitude → mouth)
  roll:    number; // 1–8  (active during dice scene)
  emotion: number; // 0=idle 1=win 2=lose
}

export function GameRive({ scene, jawOpen, roll, emotion }: Props) {
  const { artboard, stateMachine, inputScene, inputJawOpen, inputRoll, inputEmotion } = SETTINGS.rive;

  const { rive, RiveComponent } = useRive({
    src: '/SkullRive.riv',
    ...(artboard ? { artboard } : {}),
    stateMachines: stateMachine,
    autoplay: true,
    onLoadError: (e) => console.error('[GameRive] load error', e),
  });

  const sceneInput   = useStateMachineInput(rive, stateMachine, inputScene);
  const jawInput     = useStateMachineInput(rive, stateMachine, inputJawOpen);
  const rollInput    = useStateMachineInput(rive, stateMachine, inputRoll);
  const emotionInput = useStateMachineInput(rive, stateMachine, inputEmotion);

  useEffect(() => { if (sceneInput)   sceneInput.value   = scene;   }, [sceneInput,   scene]);
  useEffect(() => { if (jawInput)     jawInput.value     = jawOpen; }, [jawInput,     jawOpen]);
  useEffect(() => { if (rollInput)    rollInput.value    = roll;    }, [rollInput,    roll]);
  useEffect(() => { if (emotionInput) emotionInput.value = emotion; }, [emotionInput, emotion]);

  return (
    <div style={{ width: 480, height: 480 }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
