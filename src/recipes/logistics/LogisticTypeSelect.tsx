import { Image } from '@mantine/core';
import {
  type ISelectInputProps,
  SelectIconInput,
} from '@/core/form/SelectIconInput';
import { LogisticTypes } from './LogisticTypes';

export interface ILogisticTypeSelectProps
  extends Omit<ISelectInputProps, 'data'> {
  isFluid: boolean;
}

const LogisticOptions = LogisticTypes.map(logisticType => ({
  value: logisticType.id,
  label: logisticType.name,
  icon: (
    <Image src={logisticType.imagePath} w={16} h={16} alt={logisticType.name} />
  ),
}));

export function LogisticTypeSelect(props: ILogisticTypeSelectProps) {
  return (
    <SelectIconInput
      data={LogisticOptions.filter(
        logisticOption => logisticOption.value !== 'Pipe' || props.isFluid,
      )}
      placeholder="Transport"
      comboboxProps={{
        width: 120,
        position: 'bottom-start',
      }}
      {...props}
    />
  );
}
