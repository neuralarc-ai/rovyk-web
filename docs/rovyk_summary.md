## What Rovyk is

Rovyk is a voice-first AI agent that lives in the macOS menu bar. You say "Hey Rovyk" and speak a request, and it acts on your actual Mac: opening apps, controlling system settings, reading and organizing files, browsing the web, handling mail and calendar, and driving other apps through the Accessibility API (synthesized clicks and keystrokes, not screen-scraping tricks).

The core positioning detail that matters for a landing page: **this is not a cloud SaaS product**. There is no backend, no remote database, no accounts server. It's a native Mac app that runs locally. Hearing (speech-to-text), speech (text-to-speech), and reasoning all default to fully on-device. Any network calls (cloud LLM providers like DeepInfra/Groq, web search, a task-delegation service called Helium, GitHub integration) are opt-in and require the user to add their own API key in Settings. This "local-first, cloud-optional" story is a real differentiator versus most AI assistant products, which are cloud-only by default.

It's built as a single native macOS app (SwiftUI, Apple Silicon only, macOS 15+), distributed as a direct DMG download, not through the App Store.

## How the product actually works (for design/messaging framing)

- Wake word: "Hey Rovyk"
- One unified "brain" (an LLM) hears the request, sees the full conversation history and current screen/session context, and decides which of 50+ tools to call, no rigid command menu or fixed intents
- Before anything destructive happens (deleting/moving files, sending messages), there's a deterministic confirmation gate, independent of the AI
- After the AI replies, there's an automated honesty check that catches the assistant claiming it did something it didn't actually do, and a check that catches empty/non-answers
- Voice output uses a bundled on-device TTS model (Supertonic), not a cloud voice API

## Use cases / what it can do today

Grouped by theme, useful for a designer thinking about feature sections:

**System & app control**

- Open/quit apps, adjust volume/brightness, media playback, take screenshots
- Drive arbitrary third-party apps via Accessibility (click UI elements, type text, press key combos)

**Files**

- Voice search and read of files across folders the user explicitly grants access to (PDF, Office docs, spreadsheets, plain text)
- Organize files (with confirmation before any move/delete)

**Mail, calendar, contacts**

- Read/summarize mail, compose and draft replies
- Create/list calendar events and reminders
- Look up contacts

**Web**

- Browse the web using a bundled Playwright browser automation agent
- Web search / research (Tavily-backed)

**Memory & multi-step work**

- Long-term memory and "episodes" so it remembers things across sessions
- Multi-step task runs with visible progress: for longer jobs, the HUD shows task chips and spoken progress updates, with checkpoints and mid-run correction

**Developer-adjacent**

- Read-only GitHub integration (PRs, issues, notifications) via MCP, voice-triggered

**Self-awareness**

- Can answer "what can you do" based on its actual live tool/connection state, not a canned script

**Delegation**

- "Helium" quick actions for larger tasks handed off to a cloud service (opt-in)

## Who this is for

Based on what's built (deep macOS system control, file access, GitHub integration, developer-oriented permissions like Accessibility and Automation), this reads as a power-user / prosumer / developer-facing tool, someone comfortable granting a background app deep system access in exchange for hands-free control of their Mac. It's not positioned as a consumer chatbot; it's positioned as an agent that actually operates your machine.

## Honest constraints worth telling the designer (so they don't overclaim)

- Apple Silicon only; Intel Macs lose the web-browsing feature entirely
- Not sandboxed, distributed outside the App Store, meaning the trust story (why grant this much access) matters as much as the feature list
- Best experience requires either an internet connection + a cloud API key, or a beefy local Mac (16-32GB+ RAM) to run local models well; the fully-offline tier is explicitly weaker for complex multi-step tasks
- It's a menu-bar utility, not a full application with its own primary window; the "product" is largely voice + a lightweight HUD (notch, orb, chat window)

That's the substance. One thing to flag: the docs date the last architecture update as "post-PR #226" with a note the file was updated recently, worth a quick check with the team on whether any features shipped after this doc was last touched, since I'm relying on this file being current per the codebase rule about verifying against the actual tree rather than docs alone. I haven't cross-checked the current source tree against these claims, this brief reflects what ARCHITECTURE.md and README.md state.

Here's a set of concrete "day in the life" scenarios, framed around the act vs. answer distinction, useful for the designer to picture actual usage rather than abstract feature bullets.

## Daily-driver scenarios (it acts, not just talks)

**Morning startup routine**
"Hey Rovyk, open Slack, Mail, and my project in Xcode" — one voice command launches your whole workspace instead of clicking through the dock. It's using `open_app` calls chained together by the brain's tool loop, not a single hardcoded "morning routine" feature.

**Hands-free system tweaks while you're mid-task**
"Turn the volume down," "brighten the screen," "pause the music," "take a screenshot of this" — said while your hands are on the keyboard doing something else entirely. This is the core "HUD instead of hunting through System Settings" pitch.

**Finding things without opening Finder**
"Where's the resume I saved last week?" or "Read me the notes from the Q3 planning doc" — it searches granted folders and reads file contents back to you, rather than you tabbing out to Spotlight and squinting at a PDF.

**Clearing inbox without opening Mail**
"Summarize my unread emails," "Draft a reply to the one from Jordan agreeing to Thursday," "Create a calendar event for that meeting they mentioned" — a chain of read → draft → schedule, voice-driven, while you stay heads-down.

**Driving apps you didn't build integrations for**
Because it uses macOS Accessibility to click and type in _any_ app, it's not limited to a fixed list of supported apps like most assistants. "Click the export button," "Type this paragraph into the doc," "Open the settings menu in this app" — it can operate arbitrary UI, which is a meaningfully different pitch than Siri Shortcuts or a chatbot with plugins.

**Cleaning up your Desktop/Downloads**
"Organize my Downloads folder" — with a confirmation prompt before anything actually moves, so it's assistive automation with a safety net, not a silent background script touching your files.

**Research without switching windows**
"Look up flights to Denver next weekend and tell me the cheapest option," "Search for how to fix this error message" — browses the web (via its bundled Playwright agent) and reports back verbally, so you don't break flow to open a browser tab.

**Multi-step delegated work**
"Go through this repo and summarize the open PRs," or a longer job it can chew on in the background while you keep working — shown as task chips in the HUD with spoken progress updates, so it's less "type a prompt, wait, read a wall of text" and more "kick off a job, get a status ping."

**Checking in on itself**
"What can you do right now" or "are you connected to GitHub" — since it answers from live tool/connection state, it can double as a status widget for whether your setup (Ollama running, API key configured, GitHub PAT valid) is actually working, useful for a "no black box" trust message.

## The framing worth giving the designer

The differentiator across all of these is **agency, not chat**. Most competitors (Siri, ChatGPT desktop, Raycast AI) either answer questions or run a narrow set of pre-built shortcuts. Rovyk's pitch is that one voice command can trigger a chain of real actions across arbitrary apps and files on your actual machine, with a visible confirmation step before anything irreversible happens. The HUD (notch + orb + task chips) exists specifically to make that chain of actions visible and trustworthy in the moment, rather than a black box doing things behind your back.
