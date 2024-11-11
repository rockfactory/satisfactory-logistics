import { NumberInput, type NumberInputProps } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';

export function FactoryNumberInput(props: NumberInputProps) {
  // Very complicated yet simple handlers for "shift for +10" behaviour on the resource number input
  const [inputStep, setInputStep] = useState(1);
  const keyDownHandler = useCallback(
    (e: KeyboardEvent) => e.key == 'Shift' && setInputStep(10),
    [],
  );
  const keyUpHandler = useCallback(
    (e: KeyboardEvent) => e.key == 'Shift' && setInputStep(1),
    [],
  );
  const eventListeners = useRef<{
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
  }>();
  useEffect(() => {
    // Here will be adding the static listener so we can keep the reference
    eventListeners.current = { keydown: keyDownHandler, keyup: keyUpHandler };

    // and add the handlers for the events
    window.addEventListener('keydown', eventListeners.current.keydown, true);
    window.addEventListener('keyup', eventListeners.current.keyup, true);

    return () => {
      // and remove it later on
      window.removeEventListener(
        'keydown',
        eventListeners.current?.keydown || (() => null),
        true,
      );
      window.removeEventListener(
        'keyup',
        eventListeners.current?.keyup || (() => null),
        true,
      );
    };
  }, [keyDownHandler, keyUpHandler]);

  return <NumberInput {...props} step={inputStep} />;
}
