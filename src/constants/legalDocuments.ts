export type LegalDocumentId = 'privacy' | 'terms';

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  meta: string;
  intro: string[];
  sections: LegalSection[];
  contactEmail: string;
};

export const SUPPORT_EMAIL = 'info@devorium.com';

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  meta: 'Effective July 24, 2026 · Updated July 27, 2026',
  intro: [
    'This Privacy Policy describes how ParentKey (“we,” “us,” or “ParentKey”) collects, uses, shares, and protects information when you use ParentKey (the parent app) and ParentKey Child (the child/device app). Together, these are the “Apps,” and related services are the “Service.”',
    'By creating an account, pairing a device, or using the Service, you agree to this Privacy Policy. If you do not agree, do not use the Apps.',
  ],
  contactEmail: SUPPORT_EMAIL,
  sections: [
    {
      heading: '1. Who this Service is for',
      paragraphs: [
        'ParentKey is a parental-control Service. The parent/guardian creates an account and manages linked children’s devices. The child uses ParentKey Child on a device that the parent has linked.',
        'We design the Service so that parents understand and control monitoring features. Children (or the person setting up the child device) are shown an in-app explanation of what parents can see before continuing setup.',
        'If you are a parent or guardian in the United States and your child is under 13, you are responsible for providing appropriate parental consent before collecting or sharing your child’s information through the Service, consistent with applicable law (including COPPA).',
      ],
    },
    {
      heading: '2. Information we collect',
      paragraphs: [
        'Parents may provide account credentials, name, child account details, app block/limit rules, and related settings.',
        'On the child device we may collect profile information, consent acknowledgment, pairing information, device identifiers, platform/device label, installed app inventory, usage summaries, sync timestamps, and push tokens used for operational sync.',
        'Camera and photo library access are used only for QR pairing and optional profile photos—not for continuous recording.',
        'We do not intentionally collect precise GPS tracking, contacts/SMS/call logs/microphone monitoring, or payment card details at this time.',
      ],
    },
    {
      heading: '3. How we use information',
      paragraphs: ['We use information to:'],
      bullets: [
        'Create and authenticate parent and child accounts',
        'Pair child devices with a parent account',
        'Show parents installed apps, usage summaries, and linked devices',
        'Apply and sync app blocking / limiting rules',
        'Store and display child profile information',
        'Send operational push messages that help the child app sync',
        'Maintain security, prevent abuse, troubleshoot issues, and improve the Service',
        'Comply with legal obligations',
      ],
    },
    {
      heading: '4. Sharing within the Service',
      paragraphs: [
        'Linked parents can view and manage information associated with their children’s accounts and devices. Child devices receive rules and settings configured by the linked parent.',
        'Pairing uses short-lived pairing sessions (for example QR tokens) so a child device can be securely linked to a parent account.',
      ],
    },
    {
      heading: '5. Third-party service providers',
      paragraphs: [
        'We use trusted processors such as Supabase (auth, database, storage), Firebase Cloud Messaging (child sync messaging), and Expo/EAS (build/distribution). We do not sell personal information.',
      ],
    },
    {
      heading: '6. Children’s privacy',
      paragraphs: [
        'ParentKey Child is intended to be used under parental/guardian supervision. Parents should only enroll a child’s device if they have authority to do so.',
        'Parents can delete a linked child account from the parent app. A child account can also be deleted from the child app. If you believe we have collected a child’s information inappropriately, contact info@devorium.com.',
      ],
    },
    {
      heading: '7. Data retention and your choices',
      paragraphs: [
        'We retain account, device, usage, and rule data as needed to provide the Service and for legitimate business or legal purposes. Pairing sessions expire after a short period. Account deletion removes associated data subject to normal deletion processes and any legally required retention.',
        'Depending on where you live, you may have rights to access, correct, delete, or export personal information. Contact info@devorium.com to exercise privacy rights.',
      ],
    },
    {
      heading: '8. Security and international transfers',
      paragraphs: [
        'We use reasonable measures to protect personal information, including encrypted transport and authenticated API access. No method of transmission or storage is 100% secure.',
        'We may process and store information on servers operated by our providers that may be located outside your country of residence.',
      ],
    },
    {
      heading: '9. Changes and contact',
      paragraphs: [
        'We may update this Privacy Policy from time to time. Continued use after an update means you accept the revised policy, except where additional consent is required by law.',
        'For privacy questions, requests, or complaints, contact ParentKey at info@devorium.com.',
      ],
    },
  ],
};

export const TERMS_OF_USE_DOCUMENT: LegalDocument = {
  id: 'terms',
  title: 'Terms of Use',
  meta: 'Effective August 6, 2026 · Updated August 6, 2026',
  intro: [
    'These Terms of Use (“Terms”) govern your access to and use of the ParentKey parent application and related parent-facing services (the “App”).',
    'By creating an account or using the App, you agree to these Terms. If you do not agree, do not use the App.',
    'These Terms apply to the ParentKey parent app. Use of ParentKey Child is subject to parental setup, in-app consent messaging, and our Privacy Policy.',
  ],
  contactEmail: SUPPORT_EMAIL,
  sections: [
    {
      heading: '1. Eligibility and parental responsibility',
      paragraphs: [
        'You must be at least 18 years old (or the age of majority where you live) to create a parent account. You represent that you are a parent or legal guardian (or have equivalent authority) for any child whose device you link.',
        'You are responsible for explaining monitoring and controls to your child as appropriate, and for complying with applicable laws (including children’s privacy laws such as COPPA in the United States).',
      ],
    },
    {
      heading: '2. The ParentKey service',
      paragraphs: ['ParentKey helps parents:'],
      bullets: [
        'Create and manage a parent account',
        'Link child devices (for example via QR pairing)',
        'View linked child profiles and device status',
        'Configure app controls and related family settings where supported',
        'Manage account settings, including account deletion',
      ],
    },
    {
      heading: '3. Accounts and security',
      paragraphs: [
        'You must provide accurate account information, safeguard your credentials, and notify us promptly at info@devorium.com if you suspect unauthorized access. We may suspend or terminate accounts that are abusive, fraudulent, or in violation of these Terms.',
      ],
    },
    {
      heading: '4. Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Use the App to monitor or control a device without lawful authority',
        'Harass, exploit, or harm a child or any other person through the Service',
        'Attempt to bypass security, reverse engineer the App (except where permitted by law), or disrupt the Service',
        'Upload unlawful, harmful, or infringing content',
        'Use the App for any purpose other than legitimate family parental controls',
        'Misrepresent your identity or your relationship to a child',
      ],
    },
    {
      heading: '5. Child devices and platforms',
      paragraphs: [
        'Parental controls depend on the child device’s operating system, permissions, and platform capabilities. We do not guarantee that every app, website, or device behavior can be blocked, limited, or reported.',
        'App stores and device platforms have their own terms. Your use of those platforms is separate from these Terms.',
      ],
    },
    {
      heading: '6. Privacy',
      paragraphs: [
        'Our collection and use of personal information is described in the Privacy Policy. By using the App, you also acknowledge that policy.',
      ],
    },
    {
      heading: '7. Disclaimers and liability',
      paragraphs: [
        'THE APP AND SERVICE ARE PROVIDED “AS IS” AND “AS AVAILABLE.” To the maximum extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.',
        'ParentKey is a tool to support parenting. It is not a substitute for supervision, education, or professional advice.',
        'To the maximum extent permitted by law, ParentKey will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the App. Our total liability for any claim will not exceed the greater of amounts you paid us for the App in the prior 12 months or USD $50 if you have not paid us.',
      ],
    },
    {
      heading: '8. Termination and changes',
      paragraphs: [
        'You may stop using the App at any time and may delete your parent account in Settings. We may suspend or end access if you violate these Terms or if we discontinue the Service.',
        'We may update these Terms from time to time. Continued use after an update means you accept the revised Terms, except where additional consent is required by law.',
      ],
    },
    {
      heading: '9. Contact',
      paragraphs: [
        'Questions about these Terms: ParentKey · info@devorium.com',
      ],
    },
  ],
};

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  return id === 'terms' ? TERMS_OF_USE_DOCUMENT : PRIVACY_POLICY_DOCUMENT;
}
