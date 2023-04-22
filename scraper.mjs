import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();


const AO3_LOGIN_URL = 'https://archiveofourown.org/users/login';
const USERNAME = process.env.AO3_USERNAME;
const PASSWORD = process.env.AO3_PASSWORD;

const HISTORY_URL = `https://archiveofourown.org/users/${USERNAME}/readings?page=1`;

async function authenticate(page) {
  await page.goto(AO3_LOGIN_URL);

  await page.type('#user_login', USERNAME);
  await page.type('#user_password', PASSWORD);

  const loginButtonSelector = 'input[type="submit"][value="Log in"]';
  await page.waitForSelector(loginButtonSelector, { visible: true, timeout: 60000 });
  await Promise.all([
    page.waitForNavigation(),
    page.click(loginButtonSelector),
  ]);

  const currentPageUrl = page.url();
  if (currentPageUrl !== AO3_LOGIN_URL) {
    console.log('Authenticated successfully.');
  } else {
    console.error('Authentication failed. Please check your credentials.');
  }
}


async function scrape() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await authenticate(page);
  await page.goto(HISTORY_URL);

  const body = await page.content();
  const $ = cheerio.load(body);


  // Iterate through the works and collect the data
  const data = $('ol.reading.work.index.group > li').map((_, work) => {
    const id = $(work).attr('id');
    const title = $(work).find('h4.heading a').text();
    const author = $(work).find('a[rel="author"]').text();
    const fandoms = $(work).find('h5.fandoms a').map((_, a) => $(a).text()).get();
  
    const rating = $(work).find('span.rating').attr('title');
    const category = $(work).find('span.category').attr('title');
    const status = $(work).find('span.iswip').attr('title');
    const dateUpdated = $(work).find('p.datetime').text();
  
    const warnings = $(work).find('li.warnings a').map((_, a) => $(a).text()).get();
    const relationships = $(work).find('li.relationships a').map((_, a) => $(a).text()).get();
    const characters = $(work).find('li.characters a').map((_, a) => $(a).text()).get();
    const freeforms = $(work).find('li.freeforms a').map((_, a) => $(a).text()).get();
  
    const summary = $(work).find('blockquote.summary').text().trim();
  
    const stats = $(work).find('dl.stats');
    const words = stats.find('dd.words').text();
    const chapters = stats.find('dd.chapters').text();
    const kudos = stats.find('dd.kudos').text();
    const hits = stats.find('dd.hits').text();
  
    const visited = $(work).find('h4.viewed').text();
  
    return {
      id,
      title,
      author,
      fandoms,
      rating,
      category,
      status,
      dateUpdated,
      warnings,
      relationships,
      characters,
      freeforms,
      summary,
      words,
      chapters,
      kudos,
      hits,
      visited
    };
  }).get();
  
  console.log(data);
  

  await browser.close();
}

scrape();


/*
const rating = $('dd.rating').text().trim();
  const fandoms = $('dd.fandom a').map((_, el) => $(el).text()).get();
  const relationship = $('dd.relationship a').map((_, el) => $(el).text()).get();
  const character = $('dd.character a').map((_, el) => $(el).text()).get();
  const additionalTags = $('dd.freeform a').map((_, el) => $(el).text()).get();

  const published = $('dd.published').text().trim();
  const words = $('dd.words').text().trim();
  const chapters = $('dd.chapters').text().trim();

  const title = $('h2.title.heading').text().trim();
  const author = $('h3.byline a[rel="author"]').text().trim();
  const summary = $('blockquote.userstuff:first').text().trim();

  const data = {
    rating,
    fandoms,
    relationship,
    character,
    additionalTags,
    stats: {
      published,
      words,
      chapters,
    },
    title,
    author,
    summary,
  };

  console.log(data); //add return value once this starts working
*/