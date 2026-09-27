# Svara and Stillness website guide

## Uploading to GoDaddy (cPanel)

1. Log in to GoDaddy, open your hosting plan and choose **cPanel Admin**, then **File Manager**.
2. Open the `public_html` folder.
3. Upload everything in this folder **except** `SITE-GUIDE.md` and `svara_logo.jpeg`:
   `index.html`, `favicon.svg`, `.htaccess`, `robots.txt`, `sitemap.xml`, and the `css`, `js` and `images` folders.
   (`.htaccess` is a hidden file. In File Manager, open Settings and tick "Show hidden files" to see it.)
4. Make sure SSL is switched on for svaranstillness.com in GoDaddy, so the site loads on https.

## Replacing placeholders

| What | Where |
| --- | --- |
| Photos | Overwrite the files in `images/` using the same names. Portraits (`intro-bowl`, `facilitator`) look best around 960 x 1200. Session photos around 1200 x 900 (landscape). Instrument photos around 1200 x 800. Keep each under about 300 KB. |
| Enquiry form | Sign up free at web3forms.com with info@svaranstillness.com, then paste the access key into `index.html` where it says `YOUR_WEB3FORMS_ACCESS_KEY`. Until then, the form opens WhatsApp with the visitor's details filled in. |
| Facilitator name and story | "Your facilitator" section in `index.html` |
| Session types, durations, group sizes | "Sessions" section in `index.html` (also update the Session dropdown in the form) |
| Location | Last question in the FAQ |
| Reschedule policy | "Can I reschedule?" in the FAQ |

Every placeholder spot has a comment in `index.html` starting with "Replace" or "Update".

After changing `css/styles.css` or `js/main.js`, change `?v=1` to `?v=2` where they are linked in `index.html` so returning visitors get the new version.
