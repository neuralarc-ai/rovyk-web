import { ENTITY, type LegalDoc } from "@/lib/legal";

/* ────────────────────────────────────────────────────────────────────
   Terms of use.

   Adapted from the ModelBeat terms — same house, same entity, same
   structure — but the product underneath is a different shape and the
   document has to follow it. ModelBeat is a metered cloud gateway, so
   its terms are mostly about accounts, prepaid credit and what happens
   when a provider withdraws a model. Rovyk has no account, no server
   and no meter; it is a licensed application that runs on someone's own
   machine with permissions they granted, using provider keys they hold.

   So the sections that survive are the ones about a licence, about what
   the permissions let it do, about who is responsible when an automated
   click lands somewhere unintended, and about the fact that we have no
   way to observe or stop a session. Credits, seats, routing and service
   levels are gone — a term about a service we do not run would be
   noise in a document whose only job is to be accurate.
   ──────────────────────────────────────────────────────────────────── */

export const TERMS: LegalDoc = {
  eyebrow: "terms of use",
  title: "The terms you install it under",
  updated: "24 August 2026",
  lede: "Rovyk runs on your machine, with permissions you grant, using keys you hold. That arrangement is what this document is mostly about.",

  sections: [
    {
      id: "agreement",
      title: "The agreement",
      blocks: [
        {
          p: `These terms are a contract between you and ${ENTITY.legal}, a ${ENTITY.incorporated} corporation trading as Rovyk. They take effect when you download, install or use Rovyk, whichever happens first. There is no account to create and nothing to sign — installing the application is acceptance.`,
        },
        {
          p: "If you install Rovyk on a machine your employer owns, or run it as part of your work, you confirm you are allowed to agree to these terms on that organisation's behalf. Where that is the case, “you” means both you and that organisation.",
        },
        {
          p: "Our Privacy Policy sits alongside this document and sets out what we do and do not collect. Where the two overlap, the Privacy Policy governs personal data.",
        },
      ],
    },

    {
      id: "what-rovyk-is",
      title: "What Rovyk is",
      blocks: [
        {
          p: "Rovyk is a native macOS application that runs in the menu bar. It listens for a wake word, turns speech into text on your Mac, decides what to do, and then does it — opening and driving applications, changing system settings, reading and organising folders you have granted, handling mail and calendar, browsing the web, and operating third-party software through the macOS Accessibility API by synthesising clicks and keystrokes.",
        },
        {
          p: "Two things follow from that, and both are conditions of using it:",
        },
        {
          list: [
            "Rovyk acts on your machine with your permissions. It is not sandboxed and it is not limited to applications that have integrated with us.",
            "The step between what you say and what happens is a model's judgement. Models are wrong sometimes, and they are confident when they are wrong.",
          ],
        },
        {
          p: "There is no Rovyk server. The application has no backend, no accounts service and no remote database. Cloud features are optional, and when you enable one the traffic goes from your Mac directly to the provider you chose.",
        },
      ],
    },

    {
      id: "licence",
      title: "Your licence",
      blocks: [
        {
          p: "We grant you a personal, non-exclusive, non-transferable, revocable licence to install and use Rovyk on Macs you own or control, for as long as these terms are in force.",
        },
        { p: "That licence does not let you:" },
        {
          list: [
            "rent, sell, sublicense or redistribute the application, or make it available as a service to anyone else;",
            "reverse engineer, decompile or disassemble it, except to the extent law expressly permits despite this restriction;",
            "remove or alter any notice, mark or attribution in it;",
            "use it, or what you learn from it, to build a competing product.",
          ],
        },
        {
          p: "Rovyk is licensed, not sold. Everything not expressly granted here is reserved.",
        },
      ],
    },

    {
      id: "permissions",
      title: "The permissions you grant",
      blocks: [
        {
          p: "macOS requires each of the following to be granted separately, by you, in System Settings. Rovyk asks at the point it needs one, and every one of them can be revoked at any time — the rest of the application keeps working without it.",
        },
        {
          rows: [
            ["Microphone", "Wake word detection and speech to text, on your Mac."],
            [
              "Accessibility",
              "Synthesised clicks and keystrokes in other applications.",
            ],
            [
              "Screen recording",
              "Reading on-screen context, so a request can refer to what you can see.",
            ],
            ["Files and folders", "Only the folders you grant, one at a time."],
            [
              "Automation",
              "Driving specific applications, such as Mail and Calendar.",
            ],
          ],
        },
        {
          note: "Every capability Rovyk has is one you switched on. Taking it back in System Settings takes effect immediately, and we have no way to grant ourselves access you did not give.",
        },
        {
          p: "You are responsible for deciding which permissions are appropriate on a given machine, particularly one you do not personally own.",
        },
      ],
    },

    {
      id: "provider-keys",
      title: "Your own provider keys",
      blocks: [
        {
          p: "Rovyk runs a local model by default. If you want a cloud model, web search or the browsing agent, you add your own API key for the provider you have chosen, in Settings. When you do:",
        },
        {
          list: [
            "Your contract for that service is with that provider, not with us. Their terms, their pricing and their content policies apply to every request they serve.",
            "The key is stored on your Mac. We never receive it, and it is not transmitted to us.",
            "The text of the request, and any context Rovyk attaches to it, goes from your Mac to that provider, on your account.",
            "What they charge you is between you and them. We do not resell provider capacity and we do not take a margin on it.",
          ],
        },
        {
          p: "You are responsible for keeping those keys secure and for anything done with them.",
        },
      ],
    },

    {
      id: "acceptable-use",
      title: "Acceptable use",
      blocks: [
        { p: "Do not use Rovyk to:" },
        {
          list: [
            "break the law, infringe anyone's rights, or produce material that is illegal to produce;",
            "reach a computer, account or file you are not authorised to reach, on your machine or anyone else's;",
            "automate around another service's terms — defeating rate limits, access controls, paywalls or bot protections, or passing as a human where a service requires disclosure;",
            "make decisions with a legal or similarly significant effect on a person without meaningful human review;",
            "handle credentials, payment card numbers or other material the application was not built to handle;",
            "run it unattended on machines you do not control, or resell access to it.",
          ],
        },
        {
          note: "Because Rovyk acts through your account and your permissions, the only thing enforcing this section is you. We cannot see a session, and we cannot stop one. This is an obligation, not a control we hold.",
        },
        {
          p: "Where we reasonably believe these terms have been broken we may end your licence, and we will cooperate with lawful requests.",
        },
      ],
    },

    {
      id: "responsibility",
      title: "What you are responsible for",
      blocks: [
        {
          p: "Rovyk does real things to real files and real applications. Before you rely on it:",
        },
        {
          list: [
            "Keep backups. A confirmation gate sits in front of destructive actions, written in code and independent of the model — but it cannot undo something you approved.",
            "Read what it is asking before you approve it.",
            "Check consequential output. A model can be wrong in a way that reads as certain, and a synthesised click can land on the wrong control.",
          ],
        },
        {
          p: "You are responsible for the instructions you give it, the permissions you grant it, and the outcome either way.",
        },
      ],
    },

    {
      id: "price",
      title: "Price",
      blocks: [
        {
          p: "The current release of Rovyk is offered as a free download. If we introduce paid versions or paid features, the price and the payment terms will be put in front of you before you buy, and this section will be updated to describe them.",
        },
        {
          p: "What you pay third parties is separate. Model providers, search providers and any other service you connect bill you directly under their own agreements, and we take no part in that transaction.",
        },
      ],
    },

    {
      id: "updates",
      title: "Updates and changes to the application",
      blocks: [
        {
          p: "Rovyk may check for updates and offer to install them. We recommend taking them; security fixes arrive that way.",
        },
        {
          p: "The application will change. Capabilities may be added, altered or withdrawn — sometimes because a provider withdrew something first, sometimes because macOS changed underneath it. We will avoid removing something you obviously depend on without notice, but we do not promise that any particular capability will exist forever.",
        },
      ],
    },

    {
      id: "intellectual-property",
      title: "Intellectual property",
      blocks: [
        {
          p: "We own Rovyk — the application, its configuration and prompts, the documentation, the name, the mark and this website. These terms transfer none of it.",
        },
        {
          p: "You own what you make with it. Files it writes, messages it drafts and work it produces on your machine are yours. We have no rights in them, and no access to them.",
        },
        {
          p: "If you send us feedback we may use it, without owing you payment or attribution.",
        },
      ],
    },

    {
      id: "warranties",
      title: "Warranties, and the absence of them",
      blocks: [
        {
          p: "We will provide Rovyk with reasonable skill and care, and we have the right to enter into this agreement.",
        },
        {
          p: "Beyond that, and to the fullest extent the law allows, Rovyk is provided as it is. We disclaim the implied warranties of merchantability, fitness for a particular purpose and non-infringement. We do not warrant that it will run without interruption or error, that it will read a given instruction the way you intended, that an automated action will land where you expected, or that anything a model produces is accurate, complete or fit for your purpose.",
        },
        {
          p: "Where your local law gives you rights that cannot be excluded, this section applies only as far as that law allows and leaves those rights intact.",
        },
      ],
    },

    {
      id: "liability",
      title: "Limitation of liability",
      blocks: [
        {
          p: "Neither of us is liable to the other for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data or goodwill, even if warned they were possible.",
        },
        {
          p: "Each party's total liability under these terms is capped at the greater of what you paid us in the twelve months before the event giving rise to the claim, or one hundred United States dollars.",
        },
        {
          p: "Those caps do not apply to amounts you owe us, to your indemnity below, or to any liability that cannot lawfully be limited — including death or personal injury caused by negligence, and fraud.",
        },
      ],
    },

    {
      id: "indemnity",
      title: "Indemnity",
      blocks: [
        {
          p: "You will defend us against third-party claims arising from your use of Rovyk in breach of these terms, from what you instructed it to do, or from your infringement of someone else's rights, and you will cover damages finally awarded and the reasonable costs of defence.",
        },
        {
          p: "We will tell you promptly, let you run the defence, and help where you ask and pay. You will not settle in a way that admits fault on our part without our agreement.",
        },
      ],
    },

    {
      id: "termination",
      title: "Ending this",
      blocks: [
        {
          p: "You can end it at any time by uninstalling Rovyk. There is no notice period, no committed term and nothing to cancel.",
        },
        {
          p: "We can end it if you break these terms or if the law requires us to. When it ends, your licence ends with it and you should remove the application from your machines.",
        },
        {
          p: "The sections meant to outlive the agreement — intellectual property, warranties, liability, indemnity and governing law — do.",
        },
      ],
    },

    {
      id: "changes",
      title: "Changes to these terms",
      blocks: [
        {
          p: "We may update these terms. Where a change materially affects you we will say so on this page and, where we have a way to reach you, by email, before it takes effect. Continuing to use Rovyk after that is acceptance; if you would rather not accept, uninstall it.",
        },
        {
          p: "The date at the top of this page is the date of the version you are reading.",
        },
      ],
    },

    {
      id: "governing-law",
      title: "Governing law, and the usual clauses",
      blocks: [
        {
          p: `The law of ${ENTITY.incorporated} governs these terms, without its conflict-of-laws rules, and the state and federal courts of ${ENTITY.incorporated} have exclusive jurisdiction. Consumer protections your local law gives you that cannot be contracted away are unaffected.`,
        },
        {
          p: "If a provision is unenforceable it is read down as far as necessary and the rest stands. Not enforcing something once does not waive it later. You may not assign these terms without our written consent; we may assign them in a merger, acquisition or sale of assets. Neither party is liable for a failure caused by something outside its reasonable control. Nothing here creates a partnership, agency or employment relationship, and no third party has rights under these terms.",
        },
        {
          p: "These terms, together with anything you have separately signed with us, are the entire agreement between us on this subject.",
        },
      ],
    },

    {
      id: "contact",
      title: "Contact",
      blocks: [
        {
          p: `${ENTITY.legal} is a ${ENTITY.incorporated} corporation trading as Rovyk, with an office in ${ENTITY.office}.`,
        },
        { p: `Questions about these terms: ${ENTITY.email}.` },
      ],
    },
  ],
};
