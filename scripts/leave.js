const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const util = require('./util');
const oktaCookies = require('../okta-cookies.json');
const leaveCookies = require('../leave-cookies.json');

const logger = require('log4js').getLogger('leave');
logger.level = 'debug';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const oktaPage = await browser.newPage();

    await util.setCookies(oktaPage, oktaCookies);

    await oktaPage.goto('https://thoughtworks.okta.com/app/UserHome');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(oktaPage, logger);

    const leavePage = await browser.newPage();

    await util.setCookies(leavePage, leaveCookies)
    await leavePage.goto('https://china-leave.herokuapp.com/leave_details/new');
    await leavePage.waitForNavigation({waitUntil: 'networkidle'});
    await leavePage.waitForSelector('.row-center-width > div:nth-child(3) a');
    await (await leavePage.$('.row-center-width > div:nth-child(3) a')).click();

    await leavePage.waitForSelector('table.bordered');
    await leavePage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(leavePage, logger);

    await util.saveCookies(oktaPage, logger, 'okta-cookies');
    await util.saveCookies(leavePage, logger, 'leave-cookies');

    browser.close();
})();