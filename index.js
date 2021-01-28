const Twitter    = require("twitter");
const config     = require("./config.json");
const fs         = require("fs");
const ChartJS    = require("chartjs-node-canvas");
const Canvas     = require("canvas");
const puppeteer  = require("puppeteer");
const CP         = require("child_process");
const lineReader = require("line-reader");

// Consider looking into this https://pypi.org/project/GetOldTweets3/

var client;

var temporaryPath = "tweets.txt"
var tweetLimit    = 30;

if(fs.existsSync(temporaryPath)) {
	fs.unlinkSync(temporaryPath);
}

async function getEveryTweet(username) {
	// 9223372036854775807 is the maximum number in python, so it's basically
	// infinity
	var cmdLine = `twint -u ${
		username} --format "{link}|{tweet}|{replies}|{retweets}|{likes}|{id}|{date}" -o ${
		temporaryPath} --limit ${
		tweetLimit == -1 ? 9223372036854775807 : tweetLimit}`;
	console.log(cmdLine);
	CP.execSync(cmdLine, { stdio: 'ignore' });
}

client = new Twitter({
	consumer_key: config.API_key,
	consumer_secret: config.API_secret_key,
	bearer_token: config.Bearer_token
});

(async () => {
	var username = "simplyn64"
	getEveryTweet(username);

	console.log("Done scraping tweets, now processing");

	var tweets = [];
	lineReader.eachLine(temporaryPath, function(line) {
		if(line !== "") {
			var parts = line.split("|");
			tweets.push({
				link: parts[0],
				tweet: parts[1],
				replies: parseInt(parts[2]),
				retweets: parseInt(parts[3]),
				likes: parseInt(parts[4]),
				id: parts[5],
				date: parts[6]
			});
		}
	});

	const browser = await puppeteer.launch({ headless: true });

	Canvas.registerFont("assets/HelveticaNeue-Bold.ttf",
		{ family: "HelveticaNeue", style: "bold" });

	Canvas.registerFont("assets/HelveticaNeue-Regular.ttf",
		{ family: "HelveticaNeue", style: "normal" });

	const canvas = Canvas.createCanvas(1000, 600);
	const ctx    = canvas.getContext("2d");

	var userParts
		= CP
			  .execSync(`twint -u ${
				  username} --user-full --format "{name}|{bio}|{tweets}|{following}|{followers}|{avatar}"`)
			  .toString("utf8")
			  .split("|");
	var userInfo = {
		name: userParts[0],
		bio: userParts[1],
		tweets: parseInt(userParts[2]),
		following: parseInt(userParts[3]),
		followers: parseInt(userParts[4]),
		avatar: userParts[5].replace("\n", "").replace("normal", "400x400")
	};
	console.log(userInfo);

	const page = await browser.newPage();
	await page.emulateMediaFeatures(
		[{ name: 'prefers-color-scheme', value: 'dark' }]);

	//await page.emulate(puppeteer.devices["Pixel 2"]);

	for(let i = 0; i < tweets.length; i++) {
		var tweet = tweets[i];
		// console.log(tweet);

		console.log(tweet.link + "?s=20");

		await page.goto(tweet.link + "?s=20", { waitUntil: "networkidle0" });
		var tweetHandle = await page.evaluateHandle((username) => {
			document.getElementsByClassName("r-aqfbo4")[0].remove()
			var possibleTweets
				= Array.from(document.querySelectorAll("[role='article']"));

			for(var i = 0; i < possibleTweets.length; i++) {
				var element     = possibleTweets[i];
				var testElement = element.querySelectorAll("[role='link']")[1];
				if(testElement
					&& testElement.href === "https://twitter.com/" + username) {
					return element;
				}
			}
		}, username);
		await tweetHandle.screenshot({ path: tweet.id + ".png" });
	}

	browser.close();
})();