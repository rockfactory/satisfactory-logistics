import { Box } from '@mantine/core';
import classes from './NodeActionsBox.module.css';

export interface INodeActionsBoxProps {
  children: React.ReactNode;
}

export function NodeActionsBox(props: INodeActionsBoxProps) {
  return (
    <Box w="250px" className={classes.actions}>
      {props.children}
    </Box>
  );
}
