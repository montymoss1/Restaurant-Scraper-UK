const Apify = require('apify');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { city = 'London', maxRestaurants = 20 } = input;

    const url = `https://www.yelp.co.uk/search?cflt=restaurants&find_loc=${encodeURIComponent(city)}`;

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url });

    const restaurantData = [];

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        maxRequestsPerCrawl: 1, // Scrape only the first page, increase for pagination
        handlePageFunction: async ({ page, request }) => {
            await page.waitForSelector('.container__09f24__21w3G'); // Main listings container

            const restaurants = await page.$$eval('.container__09f24__21w3G', elements =>
                elements.map(el => {
                    const name = el.querySelector('a.css-19v1rkv')?.innerText || '';
                    const link = el.querySelector('a.css-19v1rkv')?.href || '';
                    const rating = el.querySelector('[aria-label*="star rating"]')?.ariaLabel || '';
                    const address = el.querySelector('address')?.innerText || '';
                    return { name, link, rating, address };
                })
            );

            restaurantData.push(...restaurants.slice(0, maxRestaurants));
        },
    });

    await crawler.run();

    await Apify.pushData(restaurantData);
    console.log(`Scraped ${restaurantData.length} restaurants in ${city}.`);
});