const https = require("https");
https.get("https://www.thecollegeexpo.org/", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    const match = data.match(/<img[^>]+src="([^">]+logo[^">]*)"/i);
    if (match) console.log("LOGO1=", match[1]);
    
    // just output all images if logo not found
    const matches = data.match(/<img[^>]+src="([^">]+)"/ig);
    if (matches) console.log("ALL:", matches.slice(0, 10));
  });
}).on("error", console.error);
