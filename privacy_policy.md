# Privacy Policy for Meeting Bot Connector

**Last Updated:** February 7, 2026

The "Meeting Bot Connector" Chrome Extension is designed to facilitate the connection of Convrse AI notetakers to your Google Meet sessions. Your privacy is paramount. This policy outlines exactly what data we handle and how.

## 1. No Audio or Video Recording
**We do NOT record audio or video.**
The extension itself does not capture media streams, record audio, or save video from your meetings. The Convrse AI bot (which joins separately as a participant) handles recording only after you explicitly invite it. This extension acts solely as a control panel to initiate that invitation.

## 2. Information Collection and Usage

### Meeting Metadata
We access the following metadata only when you are on a Google Meet page (`meet.google.com`):
*   **Meeting URL/ID**: To identify which meeting you are currently in so the bot can join the correct session.
*   **DOM Access**: Used strictly to inject the extension's control panel into the Google Meet interface. We do not scrape chat logs, participant lists, or other meeting content.

### Authentication Data
*   **User Credentials**: When you log in, your credentials (email/password) are sent directly to the Convrse API (`https://api.floorselector.convrse.ai/`) via secure HTTPS. We do not store your password.
*   **Tokens**: Upon successful login, an authentication token is stored locally on your device using `chrome.storage.local`. This allows you to stay logged in between sessions. This token is never shared with third parties.

## 3. Data Transmission
Data is sent exclusively to Convrse API endpoints:
*   `https://api.floorselector.convrse.ai/`
*   `https://notetaker.convrse.ai/*`

We verify your identity and send the command to join the bot to your specific meeting ID. No other data is transmitted.

## 4. No Analytics or Tracking
**We do NOT use any third-party analytics or tracking tools.**
We do not track your browsing history outside of Google Meet. We do not use Google Analytics, Mixpanel, or any other trackers in this extension. All UI assets, including fonts, are bundled locally within the extension to prevent external data requests.

## 5. Explicit User Action
The extension only takes action (joining a bot) when you explicitly click the "Connect" button. It does not perform background actions without your consent.

## 6. Contact
If you have questions about this policy or the extension's behavior, please contact the Convrse support team.
