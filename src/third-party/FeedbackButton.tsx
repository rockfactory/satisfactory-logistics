import { Button } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

export interface IFeedbackButtonProps {}

export function FeedbackButton(props: IFeedbackButtonProps) {
  return (
    <Button
      component="a"
      leftSection={<IconHelp size={16} />}
      data-canny-link
      href="https://satisfactorylogistics.featurebase.app"
    >
      Give Feedback
    </Button>
  );
}
