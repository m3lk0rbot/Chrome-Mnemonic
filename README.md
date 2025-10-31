# Chrome Mnemonic — AI-Powered Memory Assistant

Short description

Chrome Mnemonic transforms your browsing history into a private, semantic memory assistant. It clusters related pages into research sessions, generates concise summaries, enables natural-language conversational search over your history, and assists writing by surfacing sources and suggested rewrites — all with client-side, privacy-first AI where available.

Repository contents

- `manifest.json` — Chrome Extension (Manifest V3) metadata
- `background.js`, `content-script.js`, `popup.js`, `popup-new.js`, `popup-old.js` — extension entry points and UI
- `services/` — core services including `ai-service.js`, `history-service.js`, and others that orchestrate AI and history indexing
- `features/` — feature implementations (clustering, conversation, summarization wiring)
- `tests/` — Jest unit tests and test fixtures
- `testing.md` — instructions for running automated and manual tests (see below)
- `installation.md` — installation and manual load instructions for Chrome on Windows
- `CONTRIBUTING.md`, `LICENSE`, `submission.md`

What this submission includes (hackathon requirements)

- Application built with required developer tools: Chrome Extension MV3 + Node.js dev scripts
- Text description of features, functionality, and the problem being solved (this README + `chrome-mnemonic-enhanced.md`)
- Clear mapping of official built-in Chrome AI APIs used and code locations (see section below)
- Public open-source repository with an MIT license (`LICENSE` present)

Problem being solved

Modern browser history is a passive list of titles and URLs. Users often cannot rediscover pages by concept, session, or intent — they remember "what they learned" rather than where they saw it. Chrome Mnemonic addresses this by turning history into searchable, summarized, and connected knowledge so users can quickly resume work, find sources, and recover context.

Key features (user-facing)

- **Multiple AI Modes**: Choose between Chrome AI (on-device, private) or Gemini API (cloud-based, powerful)
- **Semantic/conversational search** over history using natural-language queries
- **Automatic clustering** of related pages into "Research Sessions"
- **AI-generated session summaries** and highlights
- **Smart revisit notifications** that alert you when returning to previously visited pages
- **AI-powered conversation interface** for natural language interactions about your browsing history
- **Multimodal analysis** with image analysis capabilities (screenshot-based)
- **Right-click writing assistance** that suggests rewrites and citations from your own history
- **Export/share** of session reports (Markdown/PDF)
- **Privacy-first**: Processing prefers client-side built-in APIs and local indexing; fallbacks avoid sending personal data to servers

Which official built-in AI APIs are used and where (concrete integration points)

The hackathon requires use of the built-in client-side APIs (Prompt, Summarizer, Writer/Rewriter, Translator, Proofreader). This project integrates them as follows:

- **Prompt API** — used by the conversational interface to orchestrate multi-turn prompts and maintain context. Also supports multimodal input (text + images) for screenshot analysis. See: `features/conversation.js` and `services/ai-service.js`.
- **LanguageModel API** — used for natural language processing, conversational AI, and semantic understanding across all features. See: `services/ai-service.js` and `history-page.js`.
- **Summarizer API** — used to create concise summaries for individual pages and aggregated sessions. See: `features/clustering.js` and `services/ai-service.js` (calls to Summarizer via `withAISession`).
- **Writer / Rewriter APIs** — used to refine generated text and improve human-facing summaries. See: `services/ai-service.js` (`refineSummary`).
- **Proofreader API** — used for content quality checks and feedback in the writing assistant flows. See: `services/ai-service.js` (`analyzeContentQuality`).
- **Translator API** — used for language detection and optional translation when indexing or summarizing multi-lingual content. See: `services/ai-service.js` (`detectLanguage`, `translateContent`).

**Note**: The extension also supports a hybrid AI approach, allowing users to choose between Chrome's built-in on-device AI (free, private) or Google's Gemini API (cloud-based, requires API key) for enhanced capabilities. See: `services/hybrid-ai-service.js`.

Implementation notes

- `services/ai-service.js` contains the main orchestration code: availability checks, session management, `withAISession` wrapper, and specific helpers for rewrite, proofread, translate, and summarize flows.
- `services/hybrid-ai-service.js` implements a hybrid AI system that seamlessly switches between Chrome's built-in AI APIs and Google's Gemini API based on user preference and availability.
- `features/clustering.js` implements session clustering and calls the Summarizer for session-level summaries.
- `features/conversation.js` handles the AI chat interface with support for multimodal inputs (text and screenshots).
- `background.js` implements the revisit notification system that detects page revisits and shows contextual toasts.
- Local indexing and semantic search are implemented in `services/history-service.js`; this repo uses a compact local approach and prunes indexes to respect profile storage limits.
- The code includes robust API-availability checks and graceful fallbacks when a Chrome build lacks a specific API surface. See `AIService.checkAIAvailability()`.

Testing and verification

Automated tests
- The project uses Jest for unit testing. Tests live in `tests/` and are configured in `package.json`.
- The test harness mocks AI responses for deterministic behavior. See `tests/setup.js` for mocks and fixtures.

Manual verification
- Follow `installation.md` to load the extension and then run the manual feature checklist in `testing.md`.

How to run tests (quick)

1. Install dependencies:

```powershell
npm install
```

2. Run the test suite:

```powershell
npm test
```

Development notes and constraints

- AI availability: Some built-in APIs are surfaced only on certain Chrome channels (Beta/Canary) or device builds. The extension reports which APIs are available during runtime; all flows are designed to degrade gracefully when an API is absent.
- Privacy: The project prioritizes on-device processing. No personal history data is transmitted off-device by default.

Originality statement

This project is new and developed for the 2025 Google Chrome Built-in AI Challenge. It does not reuse prior hackathon submissions or concepts and is original for this year's event.

License and repository

This project is released under the MIT License. See `LICENSE` for details.

Repository URL (replace before submission):
https://github.com/yourusername/chrome-mnemonic

---

## Notification Popup Feature

### Current Features

The extension includes a smart **revisit notification system** that enhances user awareness of their browsing patterns:

#### Revisit Notifications (Chrome Canary)
- **Background Detection**: Automatically detects when users revisit pages they've visited before
- **Visit Tracking**: Shows visit count and displays a list of the latest 5 visit timestamps
- **Non-Intrusive Toast**: Displays an elegant toast notification in the bottom-right corner without opening the extension
- **Persistent Display**: Toast remains visible until explicitly closed or muted by the user
- **Page-Level Muting**: Users can mute notifications for specific pages while keeping notifications active for other sites
- **Detailed Visit History**: Displays formatted timestamps (date and time) for each visit in an easy-to-read list format
- **URL Context**: Shows the exact page URL being revisited for context

#### Current AI Integration
The notification system currently uses:
- **History Analysis**: Leverages Chrome's history API to track and analyze page visits
- **URL Normalization**: Intelligently matches pages by ignoring query parameters, hash fragments, and trailing slashes
- **Pattern Recognition**: Identifies revisit patterns without requiring AI processing

**Implementation**: See `background.js` for the revisit notification logic using `chrome.webNavigation` and `chrome.history` APIs.

### Future Enhancements (Post-Hackathon)

After the hackathon, we plan to enhance the notification system with advanced Chrome AI API capabilities:

#### Enhanced AI-Powered Notifications
- **Detailed Summaries**: Use Chrome AI API (Summarizer, LanguageModel) to generate intelligent summaries of what changed on the page since the last visit
- **Contextual Insights**: AI-generated insights about why a page might be relevant again (e.g., "This article had updates about Chrome AI APIs")
- **Smart Search Integration**: Leverage Chrome AI APIs to extract and compare search queries across different sites, identifying patterns in user research
- **Conversational Notifications**: Allow users to interact with notifications through AI chat, asking questions like "What's new on this page?" or "Why is this relevant to me now?"
- **Semantic Matching**: Use Chrome AI to understand related content across different domains, suggesting related pages that might be of interest
- **Proactive Suggestions**: AI-powered recommendations for continuing research or revisiting related topics based on browsing patterns
- **Multimodal Analysis**: Use Prompt API with multimodal input to analyze page screenshots and provide visual summaries of changes

These enhancements will transform notifications from simple visit trackers into intelligent context-aware assistants that help users stay on top of their browsing activities.