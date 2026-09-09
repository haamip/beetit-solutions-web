import { siteConfig } from '../config/site'
import { useSeo } from '../lib/seo'

type LegalPageProps = {
  type: 'privacy' | 'terms'
}

function PrivacyPolicy() {
  return (
    <>
      <p className="legal-updated">Last updated 10 September 2026</p>
      <p>
        Beet It Solutions respects your privacy and handles personal information with care. This policy explains what information is collected through this website and client administration platform, why it is used, and how you can ask to access or correct it.
      </p>

      <h2>Information we collect</h2>
      <p>Depending on how you use the service, we may collect:</p>
      <ul>
        <li>your name, email address, phone number and messages you send us</li>
        <li>booking information including the service requested, consultation type, appointment time and important dates or deadlines</li>
        <li>client record information created during an engagement, including numbered matters, private notes and documents supplied or created for the matter</li>
        <li>your date of birth and a copy of an identity document when identity verification is required</li>
        <li>basic technical and security information needed to operate and protect the website and admin system</li>
      </ul>

      <h2>Why we use your information</h2>
      <p>Personal information is used to respond to enquiries, manage bookings, provide agreed advocacy or advisory services, maintain accurate client and matter records, verify identity when necessary, communicate with you, protect the platform, and meet legal or administrative obligations.</p>

      <h2>Identity documents and date of birth</h2>
      <p>
        Identity documents are requested only when Beet It Solutions needs to verify a client’s identity or details. Secure upload links are single use and time limited. Uploaded identity documents are kept in private client storage and are available only to authorised administrators. A date of birth is not marked as confirmed until an authorised administrator has checked it against an uploaded identity document.
      </p>

      <h2>Storage and service providers</h2>
      <p>
        HAKT Industries Limited provides technical hosting and platform support for Beet It Solutions. The platform also uses trusted infrastructure providers including Supabase for database and private document storage, Vercel for website hosting, and Resend for transactional email delivery. These providers process information only as required to operate the service and are subject to their own security and privacy controls.
      </p>

      <h2>Who we share information with</h2>
      <p>
        Beet It Solutions does not sell personal information. Information may be shared with service providers that operate the platform, with people or organisations involved in your matter where this is authorised or necessary for the agreed service, or where disclosure is required by law.
      </p>

      <h2>Security</h2>
      <p>
        Reasonable technical and organisational safeguards are used to protect client information. The administration area requires authorised sign in, client documents are stored privately, and access is restricted to approved administrators. No internet based system can be guaranteed to be completely risk free, so security is reviewed as the platform develops.
      </p>

      <h2>Retention and permanent deletion</h2>
      <p>
        Information is kept only for as long as it is reasonably needed for the purpose it was collected, for ongoing client administration, or to meet legal, accounting, dispute, or record keeping requirements. Authorised administrators may archive records that should be retained but are no longer active.
      </p>
      <p>
        Where Beet It Solutions is permitted to permanently delete a client record, the platform can remove the client profile, numbered matters, private notes, stored work documents, identity documents and secure upload links from active client storage. This action is irreversible. Existing booking or enquiry records may be detached from the deleted client record and retained where reasonably required for operational, legal or record keeping purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the New Zealand Privacy Act 2020, you may ask to access personal information Beet It Solutions holds about you and request correction if it is inaccurate. Some legal exceptions may apply.
      </p>

      <h2>Contact about privacy</h2>
      <p>
        To ask a privacy question, request access or correction, or raise a concern, contact Beet It Solutions at <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>
    </>
  )
}

function WebsiteTerms() {
  return (
    <>
      <p className="legal-updated">Last updated 10 September 2026</p>
      <p>
        These terms apply when you use the Beet It Solutions website, booking system, secure client upload features and client administration services. By using the website you agree to use it lawfully and in accordance with these terms.
      </p>

      <h2>General information</h2>
      <p>
        Website content explains the types of advocacy and advisory support Beet It Solutions may provide. It is general information only and is not a substitute for advice based on your particular circumstances.
      </p>

      <h2>Bookings and enquiries</h2>
      <p>
        A booking request reserves the selected time while it is reviewed. Beet It Solutions may confirm, reschedule or cancel an appointment where necessary and will use the contact details supplied to let you know. Please provide accurate information and tell Donna as soon as possible if an appointment needs to change.
      </p>

      <h2>Engagement and scope of work</h2>
      <p>
        Sending an enquiry, making a booking or uploading identification does not by itself create a formal engagement or representation arrangement. The work Beet It Solutions will undertake, any fees, responsibilities and the intended outcome will be discussed and agreed separately where required.
      </p>

      <h2>Your responsibilities</h2>
      <p>
        You are responsible for providing information that is accurate and complete to the best of your knowledge, supplying relevant documents when requested, keeping your contact details current and letting Beet It Solutions know about important deadlines or changes that may affect your matter.
      </p>

      <h2>Client records and matters</h2>
      <p>
        Beet It Solutions may maintain one client record for a person and create separate numbered matters for different pieces of work. Notes, documents, bookings and other information may be linked to the relevant matter so records remain organised and can be managed accurately.
      </p>

      <h2>Secure uploads</h2>
      <p>
        Secure identity upload links are intended only for the person they are sent to. Do not share a secure link with another person. Upload only documents relevant to the request and contact Beet It Solutions if a link was received unexpectedly.
      </p>

      <h2>Administrative use and permanent deletion</h2>
      <p>
        Authorised administrators may correct, update, archive or permanently delete client records where appropriate. Permanent deletion is protected by multiple confirmation steps and is irreversible. When used, it removes the client profile, matters, private notes and stored client documents, including identity files, from active client storage. Existing booking or enquiry records may remain in detached form where they are reasonably required for operational, legal or record keeping purposes.
      </p>
      <p>
        Permanent deletion should only be used when Beet It Solutions is permitted to remove the relevant records and no legal or record keeping obligation requires them to be retained.
      </p>

      <h2>Privacy and confidentiality</h2>
      <p>
        Personal information submitted through the website is handled in accordance with the Beet It Solutions Privacy Policy. Client information is treated as confidential subject to any disclosure authorised by the client, required for the agreed service, or required by law.
      </p>

      <h2>Website availability and external services</h2>
      <p>
        Reasonable care is taken to keep the website and booking system available and accurate, but uninterrupted access cannot be guaranteed. The platform relies on third party hosting, database and email services and may occasionally be affected by maintenance or outages outside Beet It Solutions’ control.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Unless otherwise stated, website text, branding, layout and platform material may not be copied, republished or commercially reused without permission. Client owned documents and information remain the property of the relevant client or rights holder.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by New Zealand law, Beet It Solutions is not responsible for loss caused solely by reliance on general website information, unauthorised use of a secure link, or an outage or failure outside its reasonable control. Nothing in these terms excludes rights or obligations that cannot legally be excluded.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        These terms may be updated when the website or services change. The current version will be published on this page. These terms are governed by the laws of New Zealand.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
    </>
  )
}

export function LegalPage({ type }: LegalPageProps) {
  const isPrivacy = type === 'privacy'
  const title = isPrivacy ? 'Privacy Policy' : 'Website Terms'

  useSeo({
    title,
    description: `${title} for Beet It Solutions.`,
    path: isPrivacy ? '/privacy' : '/terms',
  })

  return (
    <section className="page-section">
      <div className="container legal-copy">
        <p className="eyebrow">Beet It Solutions</p>
        <h1>{title}</h1>
        {isPrivacy ? <PrivacyPolicy /> : <WebsiteTerms />}
      </div>
    </section>
  )
}
