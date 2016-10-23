var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var rhyme = require('rhyme');
var mongodb = require('mongodb');
var WordPOS = require('wordpos');
    

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();

wordpos = new WordPOS();
server.post('/api/messages', connector.listen());
bot.dialog('/', intents);
// Set up MongoDB Database
var MongoClient = mongodb.MongoClient;
var mongoURL = 'mongodb://localhost:27017/bruhbot';

MongoClient.connect(mongoURL, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', mongoURL);

    // do some work here with the database.
	var collection = db.collection('verses');
	collection.drop();

    //Close connection
    db.close();
  }
});

//=========================================================
// Bots Dialogs
//=========================================================
intents.matches(/^change name/i, [
	function (session){
		session.beginDialog('/profile');
	},
	function (session, results){
		session.send('Name has been changed to %s', session.userData.name);
	}
]);

intents.matches(/^password/i, [
	function (session){
		session.beginDialog('/prefix');
	},
	function (session, results){
		session.send('prefix added');
	}
]);
	
intents.onDefault([
    function (session, args, next) {
        if(!session.userData.name){
			session.beginDialog('/profile');
		}
		else{
			next();
		}
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
		session.send('Let\'s play a game!');
		session.beginDialog('/verse');
    }
]);

bot.dialog('/profile',[
	function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

bot.dialog('/verse',[
	function (session) {
        builder.Prompts.text(session, ' Write a sentence, and I\'ll make a rhyme!');
    },
    function (session, results) {
        var hold = results.response;
		var check = false;
		var holdlast = hold.split(" ").splice(-1);
		var url = 'http://rhymebrain.com/talk?function=getRhymes&word=' + holdlast;
		request.get(url,
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(body);
				var JSONbody = JSON.parse(body);
				var chosen = JSONbody[Math.floor(Math.random()*(JSONbody.length/10))];
				chosen = chosen.word;
				var rhymepair = chosen;
				check = true;
				session.send('Found Rhyme: %s', rhymepair);
				var prelist = ['Your style is', 'Can\'t touch the', 
				'Overall, I\'m just', 'My bars go harder than', 
				'Best in the biz, top of', 'I\'m tired of', 
				'Harambe didn\'t die for', 'Swiper no swiping, but you can',
				'99 Problems, but one is', 'All my life I\'ve been',
				'Is mayonaise an', 'I\'m super happy to be',
				'Just toss a word out:', 'System.out.print:',
				'Even I can feel the', 'porcupines are very', 
				'Pokemon Go is','I dunno, so I\'ll say'];
				var prepair = prelist[Math.floor(Math.random()*18)];
				addVerse(hold, prepair +" "+rhymepair);
				/* if(wordpos.isAdjective(rhymepair, console.log)){
					console.log(rhymepair + " is adjective");
					var prepair = getPrefix('adjective');
					addVerse(hold, prepair +" "+ rhymepair);
				}
				else if(wordpos.isNoun(rhymepair, console.log)){
					console.log(rhymepair + " is noun");
					var prepair = getPrefix('noun');
					addVerse(hold, prepair +" "+ rhymepair);
				}
				else if(wordpos.isVerb(rhymepair, console.log)){
					console.log(rhymepair + " is verb");
					var prepair = getPrefix('verb');
					addVerse(hold, prepair +" "+ rhymepair);
				}
				else if(wordpos.isAdverb(rhymepair, console.log)){
					console.log(rhymepair + " is adverb");
					var prepair = getPrefix('adverb');
					addVerse(hold, prepair +" "+ rhymepair);
				}
				else{
					console.log(rhymepair + " is idk man");
					addVerse(hold, 'Drop in a random word: '+ rhymepair);
				} */			
				session.beginDialog('/continue');
			}
			else{
				//request failed, place buffer here
				session.send("Woah, rhyme was not retrieved");
				session.endDialog();
			}
		});		
    }
]);

bot.dialog('/continue',[
	function (session) {
        builder.Prompts.confirm(session, 'Want another verse?');
    },
    function (session, results) {
    if (results.response) {
        session.beginDialog('/verse');
    }
    else {
        // Always say goodbye
		//session.send('Let me finalize the track...');
		//PostWord(session.userData.name);
        session.send('Alright, let\'s spin this fire mixtape!');
		session.send('DISCLAIMER: mixtapes are not guaranteed to be fire.');
		session.beginDialog('/compile');
	}
}
]);

bot.dialog('/compile',[
	function(session){
		MongoClient.connect(mongoURL, function (err, db) {
		if (err) {
		console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {
		//HURRAY!! We are connected. :)
		console.log('Connection established to', mongoURL);

		var collection = db.collection('verses');
	
		var cursor = collection.find({name: 'v'}); 

		cursor.each(function(err,doc){
		if (err) {
			console.log(err);
		} else {
			console.log('Fetched:', doc);
			session.send(doc.v1);
			session.send(doc.v2);
		}
		//Close connection
		db.close();	
		});
	}
	});	
	//session.send('Alright, hope you enjoyed!');
	session.endDialog();
	}
]);

bot.dialog('/prefix',[
	function (session) {
        //builder.Prompts.choice(session, 'What type of prefix?', ["noun","verb","adjective","adverb"]);
		//builder.Prompts.text(session, 'What type of prefix?');
		builder.Prompts.text(session, 'What\'s your prefix?');
    },
    function (session, results) {
        //var stringResult = results.response;
		//console.log('this is a ' + stringResult);
		//addPrefix(stringResult, "Feeling truly");
		addPrefix('noun', results.response);
		session.endDialog();
    }
]);

function addVerse(given, generated){
	console.log(given+'. ' + generated + '.');
	
	MongoClient.connect(mongoURL, function (err, db) {
	if (err) {
		console.log('Unable to connect to the mongoDB server. Error:', err);
	} else {
		//HURRAY!! We are connected. :)
		console.log('Connection established to', mongoURL);

		var collection = db.collection('verses');
		var toAdd = {name : 'v', v1: given, v2: generated};
	
		collection.insert([toAdd], function (err, result) {
		if (err) {
			console.log(err);
		} else {
			console.log('Inserted %d documents into the "verses" collection. The documents inserted with "_id" are:', result.length, result);
		}
		//Close connection
			db.close();
		});
	}
	});
}

function addPrefix(POS, input){
	
	MongoClient.connect(mongoURL, function (err, db) {
		if (err) {
			console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {
			//HURRAY!! We are connected. :)
			console.log('Connection established to', mongoURL);

			var collection = db.collection('prefix');
			var toAdd = {partOfSpeech : POS, prefix: input};
	
			collection.insert([toAdd], function (err, result) {
			if (err) {
				console.log(err);
			} else {
				console.log('Inserted %d documents into the "prefix" collection. The documents inserted with "_id" are:', result.length, result);
				session.send(POS + ' Prefix added!')
			}
			//Close connection
				db.close();
			});
		}
		});
}

function getPrefix(POS, ans){
	MongoClient.connect(mongoURL, function (err, db) {
		if (err) {
		console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {
		//HURRAY!! We are connected. :)
		console.log('Get Prefix Connection established to', mongoURL);
		var collection = db.collection('prefix');
		var chosen = collection.find();
		console.log('selected this: '+chosen[prefix]);
		ans(chosen[prefix]);
		//Close connection
		db.close();
		};
	});
}

//unused, but probably should eventually use this, once I figure out async tasks properly
function PostWord(string){
  console.log('this is working, %s is being posted', string);
  var url = 'http://rhymebrain.com/talk?function=getRhymes&word=' + string;
    request.get(url,
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
			console.log(body);
			var JSONbody = JSON.parse(body);
			var chosen = JSONbody[Math.floor(Math.random()*(JSONbody.length/5))];
			chosen = chosen.word;
			console.log('the word chosen was:' + chosen);
			return chosen;
        }
    });
}