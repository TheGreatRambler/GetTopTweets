const Twitter    = require("twitter");
const config     = require("./config.json");
const fs         = require("fs");
const ChartJS    = require("chartjs-node-canvas");
const Canvas     = require("canvas");
const puppeteer  = require("puppeteer");
const sharp      = require("sharp");
const CP         = require("child_process");
const potpack    = require("potpack");
const lineReader = require("line-reader");

// Consider looking into this https://pypi.org/project/GetOldTweets3/

var client;

var temporaryPath = "tweets.txt"
var tweetLimit    = 10;

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

	var currentIndex = 0;
	var tweets = [];
	lineReader.eachLine(temporaryPath, function(line) {
		if(line !== "") {
			if (tweetLimit == -1 || currentIndex < tweetLimit) {
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

				currentIndex++;
			}
		}
	});

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

	tweets = tweets.sort(function(first, second) {
		if(first.likes > second.likes) {
			return -1;
		} else {
			return 1;
		}
	});
	
	const browser = await puppeteer.launch({ headless: true });

	const page = await browser.newPage();
	await page.emulateMediaFeatures(
		[{ name: 'prefers-color-scheme', value: 'dark' }]);

	await page.emulate(puppeteer.devices["iPad Pro"]);
	await page.setViewport({ width: 2000, height: 4000});

	var generatedImages     = [];
	var generatedImagesSize = [];

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

		var buffer = await tweetHandle.screenshot({ type: "png" });

		const bufferInfo   = await sharp(buffer).metadata();
		console.log(bufferInfo);
		const resizedImage = await sharp(
			buffer).resize(Math.round(bufferInfo.width / (i + 1)))
								 .toBuffer();
		const bufferInfoResized = await sharp(resizedImage).metadata();

		generatedImages.push(resizedImage);
		generatedImagesSize.push(
			{ w: bufferInfoResized.width, h: bufferInfoResized.height });

		console.log("Handled tweet #" + i + " , width "
					+ bufferInfoResized.width + ", height "
					+ bufferInfoResized.height);
	}

	const potpackInfo = potpack(generatedImagesSize);

	console.log(potpackInfo);

	Canvas.registerFont("assets/HelveticaNeue-Bold.ttf",
		{ family: "HelveticaNeue", style: "bold" });

	Canvas.registerFont("assets/HelveticaNeue-Regular.ttf",
		{ family: "HelveticaNeue", style: "normal" });

	const canvas = Canvas.createCanvas(potpackInfo.w, potpackInfo.h);
	const ctx    = canvas.getContext("2d");

	generatedImages.forEach(function(buf, index) {
		const correspondingInfo = generatedImagesSize[index];
		const img               = new Canvas.Image();
		img.onload = () => ctx.drawImage(
			img, correspondingInfo.x, correspondingInfo.y);
		img.onerror = err => {
			throw err
		};
		img.src = buf;
	});

	const finalImage = canvas.toBuffer(
		'image/png', { compressionLevel: 3, filters: canvas.PNG_FILTER_NONE });

	if(fs.existsSync("output.png")) {
		fs.unlinkSync("output.png");
	}

	fs.writeFileSync("output.png", finalImage);

	browser.close();
})();