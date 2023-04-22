import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config();


const AO3_LOGIN_URL = 'https://archiveofourown.org/users/login';
const USERNAME = process.env.AO3_USERNAME;
const PASSWORD = process.env.AO3_PASSWORD;

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

async function collectDataFromPage(page, url) {
  await page.goto(url);
  const body = await page.content();
  const $ = cheerio.load(body);

  // Iterate through the works and collect the data
  return $('ol.reading.work.index.group > li').map((_, work) => {
    const id = $(work).attr('id');
    const title = $(work).find('h4.heading a:first-child').text();
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
  
    const visitedText = $(work).find('h4.viewed').text().trim();
    const lastVisitedMatch = visitedText.match(/Last visited:\s*(\d+\s+\w+\s+\d+)/);
    const versionMatch = visitedText.match(/\((.+)\)/);
    const numVisitedMatch = visitedText.match(/Visited\s+(\d+)\s+times/);

    const lastVisited = lastVisitedMatch ? lastVisitedMatch[1] : '';
    const version = versionMatch ? versionMatch[1] : '';
    const numVisited = numVisitedMatch ? parseInt(numVisitedMatch[1]) : 0;
  
    return {
      id,
      title,
      author,
      fandoms: fandoms.join(', '),
      rating,
      category,
      status,
      dateUpdated,
      warnings: warnings.join(', '),
      relationships: relationships.join(', '),
      characters: characters.join(', '),
      freeforms: freeforms.join(', '),
      summary,
      words,
      chapters,
      kudos,
      hits,
      lastVisited,
      version,
      numVisited
    };
  }).get();
}


async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await authenticate(page);

  let currentPage = 1;
  let hasMorePages = true;
  let allData = [];

  while (hasMorePages) {
    const url = `https://archiveofourown.org/users/${USERNAME}/readings?page=${currentPage}`;
    const data = await collectDataFromPage(page, url);
    allData = allData.concat(data);

    // Check if there is a next page
    hasMorePages = await page.$('a[rel="next"]') !== null;

    currentPage++;
  }

  await browser.close();

  // Write data to an Excel file
  const worksheet = xlsx.utils.json_to_sheet(allData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
  xlsx.writeFile(workbook, 'collected_data.xlsx');
}

main();