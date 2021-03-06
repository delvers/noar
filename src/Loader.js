/**
 * Created by david on 10.03.17.
 */
import * as parse5 from 'parse5';
import * as https from "https";
import * as http from "http";
import Parser from "rss-parser";
import {JSDOM} from "jsdom";
import Readability from "../lib/readability/Readability";

class ParserState{
    static p =  0;
    static img = 1;
    static article = 2;
    static article_p = 3;
    static article_footer = 4;
    static idle = 5;

}

export class Loader {

    constructor(store){
        this.store = store;
        this.updateFeeds = this.updateFeeds.bind(this);
        this.updateFeed = this.updateFeed.bind(this);
//        this.loadArticleContent = this.loadArticleContent.bind(this);
//        this.httpGetAsync = this.httpGetAsync.bind(this)
    }

    static httpGetAsync(theUrl, callback) {
        let parser = document.createElement('a');
        parser.href = theUrl;
        console.log({
            protocol: parser.protocol,
            hostname: parser.hostname,
            port: parser.port,
            path: parser.pathname,
            search: parser.search
        });
        let request;
        if (parser.protocol === 'https:') {
            request = https.request({
                method: 'GET',
                protocol: parser.protocol,
                hostname: parser.hostname,
                port: parser.port,
                path: (parser.pathname).concat(parser.search)
            });
        } else if (parser.protocol === 'http:'){
            request = http.request({
                method: 'GET',
                protocol: parser.protocol,
                hostname: parser.hostname,
                port: parser.port,
                path: (parser.pathname).concat(parser.search)
            });
        }

        request.on('response', (response) => {

            console.log(`STATUS: ${response.statusCode} (${response.statusMessage})`);
            // TODO handle redirects

            response.on('error', (error) => {
                console.log(`ERROR: ${JSON.stringify(error)}`)
            });

            response.on('finish', callback);
        });

        request.end();


    }

    loadFeed(title, url , body){
        let store = this.store;
        let parser = new Parser();
        parser.parseURL(url, async function (err, parsed) {

            //console.log(parsed);
            let newsSource = {
                title: title,
                feed_title: parsed.title,
                url: url,
                id: parsed.feedUrl
            };

            // add News Source to Database
            let source_id = await store.addNewsSource(newsSource);
            //console.log(source_id);
            //console.log(newsSource);
            let newsSources = body.props.newsSources;
            //console.log(newsSources);
            if (newsSources === undefined) {
                newsSources = [];
                newsSources.push(newsSource);

            } else {
                newsSources.push(newsSource);
            }
            body.setState({ newsSources: newsSources,
                            currentSource: newsSource,
            });

            let articles = [];
            parsed.items.forEach(async function (entry) {

                // load article content
                let content = await Loader.loadArticleContent(entry.link);
                //console.log(content);
                let article = {
                    title: entry.title,
                    link: entry.link,
                    id: entry.id,
                    updated: entry.pubDate,
                    summary: entry.contentSnippet,
                    content: content,
                    sourceId: source_id
                };


                articles.push(article);

                // update view
                body.setState({currentArticles: articles});

                // save article to db
                try {
                    store.addNewsArticle(article)
                } catch (e) {
                    console.error(e);
                }
            })
        })
    }

    static getClass(attr){
        for (let a in attr){
            if(attr[a].hasOwnProperty('name') &&
               attr[a].hasOwnProperty('value') &&
               attr[a].name === 'class'){

                return attr[a].value.trim()
            }
        }
        return null
    }

    static loadArticleContent(url) {
        return new Promise(async (resolve, reject) => {
            let dom = await JSDOM.fromURL(url, {});
            let uri = {
                spec: url,
                host: "www.heise.de",
                prePath: "https://www.heise.de",
                scheme: "https",
                pathBase: 'https://www.heise.de/newsticker/meldung/'
            };
            let article = await new Readability(uri, dom.window.document).parse();
            resolve(article.content);

        });
    }


    async updateFeed(source){
        let parser = new Parser();
        let store = this.store;
        let feed = await parser.parseURL(source.url);
        source = {
            feed_title: feed.title,
            id: feed.feedUrl,
        };

        store.addNewsSource(source);

        feed.items.forEach(async function (entry) {
            let content = await Loader.loadArticleContent(entry.link);
            let article = {
                title: entry.title,
                link: entry.link,
                id: entry.id,
                updated: entry.pubDate,
                summary: entry.contentSnippet,
                content: content,
                sourceId: source.id,
            };

            try {
                store.addNewsArticle(article);
            } catch (e) {
                console.error(e);

            }
        })
    }

    async updateFeeds(){
        let sources = await this.store.getNewsSources();
        let updateFeed = this.updateFeed;
        sources.map((s) => {
                try {
                    updateFeed(s);
                } catch (e) {
                    console.error(e);
                }
            }

        );

        console.log("Feeds updated...");
    }

}