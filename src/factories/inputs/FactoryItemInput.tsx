import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  CloseButton,
  Combobox,
  Group,
  Input,
  InputWrapperProps,
  ScrollArea,
  Text,
  useCombobox,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import {
  AllFactoryItemsMap,
  AllProducibleFactoryItems,
  FactoryItem,
} from '../../recipes/FactoryItem';

export interface IFactoryItemInputProps
  extends Omit<InputWrapperProps, 'value' | 'onChange'> {
  value?: string | null;
  onChange?: (value: string | null) => void;
  allowedItems?: string[];
  size?: 'md' | 'lg' | 'sm';
  width?: number;
  placeholder?: string;
  clearable?: boolean;
}

interface FactoryItemOptionProps {
  item: FactoryItem | null;
  size: 'md' | 'lg' | 'sm';
  width?: number;
}

function FactoryItemOption({ item, size, width }: FactoryItemOptionProps) {
  const imageSize = size === 'sm' ? 22 : size === 'md' ? 24 : 32;
  return (
    <Group gap="sm" wrap="nowrap">
      <FactoryItemImage id={item?.id} size={imageSize} />
      <div>
        <Text size="sm" truncate="end" maw={`${width ?? 300}px`}>
          {item?.displayName ?? 'Unknown item'}
        </Text>
        {size === 'lg' && (
          <Text size="xs" opacity={0.5} truncate="end" maw={'280px'}>
            {item?.description ?? ''}
          </Text>
        )}
      </div>
    </Group>
  );
}

export function FactoryItemInput(props: IFactoryItemInputProps) {
  const {
    size = 'lg',
    width = 300,
    onChange,
    value,
    variant = 'default',
    allowedItems,
    placeholder = 'Select item...',
    clearable = false,
    ...inputProps
  } = props;

  const [search, setSearch] = useState('');
  const [rawSelectedItem, setSelectedItem] = useState<string | null>(null);
  const selectedItem = value ?? rawSelectedItem;
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox?.resetSelectedOption();
      combobox?.focusTarget();
      setSearch('');
    },
    onDropdownOpen: () => {
      combobox?.focusSearchInput();
    },
  });

  const options = useMemo(
    () =>
      AllProducibleFactoryItems.filter(
        item =>
          item.displayName
            .toLowerCase()
            .includes(search.toLowerCase().trim()) &&
          (allowedItems ? allowedItems.includes(item.id) : true),
      ).map(item => (
        <Combobox.Option value={item.id} key={item.id}>
          <FactoryItemOption item={item} size={size} />
        </Combobox.Option>
      )),
    [search, allowedItems, size],
  );

  if (selectedItem && !AllFactoryItemsMap[selectedItem]) {
    console.warn(`Unknown item: ${selectedItem}`);
    setSelectedItem(null);
    onChange?.(null);
  }

  return (
    <>
      <Combobox
        store={combobox}
        // Not accessible, but it's faster
        keepMounted={false}
        width={300}
        position="bottom-start"
        withArrow
        onOptionSubmit={val => {
          if (val === selectedItem) {
            setSelectedItem(null);
            onChange?.(null);
            combobox.closeDropdown();
            return;
          }

          setSelectedItem(val);
          onChange?.(val);
          combobox.closeDropdown();
        }}
      >
        <Input.Wrapper {...inputProps}>
          <Combobox.Target withAriaAttributes={false}>
            <Input
              component="button"
              onClick={() => combobox.toggleDropdown()}
              variant={variant}
              ta={'left'}
              size={size}
              w={width}
              onKeyDown={event => {
                if (event.key === 'Backspace' || event.key === 'Delete') {
                  combobox.closeDropdown();
                  setSelectedItem(null);
                  onChange?.(null);
                }
              }}
              // justify="space-between"
              rightSectionPointerEvents={
                !selectedItem || !clearable ? 'none' : 'all'
              }
              rightSection={
                selectedItem && clearable ? (
                  <CloseButton
                    size="sm"
                    variant="transparent"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      setSelectedItem(null);
                      onChange?.(null);
                    }}
                    aria-label="Clear value"
                  />
                ) : (
                  <Combobox.Chevron />
                )
              }
            >
              {selectedItem ? (
                <FactoryItemOption
                  item={AllFactoryItemsMap[selectedItem]}
                  size={size}
                  width={width - 80}
                />
              ) : (
                <Text c="dimmed" size="sm">
                  {placeholder}
                </Text>
              )}
            </Input>
          </Combobox.Target>
        </Input.Wrapper>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            placeholder="Search items"
          />
          <ScrollArea.Autosize type="scroll" mah={200}>
            <Combobox.Options>
              {options.length > 0 ? (
                options
              ) : (
                <Combobox.Empty>Nothing found</Combobox.Empty>
              )}
            </Combobox.Options>
          </ScrollArea.Autosize>
        </Combobox.Dropdown>
      </Combobox>
    </>
  );
}
