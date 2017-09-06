const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const util = require('./util');

const logger = require('log4js').getLogger('leave');
logger.level = 'debug';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.goto('https://www.google.com/');
    await page.waitForNavigation({waitUntil: 'networkidle'});

    await util.screenshot(page, logger);

    const page2 = await browser.newPage();
    await page2.goto('https://www.baidu.com/');
    await page2.waitForNavigation({waitUntil: 'networkidle'});

    await util.screenshot(page2, logger);

    console.log(browser)

    browser.close();
})();