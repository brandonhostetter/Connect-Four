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
// player related variables
Page.playerTurn = null;
Page.playerNumber = -1;
Page.piececolors = ['gold', 'orangered'];
Page.placementArray = null;
Page.placementOrder = null;
Page.y = 0;
Page.dy = 20;
Page.piecePlacedAt = null;
Page.isGameOver = false;
Page.gameUUID = '';
Page.gameStarted = false;

Page.initialize = function() {
    Page.$canvas = $('#connect-four-canvas');
    Page.context = Page.$canvas[0].getContext('2d');
    Page.$maskCanvas = $('#connect-four-mask-canvas');
    Page.maskContext = Page.$maskCanvas[0].getContext('2d');

    Page.$initModal = $('#init-modal');
    Page.$connectPlayersModal = $('#connect-players-modal');
    Page.$gameOverModal = $('#game-over-modal');

    Page.placementArray = Helpers.create2DArray(Page.rows, Page.columns);
    Page.placementOrder = [];
    Page.piecePlacedAt = [];

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

    // play on one computer
    Page.$initModal.find('#play-one-computer').on('click', function() {
        Page.$initModal.modal('hide');
    });

    // play on two computers (connect two games)
    Page.$initModal.find('#play-two-computers').on('click', function() {
        Helpers.showLoadingOverlay(); // display an overlay until player 2 joins
        Page.multiComputer();
        Page.createGameData();
        Page.getGameData();
        Page.$initModal.modal('hide');
    });
};

Page.attachListeners = function() {
    Page.attachCanvasListener();
    Page.attachButtonListeners();
};

Page.multiComputer = function() {
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
        if (Page.isAnimating || (Page.playerTurn != Page.playerNumber)) {
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
        Page.resetGame();
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
    for (var i = 0; i < Page.rows; i++) {
        for (var j = 0; j < Page.columns; j++) {
            Page.maskContext.arc(75 * j + 50, 75 * i + 48, 30, 0, 2 * Math.PI);
            Page.maskContext.rect(75 * j + 90, 96 * i, -85, 96);
        }
    }
    Page.maskContext.fill();
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
        Page.saveGameData();

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
        'player2Ready': false // player 1 creates the game so assume they're ready
    });

    database.ref('connect-four/' + Page.gameUUID + '/turn').set({
        'playerTurn': 0,
        'gameOver': false,
        'drawPieceAt': [-1, -1]
    });
};

Page.player2Ready = function() {
    database.ref('connect-four/' + Page.gameUUID).update({
        'player2Ready': true
    });
};

Page.saveGameData = function() {
    var updates = {};
    updates['connect-four/' + Page.gameUUID + '/placementArray/' + Page.piecePlacedAt[0] + '/' + Page.piecePlacedAt[1]] = {
        'player': Page.playerTurn
    };
    updates['connect-four/' + Page.gameUUID + '/turn'] = {
        'playerTurn': Helpers.updatePlayerTurn(),
        'drawPieceAt': Page.piecePlacedAt,
        'gameOver': Page.isGameOver
    };

    Page.playerTurn = Helpers.updatePlayerTurn();
    return database.ref().update(updates);
};

Page.getGameData = function() {
    database.ref('connect-four/' + Page.gameUUID).on('value', function(snapshot) {
        if (snapshot.val()) {
            Page.placementArray = snapshot.val().placementArray;

            // if (Page.playerTurn !== snapshot.val().turn.playerTurn) {
            Page.playerTurn = snapshot.val().turn.playerTurn;
            console.log(Page.playerTurn);
            Helpers.updateTurnLabels(Page.playerTurn, Page.playerNumber);
            // }

            if (snapshot.val().turn.drawPieceAt[0] !== -1 &&
                snapshot.val().turn.drawPieceAt[1] !== -1) {
                if (Page.piecePlacedAt[0] !== snapshot.val().turn.drawPieceAt[0] ||
                    Page.piecePlacedAt[1] !== snapshot.val().turn.drawPieceAt[1]) {
                    Page.piecePlacedAt = snapshot.val().turn.drawPieceAt;
                    Page.drawOpponentMove();
                }
            }

            if (snapshot.val().turn.gameOver && !Page.isGameOver) {
                Page.gameOver();
            }

            if (!Page.gameStarted && snapshot.val().player2Ready) {
                Page.attachListeners();
                Helpers.hideLoadingOverlay();
                Page.$connectPlayersModal.modal('hide');
                Page.gameStarted = true;
            }
        } else {
            console.warn('error getting data')
        }
        console.log(snapshot.val());
    });
};

//#endregion Update game data

//#region Win Condition

Page.isThereAWinner = function() {
    var p = Page.playerTurn;
    var matchesHorizontal = 0;
    var matchVertical = 0;
    for (var i = 0; i < Page.rows; i++) {
        matchesHorizontal = 0;

        for (var j = 0; j < Page.columns; j++) {
            // check horizontal
            if (Page.placementArray[i][j].player === p) {
                matchesHorizontal++;
                if (matchesHorizontal == 4) {
                    return true;
                }
            } else {
                matchesHorizontal = 0;
            }

            // check vertical
            if (j - 1 > -1 && Page.placementArray[j - 1][i].player === p) {
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

    Page.$gameOverModal.on('show.bs.modal', function(e) {
        $(this).find('#confirm-replay-game').on('click', function() {
            Page.resetGame();
            Page.$gameOverModal.modal('hide');
        });
    });

    Page.$gameOverModal.modal('show');
};

Page.resetGame = function() {
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    Page.playerTurn = 0;
    Page.placementArray = Helpers.create2DArray(Page.rows, Page.columns);
    Page.placementOrder = [];
    Page.attachCanvasListener();
    Page.isGameOver = false;
};

//#endregion Reset / Replay

$(document).on('ready', function() {
    Page.initialize();
});
