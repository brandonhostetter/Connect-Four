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
// player related variables
Page.playerTurn = null;
Page.piececolors = ['gold', 'orangered'];
Page.placementArray = null;
Page.placementOrder = null;
Page.y = 0;
Page.dy = 20;
Page.drawPieceAt = null;
Page.isGameOver = false;
// options variables
Page.enableAnimations = true;

Page.initialize = function () {
    Page.$canvas = $('#connect-four-canvas');
    Page.context = Page.$canvas[0].getContext('2d');
    Page.$maskCanvas = $('#connect-four-mask-canvas');
    Page.maskContext = Page.$maskCanvas[0].getContext('2d');

    Page.placementArray = Page.create2DArray(Page.rows, Page.columns);
    Page.placementOrder = [];
    Page.attachCanvasListener();
    Page.attachButtonListeners();

    Page.playerTurn = 0;
    Page.drawOpeningMask();
};

//#region Event Listeners

Page.attachCanvasListener = function () {
    Page.$maskCanvas.on('mouseup', function (e) {
        if (Page.isAnimating) {
            return;
        } //else

        var col = e.offsetX;
        col -= 50;
        col /= 75;
        col = Math.round(col);
        if (col < 0) col = 0;
        if (col >= Page.columns) col = Page.columns - 1;

        Page.drawPieceAt = Page.forcePieceToBottom(col);
        if (Page.drawPieceAt) {
            Page.draw();
        }
    });
};

Page.attachButtonListeners = function () {
    $('#undo-button').on('click', function (e) {
        if (Page.isGameOver) return;

        var length = Page.placementOrder.length;
        if (length > 0) {
            var last = Page.placementOrder[length - 1];
            Page.placementArray[last.row][last.col].player = null;
            Page.placementArray[last.row][last.col].color = 'white';
            Page.playerTurn = (Page.playerTurn + 1) % 2;
            Page.drawUndo();
            Page.placementOrder.pop();
        }
    });

    $('#restart-button').on('click', function (e) {
        Page.resetGame();
    });
};

//#endregion Event Listeners

//#region Canvas Drawing

Page.draw = function () {
    Page.intervalId = window.requestAnimationFrame(Page.draw);
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);

    Page.drawPlacedPieces();
    Page.drawDropAnimation();
};

Page.drawOpeningMask = function () {
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

Page.drawPiece = function (x, y, player) {
    Page.context.beginPath();
    Page.context.arc(x, y, 30, 0, 2 * Math.PI);
    Page.context.fillStyle = Page.piececolors[player];
    Page.context.fill();
    Page.context.closePath();
};

Page.drawDropAnimation = function () {
    if (Page.stopRendering || !Page.enableAnimations) {
        cancelAnimationFrame(Page.intervalId);
        Page.y = 0;
        Page.stopRendering = false;
        Page.updatePlacement();
        Page.drawPlacedPieces();
        Page.isAnimating = false;
        return;
    } else if (Page.y >= Page.drawPieceAt[0] * 96 - 62) {
        Page.stopRendering = true;
        return;
    }

    Page.isAnimating = true;
    Page.y += Page.dy;
    Page.drawPiece(75 * Page.drawPieceAt[1] + 50, Page.y, Page.playerTurn);
};

Page.drawPlacedPieces = function () {
    for (var i = 0; i < Page.placementArray.length; i++) {
        for (var j = 0; j < Page.placementArray[i].length; j++) {
            if (Page.placementArray[i][j].player !== null) {
                Page.drawPiece(75 * j + 50, 75 * i + 48, Page.placementArray[i][j].player);
            }
        }
    }
};

Page.drawUndo = function () {
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    Page.drawPlacedPieces();
};

//#endregion Canvas Drawing

//#region Helpers

Page.create2DArray = function (row, col) {
    var arr = [];
    for (var i = 0; i < row; i++) {
        arr.push([]);
        for (var j = 0; j < col; j++) {
            arr[i].push({ player: null, color: 'white' });
        }
    }
    return arr;
};

Page.isLocationTaken = function (row, column) {
    if (Page.placementArray[row][column].player !== null) {
        return true;
    }
    return false;
};

Page.forcePieceToBottom = function (column) {
    // drop the piece in the column the user clicked,
    // not necessarily the exact location that was clicked
    var validMove = null;
    var row = Page.rows - 1;

    while (!validMove) {
        if (Page.isLocationTaken(row, column)) {
            row -= 1;
            if (row < 0) {
                break;
            }
        } else {
            validMove = [row, column];
        }
    }
    return validMove;
};

Page.updatePlacement = function () {
    Page.placementArray[Page.drawPieceAt[0]][Page.drawPieceAt[1]].player = Page.playerTurn;
    Page.placementOrder.push({ row: Page.drawPieceAt[0], col: Page.drawPieceAt[1] });

    if (Page.isThereAWinner()) {
        Page.gameOver();
    }

    Page.playerTurn = (Page.playerTurn + 1) % 2;
};

//#endregion Helpers

//#region Win Condition

Page.isThereAWinner = function () {
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

Page.checkWinDiagonal = function (i, j) {
    var p = Page.playerTurn;
    if (Page.placementArray[i][j].player === p && (i + 3 < Page.rows)) {
        if (j + 3 < Page.columns) {
            if (Page.placementArray[i + 1][j + 1].player === p
				&& Page.placementArray[i + 2][j + 2].player === p
				&& Page.placementArray[i + 3][j + 3].player === p) {
                return true;
            }
        }
        if (j - 3 > -1) {
            if (Page.placementArray[i + 1][j - 1].player === p
				&& Page.placementArray[i + 2][j - 2].player === p
				&& Page.placementArray[i + 3][j - 3].player === p) {
                return true;
            }
        }
    }

    return false;
};

//#endregion Win Condition

//#region Options

Page.animationOption = function () {
    Page.enableAnimations = !Page.enableAnimations;
};

Page.restartOption = function () {
    $('#game-over-modal').on('show.bs.modal', function (e) {
        $(this).find('#confirm-replay-game').on('click', function () {
            Page.resetGame();
            $('#game-over-modal').modal('hide');
        });
    });

    $('#game-over-modal').modal('show');
};

Page.openOptions = function () {
    $('#options-side-menu').css('width', '250px');
};

Page.closeOptions = function () {
    $('#options-side-menu').css('width', '0');
};

//#endregion Options

//#region Reset / Replay

Page.gameOver = function () {
    Page.$maskCanvas.off('mouseup');
    Page.isGameOver = true;

    $('#game-over-modal').on('show.bs.modal', function (e) {
        $(this).find('#confirm-replay-game').on('click', function () {
            Page.resetGame();
            $('#game-over-modal').modal('hide');
        });
    });

    $('#game-over-modal').modal('show');
};

Page.resetGame = function () {
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    Page.playerTurn = 0;
    Page.placementArray = Page.create2DArray(Page.rows, Page.columns);
    Page.placementOrder = [];
    Page.attachCanvasListener();
    Page.isGameOver = false;
};

//#endregion Reset / Replay

$(document).on('ready', function () {
    Page.initialize();
});
