import {
  Box,
  Button,
  Image,
  LoadingOverlay,
  Modal,
  Popover,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

export interface IKofiSupportButtonProps {}

export function KofiSupportButton(props: IKofiSupportButtonProps) {
  const [open, { toggle, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(true);

  return (
    <>
      <Modal
        opened={open}
        onClose={close}
        bg="#f9f9f9"
        // keepMounted
        styles={{
          body: {
            backgroundColor: '#f9f9f9',
            paddingTop: '8px',
          },
        }}
        title="Support Us"
      >
        <Box pos="relative" mih="712">
          <LoadingOverlay visible={loading} />
          <iframe
            id="kofiframe"
            src="https://ko-fi.com/satisfactorylogistics/?hidefeed=true&widget=true&embed=true&preview=true"
            height="712"
            style={{
              border: 'none',
              width: '100%',
              padding: '4px',
              background: '#f9f9f9',
            }}
            title="satisfactorylogistics"
            onLoad={() => setLoading(false)}
          ></iframe>
        </Box>
      </Modal>
      <Button
        variant="filled"
        onClick={toggle}
        leftSection={
          <Image
            alt="Ko-fi"
            src="/images/logo/logo-kofi@2x.png"
            w={24}
            h={24}
            fit="contain"
          />
        }
      >
        Donate
      </Button>
    </>
  );

  return (
    <div>
      <Popover
        middlewares={{
          shift: false,
          flip: false,
          size: true,
        }}
        width={200}
        position="bottom"
        withArrow
        shadow="md"
      >
        <Popover.Target>
          <Button
            variant="filled"
            leftSection={
              <Image
                alt="Ko-fi"
                src="/images/logo/logo-kofi@2x.png"
                width={20}
                height={20}
              />
            }
          >
            Support Us
          </Button>
        </Popover.Target>
        <Popover.Dropdown w="400px" bg="#f9f9f9" p={'xs'}>
          <ScrollArea mah="90vh" type="auto">
            <iframe
              id="kofiframe"
              src="https://ko-fi.com/satisfactorylogistics/?hidefeed=true&widget=true&embed=true&preview=true"
              // style="border:none;width:100%;padding:4px;background:#f9f9f9;"
              //   height="712"
              style={{
                minHeight: '350px',
                border: 'none',
                width: '100%',
                padding: '4px',
                background: '#f9f9f9',
              }}
              title="satisfactorylogistics"
            ></iframe>
          </ScrollArea>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
