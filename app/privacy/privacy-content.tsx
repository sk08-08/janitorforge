"use client";

import Link from "next/link";

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-foreground">
      {n}. {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-medium text-foreground pt-2">
      {id} {children}
    </h3>
  );
}

export function PrivacyContent() {
  return (
    <>
      <section className="space-y-4">
        <H2 n={1}>Introduction</H2>
        <p>
          JanitorForge (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is
          committed to protecting your privacy. This Privacy Policy explains how
          we collect, use, store, share, and protect your information when you
          use our web-based platform for creating, managing, and sharing
          AI-powered characters (the &quot;Service&quot;), accessible at{" "}
          <a
            href="https://janitorforge.vercel.app"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            janitorforge.vercel.app
          </a>
          .
        </p>
        <p>
          By using the Service, you consent to the data practices described in
          this Privacy Policy. If you do not agree with this policy, please do
          not use the Service.
        </p>
        <p>
          This Privacy Policy should be read together with our{" "}
          <Link
            href="/terms"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            Terms of Service
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={2}>Information We Collect</H2>
        <H3 id="2.1">Account Information</H3>
        <p>When you create an account, we collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Username:</strong> A unique identifier you choose for your
            account.
          </li>
          <li>
            <strong>PIN:</strong> A numeric code used to authenticate your
            access. We store this securely in hashed form.
          </li>
          <li>
            <strong>Internal identifier:</strong> A system-generated user ID
            created by our authentication provider (Supabase).
          </li>
        </ul>
        <p>
          <strong>Note:</strong> We do not require a real email address to
          create an account. Our system generates an internal, non-deliverable
          email address ({`{username}@janitorforge.local`}) solely for
          authentication purposes. This address cannot receive external emails
          and is not shared with third parties.
        </p>

        <H3 id="2.2">Profile Information</H3>
        <p>You may voluntarily provide additional profile information:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Display name</li>
          <li>Bio / description</li>
          <li>Avatar image</li>
          <li>Social media links</li>
          <li>Banner images</li>
        </ul>

        <H3 id="2.3">User Content</H3>
        <p>We store content you create through the Service:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            AI character definitions (Bots), including names, descriptions, and
            personality configurations
          </li>
          <li>Forms and form submissions</li>
          <li>Lorebooks and related data</li>
          <li>Creator pages and their content</li>
          <li>Comments and messages</li>
          <li>Collaboration activity logs</li>
          <li>Feedback and support submissions</li>
        </ul>

        <H3 id="2.4">Automatically Collected Information</H3>
        <p>When you access the Service, we may automatically collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Usage data:</strong> Pages visited, features used, actions
            taken, timestamps, and navigation patterns.
          </li>
          <li>
            <strong>Device information:</strong> Browser type, operating system,
            device type, and screen resolution.
          </li>
          <li>
            <strong>Analytics data:</strong> Aggregated, anonymized usage
            statistics through Vercel Analytics to help us understand and
            improve the Service.
          </li>
          <li>
            <strong>Cookies and similar technologies:</strong> See Section 6
            (Cookies) for details.
          </li>
        </ul>

        <H3 id="2.5">Information We Do NOT Collect</H3>
        <p>We want to be transparent about what we do not collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Real email addresses (unless you voluntarily provide one through
            feedback)
          </li>
          <li>Phone numbers</li>
          <li>Physical addresses</li>
          <li>Government-issued identification</li>
          <li>Financial or payment information (the Service is free)</li>
          <li>Biometric data</li>
          <li>Precise geolocation data</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={3}>How We Use Your Information</H2>
        <p>We use the information we collect for the following purposes:</p>
        <H3 id="3.1">Service Operation</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>Providing, maintaining, and improving the Service.</li>
          <li>Authenticating your identity and managing your account.</li>
          <li>Storing and delivering your User Content.</li>
          <li>Enabling collaboration features between users.</li>
          <li>Processing form submissions and managing creator pages.</li>
        </ul>
        <H3 id="3.2">Communication</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Sending you service-related notifications (e.g., collaboration
            invitations, comment replies).
          </li>
          <li>Responding to your feedback, questions, or support requests.</li>
        </ul>
        <H3 id="3.3">Safety and Security</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Detecting, preventing, and addressing fraud, abuse, and security
            issues.
          </li>
          <li>Enforcing our Terms of Service and community guidelines.</li>
          <li>Moderating content to maintain a safe environment.</li>
        </ul>
        <H3 id="3.4">Analytics and Improvement</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>Analyzing usage patterns to improve the Service.</li>
          <li>Understanding how users interact with features.</li>
          <li>Developing new features and functionality.</li>
        </ul>
        <H3 id="3.5">Legal Compliance</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Complying with applicable laws, regulations, and legal processes.
          </li>
          <li>Responding to lawful requests from governmental authorities.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={4}>Legal Bases for Processing (GDPR)</H2>
        <p>
          If you are located in the European Economic Area (EEA), United
          Kingdom, or Switzerland, we process your personal data based on the
          following legal grounds:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Contract performance:</strong> Processing necessary to
            provide the Service you have requested by creating an account and
            agreeing to our Terms of Service.
          </li>
          <li>
            <strong>Legitimate interests:</strong> Processing for our legitimate
            interests in operating, improving, and securing the Service,
            provided these interests are not overridden by your rights.
          </li>
          <li>
            <strong>Consent:</strong> Where you have given specific consent for
            particular processing activities (e.g., optional profile
            information).
          </li>
          <li>
            <strong>Legal obligation:</strong> Processing necessary to comply
            with legal requirements.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={5}>How We Share Your Information</H2>
        <p>
          We do not sell your personal information. We share your information
          only in the following circumstances:
        </p>
        <H3 id="5.1">With Other Users</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Your profile information (display name, avatar, bio, social links)
            is visible to other users according to your privacy settings.
          </li>
          <li>
            User Content you choose to make public is accessible to other users.
          </li>
          <li>
            Collaboration activity is shared with invited collaborators as
            described in our Terms of Service.
          </li>
          <li>
            Comments and contributions within collaborative workspaces are
            visible to workspace members.
          </li>
        </ul>
        <H3 id="5.2">Service Providers</H3>
        <p>
          We share data with trusted third-party providers who assist us in
          operating the Service:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Vercel:</strong> Hosting infrastructure and web analytics
            (aggregated, anonymized data only).
          </li>
          <li>
            <strong>Supabase:</strong> Database hosting and authentication
            services. Your data is stored on Supabase&apos;s infrastructure and
            subject to their security practices.
          </li>
        </ul>
        <p>
          These providers are contractually obligated to use your data only for
          the purposes we specify and to maintain appropriate security measures.
        </p>
        <H3 id="5.3">Legal Requirements</H3>
        <p>
          We may disclose your information if required to do so by law or in
          response to:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Valid legal process (subpoenas, court orders, etc.).</li>
          <li>Requests from law enforcement authorities.</li>
          <li>
            Protection of our rights, property, or safety, or that of our users
            or the public.
          </li>
        </ul>
        <H3 id="5.4">Business Transfers</H3>
        <p>
          In the event of a merger, acquisition, reorganization, bankruptcy, or
          sale of assets, your information may be transferred as part of that
          transaction. We will notify you of any such change and any choices you
          may have regarding your information.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={6}>Cookies and Tracking Technologies</H2>
        <p>
          We use cookies and similar technologies to operate the Service and
          enhance your experience.
        </p>
        <H3 id="6.1">Essential Cookies</H3>
        <p>These cookies are necessary for the Service to function:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Session cookies (Supabase):</strong> Used to maintain your
            authenticated session.
          </li>
          <li>
            <strong>janitorforge_session:</strong> Stores basic session info
            (user ID, username, login timestamp).
          </li>
          <li>
            <strong>UI state cookies:</strong> Remember your interface
            preferences (e.g., sidebar state).
          </li>
        </ul>
        <H3 id="6.2">Analytics</H3>
        <p>
          We use Vercel Analytics, which collects aggregated, anonymized usage
          data without cookies or personal tracking. It does not track users
          across sites.
        </p>
        <H3 id="6.3">Managing Cookies</H3>
        <p>
          Most browsers allow you to control cookies through settings. Disabling
          essential cookies may prevent authentication and certain features from
          working.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={7}>Data Retention</H2>
        <p>
          We retain your information for as long as necessary to provide the
          Service:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Account data:</strong> Retained while your account is
            active. Upon deletion, removed within 30 days.
          </li>
          <li>
            <strong>User Content:</strong> Retained while your account is
            active. Shared content may persist in collaborators&apos;
            workspaces.
          </li>
          <li>
            <strong>Activity logs:</strong> Retained for security. Logs older
            than 12 months may be purged.
          </li>
          <li>
            <strong>Analytics:</strong> Aggregated, anonymized data may be
            retained indefinitely.
          </li>
          <li>
            <strong>Legal retention:</strong> Certain data may be retained
            longer as required by law.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={8}>Data Security</H2>
        <p>
          We implement technical and organizational measures to protect your
          information:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Encryption of data in transit (HTTPS/TLS).</li>
          <li>Secure authentication with hashed PINs.</li>
          <li>Row-level security policies in our database.</li>
          <li>Regular security assessments.</li>
          <li>Access controls limiting internal data access.</li>
        </ul>
        <p>
          However, no method of transmission or storage is 100% secure. While we
          strive to use commercially acceptable means to protect your data, we
          cannot guarantee absolute security.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={9}>Your Rights and Choices</H2>
        <p>Depending on your location, you may have the following rights:</p>
        <H3 id="9.1">Universal Rights</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Access:</strong> View your profile info and User Content
            through the Service.
          </li>
          <li>
            <strong>Correction:</strong> Update your profile and content
            directly.
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your account and
            data.
          </li>
          <li>
            <strong>Portability:</strong> Request a copy of your data in a
            common format.
          </li>
          <li>
            <strong>Withdraw consent:</strong> Where processing is based on
            consent, withdraw it at any time.
          </li>
        </ul>
        <H3 id="9.2">EEA, UK, and Switzerland</H3>
        <p>
          If you are in the EEA, UK, or Switzerland, you additionally have the
          right to:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Object to processing</strong> based on legitimate interests.
          </li>
          <li>
            <strong>Restrict processing</strong> in certain circumstances.
          </li>
          <li>
            <strong>Lodge a complaint</strong> with your local data protection
            authority.
          </li>
        </ul>
        <H3 id="9.3">California Residents (CCPA/CPRA)</H3>
        <p>If you are a California resident, you have the right to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Know what personal information we collect and how it is used.</li>
          <li>Request deletion of your personal information.</li>
          <li>
            Opt out of the sale of personal information (we do not sell it).
          </li>
          <li>Non-discrimination for exercising your rights.</li>
        </ul>
        <p>
          To exercise any rights, contact us through the JanitorForge platform.
          We will respond within 30 days.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={10}>Children&apos;s Privacy</H2>
        <p>
          The Service is not intended for children under 18 years of age. We do
          not knowingly collect personal information from children under 18. If
          we learn that we have collected personal information from a child
          under 18, we will take steps to delete such information promptly. If
          you believe a child has provided us with personal information, please
          contact us.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={11}>International Data Transfers</H2>
        <p>
          Your information may be transferred to and processed in countries
          other than your country of residence, including the United States,
          where our service providers operate. These countries may have data
          protection laws that differ from those in your jurisdiction.
        </p>
        <p>
          When we transfer data internationally, we implement appropriate
          safeguards, including Standard Contractual Clauses (SCCs) approved by
          the European Commission, to ensure your data receives an adequate
          level of protection.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={12}>Third-Party Links and Services</H2>
        <p>
          The Service may contain links to third-party websites or services that
          are not operated by us. We are not responsible for the privacy
          practices of these third parties. We encourage you to review the
          privacy policies of any third-party services you access through the
          Service.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={13}>Changes to This Privacy Policy</H2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes
          in our practices, technology, legal requirements, or other factors.
          When we make material changes, we will update the &quot;Last
          updated&quot; date at the top of this page and, where practicable,
          notify you through the Service.
        </p>
        <p>
          We encourage you to review this Privacy Policy periodically. Your
          continued use of the Service after any changes constitutes your
          acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={14}>Contact Us</H2>
        <p>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy or our data practices, please reach out to us through
          the{" "}
          <Link
            href="/"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            JanitorForge platform
          </Link>
          .
        </p>
      </section>
    </>
  );
}
