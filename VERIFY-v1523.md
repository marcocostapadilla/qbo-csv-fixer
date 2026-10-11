# v1.5.23: free-limit sentence shown once

Files over 100 rows showed the limit twice: in the red banner at the top and in the note next to Download.

- old banner: "This file has 150 rows and the free version converts up to 100, so Download is off. Download a shorter date range from your bank and convert each part."
- old note: "Free tier limit: this file has 150 rows and the free version converts up to 100. Download a shorter date range from your bank and convert each part. Unlimited version coming soon."
- new: no banner. Note: "Free tier limit: this file has 150 rows and the free version converts up to 100, so Download is off. Download a shorter date range from your bank and convert each part. Unlimited version coming soon."

Nothing is lost: "so Download is off" moved into the note. Because the banner is gone, an over-limit file now scrolls to step 3 like any other file, so the note is on screen. app.js was split first (the sample button moved to samplebtn.mjs; app.js 10,129 -> about 9,200 bytes). Tests: verify-v1523.mjs, e2e v1523.spec.mjs.
