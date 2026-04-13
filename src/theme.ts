import { generateColors } from '@mantine/colors-generator';
import {
  createTheme,
  defaultVariantColorsResolver,
  parseThemeColor,
  rgba,
} from '@mantine/core';

export const theme = createTheme({
  /* Put your mantine theme override here */
  primaryColor: 'satisfactory-orange',
  defaultRadius: 'sm',
  colors: {
    // Satisfactory colors
    blue: generateColors('#5160b8'), // '#5f668c'
    'satisfactory-orange': generateColors('#fa9549'),
  },
  variantColorResolver: input => {
    const defaultResolved = defaultVariantColorsResolver(input);

    if (input.variant === 'light') {
      const parsed = parseThemeColor({
        color: input.color || input.theme.primaryColor,
        theme: input.theme,
      });
      const shade = parsed.isThemeColor
        ? input.theme.colors[parsed.color][6]
        : parsed.value;

      return {
        ...defaultResolved,
        background: rgba(shade, 0.15),
        hover: rgba(shade, 0.25),
      };
    }

    return defaultResolved;
  },
});
