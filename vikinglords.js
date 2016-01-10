Games = new Mongo.Collection("games");
Users = new Mongo.Collection("users");

Router.route('/', function () {
  this.render('lobby');
});

Router.route('/lobby', function () {
  this.render('lobby');
});

Router.route('/games/:_id', function () {
	var game = Games.findOne({_id: this.params._id});
	this.render('game', {data: game});
});

Router.route('/todo', function () {
  this.render('todo');
});

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

if (Meteor.isClient) {
	AmplifiedSession = _.extend({}, Session, {
	  keys: _.object(_.map(amplify.store(), function(value, key) {
		return [key, JSON.stringify(value)]
	  })),
	  set: function (key, value) {
		Session.set.apply(this, arguments);
		amplify.store(key, value);
	  },
	});

	AmplifiedSession.setDefault('user', null);
  
	Template.lobby.helpers({
		isSignedIn: function () {
			return AmplifiedSession.get('user') !== null
				&& AmplifiedSession.get('user') !== undefined;
		},
	});
	
	Template.welcome.helpers({
		userName: function () {
			return AmplifiedSession.get('user').name;
		},
	});
	
	Template.welcome.events({
		"submit form": function (event, template) {
			AmplifiedSession.set('user', null);
		}
	});
	
	Template.signIn.events({
		"submit form": function (event, template) {
			var userName = event.target.userName.value;
			var user = Users.findOne( {name: userName} );
			if( user === null || user === undefined) {
				var userId = Users.insert({
					createdAt: new Date(),
					name: userName
				});
				
				user = Users.findOne(userId);
			}
			
			AmplifiedSession.set('user', user);
		}
	});
	
	Template.myGames.helpers({
		myGames: function () {
			return Games.find({players: {$elemMatch: {_id: AmplifiedSession.get('user')._id}}}).fetch();
		}
	});

	Template.joinGame.helpers({
		openGames: function () {
			return Games.find({
				status: "open",
				players: {$not: {$elemMatch: {_id: AmplifiedSession.get('user')._id}}},
				$where: "this.players.length < 4"
			}).fetch();
		},
		
		numberOfPlayers: function () {
			return this.players.length;
		}
	});
	
	Template.joinGame.events({
		"submit form": function (event, template) {
			var players = this.players;
			players.push(AmplifiedSession.get('user'));
			
			Games.update(this._id, {$set: {players: players}});
		}
	});

	Template.createGame.events({
		"submit form": function (event, template) {
			var gameName = event.target.gameName.value;
			Games.insert({
				creationTime: new Date(),
				creator: AmplifiedSession.get('user'),
				name: gameName,
				players: [AmplifiedSession.get('user')],
				status: "open",
				marketplace: [
					{ 
						name: "tavern",
						blue: 1,
						green: 1,
						red: 1,
						purple: 0,
						type: "structure",
						prereqs: []
					},
					{ 
						name: "meadhall",
						blue: 1,
						green: 1,
						red: 1,
						purple: 0,
						type: "structure",
						prereqs: ["tavern"]
					},
					{ 
						name: "skald",
						blue: 1,
						green: 1,
						red: 0,
						purple: 1,
						type: "clansman",
						prereqs: []
					},
					{ 
						name: "viking",
						blue: 0,
						green: 1,
						red: 1,
						purple: 1,
						type: "clansman",
						prereqs: []
					},
					{ 
						name: "attack",
						blue: 0,
						green: 1,
						red: 1,
						purple: 1,
						type: "action",
						prereqs: []
					},
					{ 
						name: "offering",
						blue: 1,
						green: 0,
						red: 1,
						purple: 1,
						type: "action",
						prereqs: []
					},
					{ 
						name: "longboat",
						blue: 1,
						green: 1,
						red: 1,
						purple: 1,
						type: "structure",
						prereqs: []
					},
				],
				sharedTracks: [
					{
						name: "Trading Post",
						buySlots: [
							{ 
								bought: false,
								available: true,
								cost: 1
							},
							{ 
								bought: false,
								available: false,
								cost: 2
							},
							{ 
								bought: false,
								available: false,
								cost: 3
							},
							{ 
								bought: false,
								available: false,
								cost: 4
							}
						],
						reset: true
					},
					{
						name: "Tribute to Jarl",
						buySlots: [
							{ 
								bought: false,
								available: true,
								cost: 1
							},
							{ 
								bought: false,
								available: false,
								cost: 2
							},
							{ 
								bought: false,
								available: false,
								cost: 3
							},
							{ 
								bought: false,
								available: false,
								cost: 4
							}
						],
						reset: true
					},
					{
						name: "End Game",
						buySlots: [
							{ 
								bought: false,
								available: true,
								cost: 1
							},
							{ 
								bought: false,
								available: false,
								cost: 1
							},
							{ 
								bought: false,
								available: false,
								cost: 2
							},
							{ 
								bought: false,
								available: false,
								cost: 2
							}
						],
						reset: false
					},
					{
						name: "Lead Viking",
						buySlots: [
							{ 
								bought: false,
								available: true,
								cost: 1
							},
							{ 
								bought: false,
								available: false,
								cost: 2
							},
							{ 
								bought: false,
								available: false,
								cost: 3
							},
							{ 
								bought: false,
								available: false,
								cost: 4
							}
						],
						reset: true
					},
				],
				omens: [
					"common",
					"common",
					"common",
					"common",
					"common",
					"common",
					"common",
					"common",
					"common",
					"common",
					"rare",
					"rare",
					"rare",
					"rare",
					"rare",
					"war",
					"war",
					"war",
					"war",
					"war",
					"chaos"
				],
				offerings: [
					"smite",
					"bounty",
					"scourge",
					"honor",
					"fortune",
					"valkyrie"
				]
			});
		}
	});
	
	Template.game.helpers({
		numberOfPlayers: function() {
			return this.players.length;
		},
		
		canStart: function() {
			return this.status === "open";
		},
		
		isStarted: function() {
			return this.status === "started";
		},
		
		isComplete: function() {
			return this.status === "complete";
		},
		
		inSetupStep: function() {
			return this.currentState !== undefined
				&& this.currentState !== null
				&& this.currentState.step === "setup";
		},
		
		inPlayStep: function() {
			return this.currentState !== undefined
				&& this.currentState !== null
				&& this.currentState.step === "play";
		},
		
		isCurrentPlayer: function() {
			var currentPlayerIndex = Template.parentData(1).currentState.currentPlayerIndex;
			var currentPlayer = Template.parentData(1).currentState.players[currentPlayerIndex].user;
			return currentPlayer._id === this.user._id;
		},
		
		isUser: function() {
			return AmplifiedSession.get('user')._id === this.user._id;
		}
	});
	
	Template.game.events({
		"click button.start-game": function (event, template) {		
			Games.update(this._id, {$set: {status: "started"}});
			var turnOrder = shuffle(this.players)
			var omenDeck = shuffle(this.omens);
			var offeringDeck = shuffle(this.offerings);
			var gamePlayers = [];
			for(var i = 0; i < turnOrder.length; i++) {
				gamePlayers.push({
					user: turnOrder[i],
					leadViking: i === 0,
					lastViking: i === turnOrder.length - 1,
					usingTradingPost: false,
					usingTradingPostStep1: false,
					givingSkald: false,
					raiding: false,
					decidingWhoToRaid: false,
					raidTargetUserId: null,
					decidingHowToRaid: false,
					raidTakeNumLeft: 0,
					waitingForDefender: false,
					defendingBurn: false,
					choosingWhatToBurn: false,
					resourcesLeftToCovert: 0,
					collectingBounty: false,
					smiting: false,
					decidingWhoToSmite: false,
					smiteTargetUserId: null,
					valkyring: false,
					decidingWhoToValkyrie: false,
					valkyrieTargetUserId: null,
					resourcesLeftToScourge: 0,
					resourcePicks: {
						rare: null,
						common: null,
					},
					stash: {
						blue: 0,
						green: 0,
						red: 0,
						purple: 0,
						geld: 0,
						gods: 0,
						prestige: 0,
						einherjar: 0,
						weregeld: 0
					},
					structures: {
						tavern: 0,
						meadhall: 0,
						longboat: 0
					},
					structureUses: {
						tavern: 0,
						meadhall: 0
					},
					purchased: {
						tavern: 0,
						meadhall: 0,
						longboat: 0
					},
					clansmen: {
						skald: 0,
						viking: 0
					},
					weregeldOwed: []
				})
			}
			Games.update(this._id, {$set: {
				currentState:{
					step:"setup",
					players: gamePlayers,
					currentPlayerIndex: 0,
					availableCommonResources: ['blue', 'green', 'red', 'purple'],
					availableRareResources: ['blue', 'green', 'red', 'purple'],
					sharedTracks: this.sharedTracks,
					omenDeck: omenDeck,
					playedOmens: [],
					offeringDeck: offeringDeck,
					playedOfferings: []
				}
			}});
		},
		
		"submit form": function (event, template) {
			var players = this.players.filter(function( user ) {
				return user._id !== AmplifiedSession.get('user')._id;
			});
			
			Games.update(this._id, {$set: {players: players}});
		}
	});
	
	Template.setupStep.helpers({
		isUsersTurn: function() {
			var currentPlayerIndex = Template.parentData(1).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(1).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id;
		},
		
		needToPickCommon: function() {
			var players = Template.parentData(0).currentState.players;
			for(var i = 0; i < players.length; i++){
				if(players[i].resourcePicks.common === null) {
					return true;
				}
			}
			return false;
		}
	});
	
	Template.setupStep.events({
		"click button.pick-common": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var pickedResource = this.toString();
			
			var availableCommonResources = game.currentState.availableCommonResources;			
			var pickedResourceIndex = availableCommonResources.indexOf(pickedResource);
			availableCommonResources.splice(pickedResourceIndex, 1);
			Games.update(gameId, {$set: {"currentState.availableCommonResources": availableCommonResources}});
			
			var players = game.currentState.players;
			players[currentPlayerIndex].resourcePicks.common = pickedResource;
			Games.update(gameId, {$set: {"currentState.players": players}});
			
			var numPlayers = game.currentState.players.length;
			currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers
			Games.update(gameId, {$set: {"currentState.currentPlayerIndex": currentPlayerIndex}});
		},
		
		"click button.pick-rare": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var pickedResource = this.toString();
			
			var availableRareResources = game.currentState.availableRareResources;			
			var pickedResourceIndex = availableRareResources.indexOf(pickedResource);
			availableRareResources.splice(pickedResourceIndex, 1);
			Games.update(gameId, {$set: {"currentState.availableRareResources": availableRareResources}});
			
			var players = game.currentState.players;
			players[currentPlayerIndex].resourcePicks.rare = pickedResource;
			Games.update(gameId, {$set: {"currentState.players": players}});
			
			var allRaresPicked = true;
			for(var i = 0; i < players.length; i++){
				if(players[i].resourcePicks.rare === null) {
					allRaresPicked = false;
				}
			}
			if(allRaresPicked){
				Games.update(gameId, {$set: {"currentState.currentPlayerIndex": 0}});
				Games.update(gameId, {$set: {"currentState.step": "play"}});
				var playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
				while(playedOmen === "chaos")
				{
					game.currentState.playedOmens = [];
					game.currentState.omenDeck = shuffle(game.omens);
					playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
				}
				game.currentState.playedOmens.push(playedOmen);
				switch(playedOmen){
					case "common":
						var players = game.currentState.players;
						for(var i = 0; i < players.length; i++) {
							var commonResource = players[i].resourcePicks.common;
							players[i].stash[commonResource] = players[i].stash[commonResource] + 1;
						}
						Games.update(gameId, {$set: {"currentState.players": players}});
						break;
					case "rare":
						var players = game.currentState.players;
						for(var i = 0; i < players.length; i++) {
							var rareResource = players[i].resourcePicks.rare;
							players[i].stash[rareResource] = players[i].stash[rareResource] + 1;
						}
						Games.update(gameId, {$set: {"currentState.players": players}});
						break;
					case "war":
						break;
				}
				Games.update(gameId, {$set: {"currentState.omenDeck": game.currentState.omenDeck}});
				Games.update(gameId, {$set: {"currentState.playedOmens": game.currentState.playedOmens}});
			} else {
				var numPlayers = game.currentState.players.length;
				currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers
				Games.update(gameId, {$set: {"currentState.currentPlayerIndex": currentPlayerIndex}});
			}
		},
	});
	
	Template.playStep.helpers({
		isUser: function() {
			return AmplifiedSession.get('user')._id === this.user._id;
		},
		
		isUsersTurn: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id;
		},
		
		isUsersTurn2: function() {
			var currentPlayerIndex = Template.parentData(1).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(1).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id;
		},
		
		isUsersTurn3: function() {
			var currentPlayerIndex = Template.parentData(2).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(2).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id;
		},
		
		currentPlayerTrading: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].usingTradingPost;
		},
		
		currentPlayerTradingStep1: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].usingTradingPostStep1;
		},
		
		currentPlayerGivingSkald: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].givingSkald;
		},
		
		currentPlayerRaiding: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].raiding;
		},
		
		currentPlayerDecidingWhoToRaid: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].decidingWhoToRaid;
		},
		
		currentPlayerDecidingHowToRaid: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].decidingHowToRaid;
		},
		
		currentPlayerWaitingOnDefender: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].waitingForDefender;
		},
		
		currentPlayerDecidingWhatToBurn: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].choosingWhatToBurn;
		},
		
		currentUserUnderAttack: function() {
			var players = Template.parentData(0).currentState.players;
			var userPlayer;
			for(var i = 0; i < players.length; i++) {
				if(AmplifiedSession.get('user')._id === players[i].user._id){
					userPlayer = players[i];
				}
			}
			return userPlayer.defendingBurn;
		},
		
		currentUserDecidingWhatToTake: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].raidTakeNumLeft > 0 && !Template.parentData(0).currentState.players[currentPlayerIndex].waitingForDefender && !Template.parentData(0).currentState.players[currentPlayerIndex].choosingWhatToBurn;
		},
		
		currentUserCollectingBounty: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].collectingBounty;
		},
		
		currentUserSmiting: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].smiting;
		},
		
		currentPlayerDecidingWhoToSmite: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].decidingWhoToSmite;
		},
		
		currentPlayerDecidingWhatToSmite: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].smiteTargetUserId !== null;
		},
		
		currentUserValkyring: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].valkyring;
		},
		
		currentPlayerDecidingWhoToValkyrie: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].decidingWhoToValkyrie;
		},
		
		currentPlayerDecidingWhatToValkyrie: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].valkyrieTargetUserId !== null;
		},
					
		canTrade: function() {
			var currentPlayerIndex = Template.parentData(1).currentState.currentPlayerIndex;
			var currentPlayerUser = Template.parentData(1).currentState.players[currentPlayerIndex].user;
			var currentUser = AmplifiedSession.get('user');
			var selectedUser = this.user;
			
			// You can't ever trade with yourself
			if(currentUser._id === selectedUser._id) {
				return false;
			}
			
			// You can trade with the person whose turn it is
			if(selectedUser._id === currentPlayerUser._id) {
				return true;
			}
			
			// If it is your turn, you can trade with anyone
			if(currentUser._id === currentPlayerUser._id) {
				return true;
			}
			
			return false;
		},
		
		currentUserWeregeld: function() {
			var players = Template.parentData(0).currentState.players;
			var userPlayer;
			for(var i = 0; i < players.length; i++) {
				if(AmplifiedSession.get('user')._id === players[i].user._id){
					userPlayer = players[i];
				}
			}
			return userPlayer.weregeldOwed;
		},
		
		currentUserConvertingResources: function() {
			var currentPlayerIndex = Template.parentData(0).currentState.currentPlayerIndex;
			var currentUser = Template.parentData(0).currentState.players[currentPlayerIndex].user;
			return AmplifiedSession.get('user')._id === currentUser._id && Template.parentData(0).currentState.players[currentPlayerIndex].resourcesLeftToCovert > 0
		},
		
		currentUserBeingScourged: function() {
			var players = Template.parentData(0).currentState.players;
			var userPlayer;
			for(var i = 0; i < players.length; i++) {
				if(AmplifiedSession.get('user')._id === players[i].user._id){
					userPlayer = players[i];
				}
			}
			return userPlayer.resourcesLeftToScourge > 0;
		}
	});
	
	Template.playStep.events({
		"click button.raid-common": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			for(var i = 0; i < players.length; i++) {
				var commonResource = players[i].resourcePicks.common;
				players[i].stash[commonResource] = players[i].stash[commonResource] + 1;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.raid-rare": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			for(var i = 0; i < players.length; i++) {
				var rareResource = players[i].resourcePicks.rare;
				players[i].stash[rareResource] = players[i].stash[rareResource] + 1;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.end-turn": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var i;
			
			var numPlayers = game.currentState.players.length;
				
			if(game.currentState.players[currentPlayerIndex].lastViking)
			{
				game.currentState.players[currentPlayerIndex].lastViking = false;
				for(i = 0; i < game.currentState.players.length; i++) {
					if(game.currentState.players[i].leadViking) {
						currentPlayerIndex = i;
						Games.update(gameId, {$set: {"currentState.currentPlayerIndex": currentPlayerIndex}});
						
						lastVikingIndex = (numPlayers + i -1) % numPlayers
						game.currentState.players[lastVikingIndex].lastViking = true;
						Games.update(gameId, {$set: {"currentState.players": game.currentState.players}});
						break;
					}
				}
				
				for(i = 0; i < game.currentState.players.length; i++) {
					game.currentState.players[i].structures["tavern"] = game.currentState.players[i].structures["tavern"] + game.currentState.players[i].purchased["tavern"];
					game.currentState.players[i].structures["meadhall"] = game.currentState.players[i].structures["meadhall"] + game.currentState.players[i].purchased["meadhall"];
					game.currentState.players[i].structures["longboat"] = game.currentState.players[i].structures["longboat"] + game.currentState.players[i].purchased["longboat"];
					game.currentState.players[i].purchased["tavern"] = 0;
					game.currentState.players[i].purchased["meadhall"] = 0;
					game.currentState.players[i].purchased["longboat"] = 0;
				}
				Games.update(gameId, {$set: {"currentState.players": game.currentState.players}});
				
				for(i = 0; i < game.currentState.sharedTracks.length; i++)
				{
					if(game.currentState.sharedTracks[i].reset) {
						game.currentState.sharedTracks[i] = game.sharedTracks[i];
					}
					if(game.currentState.sharedTracks[i].name === "End Game") {
						if(game.currentState.sharedTracks[i].buySlots[game.currentState.sharedTracks[i].buySlots.length -1].bought)
						{
							Games.update(gameId, {$set: {"status": "complete"}});
						}
					}
				}
				Games.update(gameId, {$set: {"currentState.sharedTracks": game.currentState.sharedTracks}});
				
				game.currentState.playedOfferings = [];
				game.currentState.offeringDeck = shuffle(game.offerings);
				Games.update(gameId, {$set: {"currentState.offeringDeck": game.currentState.offeringDeck}});
				Games.update(gameId, {$set: {"currentState.playedOfferings": game.currentState.playedOfferings}});
			} else {
				currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers
				Games.update(gameId, {$set: {"currentState.currentPlayerIndex": currentPlayerIndex}});
			}

			for(i = 0; i < game.currentState.players.length; i++) {
				game.currentState.players[i].structureUses["tavern"] = game.currentState.players[i].structures["tavern"];
				game.currentState.players[i].structureUses["meadhall"] = game.currentState.players[i].structures["meadhall"];
			}
			Games.update(gameId, {$set: {"currentState.players": game.currentState.players}});

			var playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
			while(playedOmen === "chaos")
			{
				game.currentState.playedOmens = [];
				game.currentState.omenDeck = shuffle(game.omens);
				playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
			}
			game.currentState.playedOmens.push(playedOmen);
			Games.update(gameId, {$set: {"currentState.omenDeck": game.currentState.omenDeck}});
			Games.update(gameId, {$set: {"currentState.playedOmens": game.currentState.playedOmens}});
			switch(playedOmen){
				case "common":
					var players = game.currentState.players;
					for(var i = 0; i < players.length; i++) {
						var commonResource = players[i].resourcePicks.common;
						players[i].stash[commonResource] = players[i].stash[commonResource] + 1 + players[i].structures["longboat"];
					}
					Games.update(gameId, {$set: {"currentState.players": players}});
					break;
				case "rare":
					var players = game.currentState.players;
					for(var i = 0; i < players.length; i++) {
						var rareResource = players[i].resourcePicks.rare;
						players[i].stash[rareResource] = players[i].stash[rareResource] + 1 + players[i].structures["longboat"];
					}
					Games.update(gameId, {$set: {"currentState.players": players}});
					break;
				case "war":
					game.currentState.players[currentPlayerIndex].raiding = true;
					game.currentState.players[currentPlayerIndex].decidingWhoToRaid = true;
					Games.update(gameId, {$set: {"currentState.players": game.currentState.players}});
					break;
			}
		},
		
		"click button.convert-to-rare": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var commonResource = player.resourcePicks.common;
			var rareResource = player.resourcePicks.rare;
			
			player.stash[commonResource] = player.stash[commonResource] - 2;
			player.stash[rareResource] = player.stash[rareResource] + 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.convert-to-geld": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			player.stash["geld"] = player.stash["geld"] + 1;
			player.resourcesLeftToCovert = 4;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.convert": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var resource = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			player.stash[resource] = player.stash[resource] - 1;
			player.resourcesLeftToCovert = player.resourcesLeftToCovert - 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.buy-track": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var trackName = event.target.value;
			var sharedTracks = game.currentState.sharedTracks;
			var track;
			
			for(var i = 0; i < sharedTracks.length; i++) {
				if(sharedTracks[i].name === trackName) {
					track = sharedTracks[i];
					break;
				}
			}

			for(i = 0; i < track.buySlots.length; i++) {
				if(track.buySlots[i].available === true) {
					track.buySlots[i].available = false;
					track.buySlots[i].bought = true;
					i++;
					if(i < track.buySlots.length) {
						track.buySlots[i].available = true;
					}
					break;
				}
			}
			
			Games.update(gameId, {$set: {"currentState.sharedTracks": sharedTracks}});
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];			
			player.stash["geld"] = player.stash["geld"] - this.cost;
			Games.update(gameId, {$set: {"currentState.players": players}});
			
			switch(trackName){
				case "Trading Post":
					player.usingTradingPost = true;
					player.usingTradingPostStep1 = true;
					Games.update(gameId, {$set: {"currentState.players": players}});
					break;
				case "Tribute to Jarl":
					player.stash["prestige"] = player.stash["prestige"] + 1;
					Games.update(gameId, {$set: {"currentState.players": players}});
					break;
				case "End Game":
					break;
				case "Lead Viking":
					for(i = 0; i < players.length; i++) {
						players[i].leadViking = false;
					}
					player.leadViking = true;
					Games.update(gameId, {$set: {"currentState.players": players}});
					break;
			}
			
		},
		
		"click button.buy-marketplace": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var itemName = event.target.value;
			var item;
			
			for(var i = 0; i < game.marketplace.length; i++) {
				if(game.marketplace[i].name === itemName) {
					item = game.marketplace[i];
					break;
				}
			}
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			
			for(i = 0; i < item.prereqs.length; i++) {
				player.structures[item.prereqs[i]] = player.structures[item.prereqs[i]] - 1;
			}
						
			player.stash.blue = player.stash.blue - item.blue;
			player.stash.green = player.stash.green - item.green;
			player.stash.red = player.stash.red - item.red;
			player.stash.purple = player.stash.purple - item.purple;
			Games.update(gameId, {$set: {"currentState.players": players}});
			
			switch(item.type){
				case "structure":
					player.purchased[item.name] = player.purchased[item.name] + 1;
					break;
				case "clansman":
					player.clansmen[item.name] = player.clansmen[item.name] + 1;
					break;
				case "action":
					switch(item.name) {
						case "attack":
							if(player.clansmen["viking"] > 0) {
								player.raiding = true;
								player.decidingWhoToRaid = true;
							}
							break;
						case "offering":
							var playedOffering = game.currentState.offeringDeck.splice(0, 1).toString();
							game.currentState.playedOfferings.push(playedOffering);
							Games.update(gameId, {$set: {"currentState.offeringDeck": game.currentState.offeringDeck}});
							Games.update(gameId, {$set: {"currentState.playedOfferings": game.currentState.playedOfferings}});
							switch(playedOffering){
								case "smite":
									player.smiting = true;
									player.decidingWhoToSmite = true;
									Games.update(gameId, {$set: {"currentState.players": players}});
									break;
								case "bounty":
									player.collectingBounty = true;
									Games.update(gameId, {$set: {"currentState.players": players}});
									break;
								case "scourge":
									for(i = 0; i < players.length; i++) {
										if(players[i].user._id !== player.user._id) {
											var geldToScourge = Math.floor(players[i].stash["geld"]/2);
											var totalResources = players[i].stash["blue"] + players[i].stash["green"] + players[i].stash["red"] + players[i].stash["purple"];
											var resourcesToScourge = Math.floor(totalResources/2);
											players[i].stash["geld"] = players[i].stash["geld"] - geldToScourge
											players[i].resourcesLeftToScourge = resourcesToScourge;
										}
									}
									Games.update(gameId, {$set: {"currentState.players": players}});
									break;
								case "honor":
									var sharedTracks = game.currentState.sharedTracks;
									var track;
									for(i = 0; i < sharedTracks.length; i++) {
										if(sharedTracks[i].name === "Tribute to Jarl") {
											track = sharedTracks[i];
											break;
										}
									}
									
									for(i = 0; i < track.buySlots.length; i++) {
										if(track.buySlots[i].available === true) {
											track.buySlots[i].available = false;
											track.buySlots[i].bought = true;
											i++;
											if(i < track.buySlots.length) {
												track.buySlots[i].available = true;
											}
											break;
										}
									}
									Games.update(gameId, {$set: {"currentState.sharedTracks": sharedTracks}});
									
									player.stash["prestige"] = player.stash["prestige"] + 1;
									Games.update(gameId, {$set: {"currentState.players": players}});
									break;
								case "fortune":
									var geldEarned = 2;
									for(i = 0; i < players.length; i++) {
										if(players[i].user._id !== player.user._id) {
											geldEarned = geldEarned + players[i].structures["tavern"];
											geldEarned = geldEarned + players[i].structures["meadhall"];
										}
									}
									player.stash["geld"] = player.stash["geld"] + geldEarned;
									Games.update(gameId, {$set: {"currentState.players": players}});
									break;
								case "valkyrie":
									player.valkyring = true;
									player.decidingWhoToValkyrie = true;
									player.stash["gods"] = player.stash["gods"] + 1;
									Games.update(gameId, {$set: {"currentState.players": players}});
									break;
							}
							break;
					}					
					break;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.trade-away": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var resource = event.target.value
			
			player.stash[resource] = player.stash[resource] - 1;		
			player.usingTradingPostStep1 = false;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.trade-for": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var resource = event.target.value
			
			player.stash[resource] = player.stash[resource] + 1;		
			player.usingTradingPost = false;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.activate-tavern": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			
			var players = game.currentState.players;
			var player;
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === AmplifiedSession.get('user')._id) {
					player = players[i];
				}
			}
			
			var rareResource = player.resourcePicks.rare;
			player.stash[rareResource] = player.stash[rareResource] - 1;
			player.stash["geld"] = player.stash["geld"] + 1;
			player.structureUses["tavern"] = player.structureUses["tavern"] - 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.activate-meadhall": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			
			var players = game.currentState.players;
			var player;
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === AmplifiedSession.get('user')._id) {
					player = players[i];
				}
			}
			
			var commonResource = player.resourcePicks.common;
			player.stash[commonResource] = player.stash[commonResource] - 1;
			player.stash["geld"] = player.stash["geld"] + 1;
			player.structureUses["meadhall"] = player.structureUses["meadhall"] - 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.sacrifice-skald": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];

			var rareResource = player.resourcePicks.rare;
			player.stash[rareResource] = player.stash[rareResource] - 1;
			player.clansmen["skald"] = player.clansmen["skald"] - 1;
			player.stash["gods"] = player.stash["gods"] + 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.sacrifice-viking": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];

			var rareResource = player.resourcePicks.rare;
			player.stash[rareResource] = player.stash[rareResource] - 1;
			player.clansmen["viking"] = player.clansmen["viking"] - 1;
			if(player.clansmen["skald"] > 0) {
				player.stash["einherjar"] = player.stash["einherjar"] + 1;
			}
			alert("You should get an offering");
			
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.perform-skald": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];

			player.clansmen["skald"] = player.clansmen["skald"] - 1;
			player.givingSkald = true;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.give-skald": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var recipientId = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var geldEarned = 0;
			var recipient;
			
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === recipientId) {
					recipient = players[i];
				}
				if(i === currentPlayerIndex) {
					geldEarned = geldEarned - players[i].structures["tavern"];
					geldEarned = geldEarned - players[i].structures["meadhall"];
				} else {
					geldEarned = geldEarned + players[i].structures["tavern"];
					geldEarned = geldEarned + players[i].structures["meadhall"];
				}
			}

			recipient.clansmen["skald"] = recipient.clansmen["skald"] + 1;
			if(geldEarned > 1) {
				player.stash["geld"] = player.stash["geld"] + geldEarned;
			} else {
				player.stash["geld"] = player.stash["geld"] + 1;
			}
			player.givingSkald = false;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.give-resource": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var givingPlayerId = AmplifiedSession.get('user')._id;
			var data = event.target.value;
			var resourceName = data.split(":")[0];
			var receivingPlayerId = data.split(":")[1];
			
			var players = game.currentState.players;
			var givingPlayer;
			var receivingPlayer;
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === givingPlayerId) {
					givingPlayer = players[i];
				}
				if(players[i].user._id === receivingPlayerId) {
					receivingPlayer = players[i];
				}
			}
			
			givingPlayer.stash[resourceName] = givingPlayer.stash[resourceName] - 1;
			receivingPlayer.stash[resourceName] = receivingPlayer.stash[resourceName] + 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.choose-who-to-raid": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var targetId = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			
			if(targetId === ""){
				player.decidingWhoToRaid = false;
				player.raiding = false;
			} else {
				player.decidingWhoToRaid = false;
				player.raidTargetUserId = targetId;
				player.decidingHowToRaid = true;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.choose-how-to-raid": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var action = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var target;
			for(var i = 0; i < players.length; i++)
			{
				if(players[i].user._id === player.raidTargetUserId) {
					target = players[i];
					break;
				}
			}
			
			player.decidingHowToRaid = false;
			switch(action){
				case "take":
					player.raidTakeNumLeft = player.clansmen["viking"];
					break;
				case "burn":
					if(target.clansmen["viking"] > 0){
						player.waitingForDefender = true;
						target.defendingBurn = true;
					} else {
						player.choosingWhatToBurn = true;
					}
					break;
				case "both":
					player.raidTakeNumLeft = player.clansmen["viking"];
					if(target.clansmen["viking"] > 0){
						player.waitingForDefender = true;
						target.defendingBurn = true;
					} else {
						player.choosingWhatToBurn = true;
					}
					break;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.burn-structure": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var structure = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var target;
			for(var i = 0; i < players.length; i++)
			{
				if(players[i].user._id === player.raidTargetUserId) {
					target = players[i];
					break;
				}
			}
			
			player.choosingWhatToBurn = false;
			targetResourcesLeft = target.stash["blue"] + target.stash["green"] + target.stash["red"] + target.stash["purple"];
			if(player.raidTakeNumLeft <= 0 || targetResourcesLeft <= 0) {
				player.raiding = false;
				player.raidTargetUserId = null;
				player.raidTakeNumLeft = 0;
			}
			player.stash["weregeld"] = player.stash["weregeld"] + 1;
			player.weregeldOwed.push(target);
			target.structures[structure] = target.structures[structure] - 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.steal-resource": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var resource = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var target;
			for(var i = 0; i < players.length; i++)
			{
				if(players[i].user._id === player.raidTargetUserId) {
					target = players[i];
					break;
				}
			}
			
			player.stash[resource] = player.stash[resource] + 1;
			target.stash[resource] = target.stash[resource] - 1;
			player.raidTakeNumLeft = player.raidTakeNumLeft - 1;
			targetResourcesLeft = target.stash["blue"] + target.stash["green"] + target.stash["red"] + target.stash["purple"];
			if(player.raidTakeNumLeft <= 0 || targetResourcesLeft <= 0) {
				player.raiding = false;
				player.raidTargetUserId = null;
				player.raidTakeNumLeft = 0;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.defend-attack": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var attackerIndex = game.currentState.currentPlayerIndex;
			var willDefend = event.target.value;

			var players = game.currentState.players;
			var attacker = players[attackerIndex];
			var defender;
			for(var i = 0; i < players.length; i++)
			{
				if(players[i].user._id === AmplifiedSession.get('user')._id) {
					defender = players[i];
					break;
				}
			}
			
			switch(willDefend) {
				case "true":
					defenderResourcesLeft = defender.stash["blue"] + defender.stash["green"] + defender.stash["red"] + defender.stash["purple"];
					if(attacker.raidTakeNumLeft <= 0 || defenderResourcesLeft <= 0) {
						attacker.raiding = false;
						attacker.raidTargetUserId = null;
						attacker.raidTakeNumLeft = 0;
					}
					attacker.waitingForDefender = false;
					attacker.choosingWhatToBurn = false;
					defender.defendingBurn = false;
					defender.clansmen["viking"] = defender.clansmen["viking"] - 1;
					defender.stash["einherjar"] = defender.stash["einherjar"] + 1;
					break;
				case "false":
					attacker.waitingForDefender = false;
					attacker.choosingWhatToBurn = true;
					defender.defendingBurn = false;
					break;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.reset-raids": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			
			var players = game.currentState.players;
			for(var i = 0; i < players.length; i++)
			{
				players[i].raiding = false;
				players[i].decidingWhoToRaid = false;
				players[i].raidTargetUserId = null;
				players[i].decidingHowToRaid = false;
				players[i].raidTakeNumLeft = 0;
				players[i].waitingForDefender = false;
				players[i].defendingBurn = false;
				players[i].choosingWhatToBurn = false;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.reset-offerings": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			
			var players = game.currentState.players;
			for(var i = 0; i < players.length; i++)
			{
				players[i].collectingBounty = false;
				players[i].smiting = false;
				players[i].decidingWhoToSmite = false;
				players[i].smiteTargetUserId = null;
				players[i].valkyring = false;
				players[i].decidingWhoToValkyrie = false;
				players[i].valkyrieTargetUserId = null;
				players[i].resourcesLeftToScourge = 0;
			}
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.pay-weregeld": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var payeeId = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var payee;
			for(var i = 0; i < players.length; i++)
			{
				if(players[i].user._id === payeeId) {
					payee = players[i];
				}
			}
			
			var playerPrestige = player.stash["prestige"];
			if(playerPrestige >= 0) {
				player.stash["geld"] = player.stash["geld"] - playerPrestige;
			} else {
				player.stash["geld"] = player.stash["geld"] - 1;
			}
			player.stash["weregeld"] = player.stash["weregeld"] - 1;
			payee.stash["geld"] = payee.stash["geld"] + playerPrestige;
			var weregeldPayedIndex;
			for(i = 0; i < player.weregeldOwed.length; i++)
			{
				if(player.weregeldOwed[i].user._id === payeeId){
					weregeldPayedIndex = i;
				}
			}
			player.weregeldOwed.splice(weregeldPayedIndex, 1);
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.collect-bounty": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var resource = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var resourceCount = 2;
			for(var i = 0; i < players.length; i++)
			{
				if(players[i].user._id !== player.user._id) {
					resourceCount = resourceCount + players[i].structures["longboat"];
				}
			}

			player.stash[resource] = player.stash[resource] + resourceCount;
			player.collectingBounty = false;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.choose-who-to-smite": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var targetId = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			
			if(targetId === "") {
				player.smiting = false;
				player.decidingWhoToSmite = false;
				player.stash["gods"] = player.stash["gods"] + 1;
			} else {
				player.decidingWhoToSmite = false;
				player.smiteTargetUserId = targetId;
			}

			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.choose-what-to-smite": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var structure = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var target;
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === player.smiteTargetUserId) {
					target = players[i];
					break;
				}
			}
			
			player.stash["weregeld"] = player.stash["weregeld"] + 1;
			player.weregeldOwed.push(target);
			target.structures[structure] = target.structures[structure] - 1;
			player.smiting = false;
			player.smiteTargetUserId = null;

			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.choose-who-to-valkyrie": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var targetId = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			
			if(targetId === "") {
				player.valkyring = false;
				player.decidingWhoToValkyrie = false;
			} else {
				player.decidingWhoToValkyrie = false;
				player.valkyrieTargetUserId = targetId;
			}

			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.choose-what-to-valkyrie": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var currentPlayerIndex = game.currentState.currentPlayerIndex;
			var clansman = event.target.value;
			
			var players = game.currentState.players;
			var player = players[currentPlayerIndex];
			var target;
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === player.valkyrieTargetUserId) {
					target = players[i];
					break;
				}
			}
			
			target.clansmen[clansman] = target.clansmen[clansman] - 1;
			if(clansman === "viking") {
				target.stash["einherjar"] = target.stash["einherjar"] + 1;
			}
			player.valkyring = false;
			player.valkyrieTargetUserId = null;

			Games.update(gameId, {$set: {"currentState.players": players}});
		},
		
		"click button.scourge-resource": function (event, template) {
			var game = Template.parentData(0);
			var gameId = game._id;
			var resource = event.target.value;
			
			var players = game.currentState.players;
			var player;
			for(var i = 0; i < players.length; i++) {
				if(players[i].user._id === AmplifiedSession.get("user")._id) {
					player = players[i];
					break;
				}
			}
			
			player.stash[resource] = player.stash[resource] - 1;
			player.resourcesLeftToScourge = player.resourcesLeftToScourge - 1;
			Games.update(gameId, {$set: {"currentState.players": players}});
		},
	});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
