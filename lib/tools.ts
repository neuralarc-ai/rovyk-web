/* ────────────────────────────────────────────────────────────────────
   The tool index: ten groups, fifty-nine tools.

   Three columns here are not in the original copy deck and are the
   reason this reads as a disclosure rather than a feature list: what a
   tool can touch, whether the confirmation gate stands in front of it,
   and what has to be granted before it works at all.

   `gated` follows the product's own rule rather than a per-tool
   opinion — the gate stands in front of anything destructive: deleting
   or moving files, and sending messages. It is deterministic and
   independent of the model.

   Rows marked REVIEW are inferences, not documented facts. They are
   defensible defaults, but they are public claims about permissions and
   should be confirmed against the app before this ships.
   ──────────────────────────────────────────────────────────────────── */

/** What a tool can touch. `system` is machine state — loud, but not yours. */
export type ToolAccess = "reads" | "writes" | "system";

export type Tool = {
  name: string;
  /** One sentence. What it does, not what it is. */
  summary: string;
  access: ToolAccess;
  /** The confirmation gate stands in front of it. */
  gated?: true;
  /** What has to be granted or connected first. Omitted means nothing. */
  needs?: string;
};

export type ToolGroup = {
  name: string;
  /** For the spectrum's rail, where a group gets ~100px of width. */
  short: string;
  tools: Tool[];
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    name: "System & apps",
    short: "System",
    tools: [
      {
        name: "open_app",
        summary: "Launches any installed application by name.",
        access: "system",
      },
      {
        name: "quit_app",
        summary: "Closes an app cleanly, the way ⌘Q would.",
        access: "system",
      },
      {
        name: "switch_app",
        summary: "Brings a window forward without disturbing your layout.",
        access: "system",
      },
      {
        name: "list_apps",
        summary: "Reads back what is actually installed.",
        access: "reads",
      },
      {
        name: "set_volume",
        summary: "Sets the system output level.",
        access: "system",
      },
      {
        name: "set_brightness",
        summary: "Sets the display brightness.",
        access: "system",
      },
      {
        name: "media_play_pause",
        summary: "Plays or pauses whatever is currently playing.",
        access: "system",
      },
      {
        name: "media_next",
        summary: "Skips to the next track.",
        access: "system",
      },
      // REVIEW: Screen Recording is the standard macOS permission for this,
      // but it is inferred from the platform, not read from the app.
      {
        name: "take_screenshot",
        summary: "Captures the whole screen, or a region you describe.",
        access: "reads",
        needs: "Screen Recording permission",
      },
      {
        name: "toggle_focus",
        summary: "Turns Do Not Disturb on or off.",
        access: "system",
      },
    ],
  },
  {
    name: "Any app",
    short: "Any app",
    tools: [
      {
        name: "screen_context",
        summary:
          "Reads the frontmost window, so it knows what you are looking at.",
        access: "reads",
        needs: "Accessibility permission",
      },
      {
        name: "ax_find_element",
        summary: "Locates a control by its name or label.",
        access: "reads",
        needs: "Accessibility permission",
      },
      // REVIEW: not destructive by the stated rule, but a synthesised click
      // can land on a Delete button in someone else's app. Gated or not?
      {
        name: "ax_click",
        summary: "A real synthesised click, not a guess at a screenshot.",
        access: "writes",
        needs: "Accessibility permission",
      },
      // REVIEW: same question as ax_click.
      {
        name: "ax_type",
        summary: "Types into any field, in any app.",
        access: "writes",
        needs: "Accessibility permission",
      },
      // REVIEW: same question as ax_click.
      {
        name: "ax_press_keys",
        summary: "Sends a key combination to the frontmost app.",
        access: "writes",
        needs: "Accessibility permission",
      },
      {
        name: "ax_read_window",
        summary: "Dictates what is on screen, element by element.",
        access: "reads",
        needs: "Accessibility permission",
      },
    ],
  },
  {
    name: "Files",
    short: "Files",
    tools: [
      {
        name: "find_file",
        summary: "Finds a file by name, by date, or by what is inside it.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "read_file",
        summary: "Reads plain text and markdown.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "read_pdf",
        summary: "Pulls a PDF apart and summarises it.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "read_office_doc",
        summary: "Reads Word and Pages documents.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "read_spreadsheet",
        summary: "Reads Numbers, Excel and CSV.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "list_folder",
        summary: "Lists what is in a folder.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "organise_folder",
        summary: "Proposes a structure. Nothing moves at this step.",
        access: "reads",
        needs: "Folder access",
      },
      {
        name: "move_files",
        summary: "Moves, renames and files things away.",
        access: "writes",
        gated: true,
        needs: "Folder access",
      },
    ],
  },
  {
    name: "Mail",
    short: "Mail",
    tools: [
      {
        name: "list_mail",
        summary: "Lists unread, flagged, or everything from one person.",
        access: "reads",
        needs: "a Mail account",
      },
      {
        name: "read_thread",
        summary: "Pulls a whole conversation, not just the last message.",
        access: "reads",
        needs: "a Mail account",
      },
      {
        name: "summarise_inbox",
        summary: "Says what actually needs you, and what does not.",
        access: "reads",
        needs: "a Mail account",
      },
      {
        name: "compose_mail",
        summary: "Writes a draft in your voice. It stays a draft.",
        access: "writes",
        needs: "a Mail account",
      },
      {
        name: "reply_mail",
        summary: "Drafts a reply in-thread, with the context above it.",
        access: "writes",
        needs: "a Mail account",
      },
      {
        name: "send_mail",
        summary: "Sends it. This is the step the gate stands in front of.",
        access: "writes",
        gated: true,
        needs: "a Mail account",
      },
    ],
  },
  {
    name: "Calendar & contacts",
    short: "Calendar",
    tools: [
      {
        name: "list_events",
        summary: "Reads today, this week, or a day you name.",
        access: "reads",
        needs: "Calendars permission",
      },
      {
        name: "create_event",
        summary: "Creates an event with the right people on it.",
        access: "writes",
        needs: "Calendars permission",
      },
      // REVIEW: not delete/move/send, so ungated by the stated rule — but
      // moving someone else's meeting has real-world consequences.
      {
        name: "update_event",
        summary: "Moves or renames an event that already exists.",
        access: "writes",
        needs: "Calendars permission",
      },
      {
        name: "create_reminder",
        summary: "Puts a reminder into Reminders.",
        access: "writes",
        needs: "Reminders permission",
      },
      {
        name: "find_contact",
        summary: "Finds a number, an email or an address.",
        access: "reads",
        needs: "Contacts permission",
      },
    ],
  },
  {
    name: "Web",
    short: "Web",
    tools: [
      {
        name: "web_search",
        summary: "Searches the web. Opt-in, and on your own key.",
        access: "reads",
        needs: "your own API key",
      },
      {
        name: "browse_web",
        summary: "Drives a bundled browser to do the reading for you.",
        access: "reads",
        needs: "your own API key",
      },
      {
        name: "extract_page",
        summary: "Pulls out the part of a page you actually asked about.",
        access: "reads",
        needs: "your own API key",
      },
      // REVIEW: typing into a live page can submit it. Gated or not?
      {
        name: "fill_form",
        summary: "Types into a live page.",
        access: "writes",
        needs: "your own API key",
      },
      {
        name: "download_file",
        summary: "Saves a file into a folder you have granted.",
        access: "writes",
        needs: "Folder access",
      },
    ],
  },
  {
    name: "Memory",
    short: "Memory",
    tools: [
      {
        name: "remember_fact",
        summary: "Keeps something you only want to say once.",
        access: "writes",
      },
      {
        name: "recall_fact",
        summary: "Brings it back, sessions later.",
        access: "reads",
      },
      {
        name: "list_episodes",
        summary: "Reads back what happened, and when.",
        access: "reads",
      },
      {
        name: "forget_fact",
        summary: "Removes it for good.",
        access: "writes",
        gated: true,
      },
      {
        name: "summarise_session",
        summary: "Sums up what the two of you just did.",
        access: "reads",
      },
    ],
  },
  {
    name: "Developer",
    short: "Developer",
    tools: [
      {
        name: "github_list_prs",
        summary: "Lists pull requests. Read only.",
        access: "reads",
        needs: "GitHub sign-in",
      },
      {
        name: "github_read_pr",
        summary: "Reads a pull request's diff and its discussion.",
        access: "reads",
        needs: "GitHub sign-in",
      },
      {
        name: "github_list_issues",
        summary: "Lists issues open, assigned, or mentioning you.",
        access: "reads",
        needs: "GitHub sign-in",
      },
      {
        name: "github_notifications",
        summary: "Reads what is waiting for you.",
        access: "reads",
        needs: "GitHub sign-in",
      },
      // REVIEW: a Shortcut can do essentially anything. Gated or not?
      {
        name: "run_shortcut",
        summary: "Runs anything you have already built in Shortcuts.",
        access: "system",
        needs: "Shortcuts access",
      },
    ],
  },
  {
    name: "Voice & session",
    short: "Voice",
    tools: [
      {
        name: "set_voice",
        summary: "Picks the voice it speaks in.",
        access: "system",
      },
      {
        name: "mute_mic",
        summary: "Stops listening entirely.",
        access: "system",
      },
      {
        name: "change_wake_word",
        summary: "Makes it answer to something other than Rovyk.",
        access: "system",
      },
      {
        name: "read_aloud",
        summary: "Speaks any selection back to you.",
        access: "system",
      },
    ],
  },
  {
    name: "Safety & self",
    short: "Safety",
    tools: [
      {
        name: "confirm_gate",
        summary:
          "Stands in front of anything irreversible. Deterministic, not the model's call.",
        access: "system",
      },
      {
        name: "honesty_check",
        summary: "Catches claims of work that did not actually happen.",
        access: "system",
      },
      {
        name: "list_permissions",
        summary: "Reads back exactly what you have granted.",
        access: "reads",
      },
      {
        name: "connection_status",
        summary: "Says what is wired up right now, live.",
        access: "reads",
      },
      {
        name: "what_can_you_do",
        summary: "Answers from live state, never a canned list.",
        access: "reads",
      },
    ],
  },
];

/** A tool that knows where it sits — the spectrum addresses everything by index. */
export type IndexedTool = Tool & {
  index: number;
  group: string;
  groupShort: string;
  groupIndex: number;
};

export const TOOLS: IndexedTool[] = TOOL_GROUPS.flatMap((group, groupIndex) =>
  group.tools.map((tool) => ({
    ...tool,
    group: group.name,
    groupShort: group.short,
    groupIndex,
    index: 0,
  })),
).map((tool, index) => ({ ...tool, index }));

/** Where each group starts and ends, for the rail under the ticks. */
export const GROUP_SPANS = TOOL_GROUPS.map((group, i) => {
  const start = TOOLS.findIndex((t) => t.groupIndex === i);
  return { ...group, start, end: start + group.tools.length - 1 };
});

/**
 * Where the spectrum settles after its opening sweep. `send_mail` is the
 * exact middle of the fifty-nine — so the bell lands symmetrical — and it
 * is the one tool the gate exists for, which is the point worth making.
 */
export const HERO_TOOL = TOOLS.findIndex((t) => t.name === "send_mail");
