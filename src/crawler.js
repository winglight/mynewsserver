"use strict";

var TopicModel = require('./models/TopicModel.js');
var NewsModel = require('./models/NewsModel.js');

var Parse = require('parse/node');
Parse.initialize("mynews", "",  process.env.API_KEY || "dkElkfdjiEOij843lKD");
Parse.serverURL = '/parse';


var read = require('node-readability');
var iconv = require('iconv-lite');

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const {URL} = require('url');

var cluster = require('set-clustering');
var stringSimilarity = require('string-similarity');

class Crawler {
    constructor() {
        String.prototype.endsWith = function (suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };

        Array.prototype.diff = function (a) {
            return this.filter(function (i) {
                return a.indexOf(i) < 0;
            });
        };

        Array.prototype.includes = function (searchElement, objkey) {
            'use strict';
            if (this == null) {
                throw new TypeError('Array.prototype.includes called on null or undefined');
            }

            var O = Object(this);
            var len = parseInt(O.length, 10) || 0;
            if (len === 0) {
                return false;
            }
            var k = 0;
            var currentElement;
            while (k < len) {
                currentElement = O[k];
                if (objkey) {
                    if (searchElement[objkey] === currentElement[objkey] ||
                        (searchElement[objkey] !== searchElement[objkey] && currentElement[objkey] !== currentElement[objkey])) { // NaN !== NaN
                        return true;
                    }
                } else {
                    if (searchElement === currentElement ||
                        (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                        return true;
                    }
                }
                k++;
            }
            return false;
        };
    }

    crawlLatest() {
        var that = this;
        var res = "";

        new TopicModel().findAll().then(function (topics) {
            try{
                (async () => {
                    that.browser = await puppeteer.launch({ignoreHTTPSErrors: true, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--lang=zh']});

                    for (var i=0;i<topics.length;i++) {
                        var topic = topics[i];
                        topic.refreshDataFromParse();

                        res += await that.crawlTopic(topic) + "\n";

                        console.log("-------end--------" + topic.name);
                    }

                    console.log("-------crawlTopic end 2-----");
                    await that.close();

                    const { exec } = require('child_process');
                    exec('killall -9 chrome', (err, stdout, stderr) => {
                        if (err) {
                            // node couldn't execute the command
                            return;
                        }

                        // the *entire* stdout and stderr (buffered)
                        console.log(`stdout: ${stdout}`);
                        console.log(`stderr: ${stderr}`);
                    });

                    return await res;
                })();

            } catch (e) {
                console.log("crawlTopic error:" + e);
            }finally {
                that.close();
            }
        });

    }

    async crawlTopic(topic) {
        var that = this;
        var url = topic.url;

        console.log("topic url:" + topic.url);

        try {

            if(!that.browser){
                that.browser = await puppeteer.launch({ignoreHTTPSErrors: true, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--lang=zh']});
            }

            const page = await that.browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36");

            page.on('error', msg => {
                console.log('page error: ' + msg);
            });

            await page.goto(url, {timeout: 0});

            // execute standard javascript in the context of the page.
            const hrefs = await page.evaluate(() => {
                const anchors = document.querySelectorAll('a');
                return [].map.call(anchors, a => eval({"url": a.getAttribute('href'), "title": a.text}));
            });
            console.log("hrefs length: " + hrefs.length);

            console.log("topic name:" + topic.name);


                //common crawler tasks
                var links = [];
                hrefs.forEach(function (href) {
                    var link = href.url;
                    // console.log("topic href:" + link);
                    if (link && link.indexOf('javascript') != 0 && link.indexOf('#') < 0) {
                        href.url = that.parseLink(url, link);
                        if (!links.includes(href, "url") && href.title && href.title.length > 4) {
                            if (topic.contains != null && topic.contains.length > 0) {
                                if (href.url.indexOf(topic.contains) >= 0) {
                                    links.push(href);
                                }
                            } else {
                                links.push(href);
                            }
                        }
                    }
                });
                console.log("topic links length:" + links.length);

            if(topic.id) {
                topic.crawlAt = new Date();
                if (topic.lastlinks == null) {
                    topic.lastlinks = [];
                }
                if (topic.latestLinks == null) {
                    topic.latestLinks = [];
                }
                let difference = links.concat(topic.lastlinks).filter(v => links.includes(v, "url") && (!topic.lastlinks.includes(v, "url")));
                console.log("difference length:" + difference.length);
                topic.lastlinks = topic.lastlinks.concat(difference);
                topic.latestLinks = difference;
                topic.update();
                if (difference.length > 0) {
                    for (var i = 0; i < difference.length && (i < 10 || topic.contentType === 'img'); i++) {
                        var link = difference[i];
                        var news = new NewsModel();
                        news.title = link.title;
                        news.url = link.url;
                        news.topic = topic.id;
                        news.encode = topic.encode;
                        news.contentType = topic.contentType;
                        news.crawlAt = new Date();
                        news.isRead = false;
                        await news.update();
                        // refNews.doc(news.id).set(news, { merge: true });
                        if (topic.contentType === 'img') {
                            await that.crawlImages(topic, news);
                        } else {
                            // that.crawlNews(news);
                            // await page.goto(link.url, {timeout: 5000});
                            //
                            // let bodyHTML = await page.evaluate(() => document.body.innerHTML);
                            //
                            // var article = htmlToText.fromString(bodyHTML, {
                            //     wordwrap: 130
                            // });
                            // news.content = article;
                            // news.update();
                            that.crawlNews(news);
                        }


                    }
                }

            }


            return await topic.name + " news: " + difference.length;
        } catch (e) {
            console.log("crawlTopic error:" + e);
        }


    }

    crawlNews(news) {
        var url = news.url;

        console.log("news url:" + news.url);

        var option = {
            strictSSL: false, 
            encoding: (news.encode)?news.encode:'utf-8',
                cleanRulers: [
                    function(obj, tag) {
                        if(tag === news.cover) {
                            return true;
                        }
                    }
                ]};


        read(url, option, function (err, article, meta) {
            if (!err) {
                // Main Article
                console.log("article.content type: " + typeof(article.content));
                if (news.encode != null && news.encode.length > 0) {
                    news.content = iconv.decode(article.content, news.encode)
                } else {
                    news.content = article.content;
                }
                news.update();

                // refNews.doc(news.id).set(news, { merge: true });

                // Close article to clean up jsdom and prevent leaks
                article.close();
            } else {
                console.log("crawlNews error: " + err);
            }

        });

    }

    async crawlImages(topic, news) {
        let topic1 = topic;

        console.log("crawlImages topic1 0: " + topic1);

        let count = 1;
        if(topic1.nextPageTitle){
            count = 500;
        }
        let url = news.url;
        let imageUrls = [];

        console.log("crawlImages news url:" + news.url);

        try {
            const page = await this.browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36");
            page.on('error', msg => {
                console.log('page error: ' + msg);
            });

            for (var i=0; i < count; i++)
            {
                await page.goto(url, {timeout: 5000});
                await page.setRequestInterception(true);
                page.on('request', request => {
                    if (request.resourceType() === 'image')
                        request.abort();
                    else
                        request.continue();
                });

                //get image(single)
                // execute standard javascript in the context of the page.
                const image = await page.evaluate((topic1) => {
                    const anchors = document.querySelectorAll('img');

                    console.log("crawlImages topic1 1: " + topic1);

                    let filtered = [].filter.call(anchors, a => a.getAttribute('src').indexOf(topic1.imageIncludeUrl) >= 0);
                    if(filtered.length > 0){
                        return eval({"url": filtered[0].getAttribute('src'), "title": 1});
                    }
                }, topic1);
                console.log("crawlImages image: " + image);

                if(!image){
                    break;
                }
                console.log("crawlImages image url: " + image.url);

                image.url = this.parseLink(url, image.url);
                imageUrls.push(image);

                // get next page url
                const nextlink = await page.evaluate((topic1) => {
                    const anchors = document.querySelectorAll('a');
                    console.log("crawlImages topic1 2: " + topic1);
                    let filtered = [].filter.call(anchors, a => (a.getAttribute('href') && a.getAttribute('href').indexOf('javascript') != 0 && a.getAttribute('href').indexOf('#') < 0 && a.text.indexOf(topic1.nextPageTitle) >= 0 && a.getAttribute('href').indexOf(topic1.nextPageIncludeUrl) >= 0));
                    if(filtered.length > 0){
                        return filtered[0].getAttribute('href');
                    }
                }, topic1);
                console.log("crawlImages nextlink: " + nextlink);

                if(nextlink){
                    url = this.parseLink(url, nextlink);
                }else {
                    break;
                }

            }
            news.images = imageUrls;
            console.log("crawlImages imageUrls length: " + imageUrls.length);
            news.update();
        } catch (e) {
            console.log("crawlImages error:" + e);
        }

    }

    async login(topic) {
        try {
            console.log("------login begin-------");

            // this.browser = await puppeteer.launch({headless: false});

            const page = await
                this.browser.newPage();

            await
                page.goto('https://passport.feng.com/?r=user/login', {timeout: 5000});

            await page.type(user_selector, CREDS.username);
            await page.type(pass_selector, CREDS.password);

            await page.click(btn_selector);

            await page.waitForNavigation();

            console.log("------login end-------");

        } catch (e) {
            console.log("login error:" + e);
        }

    }

    parseLink(base, link, exludeOutSite) {
        var res = new URL(link, base);
        if (exludeOutSite && link.indexOf("http") == 0) {
            var baseDomain = new URL(base).host;
            if (res.host !== baseDomain) {
                return "";
            }
        }
        return res.href;
    }

    async close() {
        try{
            if(this.browser) {
                await this.browser.close();
            }
        } catch (e) {
            console.log("close error:" + e);
        }
    }

    async pushMobi(path) {
        this.close();

        // verify connection configuration
        // transporter.verify(function(error, success) {
        //     if (error) {
        //         console.log(error);
        //     } else {
        //         console.log('Server is ready to take our messages');
        //     }
        // });


        console.log("pushMobi begin");
        try{
            transporter.sendMail({
                from: 'noreply  <' + config.user + '>',
                to: config.kindle,
                subject: 'Convert',
                text: 'Pushing to kindle from ' + path,
                attachments: [{
                    path,
                    encoding: 'base64',
                    contentType: 'application/x-mobipocket-ebook'
                }]
            }, (err, info) => {
                if (err) console.log("sendMail error:" + err);
                else console.log("sendMail completed: " + JSON.stringify(info));
            });

        } catch (e) {
            console.log("pushMobi error:" + e);
        }
    }

}

const crawler = new Crawler();
crawler.crawlLatest();

module.exports = crawler;

// console.log("-------begin--------");
// crawler.pushMobi('/Users/chenyu/Downloads/Xiao Shuo Ke I_Zhe Mo Du Zhe De Mi Mi - Unknown.mobi');

// const CREDS = require('./creds');
// const user_selector = '#username';
// const pass_selector = '#password';
// const btn_selector = '#computer_code > div > div.login_form > form > ul > li.btns > button';