import {
  Button,
  Combobox,
  ComboboxItem,
  Group,
  Image,
  OptionsFilter,
  ScrollArea,
  Text,
  useCombobox,
} from "@mantine/core";
import { useState } from "react";
import { AllFactoryItems, FactoryItem } from "../../recipes/FactoryItem";

export interface IFactoryItemInputProps {}

const AllFactoryItemsIds = AllFactoryItems.map((item) => item.id);
const AllFactoryItemsMap = AllFactoryItems.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryItem>
);

const optionsFilter: OptionsFilter = ({ options, search }) => {
  const filtered = (options as ComboboxItem[]).filter((option) =>
    AllFactoryItemsMap[option.value].displayName
      .toLowerCase()
      .trim()
      .includes(search.toLowerCase().trim())
  );

  filtered.sort((a, b) => a.label.localeCompare(b.label));
  return filtered;
};

interface FactoryItemOptionProps {
  item: FactoryItem;
}

function FactoryItemOption({ item }: FactoryItemOptionProps) {
  return (
    <Group gap="sm">
      <Image src={item.imagePath} w={32} h={32} radius="sm" />
      <div>
        <Text size="sm">{item.displayName}</Text>
        <Text size="xs" opacity={0.5} truncate="end" maw={"300px"}>
          {item.description}
        </Text>
      </div>
    </Group>
  );
}

export function FactoryItemInput(props: IFactoryItemInputProps) {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
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

  const options = AllFactoryItems.filter((item) =>
    item.displayName.toLowerCase().includes(search.toLowerCase().trim())
  ).map((item) => (
    <Combobox.Option value={item.id} key={item.id}>
      <FactoryItemOption item={item} />
    </Combobox.Option>
  ));

  return (
    <>
      <Combobox
        store={combobox}
        width={400}
        position="bottom-start"
        withArrow
        onOptionSubmit={(val) => {
          setSelectedItem(val);
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target withAriaAttributes={false}>
          <Button
            onClick={() => combobox.toggleDropdown()}
            variant="default"
            ta={"left"}
            size="lg"
            justify="space-between"
            rightSection={<Combobox.Chevron />}
          >
            {selectedItem ? (
              <FactoryItemOption item={AllFactoryItemsMap[selectedItem]} />
            ) : (
              "Select item"
            )}
          </Button>
        </Combobox.Target>

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
