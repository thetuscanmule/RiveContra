'use client';
// Rive skull — drop skull.riv into /public to activate.
// State machine: "Skull"
// Inputs:  jawOpen  (Number, 0–1)
//          idle     (Bool, true to play breathing loop)
//
// Swap this component for <SkullCanvas> in app/page.tsx once skull.riv is ready.

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';

const STATE_MACHINE = 'Skull';

interface Props {
  jawOpen: number; // 0 = closed, 1 = fully open
}

export function SkullRive({ jawOpen }: Props) {
  const { rive, RiveComponent } = useRive({
    src: '/skull.riv',
    stateMachines: STATE_MACHINE,
    autoplay: true,
  });

  const jawInput = useStateMachineInput(rive, STATE_MACHINE, 'jawOpen');
  const idleInput = useStateMachineInput(rive, STATE_MACHINE, 'idle');

  // Enable idle loop once loaded
  useEffect(() => {
    if (idleInput) idleInput.value = true;
  }, [idleInput]);

  // Drive jaw from amplitude
  useEffect(() => {
    if (jawInput) jawInput.value = jawOpen;
  }, [jawInput, jawOpen]);

  return (
    <RiveComponent
      style={{ width: 400, height: 420 }}
    />
  );
}
