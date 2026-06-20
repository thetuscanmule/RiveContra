'use client';
import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';

const STATE_MACHINE = 'Skull';

interface Props {
  jawOpen: number;
}

export function SkullRive({ jawOpen }: Props) {
  const { rive, RiveComponent } = useRive({
    src: '/SkullRive.riv',
    stateMachines: STATE_MACHINE,
    autoplay: true,
    onLoadError: (e) => console.error('[SkullRive] load error', e),
  });

  const jawInput = useStateMachineInput(rive, STATE_MACHINE, 'jawOpen');
  const idleInput = useStateMachineInput(rive, STATE_MACHINE, 'idle');

  useEffect(() => {
    if (idleInput) idleInput.value = true;
  }, [idleInput]);

  useEffect(() => {
    if (jawInput) jawInput.value = jawOpen;
  }, [jawInput, jawOpen]);

  return (
    <div style={{ width: 400, height: 420 }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
