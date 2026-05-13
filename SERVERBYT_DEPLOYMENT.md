# Serverbyt Static Hosting Deployment Guide

This app is static and does not require Node.js, Python, PHP, or a backend.

## Required Files

Upload these three files:

```text
index.html
styles.css
app.js
```

Optional files for documentation:

```text
README.md
LOOM_WALKTHROUGH_SCRIPT.md
SKIP_APPLICATION_ANSWERS.md
```

## Upload Location

Upload the required files to your public web root. Common folder names include:

```text
public_html
htdocs
www
public
```

## Subfolder Option

If you do not want the app on your main homepage, create a folder such as:

```text
smallbiz-ai
```

Then upload the files there.

Your demo URL would become:

```text
https://yourdomain.com/smallbiz-ai/
```

## Test Checklist

After upload:

- Open the live link.
- Confirm the landing page loads.
- Click a sample business profile.
- Click Generate Readiness Report.
- Confirm dashboard chart loads.
- Confirm Business Owner Action Center appears.
- Confirm Funding Readiness section appears.
- Confirm Final Small Business Growth Toolkit appears.
- Test Print / Save as PDF.
- Test Download Text Report.
- Test Application Answer Builder.
- Test Business Profile Builder.

## Important Note About Chart.js

The app loads Chart.js from:

```text
https://cdn.jsdelivr.net/npm/chart.js
```

If the chart does not display, your hosting environment or browser may be blocking the CDN. The app still works, but the chart visual may not render. To fix this, download Chart.js and host it locally.
