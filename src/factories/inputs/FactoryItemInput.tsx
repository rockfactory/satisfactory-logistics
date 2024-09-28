import {
  Combobox,
  Group,
  Image,
  Input,
  InputWrapperProps,
  ScrollArea,
  Text,
  useCombobox,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { AllFactoryItems, FactoryItem } from "../../recipes/FactoryItem";

export interface IFactoryItemInputProps
  extends Omit<InputWrapperProps, "value" | "onChange"> {
  value?: string | null;
  onChange?: (value: string | null) => void;
  size?: "md" | "lg" | "sm";
  width?: number;
}

const AllFactoryItemsMap = AllFactoryItems.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryItem>
);

interface FactoryItemOptionProps {
  item: FactoryItem;
  size: "md" | "lg" | "sm";
}

function FactoryItemOption({ item, size }: FactoryItemOptionProps) {
  const imageSize = size === "sm" ? 22 : size === "md" ? 24 : 32;
  return (
    <Group gap="sm">
      <Image src={item.imagePath} w={imageSize} h={imageSize} radius="sm" />
      <div>
        <Text size="sm" truncate="end" maw="300px">
          {item.displayName}
        </Text>
        {size === "lg" && (
          <Text size="xs" opacity={0.5} truncate="end" maw={"280px"}>
            {item.description}
          </Text>
        )}
      </div>
    </Group>
  );
}

export function FactoryItemInput(props: IFactoryItemInputProps) {
  const {
    size = "lg",
    width = 300,
    onChange,
    value,
    variant = "default",
    ...inputProps
  } = props;

  const [search, setSearch] = useState("");
  const [rawSelectedItem, setSelectedItem] = useState<string | null>(null);
  const selectedItem = value ?? rawSelectedItem;
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.focusTarget();
      setSearch("");
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput();
    },
  });

  const options = useMemo(
    () =>
      AllFactoryItems.filter((item) =>
        item.displayName.toLowerCase().includes(search.toLowerCase().trim())
      ).map((item) => (
        <Combobox.Option value={item.id} key={item.id}>
          <FactoryItemOption item={item} size={size} />
        </Combobox.Option>
      )),
    [search]
  );

  return (
    <>
      <Combobox
        store={combobox}
        // Not accessible, but it's faster
        keepMounted={false}
        width={300}
        position="bottom-start"
        withArrow
        onOptionSubmit={(val) => {
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
              ta={"left"}
              size={size}
              w={width}
              // justify="space-between"
              rightSection={<Combobox.Chevron />}
            >
              {selectedItem ? (
                <FactoryItemOption
                  item={AllFactoryItemsMap[selectedItem]}
                  size={size}
                />
              ) : (
                "Select item"
              )}
            </Input>
          </Combobox.Target>
        </Input.Wrapper>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
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
  // return (
  //   <Select
  //     data={AllFactoryItemsIds}
  //     filter={optionsFilter}
  //     searchable
  //     renderOption={renderAutocompleteOption}
  //   />
  // );
}
