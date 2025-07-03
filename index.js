const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');
const app = express();

// PATCH Railway/Render : parser JSON même si Content-Type incorrect
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    try {
      req.body = data ? JSON.parse(data) : {};
    } catch (e) {
      req.body = {};
    }
    next();
  });
});
app.use(cors());

const PORT = process.env.PORT || 3000;

app.post('/analyze', async (req, res) => {
  console.log('BODY RECU:', req.body);
  const playlistUrl = req.body.url;

  if (!playlistUrl) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const sortUrl = `https://sortyourmusic.playlistmachinery.com/?playlist=${encodeURIComponent(playlistUrl)}`;
    await page.goto(sortUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table#songs');
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table#songs tr')).slice(1);
      const headers = Array.from(document.querySelectorAll('table#songs thead th')).map(h => h.innerText.trim());
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const values = cells.map(cell => cell.innerText.trim());
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
      });
    });
    await browser.close();
    res.json(data);
  } catch (err) {
    console.error('Erreur analyse SortYourMusic:', err);
    res.status(500).json({ error: "Erreur lors de l'analyse de la playlist.", details: String(err) });
  }
});

app.get('/', (_, res) => {
  res.send('🎵 SortYourMusic Scraper API OK');
});

app.listen(PORT, () => {
  console.log(`Scraper API live sur le port ${PORT}`);
});
