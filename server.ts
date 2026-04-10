import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/search-tabelog", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    try {
      const response = await fetch('https://tabelog.com/rstLst/?sw=' + encodeURIComponent(query), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        }
      });
      const html = await response.text();
      
      const regex = /class="list-rst__rst-name-target[^>]+href="(https:\/\/tabelog\.com\/[^/]+\/A\d+\/A\d+\/\d+\/?)"/;
      const match = regex.exec(html);
      
      if (match) {
        res.json({ url: match[1] });
      } else {
        res.json({ url: null });
      }
    } catch (error) {
      console.error("Error fetching Tabelog:", error);
      res.status(500).json({ error: "Failed to fetch Tabelog" });
    }
  });

  app.get("/api/scrape-tabelog", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      // Fetch Japanese page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        }
      });
      const html = await response.text();
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      const name = $('.display-name').text().trim() || $('h2 span').first().text().trim();
      const scoreText = $('.rdheader-rating__score-val-dtl').text().trim();
      const score = parseFloat(scoreText) || 0;
      const address = $('.rstinfo-table__address').text().replace(/\s+/g, ' ').trim();
      
      let genre = '';
      const storeInfo: Record<string, string> = {};
      $('.rstinfo-table tr').each((i, el) => {
        const th = $(el).find('th').text().trim();
        const td = $(el).find('td').text().replace(/\s+/g, ' ').trim();
        if (th && td) {
          storeInfo[th] = td;
          if (th.includes('ジャンル')) {
            genre = td;
          }
        }
      });

      const businessHours = storeInfo['営業時間'] || '';

      const awards: string[] = [];
      let hyakumeiten = false;
      $('img').each((i, el) => {
        const alt = $(el).attr('alt') || '';
        const src = $(el).attr('src') || '';
        if (alt.includes('The Tabelog Award') || alt.includes('百名店') || src.includes('award') || src.includes('hyakumeiten')) {
          const awardName = alt || (src.includes('hyakumeiten') ? '百名店' : 'The Tabelog Award');
          if (!awards.includes(awardName)) awards.push(awardName);
          if (awardName.includes('百名店') || src.includes('hyakumeiten')) hyakumeiten = true;
        }
      });
      if (!hyakumeiten && $('body').text().includes('百名店')) {
        hyakumeiten = true;
        awards.push('百名店');
      }

      let lat = 0, lng = 0;
      const photos: string[] = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html() || '{}');
          if (data['@type'] === 'Restaurant') {
            if (data.geo) {
              lat = parseFloat(data.geo.latitude) || 0;
              lng = parseFloat(data.geo.longitude) || 0;
            }
            if (data.image && !photos.includes(data.image)) {
              photos.push(data.image);
            }
          }
        } catch (e) {}
      });
      $('meta[property="og:image"]').each((i, el) => {
        const src = $(el).attr('content');
        if (src && !photos.includes(src)) photos.push(src);
      });

      const description = $('.pr-comment-title').text().trim() || $('.pr-comment-wrap').text().trim() || $('meta[property="og:description"]').attr('content') || '';

      // Fetch TW page for Chinese name
      let nameTw = '';
      try {
        const twUrl = url.replace('tabelog.com/', 'tabelog.com/tw/');
        const twResponse = await fetch(twUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        if (twResponse.ok) {
          const twHtml = await twResponse.text();
          const $tw = cheerio.load(twHtml);
          nameTw = $tw('.rd-header__rst-name-main').text().trim() || $tw('h2').first().text().trim();
        }
      } catch (e) {
        console.error("Failed to fetch TW name", e);
      }

      res.json({
        name,
        nameTw,
        score,
        address,
        genre,
        awards,
        hyakumeiten,
        lat,
        lng,
        businessHours,
        photos,
        description,
        storeInfo
      });

    } catch (error) {
      console.error("Error scraping Tabelog:", error);
      res.status(500).json({ error: "Failed to scrape Tabelog" });
    }
  });

  app.get("/api/fetch-url", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        }
      });
      const html = await response.text();
      res.json({ html });
    } catch (error) {
      console.error("Error fetching URL:", error);
      res.status(500).json({ error: "Failed to fetch URL" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
