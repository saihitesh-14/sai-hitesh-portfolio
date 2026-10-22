# Sai Hitesh Bommagani — personal portfolio

A standalone, local portfolio for full-time AI engineering roles. Includes four detailed client case studies, four public projects with repository links, a compact chronological timeline, Hack Arizona leadership, résumé download, and an original scroll-controlled silver sculpture.

## Run locally

Double-click `start.command`, or run from this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173. Keep the terminal open. Stop with Control-C. JavaScript modules require this local server rather than opening index.html directly.

There are no package installs or build steps. Fonts, graphics, code, and the résumé are local. The site makes no external requests during use; GitHub, LinkedIn, and email open only when their links are selected. Nothing has been published or deployed.

## Files

- `index.html`: portfolio content and accessible navigation.
- `styles.css`: responsive styling and self-hosted typography.
- `app.js`: hero motion loop (intro, idle turn, scroll, pointer, drag to spin), project dialogs, and email copy.
- `cursor.js`: custom cursor, magnetic controls, and tilting, spotlit panels for mouse and trackpad users.
- `theme.js`: light and dark themes, the header toggle, and the circular theme reveal.
- `sculpture.js`: original native WebGL sculpture (draw-on intro, light and dark chrome studios, cursor swell) with static SVG fallback.
- `interactions.js`: finite workflow animations, manual steps, replay, section entrances, count-ups, and timeline progress.
- `PROJECT-SOURCES.md`: verified project links and content provenance.
- `motion-utils.mjs`: bounded scroll progress, easing, and frame-rate independent smoothing.
- `cases.js`: case study content used by the interactive dialogs.
- `case-studies.html`: complete static case studies for use without JavaScript.
- `assets/sai-hitesh-resume.pdf`: the supplied résumé.

If changing project copy, update both `cases.js` and `case-studies.html`. The fallback page intentionally contains the full text without JavaScript.

## Motion and accessibility

On load the headline rises line by line and the sculpture draws itself in along its length. It then turns slowly about its own axis, leans toward a mouse pointer, and rotates further as the hero scrolls away; it only renders while the hero is on screen and the tab is visible. Sections fade and rise into place as they enter, cascading when several arrive together; this hidden state is applied only after an inline script confirms JavaScript, and is lifted after three seconds if the scripts fail to load. Client workflow diagrams play one finite sequence when first seen (about four seconds): a packet travels the connector, and each node activates as it arrives. Replay and manual step controls remain.

With a mouse or trackpad, a trailing ring replaces the system cursor: it grows over links, wraps and pulls magnetic buttons toward the pointer, labels a few targets ("Drag", "Read", "Open"), and a soft glow follows it. Workflow panels and the project screenshot tilt toward the pointer under a spotlight. The sculpture swells where the pointer passes over it, and can be dragged or flicked to spin; it coasts, then settles back at rest. Touch devices, paused motion, and reduced motion keep the system cursor and none of these effects. The system cursor also returns while a case study dialog is open.

The theme toggle in the header switches between light and dark, revealing the new theme in a circle from the button where the browser supports view transitions. The choice is saved in local storage; until a visitor chooses, the page follows the system setting, including without JavaScript. An inline script applies the theme before first paint, so there is no flash. Colours are tokens at the top of `styles.css`. Visible descriptions always match the selected stage; automatic playback mutes live announcements. Pause motion stops the sculpture (showing it complete and still), the scroll-linked turn, and interface animations. System reduced-motion settings begin with a static page with all content visible. Native project dialogs support Escape and return keyboard focus to the opening link. If WebGL is unavailable, a local static silver graphic is shown. Full case studies remain available without JavaScript.

## Higgsfield status

Higgsfield was requested for media generation. Seedance 2.5 was blocked by a Plus-plan requirement; Kling 3.0 and the GPT Image fallback were blocked by a Basic-plan requirement. No jobs or media were created. This local version uses an original procedural animation, not a Higgsfield-generated asset. It has no watermark or platform branding.

## Content and credits

Professional details come from the supplied résumé and portfolio PDF, with public project metadata checked through GitHub. The user confirmed using the résumé’s approximately $2K/year modeled pipeline figure instead of the portfolio’s revenue estimate. Summer 2026 roles are identified as concurrent. McGraw Hill is described as a production-ready proof of concept; Brain Bridge's approximately $2K annual pipeline figure is explicitly modeled; graduation is expected in May 2027.

General Sans is by Indian Type Foundry and distributed through Fontshare: https://www.fontshare.com/fonts/general-sans. Font files are self-hosted. Sculptural geometry, interface diagrams, and favicon are original code-native artwork; project diagrams are explanatory sketches, not client screenshots.

## Revision checks

Reviewed using the user’s OpenClaw design-taste and web-animation skills. Browser checks cover widths from 320px to 1879px, short desktop windows, shared container alignment, workflow step/replay behavior, global motion pause, reduced motion, keyboard dialog operation, clipboard, PDF download, and JavaScript/WebGL fallbacks. No runtime external requests or JavaScript errors were found.
