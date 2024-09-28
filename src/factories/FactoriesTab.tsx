import {
  ActionIcon,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { IconTransferIn, IconTrash } from "@tabler/icons-react";
import moize from "moize";
import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../core/store";
import { FactoryUsage } from "./FactoryUsage";
import { FactoryInput } from "./inputs/FactoryInput";
import { FactoryItemInput } from "./inputs/FactoryItemInput";
import { factoryActions } from "./store/FactoriesSlice";

export interface IFactoriesTabProps {}

export function FactoriesTab(props: IFactoriesTabProps) {
  const dispatch = useDispatch();
  const factories = useSelector(
    (state: RootState) => state.factories.factories
  );

  const onChangeFactory = useCallback(
    moize(
      (id: string, path: string) =>
        (
          value: string | null | number | React.ChangeEvent<HTMLInputElement>
        ) => {
          if (typeof value === "object" && value?.currentTarget) {
            value = value.currentTarget.value;
          }
          dispatch(factoryActions.updateAtPath({ id, path, value }));
        },
      { maxSize: 100 }
    ),
    [dispatch]
  );

  return (
    <div>
      {/* <Grid columns={24}>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Factory
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Resource
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Amount
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Actions
          </Text>
        </Grid.Col>
      </Grid> */}
      {factories.map((factory) => (
        <Box key={factory.id} mb="xs">
          <Group gap="sm">
            {/* <Grid.Col span={6}> */}
            <TextInput
              variant="default"
              w={180}
              defaultValue={factory.name ?? ""}
              onChange={onChangeFactory(factory.id, "name")}
            />
            {/* </Grid.Col>
            <Grid.Col span={9}> */}
            <FactoryItemInput
              size="sm"
              variant="default"
              width={320}
              value={factory.output}
              onChange={onChangeFactory(factory.id, "output")}
            />
            {/* </Grid.Col>
            <Grid.Col span={3}> */}
            <NumberInput
              variant="default"
              value={factory.amount ?? 0}
              onChange={onChangeFactory(factory.id, "amount")}
            />
            {/* </Grid.Col>
            <Grid.Col span={6}> */}
            <FactoryUsage factoryId={factory.id} />
            <ActionIcon
              variant="filled"
              color="blue"
              size="lg"
              mt="lg"
              onClick={() =>
                dispatch(factoryActions.addInput({ id: factory.id }))
              }
            >
              <IconTransferIn stroke={1.5} size={16} />
            </ActionIcon>
            <ActionIcon
              variant="filled"
              color="red"
              size="lg"
              mt="lg"
              onClick={() =>
                dispatch(factoryActions.remove({ id: factory.id }))
              }
            >
              <IconTrash stroke={1.5} size={16} />
            </ActionIcon>
            {/* </Grid.Col> */}
          </Group>
          <Collapse mt="sm" ml="-12px" in={!!factory.inputs?.length}>
            <Card bg="gray.1" p="sm" radius="sm">
              {factory.inputs?.map((input, index) => (
                <Group key={index} gap="sm" mb="xs">
                  <FactoryInput
                    value={input.factoryId}
                    w={180}
                    onChange={onChangeFactory(
                      factory.id,
                      `inputs[${index}].factoryId`
                    )}
                  />
                  <FactoryItemInput
                    value={input.resource}
                    size="sm"
                    width={320}
                    onChange={onChangeFactory(
                      factory.id,
                      `inputs[${index}].resource`
                    )}
                  />
                  <NumberInput
                    value={input.amount ?? 0}
                    onChange={onChangeFactory(
                      factory.id,
                      `inputs[${index}].amount`
                    )}
                  />
                  <ActionIcon
                    variant="outline"
                    color="red"
                    size="md"
                    onClick={() =>
                      dispatch(
                        factoryActions.update({
                          id: factory.id,
                          inputs: factory.inputs?.filter((_, i) => i !== index),
                        })
                      )
                    }
                  >
                    <IconTrash size={16} stroke={1.5} />
                  </ActionIcon>
                </Group>
              ))}
            </Card>
          </Collapse>
        </Box>
      ))}
      <Divider mb="lg" />
      <FactoryItemInput />
      <Group mt="lg">
        <Button onClick={() => dispatch(factoryActions.add({}))}>
          Aggiungi
        </Button>
      </Group>
    </div>
  );
}
