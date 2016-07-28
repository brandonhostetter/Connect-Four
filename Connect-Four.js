
var Page = {};
Page.$connectFourBoard = null;
Page.columns = 7;
Page.rows = 6;
Page.playerTurn = null;
Page.pieceColors = ['gold', 'orangered'];
Page.placementArray = null;

Page.initialize = function () {
    Page.$connectFourBoard = $('#connect-four-board');
    Page.playerTurn = 0;
    Page.placementArray = Page.create2DArray(Page.rows, Page.columns);

    this.createGrid();
    this.attachClickListener();
};

//#region Setup

Page.createGrid = function () {
    // 7x6 grid
    for (var i = 0; i < Page.rows; i++) {
        var row = $('<div>');
        for (var j = 0; j < Page.columns; j++) {
            var button = $('<button>');
            var span = $('<span>');

            span.html('&nbsp;');
            button.append(span);

            button.attr('id', (i + '_' + j));
            button.attr('class', 'connect-four-square');

            row.append(button);
        }

        Page.$connectFourBoard.append(row);
    }
};

Page.attachClickListener = function () {
    for (var i = 0; i < Page.rows; i++) {
        for (var j = 0; j < Page.columns; j++) {
            $('#' + i + '_' + j).on('click', function (e) {
                var targetId = e.target.id.split('_');
                targetId[0] = parseInt(targetId[0]);
                targetId[1] = parseInt(targetId[1]);

                targetId = Page.forcePieceToBottom(targetId);

                if (!!targetId) {
                    $('#' + targetId[0] + '_' + targetId[1])
                        .css('background-color', Page.pieceColors[Page.playerTurn]);

                    Page.placementArray[targetId[0]][targetId[1]] = Page.playerTurn + 1;
                    if (Page.isThereAWinner(Page.playerTurn + 1)) {
                        console.log('Winner');
                        Page.gameOver();
                    }

                    Page.playerTurn = (Page.playerTurn + 1) % 2;
                }
            });
        }
    }
};

//#endregion Setup

//#region Helpers

Page.create2DArray = function (row, col) {
    var arr = [];
    for (var i = 0; i < row; i++) {
        arr.push([]);
        for (var j = 0; j < col; j++) {
            arr[i].push(0);
        }
    }
    return arr;
};

Page.isLocationTaken = function (location) {
    if (Page.placementArray[location[0]][location[1]] != 0) {
        return true;
    }
    return false;
};

Page.forcePieceToBottom = function (id) {
    // drop the piece in the column the user clicked,
    // not necessarily the exact button that was clicked
    var validMove = null;
    id = id.slice(0);
    id[0] = Page.rows - 1;

    while (!validMove) {
        if (Page.isLocationTaken(id)) {
            id[0] -= 1;
            if (id[0] < 0) {
                break;
            }
        } else {
            validMove = id;
        }
    }
    return validMove;
};

Page.isThereAWinner = function (player) {
    var matchesHorizontal = 0;
    var matchVertical = 0;
    for (var i = 0; i < Page.rows; i++) {
        for (var j = 0; j < Page.columns; j++) {
            // check horizontal
            if (Page.placementArray[i][j] == player) {
                matchesHorizontal++;
                if (matchesHorizontal == 4) {
                    return true;
                }
            } else {
                matchesHorizontal = 0;
            }

            // check vertical
            if (j - 1 > -1 && Page.placementArray[j - 1][i] == player) {
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
            if (Page.checkWinDiagonal(i, j, player)) return true;
        }
    }

    return false;
};

Page.checkWinDiagonal = function (i, j, player) {
    if (Page.placementArray[i][j] == player && (i + 3 < Page.rows)) {
        if (j + 3 < Page.columns) {
            if (Page.placementArray[i + 1][j + 1] == player
                && Page.placementArray[i + 2][j + 2] == player
                && Page.placementArray[i + 3][j + 3] == player) {
                return true;
            }
        }
        if (j - 3 > -1) {
            if (Page.placementArray[i + 1][j - 1] == player
                && Page.placementArray[i + 2][j - 2] == player
                && Page.placementArray[i + 3][j - 3] == player) {
                return true;
            }
        }
    }

    return false;
};

//#endregion Helpers

//#region Options

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
    // disable all buttons
    for (var i = 0; i < Page.rows; i++) {
        for (var j = 0; j < Page.columns; j++) {
            $('#' + i + '_' + j).attr('disabled', 'disabled');
        }
    }

    $('#game-over-modal').on('show.bs.modal', function (e) {
        $(this).find('#confirm-replay-game').on('click', function () {
            Page.resetGame();
            $('#game-over-modal').modal('hide');
        });
    });

    $('#game-over-modal').modal('show');
};

Page.resetGame = function () {
    Page.$connectFourBoard.html('');
    Page.playerTurn = 0;
    Page.placementArray = Page.create2DArray(Page.rows, Page.columns);
    Page.createGrid();
    Page.attachClickListener();
    Page.closeOptions();
};

//#endregion Reset / Replay

$(document).on('ready', function () {
    Page.initialize();
});
