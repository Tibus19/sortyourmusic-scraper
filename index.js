const puppeteer = require('puppeteer-core');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/analyze', async (req, res) => {
  const playlistUrl = req.body.url;

  if (!playlistUrl) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser', // <-- CHEMIN EXPLICITE !
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
    res.status(500).json({ error: 'Erreur lors de l\'analyse de la playlist.' });
  }
});

app.get('/', (_, res) => {
  res.send('🎵 SortYourMusic Scraper API OK');
});

app.listen(PORT, () => {
  console.log(`Scraper API live sur le port ${PORT}`);
});
