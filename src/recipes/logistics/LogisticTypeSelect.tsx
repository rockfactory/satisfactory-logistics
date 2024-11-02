import {
  SelectIconInput,
  type ISelectInputProps,
} from '@/core/form/SelectIconInput';
import { Image } from '@mantine/core';
import { LogisticTypes } from './LogisticTypes';

export interface ILogisticTypeSelectProps
  extends Omit<ISelectInputProps, 'data'> {}

const LogisticOptions = LogisticTypes.map(logisticType => ({
  value: logisticType.id,
  label: logisticType.name,
  icon: (
    <Image
      src={logisticType.imagePath}
      width={16}
      height={16}
      alt={logisticType.name}
    />
  ),
}));

export function LogisticTypeSelect(props: ILogisticTypeSelectProps) {
  return (
    <SelectIconInput
      data={LogisticOptions}
      placeholder="Transport"
      comboboxProps={{
        width: 120,
        position: 'bottom-start',
      }}
      {...props}
    />
  );
}
