import { ENTITY, type LegalDoc } from "@/lib/legal";

/* ────────────────────────────────────────────────────────────────────
   Privacy policy.

   Adapted from the ModelBeat policy, and the adaptation is nearly all
   subtraction. ModelBeat is a gateway: prompts pass through its
   infrastructure, so its policy needs a controller/processor split, a
   DPA, a sub-processor annex and a retention table for request
   metadata. None of that exists here. Rovyk has no server of ours in
   the path at all, so the honest version of this document spends its
   first three sections establishing what never reaches us, and only
   then describes the ordinary website-and-mailing-list collection that
   actually does.

   The one section with no counterpart upstream is the third parties the
   *user* chooses to involve. On a gateway those are our sub-processors;
   here they are the user's own vendors, reached with the user's own
   key, under contracts we are not party to. Filing them as sub-
   processors would be a claim of control we do not have.
   ──────────────────────────────────────────────────────────────────── */

export const PRIVACY: LegalDoc = {
  eyebrow: "privacy policy",
  title: "What reaches us, and what never does",
  updated: "24 August 2026",
  lede: "Rovyk has no backend. Most of this policy is an account of the things that stay on your Mac — and then an honest, short list of what a company with a website and a mailing list does collect.",

  sections: [
    {
      id: "who-we-are",
      title: "Who we are, and what this covers",
      blocks: [
        {
          p: `${ENTITY.legal}, a ${ENTITY.incorporated} corporation trading as Rovyk, is the controller of the personal data described here. This policy covers this website and the Rovyk macOS application.`,
        },
        {
          p: `Privacy questions go to ${ENTITY.email}. Putting “privacy” in the subject line gets it to the right person faster.`,
        },
      ],
    },

    {
      id: "short-version",
      title: "The short version",
      blocks: [
        {
          p: "There is no Rovyk server. The application has no backend, no accounts service and no remote database, so there is no place for your voice, your screen, your files or your conversations to arrive. What we collect is what a company with a website and a mailing list collects, and it is all set out below.",
        },
        {
          note: "We cannot read your prompts, because they never reach us. There is no plan, setting or support request that would change that.",
        },
      ],
    },

    {
      id: "stays-on-your-mac",
      title: "What stays on your Mac",
      blocks: [
        {
          p: "All of the following is created and held on your machine, inside your user account. None of it is transmitted to us:",
        },
        {
          list: [
            "Audio captured for wake word detection and for speech to text.",
            "Transcripts of what you said.",
            "On-screen context read in order to answer a request.",
            "Conversation history and the record of tasks it has run.",
            "The list of folders you granted, and anything read from them.",
            "API keys you added for cloud providers, held in the system keychain.",
          ],
        },
        {
          p: "Removing Rovyk and its application support folder removes all of it. We hold no copy, so there is nothing for us to remove at our end.",
        },
      ],
    },

    {
      id: "what-we-collect",
      title: "What we collect",
      blocks: [
        {
          rows: [
            [
              "Website",
              "Ordinary server logs — IP address, user agent, page and timestamp — kept for security and to keep the site up.",
            ],
            [
              "Newsletter",
              "The email address you give us and the date you gave it. Nothing else, and every message carries an unsubscribe link.",
            ],
            [
              "Correspondence",
              "Whatever you write to us, and whatever you attach to it.",
            ],
            [
              "Downloads",
              "When you download Rovyk or it checks for an update, our download host sees the request: IP address, user agent and version. That is what any file server sees.",
            ],
            [
              "Diagnostics",
              "Off unless you turn them on. A crash report may carry a stack trace and the state of the application at the time.",
            ],
          ],
        },
        {
          p: "There is no identifier in the application that would let us tie a download or an update check back to a person, and we do not attempt to construct one. A diagnostic report never carries prompt text, transcripts or file contents; if you send us one by hand, we receive whatever you chose to put in it.",
        },
      ],
    },

    {
      id: "what-we-do-not",
      title: "What we do not collect",
      blocks: [
        {
          list: [
            "Your voice. Audio is processed on your Mac and is never sent to us.",
            "Your prompts, the transcripts of them, or the replies.",
            "Screenshots, or anything read from your screen.",
            "The contents of your files, or their names.",
            "Your provider API keys.",
          ],
        },
        {
          p: "We do not train models on anything of yours. There is no setting that enables it, because there is no pipeline it could feed. We do not sell personal data, and we do not share it for cross-context behavioural advertising.",
        },
      ],
    },

    {
      id: "third-parties",
      title: "The third parties you choose to involve",
      blocks: [
        {
          p: "When you add a provider key and enable a cloud feature, your Mac talks to that provider directly. We are not in the path, we cannot see the traffic, and we hold no agreement with them on your behalf. Their privacy policy governs what they do with what you send them.",
        },
        {
          list: [
            "The cloud model provider you configured, for reasoning that runs off-device.",
            "A web search provider, when you use search.",
            "The websites the browsing agent visits on your instruction, which see it as an ordinary browser.",
            "Any external tool or MCP server you connect to it.",
          ],
        },
        {
          p: "Turning a feature off, or removing its key, ends that flow at once. Read the policy of any provider you connect — on that leg of the journey, they are the ones holding your data.",
        },
      ],
    },

    {
      id: "why",
      title: "Why we process what we do",
      blocks: [
        {
          rows: [
            [
              "To answer you",
              "Handling your mail and doing what you asked. Performance of a contract, and our legitimate interest in being a company people can write to.",
            ],
            [
              "To send the newsletter",
              "Your consent, withdrawable from any message we send.",
            ],
            [
              "To stay up and safe",
              "Server and download logs, and the prevention of fraud and abuse. Legitimate interest.",
            ],
            [
              "To fix the application",
              "Diagnostics you opted into. Consent.",
            ],
            [
              "To obey the law",
              "Tax, accounting and lawful requests. Legal obligation.",
            ],
          ],
        },
      ],
    },

    {
      id: "sharing",
      title: "Who we share it with",
      blocks: [
        {
          p: "A small number of service providers, under contracts holding them to equivalent terms:",
        },
        {
          list: [
            "Website and download hosting.",
            "Email delivery, for the newsletter and for mail we send you directly.",
            "Error monitoring, for diagnostics you opted into.",
          ],
        },
        {
          p: "Otherwise we disclose personal data only where the law compels us, or where it is necessary to protect someone's safety or rights. If the business is acquired, data may transfer with it, and this policy continues to apply until you are told otherwise.",
        },
      ],
    },

    {
      id: "transfers",
      title: "Where it goes",
      blocks: [
        {
          p: `We operate from the United States and from ${ENTITY.office}, and our service providers operate in several countries. Where personal data belonging to people in the EEA or the UK leaves those areas, we rely on Standard Contractual Clauses or another valid transfer mechanism.`,
        },
        {
          note: "What the application does on your Mac stays where your Mac is. If you never enable a cloud feature, nothing about your use of Rovyk crosses a border at all.",
        },
      ],
    },

    {
      id: "retention",
      title: "How long we keep it",
      blocks: [
        {
          rows: [
            [
              "Prompts and audio",
              "Never held by us, so there is nothing to keep.",
            ],
            [
              "Newsletter address",
              "Until you unsubscribe, then a suppression record so we do not mail you again by mistake.",
            ],
            [
              "Correspondence",
              "As long as the matter needs, and a reasonable period afterwards.",
            ],
            [
              "Server and download logs",
              "A short operational window, then deleted.",
            ],
            ["Diagnostics", "Up to twelve months from receipt."],
            [
              "Financial records",
              "As long as tax and accounting law requires.",
            ],
          ],
        },
        {
          p: "An erasure request cannot override a legal obligation to keep something. Where that applies to your request, we will tell you which record and why.",
        },
      ],
    },

    {
      id: "security",
      title: "Security",
      blocks: [
        {
          list: [
            "Traffic to this site and to our download host is encrypted in transit.",
            "Access to the systems holding correspondence and mailing list data is limited to people who need it, and reviewed.",
            "Rovyk stores your provider keys in the macOS keychain and does not write them to its logs.",
            "The application's own data stays inside your user account, under the permissions you granted and macOS's own protections.",
          ],
        },
        {
          p: "We do not claim a certification we do not hold. We are working towards SOC 2 Type 2 and align our practices with the GDPR; when there is something to show, it will be shown here.",
        },
        {
          p: "If we suffer a breach affecting your personal data, we will notify you and the relevant authority without undue delay and within the time the law requires.",
        },
      ],
    },

    {
      id: "cookies",
      title: "Cookies and this website",
      blocks: [
        {
          p: "This site loads no analytics and no advertising by default, and sets no cookies for either. If that ever changes, we will ask first, keep your answer in your own browser, and let you change it.",
        },
      ],
    },

    {
      id: "your-rights",
      title: "Your rights",
      blocks: [
        {
          p: "Depending on where you live, you can ask us to give you a copy of your personal data, correct it, delete it where nothing legal requires us to keep it, restrict or object to how we use it, hand it to another provider, or withdraw a consent you gave — which does not undo what was done before you withdrew it.",
        },
        {
          p: "You are also entitled not to be subject to a decision with legal or similarly significant effect taken solely by automated means. We take none.",
        },
        {
          p: `Write to ${ENTITY.email}. We will answer within thirty days, it costs nothing, and we will not treat you differently for asking. If our answer does not satisfy you, you can complain to your local data protection authority — though we would rather you came to us first.`,
        },
      ],
    },

    {
      id: "children",
      title: "Children",
      blocks: [
        {
          p: "Rovyk is built for professional and developer use and is not directed at children. We do not knowingly collect personal data from anyone under sixteen. If you believe a child has sent us something, write to us and we will delete it.",
        },
      ],
    },

    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        {
          p: "We will update this policy as the product changes. Where a change materially affects you we will say so on this page before it takes effect, rather than editing quietly. The date at the top is the date of the version you are reading.",
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
        { p: `Privacy questions: ${ENTITY.email}.` },
      ],
    },
  ],
};
