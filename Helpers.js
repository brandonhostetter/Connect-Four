var Helpers = {};

Helpers.$myTurnLabel = $('#my-turn-label');
Helpers.$waitingForTurnLabel = $('#waiting-for-turn-label');
Helpers.$loadingOverlay = $('#loading-overlay');

Helpers.create2DArray = function(row, col) {
    var arr = [];
    for (var i = 0; i < row; i++) {
        arr.push([]);
        for (var j = 0; j < col; j++) {
            arr[i].push({ player: -1 });
        }
    }
    return arr;
};

Helpers.isLocationTaken = function(placementArray, row, column) {
    if (placementArray[row][column].player !== -1) {
        return true;
    }
    return false;
};

Helpers.forcePieceToBottom = function(placementArray, column) {
    // drop the piece in the column the user clicked,
    // not necessarily the exact location that was clicked
    var validMove = null;
    var row = Page.rows - 1;

    while (!validMove) {
        if (Helpers.isLocationTaken(placementArray, row, column)) {
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

Helpers.updatePlacement = function(placementArray, placementOrder, drawPieceAt, playerTurn) {
    placementArray[drawPieceAt[0]][drawPieceAt[1]].player = playerTurn;
    placementOrder.push({ row: drawPieceAt[0], col: drawPieceAt[1] });
};

Helpers.updatePlayerTurn = function() {
    return (Page.playerTurn + 1) % 2;
};

Helpers.generateGUID = function() {
    // http://stackoverflow.com/a/2117523
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

Helpers.readUrlHash = function() {
    // get the uuid after the hash in the url
    var hash = window.location.hash;

    if (hash == null || hash == '') {
        return '';
    } else {
        return hash.substring(1);
    }
};

Helpers.copyToClipboard = function(element) {
    // take 'element' and copy it's text to the clipboard
    // 'element' should be an input element
    if (element.tagName !== "INPUT") return;

    element.focus();
    element.setSelectionRange(0, element.value.length);

    // copy the selection
    var succeed;
    try {
        succeed = document.execCommand('copy');
    } catch (e) {
        succeed = false;
    }
    return succeed;
};

Helpers.updateTurnLabels = function(turn, playerNumber) {
    if (turn === playerNumber) {
        Helpers.$waitingForTurnLabel.hide();
        Helpers.$myTurnLabel.show();
    } else {
        Helpers.$myTurnLabel.hide();
        Helpers.$waitingForTurnLabel.show();
    }
};

Helpers.showLoadingOverlay = function() {
    Helpers.$loadingOverlay.addClass('overlay-visible');
};

Helpers.hideLoadingOverlay = function() {
    Helpers.$loadingOverlay.removeClass('overlay-visible');
};
