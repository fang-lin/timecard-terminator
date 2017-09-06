const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const util = require('./util');
const account = require('../account.json');

const logger = require('log4js').getLogger('login');
logger.level = 'debug';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const oktaPage = await browser.newPage();

    await oktaPage.goto('https://thoughtworks.okta.com/');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});

    await oktaPage.focus('#okta-signin-username');
    await oktaPage.type(account.username);
    await oktaPage.focus('#okta-signin-password');
    await oktaPage.type(account.password);
    await (await oktaPage.$('#input41')).click();
    await util.screenshot(oktaPage, logger);
    await (await oktaPage.$('#okta-signin-submit')).click();

    await oktaPage.waitForSelector('.button-primary[type=submit]');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});

    fs.openSync(path.normalize(path.resolve(__dirname, '../sms-code.txt')), 'w');
    await (await oktaPage.$('.sms-request-button')).click();

    const smsCode = await (async function waitSmsCode(count) {
        await oktaPage.waitFor(1000);
        const smsCode = fs.readFileSync(path.resolve(__dirname, '../sms-code.txt')).toString().trim();
        if (smsCode) {
            logger.info('SMS Code', `"${smsCode}"`);
            return smsCode;
        } else {
            return await waitSmsCode(++count);
        }
    })(0);

    await oktaPage.focus('#input71'); // SMS Code Input
    await oktaPage.type(smsCode);
    await (await oktaPage.$('#input78')).click(); // Do not challenge me on this device again Checkbox
    await util.screenshot(oktaPage, logger);
    await (await oktaPage.$('.button-primary[type=submit]')).click(); // Verify Button

    await oktaPage.waitForSelector('.applink-autocomplete');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    await oktaPage.waitForSelector('a[data-se=app-button-0oa17bb8zbwv67C810h8]');
    await util.screenshot(oktaPage, logger);
    await (await oktaPage.$('a[data-se=app-button-0oa17bb8zbwv67C810h8]')).click(); // Click Leave China

    await oktaPage.waitFor(10 * 1000);

    const leavePage = await browser.newPage();
    await leavePage.goto('https://china-leave.herokuapp.com/');
    await leavePage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(leavePage, logger);

    await util.saveOktaCookies(oktaPage, logger);
    await util.saveLeaveCookies(leavePage, logger);

    browser.close();
})();