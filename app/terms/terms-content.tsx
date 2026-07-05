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

export function TermsContent() {
  return (
    <>
      <section className="space-y-4">
        <H2 n={1}>Introduction</H2>
        <p>
          Welcome to JanitorForge! We&apos;re a platform for creating, managing,
          and sharing AI-powered characters and related content. By using
          JanitorForge, you agree to these terms. If you don&apos;t agree,
          please don&apos;t use the platform.
        </p>
        <p>
          We may update these terms from time to time. When we make significant
          changes, we&apos;ll update the date at the top and let you know
          through the platform. Using JanitorForge after changes means you
          accept them.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={2}>Eligibility</H2>
        <p>
          You must be at least <strong>18 years old</strong> to use
          JanitorForge. By creating an account, you confirm you meet this
          requirement.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={3}>Your Account</H2>
        <p>
          To use the platform, you&apos;ll create an account with a username and
          PIN. Here&apos;s what we ask of you:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Keep your PIN private — don&apos;t share it with anyone.</li>
          <li>
            If you think someone else has access to your account, let us know.
          </li>
          <li>You&apos;re responsible for what happens under your account.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={4}>Your Content</H2>
        <p>
          You own everything you create on JanitorForge — your bots, forms,
          lorebooks, creator pages, and anything else. We don&apos;t claim
          ownership of your content.
        </p>
        <p>
          When you make content public or share it with collaborators, you give
          us permission to store it and display it as part of the platform. This
          is just so the platform can work. If you delete your account, we stop
          using your content (though it may remain in collaborators&apos;
          workspaces if you shared it).
        </p>
        <H3 id="4.1">Content Moderation</H3>
        <p>
          We can remove content that breaks our rules or that we think
          isn&apos;t appropriate. We don&apos;t review everything, but we
          reserve the right to act when needed.
        </p>
        <H3 id="4.2">Backups</H3>
        <p>
          We do our best to keep your data safe, but we can&apos;t guarantee
          it&apos;ll be around forever. Keep your own backups of anything
          important.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={5}>Be a Good Community Member</H2>
        <p>Please don&apos;t:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Use JanitorForge for anything illegal.</li>
          <li>
            Post content that&apos;s hateful, abusive, threatening, or
            harassing.
          </li>
          <li>Infringe on anyone else&apos;s intellectual property.</li>
          <li>Upload viruses or malicious code.</li>
          <li>Try to access other people&apos;s accounts or our systems.</li>
          <li>Scrape, spam, or overload the platform.</li>
          <li>Impersonate someone else.</li>
          <li>Resell access to the platform without our permission.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={6}>Collaboration</H2>
        <p>
          JanitorForge lets you work together on bots. When you invite
          collaborators:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            They can view and (depending on permissions) edit shared content.
          </li>
          <li>
            Activity logs keep track of what happens in shared workspaces.
          </li>
          <li>
            You&apos;re in control — you can remove collaborators whenever you
            want.
          </li>
          <li>
            If you have a disagreement with a collaborator, that&apos;s between
            you and them. We&apos;re not responsible for resolving those.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={7}>Forms and Commissions</H2>
        <p>
          Creators can build forms to receive requests or commissions from
          others. A few things to keep in mind:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Form creators should clearly communicate their terms and
            expectations.
          </li>
          <li>
            We provide the tools — we&apos;re not a party to any agreement
            between creators and submitters.
          </li>
          <li>
            Any disputes from form submissions should be resolved between the
            people involved.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={8}>Our Platform</H2>
        <p>
          JanitorForge itself — the code, design, features, and branding —
          belongs to us. Please don&apos;t copy, redistribute, or reverse
          engineer it without permission.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={9}>Third-Party Services</H2>
        <p>
          JanitorForge runs on Vercel (hosting) and Supabase (database and
          authentication). Your use of the platform is also subject to their
          terms. We may also link to other websites — we don&apos;t control
          those, so check their policies if you visit them.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={10}>Privacy</H2>
        <p>
          Our{" "}
          <Link
            href="/privacy"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          explains how we handle your data. By using JanitorForge, you agree to
          that too.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={11}>Disclaimers</H2>
        <p>
          JanitorForge is provided &quot;as is.&quot; We do our best, but we
          can&apos;t guarantee the platform will always be available,
          error-free, or perfect. AI-generated content can be unpredictable —
          use it at your own discretion.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={12}>Termination</H2>
        <p>
          You can delete your account at any time through the platform settings.
          We can also suspend or terminate accounts that break these terms.
        </p>
        <p>
          Some sections of these terms (like content licenses and disclaimers)
          survive termination because they&apos;re needed to keep things fair.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={13}>Changes to the Platform</H2>
        <p>
          We may add, change, or remove features at any time. We&apos;ll try to
          give you a heads up when we can, but sometimes things change quickly.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={14}>Disputes</H2>
        <p>
          If something goes wrong, let&apos;s try to work it out. Contact us
          through the platform first. If we can&apos;t resolve it together,
          we&apos;ll follow the laws of the jurisdiction where JanitorForge
          operates.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={15}>Contact</H2>
        <p>
          Questions about these terms? Reach out through the{" "}
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
