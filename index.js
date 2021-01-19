const Twitter = require ("twitter");
const config  = require ("./config.json");
const fs      = require ("fs");

var client;

var allResponses        = [];
var maxAllResponsesSize = -1;

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
				count: 200
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
					allResponses.push(tweet);

					// All charactors except spaces must be replaced
					allTweets.write(`"${tweet.text.replace(/\n/g, "%0A").replace(/"/g, "%22")}",${tweet.favorite_count},${tweet.retweet_count},${tweet.id_str},${tweet.created_at},https://twitter.com/${username}/status/${tweet.id_str}\n`);
				}
			});

			if (maxAllResponsesSize != -1 && allResponses.length > maxAllResponsesSize) {
				console.log("Reached forced tweet end");
				break;
			}
		}
	}

	allResponses.forEach(function (tweet) {

	});

	allTweets.close();
}

client = new Twitter ({
	consumer_key: config.API_key,
	consumer_secret: config.API_secret_key,
	bearer_token: config.Bearer_token
});

getEveryTweet ("connnor01");