import { Anchor, Container, Divider, Group, Text } from '@mantine/core';
import { IconBrandDiscord } from '@tabler/icons-react';
import classes from './Footer.module.css';

const links = [
  {
    link: 'https://discord.gg/Crd8r87dwY',
    label: 'Discord',
    labelNode: (
      <Group gap="xs">
        <IconBrandDiscord size={16} />
        Discord
      </Group>
    ),
  },
  { link: 'mailto:info@satisfactory-logistics.xyz', label: 'Contact' },
  { link: '/privacy-policy', label: 'Privacy Policy' },
];

export function Footer() {
  const items = links.map(link => (
    <Anchor<'a'>
      c="dimmed"
      key={link.label}
      href={link.link}
      target="_blank"
      rel="noopener noreferrer"
      size="sm"
    >
      {link.labelNode ?? link.label}
    </Anchor>
  ));

  return (
    <div className={classes.footer}>
      <Container className={classes.inner} size="lg">
        {/* <MantineLogo size={28} /> */}
        <Text size="sm" c="dimmed">
          v{APP_VERSION} © {new Date().getFullYear()} Satisfactory Logistics
        </Text>
        <Group className={classes.links}>{items}</Group>
      </Container>
      <Divider
        styles={{
          root: {
            borderTopColor: 'var(--mantine-color-dark-6)',
          },
        }}
      />
      <Container className={classes.inner} size="lg">
        <Text size="sm" c="dimmed">
          The assets comes from Satisfactory or from websites created and owned
          by Coffee Stain Studios, who hold the copyright of Satisfactory.
          <br />
          All trademarks and registered trademarks present in the images are
          proprietary to Coffee Stain Studios.
        </Text>
      </Container>
    </div>
  );
}
