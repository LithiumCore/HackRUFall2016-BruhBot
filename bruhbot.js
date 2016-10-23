var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var rhyme = require('rhyme');
var mongodb = require('mongodb');

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


server.post('/api/messages', connector.listen());
bot.dialog('/', intents);
// Set up MongoDB Database
/* var MongoClient = mongodb.MongoClient;
var mongoURL = 'mongodb://localhost:27017/my_database_name';

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', url);

    // do some work here with the database.

    //Close connection
    db.close();
  }
}); */

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
		var url = 'http://rhymebrain.com/talk?function=getRhymes&word=' + holdlast + '&maxResults=5';
		request.get(url,
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(body);
				var JSONbody = JSON.parse(body);
				var chosen = JSONbody[Math.floor(Math.random()*JSONbody.length)];
				chosen = chosen.word;
				var rhymepair = chosen;
				check = true;
				session.send('I found %s', rhymepair);
				session.endDialog();
			}
			else{
				//request failed, place buffer here
			}
		});		
    }
]);

//unused, but probably should eventually use this, once I figure out async tasks properly
function PostWord(string){
  console.log('this is working, %s is being posted', string);
  var url = 'http://rhymebrain.com/talk?function=getRhymes&word=' + string + '&maxResults=5';
    request.get(url,
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
			console.log(body);
			var JSONbody = JSON.parse(body);
			var chosen = JSONbody[Math.floor(Math.random()*JSONbody.length)];
			chosen = chosen.word;
			console.log('the word chosen was:' + chosen);
			return chosen;
        }
    });
}