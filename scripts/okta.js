const puppeteer = require('puppeteer');
const util = require('./util');
const account = require('../account.json');

const logger = require('log4js').getLogger('okta');
logger.level = 'debug';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const oktaPage = await browser.newPage();
    await util.setRequestInterception(oktaPage, logger, 'png|jpg|ico');

    await oktaPage.goto('https://thoughtworks.okta.com/');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    // Input username
    await oktaPage.focus('#okta-signin-username');
    await oktaPage.type(account.username);
    // Input password
    await oktaPage.focus('#okta-signin-password');
    await oktaPage.type(account.password);
    // Clicked remember checkbox
    await (await oktaPage.$('#input41')).click();
    await util.screenshot(oktaPage, logger);
    // Clicked login button
    await (await oktaPage.$('#okta-signin-submit')).click();
    // Waiting verify button
    await oktaPage.waitForSelector('.button-primary[type=submit]');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    // Refresh sms-code.txt
    await util.initSmsCode();
    // Send SMS code
    await (await oktaPage.$('.sms-request-button')).click();
    // Fetch SMS Code from sms-code.txt
    const smsCode = await util.fetchSmsCode(oktaPage, logger, 0);
    // Input SMS code
    await oktaPage.focus('#input71');
    await oktaPage.type(smsCode);
    // Do not challenge me on this device again Checkbox
    await (await oktaPage.$('#input78')).click();

    await util.screenshot(oktaPage, logger);
    // Click verify button
    await (await oktaPage.$('.button-primary[type=submit]')).click();

    await oktaPage.waitForSelector('.applink-autocomplete');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});

    // Leave China link
    await oktaPage.waitForSelector('a[data-se=app-button-0oa17bb8zbwv67C810h8]');
    await util.screenshot(oktaPage, logger);
    // Click Leave China Link
    await (await oktaPage.$('a[data-se=app-button-0oa17bb8zbwv67C810h8]')).click();
    // Timecard link
    await oktaPage.waitForSelector('a[data-se=app-button-0oag3qwdj7CTZRQVGUKO]');
    const timecardHref = await oktaPage.$eval('a[data-se=app-button-0oag3qwdj7CTZRQVGUKO]', ele => ele.href);
    // Click Timecard Link
    await (await oktaPage.$('a[data-se=app-button-0oag3qwdj7CTZRQVGUKO]')).click();

    // Wait Leave China & Timecard login
    await oktaPage.waitFor(10 * 1000);

    // Open a new page of Leave China
    const leavePage = await browser.newPage();
    await util.setRequestInterception(leavePage, logger, 'png|jpg|ico');

    await leavePage.goto('https://china-leave.herokuapp.com/');
    await leavePage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(leavePage, logger);

    // Open a new page of Timecard Link
    const timecardPage = await browser.newPage();
    await util.setRequestInterception(timecardPage, logger, 'png|jpg|ico');

    await timecardPage.goto(timecardHref);
    await timecardPage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(timecardPage, logger);

    await util.saveCookies(oktaPage, logger, 'okta-cookies');
    await util.saveCookies(leavePage, logger, 'leave-cookies');
    await util.saveCookies(timecardPage, logger, 'timecard-cookies');

    browser.close();
})();