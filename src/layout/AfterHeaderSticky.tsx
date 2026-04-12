import { Box, Container } from '@mantine/core';

export interface IAfterHeaderStickyProps {}

export function AfterHeaderSticky(
  props: React.PropsWithChildren<IAfterHeaderStickyProps>,
) {
  return (
    <Box
      bg="dark.7"
      w="100%"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 4px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Container size="lg" pt="md" pb="md">
        {props.children}
      </Container>
    </Box>
  );
}
