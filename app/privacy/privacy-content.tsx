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
          JanitorForge is a platform for creating, managing, and sharing
          AI-powered characters. This Privacy Policy explains what information
          we collect, how we use it, and how we keep it safe. We want to be
          honest and transparent with you — no surprises.
        </p>
        <p>
          By using JanitorForge, you agree to this policy. If you don&apos;t
          agree, that&apos;s okay — but please don&apos;t use the Service.
        </p>
        <p>
          This policy works together with our{" "}
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
        <H2 n={2}>What We Collect</H2>
        <H3 id="2.1">Account</H3>
        <p>When you create an account, we collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Username</strong> — the name you choose for your account.
          </li>
          <li>
            <strong>PIN</strong> — a numeric code you use to log in. We store it
            securely through our authentication provider so it&apos;s never
            saved in plain text.
          </li>
        </ul>
        <p>
          We don&apos;t ask for a real email address. Our system generates an
          internal technical identifier for authentication, but it can&apos;t
          receive emails and is never shared with anyone.
        </p>

        <H3 id="2.2">Profile</H3>
        <p>If you want, you can also add:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Display name</li>
          <li>Bio</li>
          <li>Avatar and banner images</li>
          <li>Social media links</li>
        </ul>

        <H3 id="2.3">Your Content</H3>
        <p>We store what you create on the platform:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Bots (names, descriptions, personalities)</li>
          <li>Forms and submissions</li>
          <li>Lorebooks</li>
          <li>Creator pages</li>
          <li>Comments and messages</li>
          <li>Collaboration activity</li>
          <li>Feedback you send us</li>
        </ul>

        <H3 id="2.4">Automatic Data</H3>
        <p>When you browse JanitorForge, we may collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Usage:</strong> pages you visit, features you use, and when.
          </li>
          <li>
            <strong>Device:</strong> browser type, operating system, screen
            size.
          </li>
          <li>
            <strong>Analytics:</strong> aggregated, anonymous stats via Vercel
            Analytics to help us understand what works and what doesn&apos;t.
          </li>
        </ul>

        <H3 id="2.5">What We Don&apos;t Collect</H3>
        <p>To be clear, we do not collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Real email addresses (unless you share one in feedback)</li>
          <li>Phone numbers or physical addresses</li>
          <li>Government IDs</li>
          <li>Payment info (the platform is free)</li>
          <li>Biometric or precise location data</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={3}>How We Use Your Data</H2>
        <p>We use what we collect to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Run and improve the platform.</li>
          <li>Keep your account secure.</li>
          <li>Store and deliver your content.</li>
          <li>Enable collaboration between users.</li>
          <li>
            Send you notifications (like collaboration invites or replies).
          </li>
          <li>Respond to your feedback and questions.</li>
          <li>Understand how the platform is used so we can make it better.</li>
          <li>Keep the community safe and enforce our rules.</li>
          <li>Comply with legal requirements when necessary.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={4}>How We Share Your Data</H2>
        <p>
          We don&apos;t sell your information. Here&apos;s when we do share it:
        </p>
        <H3 id="4.1">With Other Users</H3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Your profile (name, avatar, bio, links) is visible to others based
            on your settings.
          </li>
          <li>Content you make public is accessible to other users.</li>
          <li>
            Collaboration activity is visible to people you&apos;ve invited.
          </li>
        </ul>
        <H3 id="4.2">Service Providers</H3>
        <p>We work with a small number of providers to run the platform:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Vercel</strong> — hosting and anonymous analytics.
          </li>
          <li>
            <strong>Supabase</strong> — database and authentication. Your data
            lives on their infrastructure.
          </li>
        </ul>
        <p>
          These providers only use your data to help us operate the Service.
        </p>
        <H3 id="4.3">Legal Obligations</H3>
        <p>
          If the law requires us to share data (for example, a court order),
          we&apos;ll comply.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={5}>Cookies</H2>
        <p>We use a few cookies to keep things running:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Session cookie:</strong> keeps you logged in.
          </li>
          <li>
            <strong>UI preferences:</strong> remembers things like sidebar
            state.
          </li>
          <li>
            <strong>Vercel Analytics:</strong> anonymous usage stats, no
            personal tracking.
          </li>
        </ul>
        <p>
          You can disable cookies in your browser, but the platform may not work
          properly without them.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={6}>How Long We Keep Your Data</H2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Account data:</strong> while your account is active. If you
            delete it, we remove your data within 30 days.
          </li>
          <li>
            <strong>Your content:</strong> while your account is active. Content
            shared with collaborators may remain in their workspaces.
          </li>
          <li>
            <strong>Activity logs:</strong> kept for security. Logs older than
            12 months may be cleared.
          </li>
          <li>
            <strong>Analytics:</strong> anonymous, aggregated data may be kept
            indefinitely.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={7}>Security</H2>
        <p>We take security seriously and use:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>HTTPS encryption for all data in transit.</li>
          <li>Secure authentication through our provider.</li>
          <li>Row-level security in our database.</li>
          <li>Access controls to limit who can see your data.</li>
        </ul>
        <p>
          No system is perfect, but we do our best to keep your information
          safe.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={8}>Your Rights</H2>
        <p>You can always:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>View</strong> your profile and content through the platform.
          </li>
          <li>
            <strong>Edit</strong> your profile and content directly.
          </li>
          <li>
            <strong>Delete</strong> your account and data.
          </li>
          <li>
            <strong>Request a copy</strong> of your data.
          </li>
        </ul>
        <p>
          If you&apos;re in the EEA, UK, or Switzerland, you also have the right
          to object to certain processing or lodge a complaint with your local
          data protection authority.
        </p>
        <p>
          To exercise any of these rights, reach out through the JanitorForge
          platform.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={9}>Age Requirement</H2>
        <p>
          JanitorForge is for users 18 and older. We don&apos;t knowingly
          collect data from anyone under 18. If we find out a minor has created
          an account, we&apos;ll delete it.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={10}>Third-Party Links</H2>
        <p>
          The platform may link to other websites. We don&apos;t control those
          sites, so please check their privacy policies if you visit them.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={11}>Changes to This Policy</H2>
        <p>
          We may update this policy from time to time. When we make significant
          changes, we&apos;ll update the date at the top of this page and let
          you know through the platform. Using JanitorForge after changes means
          you accept the updated policy.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={12}>Contact</H2>
        <p>
          Questions or concerns? Reach out to us through the{" "}
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
