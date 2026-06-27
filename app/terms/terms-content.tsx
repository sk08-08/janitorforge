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
          Welcome to JanitorForge (&quot;we,&quot; &quot;us,&quot;
          &quot;our&quot;). JanitorForge is a web-based platform that provides
          tools for creating, managing, and sharing AI-powered characters and
          related content (the &quot;Service&quot;). The Service is accessible
          at{" "}
          <a
            href="https://janitorforge.vercel.app"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            janitorforge.vercel.app
          </a>{" "}
          and any related subdomains or mirror domains we operate.
        </p>
        <p>
          By creating an account, accessing, or using the Service in any
          capacity, you acknowledge that you have read, understood, and agree to
          be bound by these Terms of Service (&quot;Terms&quot;). If you do not
          agree to these Terms, you must not access or use the Service.
        </p>
        <p>
          We reserve the right to modify these Terms at any time. When we make
          material changes, we will update the &quot;Last updated&quot; date
          above and, where practicable, notify you through the Service. Your
          continued use of the Service after any such changes constitutes your
          acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={2}>Eligibility</H2>
        <p>
          You must be at least <strong>18 years of age</strong> to use the
          Service. By using the Service, you represent and warrant that you meet
          this age requirement and have the legal capacity to enter into these
          Terms.
        </p>
        <p>
          We do not knowingly collect personal information from children under
          18. If we learn that a user under 18 has created an account, we will
          terminate that account and delete associated data promptly.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={3}>Account Registration and Security</H2>
        <p>
          To access certain features of the Service, you must create an account
          by selecting a unique username and a personal identification number
          (PIN). You agree to the following:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            You will provide accurate information during the registration
            process and keep your profile information up to date.
          </li>
          <li>
            You are solely responsible for maintaining the confidentiality of
            your PIN and for all activity that occurs under your account.
          </li>
          <li>
            You will not share your account credentials with any third party or
            allow others to access the Service through your account.
          </li>
          <li>
            You will notify us immediately if you suspect any unauthorized use
            of your account or any other security breach.
          </li>
          <li>
            We are not liable for any loss or damage arising from your failure
            to safeguard your credentials.
          </li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that we
          reasonably believe are compromised, used in violation of these Terms,
          or inactive for an extended period of time.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={4}>User Content</H2>
        <p>
          The Service allows you to create, upload, store, and share various
          types of content, including but not limited to AI character
          definitions (&quot;Bots&quot;), forms, lorebooks, creator pages,
          profile information, comments, and other materials (collectively,
          &quot;User Content&quot;).
        </p>
        <H3 id="4.1">Ownership</H3>
        <p>
          You retain all ownership rights in the User Content you create. We do
          not claim ownership over your User Content.
        </p>
        <H3 id="4.2">License Grant</H3>
        <p>
          By uploading, posting, or otherwise making User Content available
          through the Service, you grant us a worldwide, non-exclusive,
          royalty-free, sublicensable, and transferable license to use,
          reproduce, modify, adapt, publish, translate, distribute, and display
          such User Content solely for the purposes of operating, improving, and
          promoting the Service. This license survives termination of your
          account only to the extent necessary for us to provide the Service to
          other users or to comply with legal obligations.
        </p>
        <H3 id="4.3">Responsibility</H3>
        <p>
          You are solely responsible for your User Content. You represent and
          warrant that:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            You own or have the necessary rights, licenses, and permissions to
            post your User Content and to grant the license described above.
          </li>
          <li>
            Your User Content does not infringe, misappropriate, or violate any
            third-party intellectual property rights, privacy rights, publicity
            rights, or any other rights.
          </li>
          <li>
            Your User Content complies with these Terms and all applicable laws
            and regulations.
          </li>
        </ul>
        <H3 id="4.4">Content Moderation</H3>
        <p>
          We reserve the right, but have no obligation, to review, monitor,
          edit, remove, or disable access to any User Content at our sole
          discretion, for any reason or no reason, including User Content that
          we determine violates these Terms or is otherwise objectionable. We
          are not responsible for any loss or damage resulting from our
          moderation actions.
        </p>
        <H3 id="4.5">Backups and Data Loss</H3>
        <p>
          While we take reasonable measures to protect your data, we do not
          guarantee that User Content will be preserved indefinitely. You are
          responsible for maintaining your own backups of any User Content you
          consider important. We are not liable for any loss of User Content.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={5}>Prohibited Conduct</H2>
        <p>
          You agree not to engage in any of the following prohibited activities:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Illegal use:</strong> Using the Service for any purpose that
            violates applicable local, state, national, or international law or
            regulation.
          </li>
          <li>
            <strong>Harmful content:</strong> Creating, uploading, or
            distributing User Content that is defamatory, abusive, threatening,
            harassing, hateful, or otherwise objectionable.
          </li>
          <li>
            <strong>Intellectual property infringement:</strong> Uploading
            content that infringes any patent, trademark, trade secret,
            copyright, or other intellectual property right of any party.
          </li>
          <li>
            <strong>Malicious code:</strong> Uploading or transmitting viruses,
            malware, worms, Trojan horses, or any other code of a destructive or
            disruptive nature.
          </li>
          <li>
            <strong>Unauthorized access:</strong> Attempting to gain
            unauthorized access to other users&apos; accounts, the
            Service&apos;s systems or networks, or any connected server or
            database.
          </li>
          <li>
            <strong>Interference:</strong> Interfering with or disrupting the
            integrity or performance of the Service, including through
            denial-of-service attacks, excessive automated requests, or
            scraping.
          </li>
          <li>
            <strong>Impersonation:</strong> Impersonating any person or entity,
            or falsely stating or misrepresenting your affiliation with any
            person or entity.
          </li>
          <li>
            <strong>Spam and abuse:</strong> Using the Service to send
            unsolicited communications, spam, chain letters, or pyramid schemes,
            or to excessively burden the Service with automated activity.
          </li>
          <li>
            <strong>Circumvention:</strong> Bypassing any measures we use to
            restrict access to the Service or its features.
          </li>
          <li>
            <strong>Data harvesting:</strong> Collecting or harvesting any
            personally identifiable information from the Service without
            consent.
          </li>
          <li>
            <strong>Resale:</strong> Reselling, sublicensing, or commercially
            exploiting access to the Service without our prior written consent.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={6}>Collaboration Features</H2>
        <p>
          The Service provides collaboration tools that allow multiple users to
          work together on Bots, including shared editing, commenting, and
          change requests. When you invite collaborators or accept collaboration
          invitations:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            You grant invited collaborators access to view, comment on, and
            (depending on their permission level) edit the shared content.
          </li>
          <li>
            Activity logs may record collaborative actions for transparency and
            accountability purposes.
          </li>
          <li>
            The account owner retains ultimate control over collaborator
            permissions and may revoke access at any time.
          </li>
          <li>
            We are not responsible for disputes arising between collaborators.
            It is your responsibility to establish collaboration terms with your
            partners.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={7}>Forms and Commission Features</H2>
        <p>
          The Service allows creators to build custom forms for receiving
          requests, commissions, or submissions from other users. When using
          these features:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Form creators are responsible for clearly communicating their terms,
            requirements, and expectations to submitters.
          </li>
          <li>
            We provide the technical infrastructure for form creation and
            submission only. We are not a party to any agreement between form
            creators and submitters.
          </li>
          <li>
            We do not guarantee response times, acceptance rates, or the
            completion of any commissions or requests facilitated through the
            Service.
          </li>
          <li>
            Any disputes arising from form submissions, commissions, or
            creator-submitter arrangements must be resolved directly between the
            parties involved.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 n={8}>Intellectual Property</H2>
        <p>
          The Service itself, including its design, code, features,
          documentation, trademarks, logos, and all other proprietary content
          (excluding User Content), is the exclusive property of JanitorForge
          and its licensors. The Service is protected by copyright, trademark,
          and other intellectual property laws.
        </p>
        <p>
          You may not copy, modify, distribute, sell, lease, reverse engineer,
          decompile, or disassemble any part of the Service without our prior
          written consent. You may not use our trademarks, logos, or branding
          without authorization.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={9}>Third-Party Services</H2>
        <p>
          The Service relies on third-party infrastructure and services,
          including but not limited to Vercel (hosting and analytics), Supabase
          (database and authentication), and other providers. Your use of the
          Service is also subject to the terms and policies of these third-party
          providers.
        </p>
        <p>
          The Service may contain links to third-party websites or services that
          are not owned or controlled by us. We have no control over, and assume
          no responsibility for, the content, privacy policies, or practices of
          any third-party sites or services. You access third-party services at
          your own risk.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={10}>Privacy</H2>
        <p>
          Your use of the Service is also governed by our{" "}
          <Link
            href="/privacy"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            Privacy Policy
          </Link>
          , which describes how we collect, use, store, and disclose your
          information. By using the Service, you consent to the data practices
          described in the Privacy Policy.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={11}>Disclaimers</H2>
        <p className="uppercase text-xs tracking-wide">
          THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
          AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED
          TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, TITLE, AND NON-INFRINGEMENT.
        </p>
        <p>Without limiting the foregoing, we do not warrant that:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            The Service will be uninterrupted, timely, secure, or error-free.
          </li>
          <li>
            The results obtained from the use of the Service will be accurate or
            reliable.
          </li>
          <li>
            The quality of any content, information, or other material obtained
            through the Service will meet your expectations.
          </li>
          <li>Any errors in the Service will be corrected.</li>
        </ul>
        <p>
          We do not endorse, guarantee, or assume responsibility for any User
          Content posted by users. You acknowledge that AI-generated content may
          produce unexpected, inaccurate, or inappropriate outputs, and you use
          such content at your own risk.
        </p>
      </section>

      {/* <section className="space-y-4">
        <H2 n={12}>Limitation of Liability</H2>
        <p className="uppercase text-xs tracking-wide">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
          JANITORFORGE, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS,
          OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS
          OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING
          OUT OF OR RELATED TO:
        </p>
        <ul className="list-disc space-y-2 pl-6 uppercase text-xs tracking-wide">
          <li>
            Your access to, use of, or inability to access or use the Service;
          </li>
          <li>Any conduct or content of any third party on the Service;</li>
          <li>Any content obtained from the Service;</li>
          <li>
            Unauthorized access, use, or alteration of your transmissions or
            content;
          </li>
          <li>
            Any User Content created, shared, or distributed by you or other
            users;
          </li>
          <li>
            Disputes between users, including collaboration and commission
            disputes;
          </li>
          <li>Any loss or damage to your User Content.</li>
        </ul>
        <p className="uppercase text-xs tracking-wide">
          IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE
          GREATER OF (A) THE AMOUNT YOU HAVE PAID TO US IN THE TWELVE (12)
          MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR
          (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100.00).
        </p>
      </section> */}

      <section className="space-y-4">
        <H2 n={12}>Indemnification</H2>
        <p>
          You agree to defend, indemnify, and hold harmless JanitorForge and its
          officers, directors, employees, contractors, agents, licensors, and
          suppliers from and against any claims, actions, demands, liabilities,
          settlements, and expenses (including reasonable legal and accounting
          fees) arising out of or related to your use of the Service, your
          violation of these Terms, your User Content, or your violation of any
          third-party rights, including intellectual property, privacy, or
          publicity rights.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={13}>Termination</H2>
        <p>
          We may suspend or terminate your access to the Service immediately,
          without prior notice or liability, for any reason, including but not
          limited to your breach of these Terms.
        </p>
        <p>
          You may terminate your account at any time by contacting us or by
          using any account deletion features we provide. Upon termination, your
          right to access and use the Service will cease immediately.
        </p>
        <p>
          We may, but are not obligated to, retain your User Content for a
          reasonable period to allow for data recovery or as required by law.
          Sections of these Terms that by their nature should survive
          termination will survive, including but not limited to Sections 4.2,
          8, 11, 12, 13, and 16.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={14}>Changes to the Service</H2>
        <p>
          We reserve the right to modify, suspend, or discontinue the Service
          (or any part thereof) at any time, with or without notice. We shall
          not be liable to you or to any third party for any modification,
          suspension, or discontinuation of the Service.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={15}>Governing Law and Disputes</H2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the jurisdiction in which JanitorForge operates, without
          regard to its conflict-of-law principles.
        </p>
        <p>
          Any dispute arising out of or relating to these Terms or the Service
          shall be resolved through good-faith negotiation as a first step. If
          the dispute cannot be resolved through negotiation within thirty (30)
          days, either party may pursue resolution through binding arbitration
          or in the courts of competent jurisdiction, as applicable.
        </p>
        <p>
          You agree that any dispute resolution proceedings will be conducted
          only on an individual basis and not in a class, consolidated, or
          representative action.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={16}>General Provisions</H2>
        <p>
          <strong>Entire Agreement:</strong> These Terms, together with the
          Privacy Policy, constitute the entire agreement between you and
          JanitorForge regarding the Service and supersede all prior agreements
          and understandings.
        </p>
        <p>
          <strong>Severability:</strong> If any provision of these Terms is held
          to be invalid or unenforceable, the remaining provisions will remain
          in full force and effect.
        </p>
        <p>
          <strong>Waiver:</strong> Our failure to enforce any right or provision
          of these Terms will not be considered a waiver of such right or
          provision.
        </p>
        <p>
          <strong>Assignment:</strong> You may not assign or transfer these
          Terms or your rights under them without our prior written consent. We
          may assign our rights and obligations without restriction.
        </p>
        <p>
          <strong>Force Majeure:</strong> We shall not be liable for any failure
          or delay in performance resulting from causes beyond our reasonable
          control, including but not limited to natural disasters, war,
          terrorism, pandemics, labor disputes, government actions, or failures
          of third-party infrastructure.
        </p>
        <p>
          <strong>No Agency:</strong> Nothing in these Terms creates a
          partnership, joint venture, agency, or employment relationship between
          you and JanitorForge.
        </p>
      </section>

      <section className="space-y-4">
        <H2 n={17}>Contact Us</H2>
        <p>
          If you have any questions, concerns, or feedback about these Terms,
          please reach out to us through the{" "}
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
