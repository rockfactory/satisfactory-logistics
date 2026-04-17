import { generateColors } from '@mantine/colors-generator';
import { createTheme, Tooltip } from '@mantine/core';

export const theme = createTheme({
  /* Put your mantine theme override here */
  primaryColor: 'satisfactory-orange',
  defaultRadius: 'sm',
  colors: {
    // Satisfactory colors
    blue: generateColors('#5160b8'), // '#5f668c'
    'satisfactory-orange': generateColors('#fa9549'),
  },
  components: {
    Tooltip: Tooltip.extend({
      defaultProps: {
        color: 'dark.8',
      },
    }),
  },
});
