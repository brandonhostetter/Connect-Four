var Page = {};
// canvas variables
Page.$canvas = null;
Page.context = null;
Page.$maskCanvas = null;
Page.maskContext = null;
Page.stopRendering = false;
Page.isAnimating = false;
Page.canvasWidth = 545;
Page.canvasHeight = 470;
Page.rows = 6;
Page.columns = 7;
// dom selectors
Page.$initModal = null;
Page.$connectPlayersModal = null;
Page.$gameOverModal = null;
Page.$replayDeclined = null;
// player / game related variables
Page.playerTurn = null;
Page.playerNumber = -1;
Page.piececolors = ['gold', 'orangered'];
Page.placementArray = null;
Page.placementOrder = [];
Page.y = 0;
Page.dy = 20;
Page.piecePlacedAt = [];
Page.isGameOver = false;
Page.gameUUID = '';
Page.gameStarted = false;
Page.isLocalGame = false;

Page.initialize = function() {
    // get dom references
    Page.$canvas = $('#connect-four-canvas');
    Page.context = Page.$canvas[0].getContext('2d');
    Page.$maskCanvas = $('#connect-four-mask-canvas');
    Page.maskContext = Page.$maskCanvas[0].getContext('2d');

    Page.$initModal = $('#init-modal');
    Page.$connectPlayersModal = $('#connect-players-modal');
    Page.$gameOverModal = $('#game-over-modal');
    Page.$replayDeclined = $('#replay-declined-modal');

    Page.placementArray = Helpers.create2DArray(Page.rows, Page.columns);
    Page.drawOpeningMask();
    Page.determineOpeningAction();
};

//#region Initialization

Page.determineOpeningAction = function() {
    Page.gameUUID = Helpers.readUrlHash();

    if (Page.gameUUID != '') {
        // Join existing game
        // this is player 2
        Page.playerNumber = 1;
        Page.joinExistingGame();
        Page.isLocalGame = false;
    } else {
        // No existing game to join
        // Instead, ask the user if they would like to play on one computer or two
        // this is player 1
        Page.playerNumber = 0;
        Page.displayInitModal();
    }
};

Page.displayInitModal = function() {
    Page.$initModal.modal('show');

    // single player game vs computer
    Page.$initModal.find('#play-ai').on('click', function() {
        console.log('Playing single player vs computer');
        Page.initSinglePlayer();
        Page.$initModal.modal('hide');
    });

    // two player local game
    Page.$initModal.find('#play-local-multi').on('click', function() {
        console.log('Playing two player local game');
        Page.initLocalMulti();
        Page.$initModal.modal('hide');
    });

    // two player online game
    Page.$initModal.find('#play-online-multi').on('click', function() {
        console.log('Playing two player online game');
        Helpers.showLoadingOverlay(); // display an overlay until player 2 joins
        Page.initOnlineMulti();
        Page.createGameData();
        Page.getGameData();
        Page.$initModal.modal('hide');
    });
};

Page.attachListeners = function() {
    Page.attachCanvasListener();
    Page.attachButtonListeners();
};

Page.initSinglePlayer = function() {
    Page.attachListeners();
    Page.playerTurn = 0;
    Page.isLocalGame = true;
};

Page.initLocalMulti = function() {
    Page.attachListeners();
    Page.playerTurn = 0;
    Page.isLocalGame = true;
    Page.gameStarted = true;
};

Page.initOnlineMulti = function() {
    // Generate a unique id for the game
    Page.gameUUID = Helpers.generateGUID();
    // Change the url to reflect the unique id
    window.location = '#' + Page.gameUUID;
    // Update the modal with the unique game url
    Page.$connectPlayersModal.find('#my-uuid').val(window.location.href);
    Page.$connectPlayersModal.modal('show');

    Page.$connectPlayersModal.find('#copy-uuid-btn').on('click', function(e) {
        var target = Page.$connectPlayersModal.find('#my-uuid')[0];
        Helpers.copyToClipboard(target);
    });
};

Page.joinExistingGame = function() {
    Page.getGameData();
    Page.player2Ready();
};

//#region Event Listeners

Page.attachCanvasListener = function() {
    Page.$maskCanvas.on('mouseup', function(e) {
        if (Page.isAnimating || (!Page.isLocalGame && (Page.playerTurn != Page.playerNumber))) {
            return;
        } //else

        var col = e.offsetX;
        col -= 50;
        col /= 75;
        col = Math.round(col);
        if (col < 0) col = 0;
        if (col >= Page.columns) col = Page.columns - 1;

        Page.piecePlacedAt = Helpers.forcePieceToBottom(Page.placementArray, col);
        if (Page.piecePlacedAt) {
            Page.draw();
        }
    });
};

Page.attachButtonListeners = function() {
    $('#undo-button').on('click', function(e) {
        if (Page.isGameOver) return;

        var length = Page.placementOrder.length;
        if (length > 0) {
            var last = Page.placementOrder[length - 1];
            Page.placementArray[last.row][last.col].player = -1;
            Helpers.updatePlayerTurn();
            Page.drawUndo();
            Page.placementOrder.pop();
        }
    });

    $('#restart-button').on('click', function(e) {
        if (!isLocalGame) {
            // get confirmation from other user that they would like to reset the game
        } else {
            Page.resetGame();
        }
    });
};

//#endregion Event Listeners

//#endregion Initialization

//#region Canvas Drawing

Page.draw = function() {
    Page.intervalId = window.requestAnimationFrame(Page.draw);
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);

    Page.drawPlacedPieces();
    Page.drawDropAnimation();
};

Page.drawOpponentMove = function() {
    Page.intervalId = window.requestAnimationFrame(Page.drawOpponentMove);
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);

    Page.drawPlacedPieces(true);
    Page.drawOpponentAnimation();
};

Page.drawOpeningMask = function() {
    // http://stackoverflow.com/a/11770000
    // We draw this once at initialization. This is the 'cut-out' of the holes
    // the pieces will fill;
    Page.maskContext.fillStyle = 'cornflowerBlue';
    Page.maskContext.beginPath();

    for (var i = 0; i < Page.rows; i++) {
        for (var j = 0; j < Page.columns; j++) {
            Page.maskContext.arc(75 * j + 50, 75 * i + 48, 30, 0, 2 * Math.PI);
            if (j === 0) {
                // offset a little more on the left most column so we aren't right on the edge
                Page.maskContext.rect(75 * j + 90, 96 * i, -80, 96);
            } else {
                Page.maskContext.rect(75 * j + 90, 96 * i, -75, 96);
            }
        }
    }

    Page.maskContext.closePath();
    Page.maskContext.fill('evenodd');
};

Page.drawPiece = function(x, y, player) {
    Page.context.beginPath();
    Page.context.arc(x, y, 30, 0, 2 * Math.PI);
    Page.context.fillStyle = Page.piececolors[player];
    Page.context.fill();
    Page.context.closePath();
};

Page.drawDropAnimation = function() {
    if (Page.stopRendering) {
        cancelAnimationFrame(Page.intervalId);
        Page.y = 0;
        Page.stopRendering = false;
        // update placement array
        Helpers.updatePlacement(Page.placementArray, Page.placementOrder, Page.piecePlacedAt, Page.playerTurn);

        // check for winner
        if (Page.isThereAWinner()) {
            Page.gameOver();
        }

        // update database
        if (!Page.isLocalGame) {
            Page.saveGameData();
        }

        Page.drawPlacedPieces();
        Page.isAnimating = false;
        return;
    } else if (Page.y >= Page.piecePlacedAt[0] * 96 - 62) {
        Page.stopRendering = true;
        return;
    }

    Page.isAnimating = true;
    Page.y += Page.dy;
    Page.drawPiece(75 * Page.piecePlacedAt[1] + 50, Page.y, Page.playerTurn);
};

Page.drawOpponentAnimation = function() {
    if (Page.stopRendering) {
        cancelAnimationFrame(Page.intervalId);
        Page.y = 0;
        Page.stopRendering = false;
        Page.drawPlacedPieces();
        Page.isAnimating = false;
        return;
    } else if (Page.y >= Page.piecePlacedAt[0] * 96 - 62) {
        Page.stopRendering = true;
        return;
    }

    Page.isAnimating = true;
    Page.y += Page.dy;
    // we should be on the current player's turn so we need to change player turn back to the opponent
    Page.drawPiece(75 * Page.piecePlacedAt[1] + 50, Page.y, ((Page.playerTurn + 1) % 2));
};

Page.drawPlacedPieces = function(ignoreMostRecentlyPlaced) {
    for (var i = 0; i < Page.placementArray.length; i++) {
        for (var j = 0; j < Page.placementArray[i].length; j++) {
            if (Page.placementArray[i][j].player !== -1) {
                if (ignoreMostRecentlyPlaced && Page.piecePlacedAt[0] === i && Page.piecePlacedAt[1] === j) {
                    continue;
                }
                Page.drawPiece(75 * j + 50, 75 * i + 48, Page.placementArray[i][j].player);
            }
        }
    }
};

Page.drawUndo = function() {
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    Page.drawPlacedPieces();
};

//#endregion Canvas Drawing

//#region Update game data

Page.createGameData = function() {
    // create the empty placement array on the database
    database.ref('connect-four/' + Page.gameUUID).set({
        'placementArray': Page.placementArray,
        'player1Ready': true,
        'player2Ready': false,
        'player1ReplayDenied': false,
        'player2ReplayDenied': false,
        'player1ReplayAccepted': false,
        'player2ReplayAccepted': false
    });

    database.ref('connect-four/' + Page.gameUUID + '/turn').set({
        'playerTurn': 0,
        'gameOver': false,
        'drawPieceAt': [-1, -1]
    });
};

Page.player1Ready = function() {
    database.ref('connect-four/' + Page.gameUUID).update({
        'player1Ready': true
    });
};

Page.player2Ready = function() {
    database.ref('connect-four/' + Page.gameUUID).update({
        'player2Ready': true
    });
};

Page.replayDenied = function() {
    if (Page.playerNumber === 0) {
        database.ref('connect-four/' + Page.gameUUID).update({
            'player1ReplayDenied': true,
            'player1Ready': false
        });
    } else {
        database.ref('connect-four/' + Page.gameUUID).update({
            'player2ReplayDenied': true,
            'player2Ready': false
        });
    }
};

Page.replayAccepted = function() {
    if (Page.playerNumber === 0) {
        database.ref('connect-four/' + Page.gameUUID).update({
            'player1ReplayAccepted': true,
            'player1Ready': true
        });
    } else {
        database.ref('connect-four/' + Page.gameUUID).update({
            'player2ReplayAccepted': true,
            'player2Ready': true
        });
    }
};

Page.saveGameData = function() {
    var updates = {};
    updates['connect-four/' + Page.gameUUID + '/placementArray/' + Page.piecePlacedAt[0] + '/' + Page.piecePlacedAt[1]] = {
        'player': Page.playerTurn
    };
    updates['connect-four/' + Page.gameUUID + '/turn'] = {
        'playerTurn': Helpers.updatePlayerTurn(), // update the player turn to the next player
        'drawPieceAt': Page.piecePlacedAt,
        'gameOver': Page.isGameOver
    };

    Page.playerTurn = Helpers.updatePlayerTurn();
    return database.ref().update(updates);
};

Page.undoMove = function() {

};

Page.getGameData = function() {
    database.ref('connect-four/' + Page.gameUUID).on('value', function(snapshot) {
        var data = snapshot.val();
        if (data) {
            Page.placementArray = data.placementArray;

            Page.playerTurn = data.turn.playerTurn;
            console.log(Page.playerTurn);
            Helpers.updateTurnLabels(Page.playerTurn, Page.playerNumber);

            // make sure we're actually updating the value and not looking at our previous entry
            if (data.turn.drawPieceAt[0] !== -1 &&
                data.turn.drawPieceAt[1] !== -1 &&
                (Page.piecePlacedAt[0] !== data.turn.drawPieceAt[0] ||
                    Page.piecePlacedAt[1] !== data.turn.drawPieceAt[1])) {
                Page.piecePlacedAt = data.turn.drawPieceAt;
                Page.drawOpponentMove();
            }

            if (data.turn.gameOver && !Page.isGameOver) {
                Page.gameOver();
            } else {
                Page.isGameOver = false;
            }

            if (data.turn.gameOver && Page.isGameOver) {
                if ((data.player1ReplayDenied && Page.playerNumber == 1) ||
                    data.player2ReplayDenied && Page.playerNumber == 0) {
                    Page.$gameOverModal.modal('hide');
                    Page.$replayDeclined.modal('show');
                } else if (data.player1ReplayAccepted && data.player2ReplayAccepted) {
                    console.log('both players want replay');
                    // only allow player 1 to reset the game (since they created it to begin with
                    // and we don't want both players to create a game at the same time)
                    if (Page.playerNumber === 0) {
                        Page.resetGame();
                    }
                }
            }

            if (!Page.gameStarted && data.player2Ready) {
                Page.attachListeners();
                Helpers.hideLoadingOverlay();
                Page.$connectPlayersModal.modal('hide');
                Page.gameStarted = true;
            }
        } else {
            console.warn('error getting data')
        }
    });
};

//#endregion Update game data

//#region Win Condition

Page.isThereAWinner = function() {
    var matchesHorizontal = 0;
    var matchVertical = 0;
    for (var i = 0; i < Page.rows; i++) {
        matchesHorizontal = 0;

        for (var j = 0; j < Page.columns; j++) {
            // check horizontal
            if (Page.placementArray[i][j].player === Page.playerTurn) {
                matchesHorizontal++;
                if (matchesHorizontal == 4) {
                    return true;
                }
            } else {
                matchesHorizontal = 0;
            }

            // check vertical
            if (j - 1 > -1 && Page.placementArray[j - 1][i].player === Page.playerTurn) {
                matchVertical++;
                if (matchVertical == 4) {
                    return true;
                }
            } else {
                matchVertical = 0;
            }
        }
    }

    // check diagonal
    var diagonalRightMatches = 0;
    for (var i = 0; i < Page.rows; i++) {
        for (var j = 0; j < Page.columns; j++) {
            if (Page.checkWinDiagonal(i, j)) return true;
        }
    }

    return false;
};

Page.checkWinDiagonal = function(i, j) {
    var p = Page.playerTurn;
    if (Page.placementArray[i][j].player === p && (i + 3 < Page.rows)) {
        if (j + 3 < Page.columns) {
            if (Page.placementArray[i + 1][j + 1].player === p &&
                Page.placementArray[i + 2][j + 2].player === p &&
                Page.placementArray[i + 3][j + 3].player === p) {
                return true;
            }
        }
        if (j - 3 > -1) {
            if (Page.placementArray[i + 1][j - 1].player === p &&
                Page.placementArray[i + 2][j - 2].player === p &&
                Page.placementArray[i + 3][j - 3].player === p) {
                return true;
            }
        }
    }

    return false;
};

//#endregion Win Condition

//#region Reset / Replay

Page.gameOver = function() {
    Page.$maskCanvas.off('mouseup');
    Page.isGameOver = true;

    Page.$gameOverModal.one('show.bs.modal', function(e) {
        $(this).find('#confirm-replay-game').one('click', function() {
            Page.$gameOverModal.modal('hide');
            if (Page.isLocalGame) {
                Page.resetGame();
            } else {
                Page.replayAccepted();
            }
        });

        $(this).find('#deny-replay-game').one('click', function() {
            Page.$gameOverModal.modal('hide');
            Page.replayDenied();
        });
    });

    Page.$gameOverModal.modal('show');
};

Page.resetGame = function() {
    // clear the canvas
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    // reset game variables
    Page.placementArray = Helpers.create2DArray(Page.rows, Page.columns);
    Page.placementOrder = [];
    Page.piecePlacedAt = [];

    if (!Page.isLocalGame) {
        // clear game data in the database
        Page.createGameData();
    }

    // reattach click events
    Page.attachCanvasListener();
};

//#endregion Reset / Replay

$(document).on('ready', function() {
    Page.initialize();
});