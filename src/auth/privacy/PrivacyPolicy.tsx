import { Anchor, Button, Container } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Footer } from '../../layout/Footer';
import { Header } from '../../layout/Header';

export const PrivacyPolicy = () => {
  return (
    <div>
      <Header />
      <Container size="lg" pt="md">
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          component="a"
          href="/"
        >
          Back to home
        </Button>
        <h1>Privacy Policy for Satisfactory Logistics</h1>
        <p>
          Effective Date: <strong>29/09/2024</strong>
        </p>
        <p>
          At Satisfactory Logistics, accessible from{' '}
          <a href="https://satisfactory-logistics.xyz">
            satisfactory-logistics.xyz
          </a>
          , we are committed to protecting your privacy and your personal data.
          This Privacy Policy explains how we collect, use, and protect your
          information in accordance with the General Data Protection Regulation
          (GDPR).
        </p>

        <h2>Information We Collect</h2>
        <p>
          When you create an account on Satisfactory Logistics, we collect the
          following personal information:
        </p>
        <ul>
          <li>Email address</li>
        </ul>
        <p>
          We do not collect any other personal data beyond what is necessary for
          account authentication.
        </p>

        <h2>Legal Basis for Processing Your Data</h2>
        <p>
          We process your personal data based on your consent when you provide
          your email address for account creation and authentication.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          Your email address is used solely for account authentication and
          communication regarding your account. We do not sell, trade, or
          transfer your information to outside parties.
        </p>

        <h2>Data Retention</h2>
        <p>
          We will retain your personal information only for as long as is
          necessary for the purposes set out in this policy. If you choose to
          delete your account, we will delete your data in accordance with
          applicable laws.
        </p>

        <h2>Your Rights Under GDPR</h2>
        <p>Under the GDPR, you have the following rights:</p>
        <ul>
          <li>The right to access your personal data.</li>
          <li>The right to rectify inaccurate personal data.</li>
          <li>The right to erase your personal data.</li>
          <li>The right to restrict processing of your personal data.</li>
          <li>The right to data portability.</li>
          <li>The right to object to the processing of your personal data.</li>
        </ul>
        <p>
          To exercise these rights, please contact us at
          info@satisfactory-logistics.xyz.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          We use Supabase for authentication, which may collect data as
          described in their privacy policy.
        </p>
        <p>
          We also use Sentry for session replay and error tracing, which may
          collect usage data. For more information, please refer to Sentry's
          privacy policy.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement a variety of security measures to maintain the safety of
          your personal information. However, please remember that no method of
          transmission over the internet or method of electronic storage is 100%
          secure.
        </p>

        <h2>Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. Any changes will
          be posted on this page, and where appropriate, notified to you via
          email.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or your personal
          data, please contact us at:
        </p>
        <p>
          Email:{' '}
          <Anchor<'a'>
            component="a"
            href="mailto:info@satisfactory-logistics.xyz"
          >
            info@satisfactory-logistics.xyz
          </Anchor>
        </p>
      </Container>
      <Footer />
    </div>
  );
};
