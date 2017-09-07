const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const util = require('./util');
const oktaCookies = require('../okta-cookies.json');
const timecardCookies = require('../timecard-cookies.json');

const logger = require('log4js').getLogger('timecard');
logger.level = 'debug';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const oktaPage = await browser.newPage();

    await util.setCookies(oktaPage, oktaCookies);

    await oktaPage.goto('https://thoughtworks.okta.com/app/UserHome');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(oktaPage, logger);

    const timecardPage = await browser.newPage();

    await util.setCookies(timecardPage, timecardCookies);
    await timecardPage.goto('https://thoughtworks.my.salesforce.com/home/home.jsp');
    await timecardPage.waitForNavigation({waitUntil: 'networkidle'});


    await timecardPage.waitForSelector('.wt-Timecard_Header a');
    await (await timecardPage.$('.wt-Timecard_Header a')).click();
    
    await oktaPage.waitFor(10 * 1000);
    await timecardPage.waitForSelector('#actionForm');
    await util.screenshot(timecardPage, logger);

    // await util.saveCookies(oktaPage, logger, 'okta-cookies');
    // await util.saveCookies(timecardCookies, logger, 'timecard-cookies');

    browser.close();
})();