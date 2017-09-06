const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const util = require('./util');

const logger = require('log4js').getLogger('login');
logger.level = 'debug';


(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.goto('https://www.google.com/');

})();