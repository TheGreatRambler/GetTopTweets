const Twitter   = require ("twitter");
const config    = require ("./config.json");
const fs        = require ("fs");
const ChartJS   = require ("chartjs-node-canvas");
const Canvas    = require ("canvas");
const puppeteer = require ("puppeteer");

// Consider looking into this https://pypi.org/project/GetOldTweets3/

var client;

var allResponses        = [];
var maxAllResponsesSize = 30;

var allTweetsPath = "./tweets.csv";

if (fs.existsSync(allTweetsPath)) {
	fs.unlinkSync(allTweetsPath);
}

const allTweets = fs.createWriteStream(allTweetsPath);

allTweets.write("Text,Likes,Retweets,Id,Created,URL\n")

async function getEveryTweet (username) {
	// Go backwards
	var maxId = undefined;
	while (true) {
		try {
			var responses = await client.get("statuses/user_timeline", {
				include_rts: 1,
				max_id: maxId,
				screen_name: username,
				count: maxAllResponsesSize == -1 ? 200 : Math.min(maxAllResponsesSize - allResponses.length, 200)
			});
		} catch (e) {
			console.error(e);
		}

		if (responses.length == 0) {
			console.log("Reached end of profile");
			break;
		} else if (responses.length == 1) {
			console.log("Peculier error, only 1 response returned");
			break;
		} else {
			console.log("Obtained " + responses.length + " tweets in this batch");

			maxId = responses[responses.length - 1].id_str;

			// Supposedly fastest way
			allResponses.push(...responses);

			responses.forEach(function (tweet) {
				if (!tweet.text.startsWith("RT ")) {
					tweet.url = `https://twitter.com/${username}/status/${tweet.id_str}`;
					allResponses.push(tweet);

					// All charactors except spaces must be replaced
					allTweets.write(`"${tweet.text.replace(/\n/g, "%0A").replace(/"/g, "%22")}",${tweet.favorite_count},${tweet.retweet_count},${tweet.id_str},${tweet.created_at},tweet.url\n`);
				}
			});

			if (maxAllResponsesSize != -1 && allResponses.length > maxAllResponsesSize) {
				console.log("Reached forced tweet end");
				break;
			}
		}
	}

	allTweets.close();
}

client = new Twitter ({
	consumer_key: config.API_key,
	consumer_secret: config.API_secret_key,
	bearer_token: config.Bearer_token
});

(async () => {
	getEveryTweet ("simplyn64");

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

	var userInfo       = allResponses[0].user;
	var profilePicture = userInfo.profile_image_url.replace("normal", "400x400");

	for (let i = 0; i < allResponses.length; i++) {
		var tweet = allResponses[i];

		// https://twitter.com/MatttGFX/status/1352400305963618306?s=20
		const page = await browser.newPage();
		await page.goto(tweet.url + "?s=20");
	}

	browser.close();
}) ();