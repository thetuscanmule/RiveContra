'use client';
// One persistent Rive file. React touches only the flat top-level inputs:
//   scene   — Number: 0 = skull/playing, 1 = dice/rolling, 2 = results
//   jawOpen — Number: 0–1, forwarded to the skull nested artboard
//
// Input names and the state machine name are configured in data/settings.json
// under the "rive" key so they can be updated from the admin panel without
// touching code.

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';
import { SETTINGS } from '@/lib/game/settings';

interface Props {
  scene: number;   // 0 | 1 | 2
  jawOpen: number; // 0–1
}

export function GameRive({ scene, jawOpen }: Props) {
  const { stateMachine, inputScene, inputJawOpen } = SETTINGS.rive;

  const { rive, RiveComponent } = useRive({
    src: '/SkullRive.riv',
    stateMachines: stateMachine,
    autoplay: true,
    onLoadError: (e) => console.error('[GameRive] load error', e),
  });

  const sceneInput = useStateMachineInput(rive, stateMachine, inputScene);
  const jawInput   = useStateMachineInput(rive, stateMachine, inputJawOpen);

  useEffect(() => {
    if (sceneInput) sceneInput.value = scene;
  }, [sceneInput, scene]);

  useEffect(() => {
    if (jawInput) jawInput.value = jawOpen;
  }, [jawInput, jawOpen]);

  return (
    <div style={{ width: 480, height: 480 }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
