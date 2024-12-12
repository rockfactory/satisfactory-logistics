import { Box, Container } from '@mantine/core';
import { PropsWithChildren, useEffect, useState } from 'react';

export interface IAfterHeaderStickyProps {}

function useHeaderTop() {
  const [headerTop, setHeaderTop] = useState(0);

  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const resizeObserver = new ResizeObserver(() => {
      setHeaderTop(header.offsetHeight);
    });
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  return headerTop;
}

export function AfterHeaderSticky(
  props: PropsWithChildren<IAfterHeaderStickyProps>,
) {
  const headerTop = useHeaderTop();
  return (
    <Box
      bg="dark.7"
      w="100%"
      style={{
        position: 'sticky',
        top: headerTop,
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
