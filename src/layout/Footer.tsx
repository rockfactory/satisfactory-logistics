import { Anchor, Container, Divider, Group, Text } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import clsx from 'clsx';
import classes from './Footer.module.css';

const links = [
  {
    link: 'https://github.com/th3fallen/satisfactory-logistics',
    label: 'GitHub',
    labelNode: (
      <Group gap="xs">
        <IconBrandGithub size={16} />
        GitHub
      </Group>
    ),
  },
  {
    link: 'https://github.com/rockfactory/satisfactory-logistics',
    label: 'OriginalGitHub',
    labelNode: (
      <Group gap="xs">
        <IconBrandGithub size={16} />
        Original Repository
      </Group>
    ),
  },
  { link: '/privacy-policy', label: 'Privacy Policy' },
];

export function Footer({ compact }: { compact?: boolean }) {
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
      <Container
        className={clsx(classes.inner, {
          [classes.compact]: compact,
        })}
        size="lg"
      >
        <Group>
          <Text size="sm" c="dimmed">
            v{APP_VERSION} © {new Date().getFullYear()} Satisfactory Logistics
          </Text>
          <Group className={classes.links}>{items}</Group>
        </Group>
      </Container>

      {!compact && (
        <>
          <Divider
            styles={{
              root: {
                borderTopColor: 'var(--mantine-color-dark-6)',
              },
            }}
          />
          <Container className={classes.inner} size="lg">
            <Text size="sm" c="dimmed">
              The assets comes from Satisfactory or from websites created and
              owned by Coffee Stain Studios, who hold the copyright of
              Satisfactory.
              <br />
              All trademarks and registered trademarks present in the images are
              proprietary to Coffee Stain Studios.
            </Text>
          </Container>
        </>
      )}
    </div>
  );
}
