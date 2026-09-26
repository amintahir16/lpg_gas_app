import React from 'react';

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface LegalDocument {
  id: 'privacy' | 'terms';
  title: string;
  description: string;
  effectiveDate: string;
  version: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY_DATA: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  description: 'This policy describes how Flamora collects, utilizes, stores, and safeguards customer, transactional, and cylinder inventory information across our application, logistics platform, and distribution operations.',
  effectiveDate: 'September 2026',
  version: '2.4',
  sections: [
    {
      id: 'scope-and-applicability',
      title: '1. Scope and Operational Framework',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Flamora LPG Gas Cylinder Distribution (&quot;Flamora&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) operates a specialized Liquefied Petroleum Gas distribution and energy management system serving domestic consumers and commercial enterprises across Peshawar, Khyber Pakhtunkhwa, and regional distribution corridors.
          </p>
          <p>
            This Privacy Policy applies to all interactions with Flamora, including our administrative application, public order channels, B2B commercial accounts, delivery dispatch services, and customer ledger management systems. By accessing our services or establishing a customer account, you acknowledge the data management practices detailed herein.
          </p>
        </div>
      ),
    },
    {
      id: 'information-collected',
      title: '2. Information We Collect',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            To facilitate compliant LPG distribution, maintain precise cylinder asset reconciliation, and manage running accounts, Flamora processes the following categories of data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>
              <strong className="text-white">Account &amp; Entity Identification:</strong> Customer legal or commercial names, registered entity names (e.g. restaurants, catering facilities, hotels, residential properties), primary physical delivery addresses, GPS coordinates for delivery routing, contact phone numbers, and authorized account representatives.
            </li>
            <li>
              <strong className="text-white">Cylinder Asset &amp; Inventory Records:</strong> Serial identifiers, barcode assignments, cylinder tare and gross capacities (11.8 kg Domestic, 15.0 kg Standard, and 45.4 kg Commercial), live custody records (&quot;WITH_CUSTOMER&quot; status), security dues deposited, empty cylinder returns, and buyback credits.
            </li>
            <li>
              <strong className="text-white">Financial &amp; Invoicing Transactions:</strong> Sequenced sales orders, delivery receipts, account running ledgers, outstanding balances, payment timestamps, transaction instruments (Cash on Delivery, Bank Transfer, EasyPaisa, JazzCash), credit thresholds, and designated B2B margin categories.
            </li>
            <li>
              <strong className="text-white">Operational &amp; Inbound Inquiries:</strong> Communications submitted via our public portal, catalog inquiries, delivery schedules, customer support inquiries, and safety audit notes recorded by dispatch personnel.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'purpose-of-processing',
      title: '3. Purpose and Legal Basis for Data Processing',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>Data gathered by Flamora is utilized strictly for lawful operational, regulatory, and financial management purposes:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Logistics &amp; Fulfillment</h4>
              <p className="text-xs text-gray-400">
                Coordinating doorstep delivery, routing dispatch vehicles, confirming physical delivery verification, and ensuring scheduled refills.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Asset Custody Auditing</h4>
              <p className="text-xs text-gray-400">
                Reconciling pressurized gas cylinders held by customers and auditing stagnant cylinder holdings (&gt;7 days without refill or return).
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Commercial Accounting</h4>
              <p className="text-xs text-gray-400">
                Maintaining real-time double-entry ledgers, issuing compliant bills, tracking receivable aging, and reconciling payment instruments.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Statutory &amp; Safety Compliance</h4>
              <p className="text-xs text-gray-400">
                Adhering to Oil &amp; Gas Regulatory Authority (OGRA) directives, civil safety guidelines, and cylinder pressure re-testing certifications.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'security-and-retention',
      title: '4. Information Security and Access Control',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Flamora implements enterprise-grade technical and organizational safeguards to protect customer records against unauthorized disclosure, alteration, or destruction:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-300">
            <li><strong className="text-white">Role-Based Access Control (RBAC):</strong> Administrative rights are segmented strictly by role (Super Admin, Regional Manager, Customer). Users may access only records required for their designated operational responsibilities.</li>
            <li><strong className="text-white">Audit Trails:</strong> Core financial entries, inventory status changes, voided bills, and cylinder custody modifications generate immutable system logs identifying the operating user and timestamp.</li>
            <li><strong className="text-white">Transport &amp; Rest Encryption:</strong> Digital transmissions between user clients and application endpoints are secured with Transport Layer Security (TLS 1.3 / HTTPS).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'data-sharing-and-disclosure',
      title: '5. Non-Disclosure and Third-Party Transfer',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Flamora maintains a strict policy regarding user and business information:
          </p>
          <p className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-300">
            <strong className="text-white">Zero Monetization:</strong> We do not sell, rent, monetize, or trade customer contact details, transaction ledgers, or business profiles to any third-party marketing or advertising networks.
          </p>
          <p>
            Information is disclosed strictly to authorized delivery personnel to effectuate physical delivery, verified banking institutions for payment settlement, or regulatory authorities where mandated by the laws of Pakistan.
          </p>
        </div>
      ),
    },
    {
      id: 'contact-and-rectification',
      title: '6. Account Rights and Contact Information',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Commercial and domestic account holders may review running ledger balances, request invoice adjustments, or update operational contact details by contacting Flamora administration:
          </p>
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs space-y-1.5 font-mono text-gray-300">
            <p><span className="text-gray-500 uppercase tracking-wider">Compliance Office:</span> Flamora Energy Solutions (Pvt.) Ltd.</p>
            <p><span className="text-gray-500 uppercase tracking-wider">Electronic Inquiries:</span> <a href="mailto:flamora.pk@gmail.com" className="text-gray-300 hover:text-white underline underline-offset-2">flamora.pk@gmail.com</a></p>
            <p><span className="text-gray-500 uppercase tracking-wider">Dispatch Helpline:</span> <a href="tel:+923041555763" className="text-gray-300 hover:text-white underline underline-offset-2">+92 3041555763</a></p>
            <p><span className="text-gray-500 uppercase tracking-wider">Jurisdiction:</span> Peshawar, Khyber Pakhtunkhwa, Pakistan</p>
          </div>
        </div>
      ),
    },
  ],
};

export const TERMS_OF_SERVICE_DATA: LegalDocument = {
  id: 'terms',
  title: 'Terms of Service & Conditions',
  description: 'These terms constitute the binding commercial and operational agreement governing LPG cylinder distribution, cylinder asset custody, return obligations, and customer accounts with Flamora.',
  effectiveDate: 'September 2026',
  version: '2.4',
  sections: [
    {
      id: 'agreement-and-acceptance',
      title: '1. Agreement and Binding Acceptance',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between the customer or corporate entity (&quot;Customer&quot;, &quot;Client&quot;, or &quot;You&quot;) and Flamora LPG Gas Cylinder Distribution (&quot;Flamora&quot;, &quot;we&quot;, &quot;us&quot;).
          </p>
          <p>
            By booking a cylinder delivery, registering an account on our platform, maintaining cylinder security dues, or accepting physical possession of LPG cylinders, you acknowledge and agree to be governed by these Terms and our Privacy Policy.
          </p>
        </div>
      ),
    },
    {
      id: 'operational-services',
      title: '2. Operational Services & Cylinder Specifications',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Flamora provides certified LPG supply, scheduled cylinder deliveries, empty cylinder return services, and commercial ledger management under the following operational tiers:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>
              <strong className="text-white">Domestic Distribution (B2C):</strong> Provision of 11.8 kg and 15.0 kg capacity cylinders for residential consumption, including doorstep safety checks and valve seal verification upon handoff.
            </li>
            <li>
              <strong className="text-white">Commercial &amp; Industrial Supply (B2B):</strong> High-volume 45.4 kg commercial cylinders tailored for restaurants, hotels, commercial food processing, and industrial facilities, supported by running account credit lines and assigned margin tiers.
            </li>
            <li>
              <strong className="text-white">Order Schedules:</strong> Deliveries are executed during standard operating hours or according to agreed standing commercial schedules. Unforeseen weather, transportation disruptions, or supply chain shortages will be communicated promptly.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'cylinder-custody-and-returns',
      title: '3. Cylinder Asset Custody, Empty Returns & Stagnant Audits',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            LPG gas cylinders are certified pressure vessels subject to strict custody and accountability standards:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <strong className="text-white block mb-0.5">Asset Ownership &amp; Security Deposits:</strong>
              <p className="text-gray-400">
                All cylinders remain the physical property of Flamora or its authorized distributors unless an explicit written bill of outright sale is executed. Any security dues held represent deposit accountability and do not transfer ownership.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <strong className="text-white block mb-0.5">One-for-One Refill Return Obligation:</strong>
              <p className="text-gray-400">
                Upon delivery of a refilled cylinder, the customer must return an empty, undamaged cylinder of corresponding capacity. If an empty cylinder is not surrendered, the delivered cylinder is booked as an additional outstanding cylinder due against the customer&apos;s account.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <strong className="text-white block mb-0.5">7-Day Stagnant Cylinder Audit Protocol:</strong>
              <p className="text-gray-400">
                Any cylinder retained in customer custody for greater than seven (7) calendar days without recorded refill consumption or surrender is automatically flagged in the system for physical inventory verification and recovery dispatch.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <strong className="text-white block mb-0.5">Surplus Cylinder Buyback Credit:</strong>
              <p className="text-gray-400">
                Customers may return surplus cylinders in sound condition for buyback ledger credit at prevailing authorized market rates, subject to technical safety inspection by Flamora depot engineers.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'pricing-and-payment',
      title: '4. Regulatory Pricing and Account Settlement',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Pricing and settlement terms for gas supply and cylinder deposits:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-300">
            <li><strong className="text-white">OGRA Regulatory Rates:</strong> LPG gas unit prices are indexed in accordance with official consumer pricing notifications issued periodically by the Oil &amp; Gas Regulatory Authority (OGRA), augmented by approved regional logistics tariffs.</li>
            <li><strong className="text-white">Running Ledger Reconciliation:</strong> Commercial accounts are maintained on a continuous ledger basis. Invoices, delivery slips, and payment receipts are reflected in real time.</li>
            <li><strong className="text-white">Payment Windows:</strong> Invoices are payable on the terms specified (e.g. Cash on Delivery or agreed 15-day commercial terms). Unsettled balances beyond agreed credit limits may result in temporary dispatch holds.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'safety-and-compliance',
      title: '5. Mandatory Safety Protocols & Operational Restrictions',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            LPG is a pressurized, combustible substance. Customers accepting cylinder deliveries covenant and agree to uphold all mandatory safety guidelines:
          </p>
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-300 space-y-1.5">
            <p className="text-white font-semibold uppercase tracking-wider">Required Safety Measures:</p>
            <p>• Cylinders must be placed upright in a well-ventilated, above-ground location away from open flames, heat sources, and electrical equipment.</p>
            <p>• <strong className="text-red-400">Prohibition on Unauthorized Decanting:</strong> Cross-filling, illegal roadside decanting, or tampering with pressure relief valves is strictly prohibited by law and voids all warranties and liability.</p>
            <p>• In the event of an odor leak or defective regulator seal, immediately shut the valve, ventilate the area, avoid electrical switches, and contact the Flamora emergency line.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'governing-law',
      title: '6. Limitation of Liability and Governing Jurisdiction',
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Flamora shall not be liable for losses or damages resulting from customer mishandling, unauthorized decanting, substandard hose connections, or force majeure events outside our reasonable operational control.
          </p>
          <p className="text-xs text-gray-400">
            These Terms shall be interpreted and governed in accordance with the laws of the Islamic Republic of Pakistan. All legal proceedings arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Peshawar, Khyber Pakhtunkhwa.
          </p>
        </div>
      ),
    },
  ],
};
