const Twitter    = require ("twitter");
const config     = require ("./config.json");
const fs         = require ("fs");
const ChartJS    = require ("chartjs-node-canvas");
const Canvas     = require ("canvas");
const puppeteer  = require ("puppeteer");
const CP         = require ("child_process");
const lineReader = require ("line-reader");

// Consider looking into this https://pypi.org/project/GetOldTweets3/

var client;

var allResponses  = [];
var temporaryPath = "tweets.txt"
var tweetLimit    = -1;

if (fs.existsSync(temporaryPath)) {
	fs.unlinkSync(temporaryPath);
}

async function getEveryTweet (username) {
	// 9223372036854775807 is the maximum number in python, so it's basically infinity
	CP.execSync(`twint -u ${username} --format "{'link':'{link}','tweet':'{tweet}','replies':{replies},'retweets':{retweets},'likes':{likes},'id':'{id}','date':'{date}'}" -o ${temporaryPath} --limit ${tweetLimit == -1 ? 9223372036854775807 : tweetLimit}`);
}

client = new Twitter ({
	consumer_key: config.API_key,
	consumer_secret: config.API_secret_key,
	bearer_token: config.Bearer_token
});

(async () => {
	var username = "simplyn64"
	getEveryTweet (username);

	var tweets = [];
	lineReader.eachLine(temporaryPath, function (line) {
		if (line !== "") {
			tweets.push(JSON.parse(line));
		}
	});

	const browser = await puppeteer.launch({
		headless: true
	});

	Canvas.registerFont("assets/HelveticaNeue-Bold.ttf", {
		family: "HelveticaNeue",
		style: "bold"
	});

	Canvas.registerFont("assets/HelveticaNeue-Regular.ttf", {
		family: "HelveticaNeue",
		style: "normal"
	});

	const canvas = Canvas.createCanvas(1000, 600);
	const ctx    = canvas.getContext("2d");

	var userInfo       = JSON.parse(CP.execSync(`twint -u ${username} --user-full --format "{'name':'{name}','bio':'{bio}','tweets':{tweets},'following':{following},'followers':{followers},'avatar':'{avatar}'}"`));
    var profilePicture = userInfo.avatar.replace("normal", "400x400");

	for (let i = 0; i < allResponses.length; i++) {
		var tweet = allResponses[i];
		console.log(tweet);

		// https://twitter.com/MatttGFX/status/1352400305963618306?s=20
		const page = await browser.newPage();
		await page.goto(tweet.url + "?s=20");
	}

	browser.close();
}) ();