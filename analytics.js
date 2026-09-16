/* ===========================================================================
   GOOGLE ANALYTICS 4
   ---------------------------------------------------------------------------
   HOW TO TURN THIS ON (free, ~5 minutes, one-time):

     1. Go to  https://analytics.google.com  and sign in with your Google account.
     2. Click  Admin (gear, bottom-left)  ->  Create  ->  Property.
        - Property name: "Mingjue Liu Portfolio"
        - Pick your time zone (Netherlands) and currency, then Next.
        - Answer the business questions (size: small, objective: "Examine user
          behaviour") — none of it affects tracking.
     3. When it asks to choose a platform, pick  Web.
        - Website URL: your live domain (e.g. mingjueliu.com)
        - Stream name: "Portfolio"
        - Click Create stream.
     4. You'll land on a page showing a  MEASUREMENT ID  that looks like  G-ABC123XYZ.
        Copy it.
     5. Paste it between the quotes on the GA_ID line below, save, and re-deploy.

   That's the whole setup. Data starts appearing in GA within a few minutes
   (Reports -> Realtime is the fastest way to confirm it's working).

   Note: visits from localhost are deliberately ignored, so your own testing
   doesn't pollute the numbers.
   =========================================================================== */

var GA_ID = "";            // <-- paste your G-XXXXXXXXXX measurement ID here

(function () {
  if (!GA_ID || GA_ID.indexOf("G-") !== 0) return;          // not configured yet
  var h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "") return;  // skip local dev

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID);
})();
