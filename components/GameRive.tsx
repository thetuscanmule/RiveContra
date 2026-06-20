'use client';
// One persistent Rive file. React touches only the flat top-level inputs:
//   scene   — Number: 0 = skull/playing, 1 = dice/rolling, 2 = results
//   jawOpen — Number: 0–1, forwarded to the skull nested artboard
//
// Rive editor requirements (update SkullRive.riv):
//   • Rename the state machine from "Skull" → "Game"
//   • Add Number input "scene" (default 0)
//   • Add scene-switching in the SM:
//       scene == 0 → skull nested artboard visible (jaw rig active)
//       scene == 1 → dice placeholder visible  (skull hidden)
//       scene == 2 → results placeholder visible (skull hidden)
//   • "jawOpen" Number input already exists — keep it

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';

const STATE_MACHINE = 'Game';

interface Props {
  scene: number;   // 0 | 1 | 2
  jawOpen: number; // 0–1
}

export function GameRive({ scene, jawOpen }: Props) {
  const { rive, RiveComponent } = useRive({
    src: '/SkullRive.riv',
    stateMachines: STATE_MACHINE,
    autoplay: true,
    onLoadError: (e) => console.error('[GameRive] load error', e),
  });

  const sceneInput  = useStateMachineInput(rive, STATE_MACHINE, 'scene');
  const jawInput    = useStateMachineInput(rive, STATE_MACHINE, 'jawOpen');

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
