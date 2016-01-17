"use strict";

////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////

var BLUE = "blue",
  GREEN = "green",
  RED = "red",
  PURPLE = "purple",
  GELD = "geld",
  PRESTIGE = "prestige",
  GODS = "gods",
  EINHERJAR = "einherjar",
  WEREGELD = "weregeld",
  TAVERN = "tavern",
  MEAD_HALL = "meadhall",
  LONGBOAT = "longboat",
  SKALD = "skald",
  VIKING = "viking",
  ATTACK = "attack",
  OFFERING = "offering",
  STRUCTURE = "structure",
  CLANSMAN = "clansman",
  ACTION = "action",
  COMMON = "common",
  RARE = "rare",
  WAR = "war",
  CHAOS = "chaos",
  FORTUNE = "fortune",
  HONOR = "honor",
  SMITE = "smite",
  VALKYRIE = "valkyrie",
  SCOURGE = "scourge",
  BOUNTY = "bounty",
  TRADING_POST = "Trading Post",
  TRIBUTE = "Tribute to Jarl",
  END_GAME = "End Game",
  LEAD_VIKING = "Lead Viking",
  STEP_SETUP = "setup",
  STEP_PLAY = "play";

////////////////////////////////////////////////////////////////////////////////
// Initialize collections
////////////////////////////////////////////////////////////////////////////////

// The Games collection contains all the games.
var Games = new Mongo.Collection("games");
// The Users collection contains all the registered users.
var Users = new Mongo.Collection("users");

////////////////////////////////////////////////////////////////////////////////
// Configure routes
//
// This uses the IronRouter package for client side routing to specific
// templates.
////////////////////////////////////////////////////////////////////////////////

// The default page is the lobby.
Router.route('/', function() {
  this.render('lobby');
});

// The lobby.  Before loggin in, it is a sign in screen. After loggin in, it
// shows current games, games available to join, and allows game creation.
Router.route('/lobby', function() {
  this.render('lobby');
});

// The game screen. This is where games are played from start to finish. Games
// can be accessed by their unique ids.
Router.route('/games/:_id', function() {
  var game = Games.findOne({
    _id: this.params._id
  });
  this.render('game', {
    data: game
  });
});

// A TODO page. This contains the running list of development tasks to improve
// playing the game online.
Router.route('/todo', function() {
  this.render('todo');
});

////////////////////////////////////////////////////////////////////////////////
// Utility functions
////////////////////////////////////////////////////////////////////////////////

// Reorder an array. The array passed in will be modified
// as well as returned. This is currenlty
function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue, randomIndex;

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

////////////////////////////////////////////////////////////////////////////////
// Game Helpers
////////////////////////////////////////////////////////////////////////////////

// Returns the player object for the player whose turn it is for the game
// passed in. This function is in no way based on who the currently logged in
// user is for this client.
function getCurrentPlayer(game) {
  var currentPlayerIndex = game.currentState.currentPlayerIndex;
  var players = game.currentState.players;
  var currentPlayer = players[currentPlayerIndex];

  return currentPlayer;
}

// Returns the player object for the user who is currently logged in. This
// function is in no way based on which player's turn it currently is. Note
// that this returns the player object, not the user object.
function getUserPlayer(game) {
  return getPlayerFromUserId(game, AmplifiedSession.get(USER)._id);
}

// Returns the player object whose user has the given userId. Note this returns
// the player object, not the user object.
function getPlayerFromUserId(game, userId) {
  var players = game.currentState.players;

  for (var i = 0; i < players.length; i++) {
    if (players[i].user._id === userId) {
      return players[i];
    }
  }
}

// Modifies the game passed in so that it is the next players turn. This
// method does not return anything.
//
// The backwards parameter is optional and defaults to false. If true is
// passed in, the turn goes backwards one player instead of forwards.
function advanceTurn(game, backwards) {
  var currentPlayerIndex = game.currentState.currentPlayerIndex;
  var numPlayers = game.currentState.players.length;
  backwards = backwards || false;

  if(backwards) {
    currentPlayerIndex = (numPlayers + currentPlayerIndex - 1) % numPlayers;
  } else {
    currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
  }

  game.currentState.currentPlayerIndex = currentPlayerIndex;
}

// Adds (or subtracts if negative) a given number of a given type of resource
// from the given player. This does not return anything.
function giveResources(player, resource, numberOfResources){
  player.stash[resource] = player.stash[resource] + numberOfResources;
}

// Transfers a given number of a given type of resource from one player to
// another player. This does not return anything.
function transferResources(fromPlayer, toPlayer, resource, numberOfResources){
  giveResources(fromPlayer, resource, -1 * numberOfResources);
  giveResources(toPlayer, resource, numberOfResources);
}

// Draw an omen card off the top of the deck and perform its effect. This
// modifies the omen deck and the list of played omens. If a chaos omen is
// drawn, the deck will be reshuffled and second omen will automatically be
// drawn and played. This modifies the passsed in game, but does not return
// anything.
function drawOmen(game) {
  // Remove the top omen from the omen deck.
  var playedOmen = game.currentState.omenDeck.splice(0, 1).toString();

  // If we get a chaos omen, keep drawing until we get a different omen.
  // Before drawing again, clear the played omens and make a new,
  // re-shuffled omen deck. Once we have our non-chaos omen, put it with the
  // played omens.
  while (playedOmen === CHAOS) {
    game.currentState.playedOmens = [];
    game.currentState.omenDeck = shuffle(game.omens);
    playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
  }
  game.currentState.playedOmens.push(playedOmen);

  var players = game.currentState.players;
  var i;
  switch (playedOmen) {
    case COMMON:
      for (i = 0; i < players.length; i++) {
        var commonResource = players[i].resourcePicks.common;
        giveResources(players[i], commonResource, 1);
      }
      break;
    case RARE:
      for (i = 0; i < players.length; i++) {
        var rareResource = players[i].resourcePicks.rare;
        giveResources(players[i], rareResource, 1);
      }
      break;
    case WAR:
      var currentPlayer = getCurrentPlayer(game);
      beginAttack(currentPlayer);
      break;
  }
}

// Sets up the given player to begin to attack. This function does not return
// anything.
function beginAttack(player) {
  player.raiding = true;
  player.decidingWhoToRaid = true;
}

// Move the passed in game from the setup step to the play step. This
// involves switching the current step flag, setting the current player
// to be the first player, and drawing the first omen. We need to draw
// the first omen beacuse that is normally taken care of when a player
// ends their turn, but no player is ending a turn to start the first
// turn.
function beginPlayStep(game) {
  game.currentState.step = STEP_PLAY;
  game.currentState.currentPlayerIndex = 0;

  drawOmen(game);
}

////////////////////////////////////////////////////////////////////////////////
// Commands
////////////////////////////////////////////////////////////////////////////////
function executeCommand(game, command) {
  game.commands.push(command);
  commands[command.name].execute(game, command.data);
  Games.update(game._id, game);
}

function undoCommand(game, command) {
  var commandIndex = game.commands.indexOf(command);
  game.commands.splice(commandIndex, 1);
  commands[command.name].undo(game, command.data);
  Games.update(game._id, game);
}

var COMMAND_BUY_GOOD = "buyGood";

var commands = {};
commands[COMMAND_BUY_GOOD] = {
  execute: function (game, data) {
    var player = getPlayerFromUserId(game, data.playerUserId);
    var good = data.good;

    // Pay for good
    player.stash.blue = player.stash.blue - good.blue;
    player.stash.green = player.stash.green - good.green;
    player.stash.red = player.stash.red - good.red;
    player.stash.purple = player.stash.purple - good.purple;

    // Destroy any prerequisites
    for (var i = 0; i < good.prereqs.length; i++) {
      player.structures[good.prereqs[i]] =
        player.structures[good.prereqs[i]] - 1;
    }

    // Get good
    switch (good.type) {
      case STRUCTURE:
        player.purchased[good.name] = player.purchased[good.name] + 1;
        break;
      case CLANSMAN:
        player.clansmen[good.name] = player.clansmen[good.name] + 1;
        break;
      case ACTION:
        alert("not yet implemented");
        break;
    }
  },
  undo: function (game, data) {
    var player = getPlayerFromUserId(game, data.playerUserId);
    var good = data.good;

    // Get refunded for good
    player.stash.blue = player.stash.blue + good.blue;
    player.stash.green = player.stash.green + good.green;
    player.stash.red = player.stash.red + good.red;
    player.stash.purple = player.stash.purple + good.purple;

    // Replace any prerequisites
    for (var i = 0; i < good.prereqs.length; i++) {
      player.structures[good.prereqs[i]] =
        player.structures[good.prereqs[i]] + 1;
    }

    // Lose good
    switch (good.type) {
      case STRUCTURE:
        player.purchased[good.name] = player.purchased[good.name] - 1;
        break;
      case CLANSMAN:
        player.clansmen[good.name] = player.clansmen[good.name] - 1;
        break;
      case ACTION:
        alert("not yet implemented");
        break;
    }
  }
};

function makeBuyGoodCommand(player, good) {
  var message = player.user.name + " bought a " + good.name;
  return {
    message: message,
    data: {
      playerUserId: player.user._id,
      good: good
    },
    name: COMMAND_BUY_GOOD
  };
}

////////////////////////////////////////////////////////////////////////////////
// Client side only code
////////////////////////////////////////////////////////////////////////////////
if (Meteor.isClient) {
  //////////////////////////////////////////////////////////////////////////////
  // Generic Set Up
  //////////////////////////////////////////////////////////////////////////////

  // Use amplified session so that session variables are not lost on page
  // refreshes.
  var AmplifiedSession = _.extend({}, Session, {
    keys: _.object(_.map(amplify.store(), function(value, key) {
      return [key, JSON.stringify(value)];
    })),
    set: function(key, value) {
      Session.set.apply(this, arguments);
      amplify.store(key, value);
    },
  });

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  var USER = "user";

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  // Set up the user session variable. This is null by deafult, but will be
  // replaced by a user object (of the Users collection) when the player
  // signs in.
  AmplifiedSession.setDefault(USER, null);

  //////////////////////////////////////////////////////////////////////////////
  // Global Teamplate Helpers
  //////////////////////////////////////////////////////////////////////////////
  Template.registerHelper('imagePathForResource', function() {
     var resource = this.toString();
      switch (resource) {
        case BLUE:
          return "/images/cube-blue.png";
        case GREEN:
          return "/images/cube-green.png";
        case RED:
          return "/images/cube-red.png";
        case PURPLE:
          return "/images/cube-purple.png";
      }
  });

  //////////////////////////////////////////////////////////////////////////////
  // Template Code
  //////////////////////////////////////////////////////////////////////////////
  Template.lobby.helpers({
    isSignedIn: function() {
      return AmplifiedSession.get(USER) !== null &&
        AmplifiedSession.get(USER) !== undefined;
    },
  });

  Template.welcome.helpers({
    userName: function() {
      return AmplifiedSession.get(USER).name;
    },
  });

  Template.welcome.events({
    "click button.sign-out": function() {
      AmplifiedSession.set('user', null);
    }
  });

  Template.signIn.events({
    "submit form": function(event) {
      event.preventDefault();
      var username = event.target.username.value;
      var user = Users.findOne({
        name: username
      });
      if (user === null || user === undefined) {
        var userId = Users.insert({
          createdAt: new Date(),
          name: username
        });

        user = Users.findOne(userId);
      }

      AmplifiedSession.set('user', user);
    }
  });

  Template.myGames.helpers({
    myGames: function() {
      return Games.find({
        players: {
          $elemMatch: {
            _id: AmplifiedSession.get(USER)._id
          }
        }
      }).fetch();
    }
  });

  Template.joinGame.helpers({
    openGames: function() {
      return Games.find({
        status: "open",
        players: {
          $not: {
            $elemMatch: {
              _id: AmplifiedSession.get(USER)._id
            }
          }
        },
        $where: "this.players.length < 4"
      }).fetch();
    },

    numberOfPlayers: function() {
      return this.players.length;
    }
  });

  Template.joinGame.events({
    "click button.join-game": function() {
      var players = this.players;
      players.push(AmplifiedSession.get(USER));

      Games.update(this._id, {
        $set: {
          players: players
        }
      });
    }
  });

  Template.createGame.events({
    "submit form": function(event) {
      var gameName = event.target.gameName.value;
      Games.insert({
        creationTime: new Date(),
        creator: AmplifiedSession.get(USER),
        name: gameName,
        players: [AmplifiedSession.get(USER)],
        status: "open",
        commands: [],
        marketplace: [{
          name: TAVERN,
          blue: 1,
          green: 1,
          red: 1,
          purple: 0,
          type: STRUCTURE,
          prereqs: []
        }, {
          name: MEAD_HALL,
          blue: 1,
          green: 1,
          red: 1,
          purple: 0,
          type: STRUCTURE,
          prereqs: [TAVERN]
        }, {
          name: SKALD,
          blue: 1,
          green: 1,
          red: 0,
          purple: 1,
          type: CLANSMAN,
          prereqs: []
        }, {
          name: VIKING,
          blue: 0,
          green: 1,
          red: 1,
          purple: 1,
          type: CLANSMAN,
          prereqs: []
        }, {
          name: ATTACK,
          blue: 0,
          green: 1,
          red: 1,
          purple: 1,
          type: ACTION,
          prereqs: []
        }, {
          name: OFFERING,
          blue: 1,
          green: 0,
          red: 1,
          purple: 1,
          type: ACTION,
          prereqs: []
        }, {
          name: LONGBOAT,
          blue: 1,
          green: 1,
          red: 1,
          purple: 1,
          type: STRUCTURE,
          prereqs: []
        }, ],
        sharedTracks: [{
          name: TRADING_POST,
          buySlots: [{
            bought: false,
            available: true,
            cost: 1
          }, {
            bought: false,
            available: false,
            cost: 2
          }, {
            bought: false,
            available: false,
            cost: 3
          }, {
            bought: false,
            available: false,
            cost: 4
          }],
          reset: true
        }, {
          name: TRIBUTE,
          buySlots: [{
            bought: false,
            available: true,
            cost: 1
          }, {
            bought: false,
            available: false,
            cost: 2
          }, {
            bought: false,
            available: false,
            cost: 3
          }, {
            bought: false,
            available: false,
            cost: 4
          }],
          reset: true
        }, {
          name: END_GAME,
          buySlots: [{
            bought: false,
            available: true,
            cost: 1
          }, {
            bought: false,
            available: false,
            cost: 1
          }, {
            bought: false,
            available: false,
            cost: 2
          }, {
            bought: false,
            available: false,
            cost: 2
          }],
          reset: false
        }, {
          name: LEAD_VIKING,
          buySlots: [{
            bought: false,
            available: true,
            cost: 1
          }, {
            bought: false,
            available: false,
            cost: 2
          }, {
            bought: false,
            available: false,
            cost: 3
          }, {
            bought: false,
            available: false,
            cost: 4
          }],
          reset: true
        }, ],
        omens: [
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          COMMON,
          RARE,
          RARE,
          RARE,
          RARE,
          RARE,
          WAR,
          WAR,
          WAR,
          WAR,
          WAR,
          CHAOS
        ],
        offerings: [
          SMITE,
          BOUNTY,
          SCOURGE,
          HONOR,
          FORTUNE,
          VALKYRIE
        ]
      });
    }
  });

  Template.game.helpers({
    playerList: function() {
      var names = [];
      for(var i = 0; i < this.players.length; i++) {
        names.push(this.players[i].name);
      }
      return names.join();
    },

    isOpen: function() {
      return this.status === "open";
    },

    canStart: function() {
      return this.status === "open" &&
        this.players.length > 1;
    },

    isStarted: function() {
      return this.status === "started";
    },

    isComplete: function() {
      return this.status === "complete";
    },

    inSetupStep: function() {
      return this.currentState !== undefined &&
        this.currentState !== null &&
        this.currentState.step === STEP_SETUP;
    },

    inPlayStep: function() {
      return this.currentState !== undefined &&
        this.currentState !== null &&
        this.currentState.step === STEP_PLAY;
    },

    isCurrentPlayer: function() {
      var currentPlayerIndex =
        Template.parentData(1).currentState.currentPlayerIndex;
      var currentPlayer =
        Template.parentData(1).currentState.players[currentPlayerIndex].user;
      return currentPlayer._id === this.user._id;
    },

    isUser: function() {
      return AmplifiedSession.get(USER)._id === this.user._id;
    }
  });

  Template.game.events({
    "click button.start-game": function() {
      Games.update(this._id, {
        $set: {
          status: "started"
        }
      });
      var turnOrder = shuffle(this.players);
      var omenDeck = shuffle(this.omens);
      var offeringDeck = shuffle(this.offerings);
      var gamePlayers = [];
      for (var i = 0; i < turnOrder.length; i++) {
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
        });
      }
      Games.update(this._id, {
        $set: {
          currentState: {
            step: STEP_SETUP,
            players: gamePlayers,
            currentPlayerIndex: 0,
            availableCommonResources: [BLUE, GREEN, RED,
              PURPLE
            ],
            availableRareResources: [BLUE, GREEN, RED, PURPLE],
            sharedTracks: this.sharedTracks,
            omenDeck: omenDeck,
            playedOmens: [],
            offeringDeck: offeringDeck,
            playedOfferings: []
          }
        }
      });
    },

    "submit form": function() {
      var players = this.players.filter(function(user) {
        return user._id !== AmplifiedSession.get(USER)._id;
      });

      Games.update(this._id, {
        $set: {
          players: players
        }
      });
    }
  });

  Template.setupStep.helpers({
    isUsersTurn: function() {
      var currentPlayerIndex =
        Template.parentData(1).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(1).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id;
    },

    needToPickCommon: function() {
      var players = Template.parentData(1).currentState.players;
      for (var i = 0; i < players.length; i++) {
        if (players[i].resourcePicks.common === null) {
          return true;
        }
      }
      return false;
    }
  });

  Template.setupStep.events({
    "click button.pick-common": function() {
      var game = Template.parentData(0);
      var currentPlayer = getCurrentPlayer(game);
      var selectedResource = this.toString();

      // Remove the selected common resource from the list of available
      // common resources.
      var availableCommons = game.currentState.availableCommonResources;
      var selectedResourceIndex = availableCommons.indexOf(selectedResource);
      availableCommons.splice(selectedResourceIndex, 1);

      currentPlayer.resourcePicks.common = selectedResource;

      // Advance the turn, but only if this is not the last player. We do not
      // advance if is the last player because they should be the first to
      // pick a rare resource.
      if(!currentPlayer.lastViking) {
        advanceTurn(game);
      }

      Games.update(game._id, game);
    },

    "click button.pick-rare": function() {
      var game = Template.parentData(0);
      var currentPlayer = getCurrentPlayer(game);
      var selectedResource = this.toString();

      // Remove the selected rare resource from the list of available rare
      // resources.
      var availableRares = game.currentState.availableRareResources;
      var selectedResourceIndex = availableRares.indexOf(selectedResource);
      availableRares.splice(selectedResourceIndex, 1);

      currentPlayer.resourcePicks.rare = selectedResource;

      // If we haven't reached the lead viking, we go backwards in turn order to
      // finish picking rares. Once we reach the lead viking, we end the setup
      // step and move to the play step.
      if(!currentPlayer.leadViking) {
        advanceTurn(game, /*backwards*/ true);
      } else {
        beginPlayStep(game);
      }

      Games.update(game._id, game);
    },
  });

  Template.playStep.helpers({
    isUser: function() {
      return AmplifiedSession.get(USER)._id === this.user._id;
    },

    isUsersTurn: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id;
    },

    isUsersTurn2: function() {
      var currentPlayerIndex =
        Template.parentData(1).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(1).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id;
    },

    isUsersTurn3: function() {
      var currentPlayerIndex =
        Template.parentData(2).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(2).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id;
    },

    currentPlayerTrading: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .usingTradingPost;
    },

    currentPlayerTradingStep1: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .usingTradingPostStep1;
    },

    currentPlayerGivingSkald: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .givingSkald;
    },

    currentPlayerRaiding: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0).currentState.players[currentPlayerIndex].raiding;
    },

    currentPlayerDecidingWhoToRaid: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .decidingWhoToRaid;
    },

    currentPlayerDecidingHowToRaid: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .decidingHowToRaid;
    },

    currentPlayerWaitingOnDefender: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .waitingForDefender;
    },

    currentPlayerDecidingWhatToBurn: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0).
          currentState
          .players[currentPlayerIndex]
          .choosingWhatToBurn;
    },

    currentUserUnderAttack: function() {
      var players = Template.parentData(0).currentState.players;
      var userPlayer;
      for (var i = 0; i < players.length; i++) {
        if (AmplifiedSession.get(USER)._id === players[i].user._id) {
          userPlayer = players[i];
        }
      }
      return userPlayer.defendingBurn;
    },

    currentUserDecidingWhatToTake: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .raidTakeNumLeft > 0 &&
        !Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .waitingForDefender &&
        !Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .choosingWhatToBurn;
    },

    currentUserCollectingBounty: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .collectingBounty;
    },

    currentUserSmiting: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0).currentState.players[currentPlayerIndex].smiting;
    },

    currentPlayerDecidingWhoToSmite: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .decidingWhoToSmite;
    },

    currentPlayerDecidingWhatToSmite: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .smiteTargetUserId !== null;
    },

    currentUserValkyring: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .valkyring;
    },

    currentPlayerDecidingWhoToValkyrie: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser =
        Template.parentData(0).currentState.players[currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .decidingWhoToValkyrie;
    },

    currentPlayerDecidingWhatToValkyrie: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser = Template.parentData(0).currentState.players[
        currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .valkyrieTargetUserId !== null;
    },

    currentUserWeregeld: function() {
      var players = Template.parentData(0).currentState.players;
      var userPlayer;
      for (var i = 0; i < players.length; i++) {
        if (AmplifiedSession.get(USER)._id === players[i].user._id) {
          userPlayer = players[i];
        }
      }
      return userPlayer.weregeldOwed;
    },

    currentUserConvertingResources: function() {
      var currentPlayerIndex =
        Template.parentData(0).currentState.currentPlayerIndex;
      var currentUser = Template.parentData(0).currentState.players[
        currentPlayerIndex].user;
      return AmplifiedSession.get(USER)._id === currentUser._id &&
        Template.parentData(0)
          .currentState
          .players[currentPlayerIndex]
          .resourcesLeftToCovert > 0;
    },

    currentUserBeingScourged: function() {
      var players = Template.parentData(0).currentState.players;
      var userPlayer;
      for (var i = 0; i < players.length; i++) {
        if (AmplifiedSession.get(USER)._id === players[i].user._id) {
          userPlayer = players[i];
        }
      }
      return userPlayer.resourcesLeftToScourge > 0;
    },

    currentUserBusy: function() {
      var game = Template.parentData(0);
      var currentUserPlayer = getUserPlayer(game);
      return currentUserPlayer.resourcesLeftToScourge > 0 ||
        currentUserPlayer.resourcesLeftToCovert > 0 ||
        currentUserPlayer.valkyring ||
        currentUserPlayer.smiting ||
        currentUserPlayer.collectingBounty ||
        currentUserPlayer.defendingBurn ||
        currentUserPlayer.raiding ||
        currentUserPlayer.givingSkald ||
        currentUserPlayer.usingTradingPost;
    },

    resourceCost: function() {
      var marketplaceItem = this;
      var resourceCost = [];
      var i;
      for(i = 0; i < marketplaceItem[BLUE]; i++) {
        resourceCost.push(BLUE);
      }
      for(i = 0; i < marketplaceItem[GREEN]; i++) {
        resourceCost.push(GREEN);
      }
      for(i = 0; i < marketplaceItem[RED]; i++) {
        resourceCost.push(RED);
      }
      for(i = 0; i < marketplaceItem[PURPLE]; i++) {
        resourceCost.push(PURPLE);
      }

      return resourceCost;
    },

    latestCommands: function(numCommands) {
      var game = Template.parentData(0);
      numCommands = Math.min(numCommands, game.commands.length);
      if(numCommands === 0)
      {
        return [];
      } else {
        return game.commands.slice(-1 * numCommands).reverse();
      }
    }
  });

  Template.playStep.events({
    "click button.raid-common": function() {
      var game = Template.parentData(0);
      var gameId = game._id;

      var players = game.currentState.players;
      for (var i = 0; i < players.length; i++) {
        var commonResource = players[i].resourcePicks.common;
        players[i].stash[commonResource] = players[i].stash[
          commonResource] + 1;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.raid-rare": function() {
      var game = Template.parentData(0);
      var gameId = game._id;

      var players = game.currentState.players;
      for (var i = 0; i < players.length; i++) {
        var rareResource = players[i].resourcePicks.rare;
        players[i].stash[rareResource] = players[i].stash[rareResource] +
          1;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.end-turn": function() {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var i;

      var numPlayers = game.currentState.players.length;

      if (game.currentState.players[currentPlayerIndex].lastViking) {
        game.currentState.players[currentPlayerIndex].lastViking = false;
        for (i = 0; i < game.currentState.players.length; i++) {
          if (game.currentState.players[i].leadViking) {
            currentPlayerIndex = i;
            Games.update(gameId, {
              $set: {
                "currentState.currentPlayerIndex": currentPlayerIndex
              }
            });

            var lastVikingIndex = (numPlayers + i - 1) % numPlayers;
            game.currentState.players[lastVikingIndex].lastViking = true;
            Games.update(gameId, {
              $set: {
                "currentState.players": game.currentState.players
              }
            });
            break;
          }
        }

        for (i = 0; i < game.currentState.players.length; i++) {
          game.currentState.players[i].structures[TAVERN] =
            game.currentState.players[i].structures[TAVERN] +
            game.currentState.players[i].purchased[TAVERN];
          game.currentState.players[i].structures[MEAD_HALL] =
            game.currentState.players[i].structures[MEAD_HALL] +
            game.currentState.players[i].purchased[MEAD_HALL];
          game.currentState.players[i].structures[LONGBOAT] =
            game.currentState.players[i].structures[LONGBOAT] +
            game.currentState.players[i].purchased[LONGBOAT];
          game.currentState.players[i].purchased[TAVERN] = 0;
          game.currentState.players[i].purchased[MEAD_HALL] = 0;
          game.currentState.players[i].purchased[LONGBOAT] = 0;
        }
        Games.update(gameId, {
          $set: {
            "currentState.players": game.currentState.players
          }
        });

        for (i = 0; i < game.currentState.sharedTracks.length; i++) {
          if (game.currentState.sharedTracks[i].reset) {
            game.currentState.sharedTracks[i] = game.sharedTracks[i];
          }
          if (game.currentState.sharedTracks[i].name === END_GAME) {
            if (game.currentState.sharedTracks[i].buySlots[game.currentState
                .sharedTracks[i].buySlots.length - 1].bought) {
              Games.update(gameId, {
                $set: {
                  "status": "complete"
                }
              });
            }
          }
        }
        Games.update(gameId, {
          $set: {
            "currentState.sharedTracks": game.currentState.sharedTracks
          }
        });

        game.currentState.playedOfferings = [];
        game.currentState.offeringDeck = shuffle(game.offerings);
        Games.update(gameId, {
          $set: {
            "currentState.offeringDeck": game.currentState.offeringDeck
          }
        });
        Games.update(gameId, {
          $set: {
            "currentState.playedOfferings": game.currentState.playedOfferings
          }
        });
      } else {
        currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
        Games.update(gameId, {
          $set: {
            "currentState.currentPlayerIndex": currentPlayerIndex
          }
        });
      }

      for (i = 0; i < game.currentState.players.length; i++) {
        game.currentState.players[i].structureUses[TAVERN] =
          game.currentState.players[i].structures[TAVERN];
        game.currentState.players[i].structureUses[MEAD_HALL] =
          game.currentState.players[i].structures[MEAD_HALL];
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": game.currentState.players
        }
      });

      var playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
      while (playedOmen === CHAOS) {
        game.currentState.playedOmens = [];
        game.currentState.omenDeck = shuffle(game.omens);
        playedOmen = game.currentState.omenDeck.splice(0, 1).toString();
      }
      game.currentState.playedOmens.push(playedOmen);
      Games.update(gameId, {
        $set: {
          "currentState.omenDeck": game.currentState.omenDeck
        }
      });
      Games.update(gameId, {
        $set: {
          "currentState.playedOmens": game.currentState.playedOmens
        }
      });
      var players;
      switch (playedOmen) {
        case COMMON:
          players = game.currentState.players;
          for (i = 0; i < players.length; i++) {
            var commonResource = players[i].resourcePicks.common;
            players[i].stash[commonResource] = players[i].stash[
              commonResource] + 1 + players[i].structures[LONGBOAT];
          }
          Games.update(gameId, {
            $set: {
              "currentState.players": players
            }
          });
          break;
        case RARE:
          players = game.currentState.players;
          for (i = 0; i < players.length; i++) {
            var rareResource = players[i].resourcePicks.rare;
            players[i].stash[rareResource] = players[i].stash[
              rareResource] + 1 + players[i].structures[LONGBOAT];
          }
          Games.update(gameId, {
            $set: {
              "currentState.players": players
            }
          });
          break;
        case WAR:
          game.currentState.players[currentPlayerIndex].raiding = true;
          game.currentState.players[currentPlayerIndex].decidingWhoToRaid =
            true;
          Games.update(gameId, {
            $set: {
              "currentState.players": game.currentState.players
            }
          });
          break;
      }
    },

    "click button.convert-to-rare": function() {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var commonResource = player.resourcePicks.common;
      var rareResource = player.resourcePicks.rare;

      player.stash[commonResource] = player.stash[commonResource] - 2;
      player.stash[rareResource] = player.stash[rareResource] + 1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.convert-to-geld": function() {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      player.stash[GELD] = player.stash[GELD] + 1;
      player.resourcesLeftToCovert = 4;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.convert": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var resource = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      player.stash[resource] = player.stash[resource] - 1;
      player.resourcesLeftToCovert = player.resourcesLeftToCovert - 1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.buy-track": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var trackName = event.target.value;
      var sharedTracks = game.currentState.sharedTracks;
      var track;

      for (var i = 0; i < sharedTracks.length; i++) {
        if (sharedTracks[i].name === trackName) {
          track = sharedTracks[i];
          break;
        }
      }

      for (i = 0; i < track.buySlots.length; i++) {
        if (track.buySlots[i].available === true) {
          track.buySlots[i].available = false;
          track.buySlots[i].bought = true;
          i++;
          if (i < track.buySlots.length) {
            track.buySlots[i].available = true;
          }
          break;
        }
      }

      Games.update(gameId, {
        $set: {
          "currentState.sharedTracks": sharedTracks
        }
      });

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      player.stash[GELD] = player.stash[GELD] - this.cost;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });

      switch (trackName) {
        case TRADING_POST:
          player.usingTradingPost = true;
          player.usingTradingPostStep1 = true;
          Games.update(gameId, {
            $set: {
              "currentState.players": players
            }
          });
          break;
        case TRIBUTE:
          player.stash[PRESTIGE] = player.stash[PRESTIGE] + 1;
          Games.update(gameId, {
            $set: {
              "currentState.players": players
            }
          });
          break;
        case END_GAME:
          break;
        case LEAD_VIKING:
          for (i = 0; i < players.length; i++) {
            players[i].leadViking = false;
          }
          player.leadViking = true;
          Games.update(gameId, {
            $set: {
              "currentState.players": players
            }
          });
          break;
      }

    },

    "click button.buy-marketplace": function(event) {
      var game = Template.parentData(0);
      var currentPlayer = getCurrentPlayer(game);
      var goodName = event.target.value;
      var good;

      for (var i = 0; i < game.marketplace.length; i++) {
        if (game.marketplace[i].name === goodName) {
          good = game.marketplace[i];
          break;
        }
      }

      switch (good.type) {
        case STRUCTURE:
        case CLANSMAN:
          var buyGoodCommand = makeBuyGoodCommand(currentPlayer, good);
          executeCommand(game, buyGoodCommand);
          break;
        case ACTION:
          var players = game.currentState.players;

          for (i = 0; i < good.prereqs.length; i++) {
            currentPlayer.structures[good.prereqs[i]] =
              currentPlayer.structures[good.prereqs[i]] - 1;
          }

          currentPlayer.stash.blue = currentPlayer.stash.blue - good.blue;
          currentPlayer.stash.green = currentPlayer.stash.green - good.green;
          currentPlayer.stash.red = currentPlayer.stash.red - good.red;
          currentPlayer.stash.purple = currentPlayer.stash.purple - good.purple;
          Games.update(game._id, {
            $set: {
              "currentState.players": players
            }
          });

          switch (good.name) {
            case ATTACK:
              currentPlayer.raiding = true;
              currentPlayer.decidingWhoToRaid = true;
              Games.update(game._id, {
                $set: {
                  "currentState.players": players
                }
              });
              break;
            case OFFERING:
              var playedOffering = game.currentState.offeringDeck.splice(
                0, 1).toString();
              game.currentState.playedOfferings.push(playedOffering);
              Games.update(game._id, {
                $set: {
                  "currentState.offeringDeck": game.currentState.offeringDeck
                }
              });
              Games.update(game._id, {
                $set: {
                  "currentState.playedOfferings":
                    game.currentState.playedOfferings
                }
              });
              switch (playedOffering) {
                case SMITE:
                  currentPlayer.smiting = true;
                  currentPlayer.decidingWhoToSmite = true;
                  Games.update(game._id, {
                    $set: {
                      "currentState.players": players
                    }
                  });
                  break;
                case BOUNTY:
                  currentPlayer.collectingBounty = true;
                  Games.update(game._id, {
                    $set: {
                      "currentState.players": players
                    }
                  });
                  break;
                case SCOURGE:
                  for (i = 0; i < players.length; i++) {
                    if (players[i].user._id !== currentPlayer.user._id) {
                      var geldToScourge =
                        Math.floor(players[i].stash[GELD] / 2);
                      var totalResources = players[i].stash[BLUE] +
                        players[i].stash[GREEN] +
                        players[i].stash[RED] +
                        players[i].stash[PURPLE];
                      var resourcesToScourge = Math.floor(totalResources / 2);
                      players[i].stash[GELD] = players[i].stash[GELD] -
                        geldToScourge;
                      players[i].resourcesLeftToScourge =
                        resourcesToScourge;
                    }
                  }
                  Games.update(game._id, {
                    $set: {
                      "currentState.players": players
                    }
                  });
                  break;
                case HONOR:
                  var sharedTracks = game.currentState.sharedTracks;
                  var track;
                  for (i = 0; i < sharedTracks.length; i++) {
                    if (sharedTracks[i].name === TRIBUTE) {
                      track = sharedTracks[i];
                      break;
                    }
                  }

                  for (i = 0; i < track.buySlots.length; i++) {
                    if (track.buySlots[i].available === true) {
                      track.buySlots[i].available = false;
                      track.buySlots[i].bought = true;
                      i++;
                      if (i < track.buySlots.length) {
                        track.buySlots[i].available = true;
                      }
                      break;
                    }
                  }
                  Games.update(game._id, {
                    $set: {
                      "currentState.sharedTracks": sharedTracks
                    }
                  });

                  currentPlayer.stash[PRESTIGE] =
                    currentPlayer.stash[PRESTIGE] + 1;
                  Games.update(game._id, {
                    $set: {
                      "currentState.players": players
                    }
                  });
                  break;
                case FORTUNE:
                  var geldEarned = 2;
                  for (i = 0; i < players.length; i++) {
                    if (players[i].user._id !== currentPlayer.user._id) {
                      geldEarned = geldEarned + players[i].structures[TAVERN];
                      geldEarned =
                        geldEarned + players[i].structures[MEAD_HALL];
                    }
                  }
                  currentPlayer.stash[GELD] = currentPlayer.stash[GELD] +
                    geldEarned;
                  Games.update(game._id, {
                    $set: {
                      "currentState.players": players
                    }
                  });
                  break;
                case VALKYRIE:
                  currentPlayer.valkyring = true;
                  currentPlayer.decidingWhoToValkyrie = true;
                  currentPlayer.stash[GODS] = currentPlayer.stash[GODS] + 1;
                  Games.update(game._id, {
                    $set: {
                      "currentState.players": players
                    }
                  });
                  break;
              }
              break;
          }
          break;
      }
    },

    "click button.trade-away": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var resource = event.target.value;

      player.stash[resource] = player.stash[resource] - 1;
      player.usingTradingPostStep1 = false;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.trade-for": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var resource = event.target.value;

      player.stash[resource] = player.stash[resource] + 1;
      player.usingTradingPost = false;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.activate-tavern": function() {
      var game = Template.parentData(0);
      var gameId = game._id;

      var players = game.currentState.players;
      var player;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === AmplifiedSession.get(USER)._id) {
          player = players[i];
        }
      }

      var rareResource = player.resourcePicks.rare;
      player.stash[rareResource] = player.stash[rareResource] - 1;
      player.stash[GELD] = player.stash[GELD] + 1;
      player.structureUses[TAVERN] = player.structureUses[TAVERN] - 1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.activate-meadhall": function() {
      var game = Template.parentData(0);
      var gameId = game._id;

      var players = game.currentState.players;
      var player;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === AmplifiedSession.get(USER)._id) {
          player = players[i];
        }
      }

      var commonResource = player.resourcePicks.common;
      player.stash[commonResource] = player.stash[commonResource] - 1;
      player.stash[GELD] = player.stash[GELD] + 1;
      player.structureUses[MEAD_HALL] = player.structureUses[MEAD_HALL] -
        1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.sacrifice-skald": function() {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];

      var rareResource = player.resourcePicks.rare;
      player.stash[rareResource] = player.stash[rareResource] - 1;
      player.clansmen[SKALD] = player.clansmen[SKALD] - 1;
      player.stash[GODS] = player.stash[GODS] + 1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.perform-skald": function() {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];

      player.clansmen[SKALD] = player.clansmen[SKALD] - 1;
      player.givingSkald = true;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.give-skald": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var recipientId = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var geldEarned = 0;
      var recipient;

      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === recipientId) {
          recipient = players[i];
        }
        if (i === currentPlayerIndex) {
          geldEarned = geldEarned - players[i].structures[TAVERN];
          geldEarned = geldEarned - players[i].structures[MEAD_HALL];
        } else {
          geldEarned = geldEarned + players[i].structures[TAVERN];
          geldEarned = geldEarned + players[i].structures[MEAD_HALL];
        }
      }

      recipient.clansmen[SKALD] = recipient.clansmen[SKALD] + 1;
      if (geldEarned > 1) {
        player.stash[GELD] = player.stash[GELD] + geldEarned;
      } else {
        player.stash[GELD] = player.stash[GELD] + 1;
      }
      player.givingSkald = false;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.choose-who-to-raid": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var targetId = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];

      if (targetId === "") {
        player.decidingWhoToRaid = false;
        player.raiding = false;
      } else {
        player.decidingWhoToRaid = false;
        player.raidTargetUserId = targetId;
        player.decidingHowToRaid = true;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.choose-how-to-raid": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var action = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var target;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === player.raidTargetUserId) {
          target = players[i];
          break;
        }
      }

      player.decidingHowToRaid = false;
      switch (action) {
        case "take":
          player.raidTakeNumLeft = player.clansmen[VIKING];
          break;
        case "burn":
          if (target.clansmen[VIKING] > 0) {
            player.waitingForDefender = true;
            target.defendingBurn = true;
          } else {
            player.choosingWhatToBurn = true;
          }
          break;
        case "both":
          player.raidTakeNumLeft = player.clansmen[VIKING];
          if (target.clansmen[VIKING] > 0) {
            player.waitingForDefender = true;
            target.defendingBurn = true;
          } else {
            player.choosingWhatToBurn = true;
          }
          break;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.burn-structure": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var structure = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var target;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === player.raidTargetUserId) {
          target = players[i];
          break;
        }
      }

      player.choosingWhatToBurn = false;
      var targetResourcesLeft = target.stash[BLUE] + target.stash[GREEN] +
        target.stash[RED] + target.stash[PURPLE];
      if (player.raidTakeNumLeft <= 0 || targetResourcesLeft <= 0) {
        player.raiding = false;
        player.raidTargetUserId = null;
        player.raidTakeNumLeft = 0;
      }
      player.stash[WEREGELD] = player.stash[WEREGELD] + 1;
      player.weregeldOwed.push(target);
      target.structures[structure] = target.structures[structure] - 1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.steal-resource": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var resource = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var target;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === player.raidTargetUserId) {
          target = players[i];
          break;
        }
      }

      player.stash[resource] = player.stash[resource] + 1;
      target.stash[resource] = target.stash[resource] - 1;
      player.raidTakeNumLeft = player.raidTakeNumLeft - 1;
      var targetResourcesLeft = target.stash[BLUE] + target.stash[GREEN] +
        target.stash[RED] + target.stash[PURPLE];
      if (player.raidTakeNumLeft <= 0 || targetResourcesLeft <= 0) {
        player.raiding = false;
        player.raidTargetUserId = null;
        player.raidTakeNumLeft = 0;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.defend-attack": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var attackerIndex = game.currentState.currentPlayerIndex;
      var willDefend = event.target.value;

      var players = game.currentState.players;
      var attacker = players[attackerIndex];
      var defender;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === AmplifiedSession.get(USER)._id) {
          defender = players[i];
          break;
        }
      }

      switch (willDefend) {
        case "true":
          var defenderResourcesLeft = defender.stash[BLUE] +
            defender.stash[GREEN] +
            defender.stash[RED] +
            defender.stash[PURPLE];
          if (attacker.raidTakeNumLeft <= 0 || defenderResourcesLeft <= 0) {
            attacker.raiding = false;
            attacker.raidTargetUserId = null;
            attacker.raidTakeNumLeft = 0;
          }
          attacker.waitingForDefender = false;
          attacker.choosingWhatToBurn = false;
          defender.defendingBurn = false;
          defender.clansmen[VIKING] = defender.clansmen[VIKING] - 1;
          defender.stash[EINHERJAR] = defender.stash[EINHERJAR] + 1;
          break;
        case "false":
          attacker.waitingForDefender = false;
          attacker.choosingWhatToBurn = true;
          defender.defendingBurn = false;
          break;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.reset-raids": function() {
      var game = Template.parentData(0);
      var gameId = game._id;

      var players = game.currentState.players;
      for (var i = 0; i < players.length; i++) {
        players[i].raiding = false;
        players[i].decidingWhoToRaid = false;
        players[i].raidTargetUserId = null;
        players[i].decidingHowToRaid = false;
        players[i].raidTakeNumLeft = 0;
        players[i].waitingForDefender = false;
        players[i].defendingBurn = false;
        players[i].choosingWhatToBurn = false;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.reset-offerings": function() {
      var game = Template.parentData(0);
      var gameId = game._id;

      var players = game.currentState.players;
      for (var i = 0; i < players.length; i++) {
        players[i].collectingBounty = false;
        players[i].smiting = false;
        players[i].decidingWhoToSmite = false;
        players[i].smiteTargetUserId = null;
        players[i].valkyring = false;
        players[i].decidingWhoToValkyrie = false;
        players[i].valkyrieTargetUserId = null;
        players[i].resourcesLeftToScourge = 0;
      }
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.pay-weregeld": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var payeeId = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var payee;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === payeeId) {
          payee = players[i];
        }
      }

      var cost = player.stash[PRESTIGE];
      if (cost < 1) {
        cost = 1;
      }
      player.stash[GELD] = player.stash[GELD] - cost;
      player.stash[WEREGELD] = player.stash[WEREGELD] - 1;
      payee.stash[GELD] = payee.stash[GELD] + cost;
      var weregeldPayedIndex;
      for (i = 0; i < player.weregeldOwed.length; i++) {
        if (player.weregeldOwed[i].user._id === payeeId) {
          weregeldPayedIndex = i;
        }
      }
      player.weregeldOwed.splice(weregeldPayedIndex, 1);
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.collect-bounty": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var resource = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var resourceCount = 2;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id !== player.user._id) {
          resourceCount = resourceCount + players[i].structures[LONGBOAT];
        }
      }

      player.stash[resource] = player.stash[resource] + resourceCount;
      player.collectingBounty = false;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.choose-who-to-smite": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var targetId = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];

      if (targetId === "") {
        player.smiting = false;
        player.decidingWhoToSmite = false;
        player.stash[GODS] = player.stash[GODS] + 1;
      } else {
        player.decidingWhoToSmite = false;
        player.smiteTargetUserId = targetId;
      }

      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.choose-what-to-smite": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var structure = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var target;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === player.smiteTargetUserId) {
          target = players[i];
          break;
        }
      }

      player.stash[WEREGELD] = player.stash[WEREGELD] + 1;
      player.weregeldOwed.push(target);
      target.structures[structure] = target.structures[structure] - 1;
      player.smiting = false;
      player.smiteTargetUserId = null;

      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.choose-who-to-valkyrie": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var targetId = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];

      if (targetId === "") {
        player.valkyring = false;
        player.decidingWhoToValkyrie = false;
      } else {
        player.decidingWhoToValkyrie = false;
        player.valkyrieTargetUserId = targetId;
      }

      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.choose-what-to-valkyrie": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var currentPlayerIndex = game.currentState.currentPlayerIndex;
      var clansman = event.target.value;

      var players = game.currentState.players;
      var player = players[currentPlayerIndex];
      var target;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === player.valkyrieTargetUserId) {
          target = players[i];
          break;
        }
      }

      target.clansmen[clansman] = target.clansmen[clansman] - 1;
      if (clansman === VIKING) {
        target.stash[EINHERJAR] = target.stash[EINHERJAR] + 1;
      }
      player.valkyring = false;
      player.valkyrieTargetUserId = null;

      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.scourge-resource": function(event) {
      var game = Template.parentData(0);
      var gameId = game._id;
      var resource = event.target.value;

      var players = game.currentState.players;
      var player;
      for (var i = 0; i < players.length; i++) {
        if (players[i].user._id === AmplifiedSession.get(USER)._id) {
          player = players[i];
          break;
        }
      }

      player.stash[resource] = player.stash[resource] - 1;
      player.resourcesLeftToScourge = player.resourcesLeftToScourge - 1;
      Games.update(gameId, {
        $set: {
          "currentState.players": players
        }
      });
    },

    "click button.undo-command": function(event) {
      var game = Template.parentData(0);
      var commandIndex = event.target.value;
      var command = game.commands[commandIndex];

      undoCommand(game, command);
    }
  });

  Template.stash.helpers({
    isUser: function() {
      return AmplifiedSession.get(USER)._id === this.user._id;
    },

    canTrade: function() {
      var game = Template.parentData(1);
      var currentPlayer = getCurrentPlayer(game);
      var currentUser = AmplifiedSession.get(USER);
      var userToTradeWith = this.user;

      // You can't ever trade with yourself
      if (currentUser._id === userToTradeWith._id) {
        return false;
      }

      // You can trade with the person whose turn it is
      if (userToTradeWith._id === currentPlayer.user._id) {
        return true;
      }

      // If it is your turn, you can trade with anyone
      if (currentUser._id === currentPlayer.user._id) {
        return true;
      }

      return false;
    }
  });

  Template.stash.events({
    "click button.give-resource": function(event) {
      var game = Template.parentData(0);
      var resourceName = event.target.value.split(":")[0];
      var receivingPlayerId = event.target.value.split(":")[1];
      var givingPlayer = getUserPlayer(game);
      var receivingPlayer = getPlayerFromUserId(game, receivingPlayerId);

      transferResources(givingPlayer, receivingPlayer, resourceName, 1);

      Games.update(game._id, game);
    },
  });
}

////////////////////////////////////////////////////////////////////////////////
// Server side only code
////////////////////////////////////////////////////////////////////////////////
if (Meteor.isServer) {
  Meteor.startup(function() {
    // code to run on server at startup
  });
}