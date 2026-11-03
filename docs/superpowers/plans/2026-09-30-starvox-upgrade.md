# StarVox Upgrade Implementation Plan

**Goal:** Complete the existing local companion application across desktop and mobile while preserving legacy data.

**Architecture:** Reuse ChatPage as a responsive shell, keep request and memory processing in shared libraries, and provide an encrypted versioned conversation repository through storage.js. Browser media features are isolated from chat and degrade with explicit availability messages.

**Tech Stack:** React 18, Vite 6, Capacitor 8, localStorage, Web Speech APIs, existing noble encryption and local embeddings.

**Spec:** ../specs/2026-09-30-starvox-upgrade-design.md

## Global constraints

- No real browser data or API keys in tests. No paid requests. No publishing.
- Preserve existing functions and legacy backup imports. No silent history truncation.
- Source backup created before changes. Project has no Git repository, so do not invent a Git history.
- Each work unit owns distinct files; root integrates and reviews the final result.

## Task 1: Core request and memory correctness

Files: src/lib/turn.js, deepseek.js, memory.js, embed.js; tests/core.test.*.

- [x] Separate prior history from the current pending pair. Add current multimodal content exactly once.
- [x] Make every turn settle once on success, failure, timeout and user cancellation, and ignore late chunks.
- [x] Capture memory scope and cancellation generations in queued tasks; drain sequentially and preserve failed state for retry.
- [x] Keep sensitivity on summaries and stable source identifiers; filter source passages before prompt assembly.
- [x] Run synthetic regressions for duplicate input, immediate abort, late network data, cross-scope extraction and deleted memory reappearing.

## Task 2: Storage and backup reliability

Files: src/lib/storage.js, crypto.js; src/components/BackupModal.jsx; tests/storage.test.*.

- [x] Provide listConversations(), createConversation(session, title), activateConversation(id, fallback), renameConversation(id, title), deleteConversation(id), preserving saveSessionSafe() / loadSession() contracts.
- [x] Session records carry id, title, createdAt and updatedAt. All conversations participate in encryption and full backup.
- [x] Refuse writes while locked and roll back failed crypto/restore transactions. Parsing backups must not change runtime scope.
- [x] Add backup preview, explicit restore confirmation, and accurate restore failures.
- [x] Verify legacy migration, quota failures, scope isolation, encryption round trips and multiple conversation backups using synthetic data.

## Task 3: Shared responsive interface

Files: src/App.jsx, src/components/SetupGate.jsx, src/lib/markdown.jsx, src/styles/tokens.css, src/styles/global.css and new upgrade.css.

- [x] Use ChatPage on all widths without unmounting when crossing a breakpoint. Root supplies the sidebar drawer controls.
- [x] Bind connection tests to a stable config snapshot, cancel on exit and remove delayed redirects.
- [x] Correct Markdown literal text escaping, code rendering and safe links.
- [x] Add responsive drawer, conversation controls, message action and composer styles, keyboard focus, reduced motion and readable contrast.
- [x] Verify narrow tablet and 390px phone, plus desktop.

## Task 4: Conversations, messages and media

Files: src/components/ChatPage.jsx and new ConversationPanel.jsx, ComposerTools.jsx, src/lib/media.js.

- [x] Wire storage repository into conversation selection, title editing and search; preserve a draft per conversation.
- [x] Add copy, star, text export, branch edit/regenerate/retry, with source conversation retained.
- [x] Guard all callbacks by request identity, cancel on state transitions and teardown, and avoid applying emotion twice.
- [x] Add image preview, compression and multimodal request construction; preserve attachment metadata in backups.
- [x] Add speech input/reading, availability feedback and immediate speech cancellation; provide optional avatar image.
- [x] Follow output only when near the bottom; provide jump-to-latest and search results.

## Task 5: Integration and delivery

- [x] Run all meaningful regression tests and production build.
- [x] Use an isolated browser origin with synthetic requests to verify daily flows, backup and responsive UI.
- [x] Synchronize Capacitor resources and assess installed Android build tools without installing toolchains.
- [x] Update README, startup script and truthful roadmap. Record completed features and external limitations in a user-facing upgrade report.
