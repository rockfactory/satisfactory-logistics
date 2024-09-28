import { generateColors } from '@mantine/colors-generator';
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  /* Put your mantine theme override here */
  primaryColor: 'satisfactory-orange',
  colors: {
    // Satisfactory colors
    blue: generateColors('#5160b8'), // '#5f668c'
    'satisfactory-orange': generateColors('#fa9549'),
  },
});
