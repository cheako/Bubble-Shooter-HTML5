// ------------------------------------------------------------------------
// Bubble Shooter Game Tutorial With HTML5 And JavaScript
// Copyright (c) 2015 Rembound.com
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see http://www.gnu.org/licenses/.
//
// http://rembound.com/articles/bubble-shooter-game-tutorial-with-html5-and-javascript
// ------------------------------------------------------------------------

// The function gets called when the window is fully loaded
window.onload = () => {
    document.getElementById("gofullscreen").onclick = function () {
        let speed = Number(document.getElementById("speed").value);
        let tilesize = Number(document.getElementById("tilesize").value);
        let scale = tilesize / 40;
        let rowheight = 34 * scale;

        var canvas = document.createElement('canvas');

        canvas.id = "GameBoard";

        let body = document.getElementById("main");
        let child;
        while (child = body.firstChild) {
            child.remove();
        }

        body.appendChild(canvas);

        canvas.requestFullscreen().then(() => {
            // Get the device pixel ratio, falling back to 1.
            let dpr = window.devicePixelRatio || 1;

            let rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            // canvas.style.width = `${rect.width}px`;
            // canvas.style.height = `${rect.height}px`;

            let width = rect.width - 8 * scale;
            // No idea where 66 comes from.
            let height = rect.height - 2 * tilesize - 66 * scale;

            // Level
            let level = {
                x: 4 * scale, // X position
                y: 83 * scale, // Y position
                width: width, // Width
                height: height, // Height
                columns: Math.floor((width - tilesize / 2) / tilesize), // Number of tile columns
                rows: Math.floor((height - tilesize) / rowheight) + 1, // Number of tile rows
                tilesize: tilesize, // Visual width of a tile
                rowheight: rowheight, // Height of a row
                radius: tilesize / 2, // Bubble collision radius
                scale: scale, // This will be used all over to resize things
                dpr: dpr, // Mouse position adjust
                tiles: [] // The two-dimensional tile array
            };

            let context = canvas.getContext("2d");
            context.scale(dpr, dpr);

            run_game(canvas, context, level, speed);
        }, (err) => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    };

    document.getElementById("staticstart").onclick = () => {
        let speed = Number(document.getElementById("speed").value);
        let tilesize = Number(document.getElementById("tilesize").value);
        let scale = tilesize / 40;
        let rowheight = 34 * scale;
        let columns = Number(document.getElementById("columns").value);
        let rows = Number(document.getElementById("rows").value);

        // Get the device pixel ratio, falling back to 1.
        var dpr = window.devicePixelRatio || 1;

        // Level
        let level = {
            x: 4 * scale, // X position
            y: 83 * scale, // Y position
            width: columns * tilesize + tilesize / 2, // Width
            height: rows * rowheight + tilesize, // Height
            columns: columns, // Number of tile columns
            rows: rows + 1, // Number of tile rows
            tilesize: tilesize, // Visual size of a tile
            rowheight: rowheight, // Height of a row
            radius: tilesize / 2, // Bubble collision radius
            scale: scale, // This will be used all over to resize things
            dpr: dpr, // Mouse position adjust
            tiles: [] // The two-dimensional tile array
        };

        let canvas = document.createElement('canvas');

        let width = level.width + 8 * scale;
        // No idea where 66 comes from.
        let height = level.height + 2 * tilesize + 66 * scale;

        canvas.id = "GameBoard";
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.style.zIndex = 8;
        canvas.style.position = "absolute";
        canvas.style.border = "1px solid";
        canvas.style.marginLeft = `${(width + 2) / -2}px`;
        canvas.style.marginTop = `${(height + 2) / -2}px`;

        let center = document.getElementById("centerpoint");
        let child;
        while (child = center.firstChild) {
            child.remove();
        }

        center.appendChild(canvas);

        let context = canvas.getContext("2d");
        context.scale(dpr, dpr);

        run_game(canvas, context, level, speed);
    };
}

function run_game(canvas, context, level, speed) {
    // Timing and frames per second
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;

    var initialized = false;

    // Define a tile class
    var Tile = function(x, y, type, shift) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.removed = false;
        this.shift = shift;
        this.velocity = 0;
        this.alpha = 1;
        this.processed = false;
    };

    // Player
    var player = {
        x: 0,
        y: 0,
        angle: 0,
        tiletype: 0,
        bubble: {
                    x: 0,
                    y: 0,
                    angle: 0,
                    speed: speed,
                    dropspeed: 900,
                    tiletype: 0,
                    visible: false
                },
        nextbubble: {
                        x: 0,
                        y: 0,
                        tiletype: 0
                    }
    };

    // Neighbor offset table
    var neighborsoffsets = [[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
                            [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]];  // Odd row tiles

    // Number of different colors
    var bubblecolors = 7;

    // Game states
    var gamestates = { init: 0, ready: 1, shootbubble: 2, removecluster: 3, gameover: 4 };
    var gamestate = gamestates.init;

    // Score
    var score = 0;

    var turncounter = 0;
    var rowoffset = 0;

    // Animation variables
    var animationstate = 0;
    var animationtime = 0;

    // Clusters
    var showcluster = false;
    var cluster = [];
    var floatingclusters = [];

    // Touch
    var touch = {
        identifyer: undefined,
        timeStamp: undefined
    };

    // Leaderboard
    var scoringflags = {};

    // Images
    var images = [];
    var bubbleimage;

    // Image loading global variables
    var loadcount = 0;
    var loadtotal = 0;
    var preloaded = false;

    // Load images
    function loadImages(imagefiles) {
        // Initialize variables
        loadcount = 0;
        loadtotal = imagefiles.length;
        preloaded = false;

        // Load the images
        var loadedimages = [];
        for (var i=0; i<imagefiles.length; i++) {
            // Create the image object
            var image = new Image();

            // Add onload event handler
            image.onload = function () {
                loadcount++;
                if (loadcount == loadtotal) {
                    // Done loading
                    preloaded = true;
                }
            };

            // Set the source url of the image
            image.src = imagefiles[i];

            // Save to the image array
            loadedimages[i] = image;
        }

        // Return an array of images
        return loadedimages;
    }

    // Initialize the game
    function init() {
        // Load images
        images = loadImages(["bubble-sprites.png"]);
        bubbleimage = images[0];

        // Add mouse events
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);

        // Add touch events
        canvas.addEventListener("touchstart", touchHandleStart);
        canvas.addEventListener("touchmove", touchHandleMove);
        canvas.addEventListener("touchend", touchHandleEnd);
        canvas.addEventListener("touchcancel", touchHandleCancel);

        // Initialize the two-dimensional tile array
        for (var i=0; i<level.columns; i++) {
            level.tiles[i] = [];
            for (var j=0; j<level.rows; j++) {
                // Define a tile type and a shift parameter for animation
                level.tiles[i][j] = new Tile(i, j, 0, 0);
            }
        }

        // Init the player
        player.x = level.x + level.width/2 - level.tilesize/2;
        player.y = level.y + level.height;
        player.angle = Math.PI;
        player.tiletype = 0;

        player.nextbubble.x = player.x - 2 * level.tilesize;
        player.nextbubble.y = player.y;

        // New game
        newGame();

        // Enter main loop
        main(0);
    }

    // Main loop
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);

        if (!initialized) {
            // Preloader

            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the frame
            drawFrame();

            // Draw a progress bar
            var loadpercentage = loadcount/loadtotal;
            context.strokeStyle = "#ff8080";
            context.lineWidth = 3 * level.scale;
            context.strokeRect(18.5 * level.scale, canvas.height - 50.5 * level.scale, canvas.width - 37 * level.scale, 32 * level.scale);
            context.fillStyle = "#ff8080";
            context.fillRect(18.5 * level.scale, canvas.height - 50.5 * level.scale, loadpercentage * (canvas.width - 37 * level.scale), 32 * level.scale);

            // Draw the progress text
            var loadtext = "Loaded " + loadcount + "/" + loadtotal + " images";
            context.fillStyle = "#000000";
            context.font = `${16 * level.scale}px Verdana`;
            context.fillText(loadtext, 18 * level.scale, canvas.height - 62.5 * level.scale);

            if (preloaded) {
                // Add a delay for demonstration purposes
                setTimeout(function(){initialized = true;}, 1000);
            }
        } else {
            // Update and render the game
            update(tframe);
            render();
        }
    }

    // Update the game state
    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;

        // Update the fps counter
        updateFps(dt);

        if (gamestate == gamestates.ready) {
            // Game is ready for player input
        } else if (gamestate == gamestates.shootbubble) {
            // Bubble is moving
            stateShootBubble(dt);
        } else if (gamestate == gamestates.removecluster) {
            // Remove cluster and drop tiles
            stateRemoveCluster(dt);
        }
    }

    function setGameState(newgamestate) {
        gamestate = newgamestate;

        animationstate = 0;
        animationtime = 0;
    }

    function stateShootBubble(dt) {
        // Bubble is moving

        let dist = dt * player.bubble.speed;
        let deltax = dist * Math.cos(player.bubble.angle);
        let deltay = dist * Math.sin(player.bubble.angle);
        let number_movements = Math.ceil(2 * dist / level.tilesize);

        for (var t=0; t<number_movements; t++) {
            // Move the bubble in the direction of the mouse
            player.bubble.x += deltax / number_movements;
            player.bubble.y -= deltay / number_movements;

            let rightEdge = level.x + level.width - level.tilesize;

            // Handle left and right collisions with the level
            if (player.bubble.x <= level.x) {
                // Left edge
                player.bubble.angle = Math.PI - player.bubble.angle;
                player.bubble.x = level.x * 2 - player.bubble.x;
            } else if (player.bubble.x >= rightEdge) {
                // Right edge
                player.bubble.angle = Math.PI - player.bubble.angle;
                player.bubble.x = rightEdge * 2 - player.bubble.x;
            }

            // Collisions with the top of the level
            if (player.bubble.y <= level.y) {
                // Top collision
                let ydelta = level.y - player.bubble.y;
                player.bubble.x += Math.sin(player.bubble.angle) * Math.cos(player.bubble.angle) / ydelta;
                player.bubble.y = level.y;
                snapBubble();
                return;
            }

            // Collisions with other tiles
            for (var i=0; i<level.columns; i++) {
                for (var j=0; j<level.rows; j++) {
                    var tile = level.tiles[i][j];

                    // Skip empty tiles
                    if (tile.type < 0) {
                        continue;
                    }

                    // Check for intersections
                    var coord = getTileCoordinate(i, j);
                    if ( // Check if two circles intersect
                        function circleIntersection(x1, y1, r1, x2, y2, r2) {
                            // Calculate the distance between the centers
                            var dx = x1 - x2;
                            var dy = y1 - y2;

                            return dx * dx + dy * dy < r1 * r1 + r2 * r2;
                        }(player.bubble.x + level.tilesize / 2,
                            player.bubble.y + level.tilesize / 2,
                            level.radius,
                            coord.tilex + level.tilesize / 2,
                            coord.tiley + level.tilesize / 2,
                            level.radius)) {

                        // Intersection with a level bubble
                        snapBubble();
                        return;
                    }
                }
            }
        }        
    }

    function stateRemoveCluster(dt) {
        if (animationstate == 0) {
            resetRemoved();

            // Mark the tiles as removed
            for (var i=0; i<cluster.length; i++) {
                // Set the removed flag
                cluster[i].removed = true;
            }

            // Add cluster score
            score += cluster.length * 100;

            // Find floating clusters
            floatingclusters = findFloatingClusters();

            if (floatingclusters.length > 0) {
                // Setup drop animation
                for (var i=0; i<floatingclusters.length; i++) {
                    for (var j=0; j<floatingclusters[i].length; j++) {
                        var tile = floatingclusters[i][j];
                        tile.shift = 0;
                        tile.shift = 1;
                        tile.velocity = player.bubble.dropspeed;

                        score += 100;
                    }
                }
            }

            animationstate = 1;
        }

        if (animationstate == 1) {
            // Pop bubbles
            var tilesleft = false;
            for (var i=0; i<cluster.length; i++) {
                var tile = cluster[i];

                if (tile.type >= 0) {
                    tilesleft = true;

                    // Alpha animation
                    tile.alpha -= dt * 15;
                    if (tile.alpha < 0) {
                        tile.alpha = 0;
                    }

                    if (tile.alpha == 0) {
                        tile.type = -1;
                        tile.alpha = 1;
                    }
                }
            }

            // Drop bubbles
            for (var i=0; i<floatingclusters.length; i++) {
                for (var j=0; j<floatingclusters[i].length; j++) {
                    var tile = floatingclusters[i][j];

                    if (tile.type >= 0) {
                        tilesleft = true;

                        // Accelerate dropped tiles
                        tile.velocity += dt * 700;
                        tile.shift += dt * tile.velocity;

                        // Alpha animation
                        tile.alpha -= dt * 8;
                        if (tile.alpha < 0) {
                            tile.alpha = 0;
                        }

                        // Check if the bubbles are past the bottom of the level
                        if (tile.alpha == 0 || (tile.y * level.rowheight + tile.shift > (level.rows - 1) * level.rowheight + level.tilesize)) {
                            tile.type = -1;
                            tile.shift = 0;
                            tile.alpha = 1;
                        }
                    }

                }
            }

            if (!tilesleft) {
                // Next bubble
                nextBubble();

                // Check for game over
                var tilefound = false
                for (var i=0; i<level.columns; i++) {
                    for (var j=0; j<level.rows; j++) {
                        if (level.tiles[i][j].type != -1) {
                            tilefound = true;
                            break;
                        }
                    }
                }

                if (tilefound) {
                    setGameState(gamestates.ready);
                } else {
                    // No tiles left, game over
                    setGameState(gamestates.gameover);
                }
            }
        }
    }

    // Snap bubble to the grid
    function snapBubble() {
        // Get the grid position
        var centerx = player.bubble.x + level.tilesize/2;
        var centery = player.bubble.y + level.tilesize/2;
        var gridpos = getGridPosition(centerx, centery);

        // Make sure the grid position is valid
        if (gridpos.x < 0) {
            gridpos.x = 0;
        }

        if (gridpos.x >= level.columns) {
            gridpos.x = level.columns - 1;
        }

        if (gridpos.y < 0) {
            gridpos.y = 0;
        }

        if (gridpos.y >= level.rows) {
            gridpos.y = level.rows - 1;
        }

        // Check if the tile is empty
        var addtile = false;
        if (level.tiles[gridpos.x][gridpos.y].type != -1) {
            // Tile is not empty, shift the new tile downwards
            for (var newrow=gridpos.y+1; newrow<level.rows; newrow++) {
                if (level.tiles[gridpos.x][newrow].type == -1) {
                    gridpos.y = newrow;
                    addtile = true;
                    break;
                }
            }
        } else {
            addtile = true;
        }

        // Add the tile to the grid
        if (addtile) {
            // Hide the player bubble
            player.bubble.visible = false;

            // Set the tile
            level.tiles[gridpos.x][gridpos.y].type = player.bubble.tiletype;

            // Check for game over
            if (checkGameOver()) {
                return;
            }

            // Find clusters
            cluster = findCluster(gridpos.x, gridpos.y, true, true, false);

            if (cluster.length >= 3) {
                // Remove the cluster
                setGameState(gamestates.removecluster);
                return;
            }
        }

        // No clusters found
        turncounter++;
        if (turncounter >= 5) {
            // Add a row of bubbles
            addBubbles();
            turncounter = 0;
            rowoffset = (rowoffset + 1) % 2;

            if (checkGameOver()) {
                return;
            }
        }

        // Next bubble
        nextBubble();
        setGameState(gamestates.ready);
    }

    function checkGameOver() {
        // Check for game over
        for (var i=0; i<level.columns; i++) {
            // Check if there are bubbles in the bottom row
            if (level.tiles[i][level.rows-1].type != -1) {
                // Game over
                nextBubble();
                setGameState(gamestates.gameover);
                return true;
            }
        }

        return false;
    }

    function addBubbles() {
        // Move the rows downwards
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows-1; j++) {
                level.tiles[i][level.rows-1-j].type = level.tiles[i][level.rows-1-j-1].type;
            }
        }

        // Add a new row of bubbles at the top
        for (var i=0; i<level.columns; i++) {
            // Add random, existing, colors
            level.tiles[i][0].type = getExistingColor();
        }
    }

    // Find the remaining colors
    function findColors() {
        var foundcolors = [];
        var colortable = [];
        for (var i=0; i<bubblecolors; i++) {
            colortable.push(false);
        }

        // Check all tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (tile.type >= 0) {
                    if (!colortable[tile.type]) {
                        colortable[tile.type] = true;
                        foundcolors.push(tile.type);
                    }
                }
            }
        }

        return foundcolors;
    }

    // Find cluster at the specified tile location
    function findCluster(tx, ty, matchtype, reset, skipremoved) {
        // Reset the processed flags
        if (reset) {
            resetProcessed();
        }

        // Get the target tile. Tile coord must be valid.
        var targettile = level.tiles[tx][ty];

        // Initialize the toprocess array with the specified tile
        var toprocess = [targettile];
        targettile.processed = true;
        var foundcluster = [];

        while (toprocess.length > 0) {
            // Pop the last element from the array
            var currenttile = toprocess.pop();

            // Skip processed and empty tiles
            if (currenttile.type == -1) {
                continue;
            }

            // Skip tiles with the removed flag
            if (skipremoved && currenttile.removed) {
                continue;
            }

            // Check if current tile has the right type, if matchtype is true
            if (!matchtype || (currenttile.type == targettile.type)) {
                // Add current tile to the cluster
                foundcluster.push(currenttile);

                // Get the neighbors of the current tile
                var neighbors = getNeighbors(currenttile);

                // Check the type of each neighbor
                for (var i=0; i<neighbors.length; i++) {
                    if (!neighbors[i].processed) {
                        // Add the neighbor to the toprocess array
                        toprocess.push(neighbors[i]);
                        neighbors[i].processed = true;
                    }
                }
            }
        }

        // Return the found cluster
        return foundcluster;
    }

    // Find floating clusters
    function findFloatingClusters() {
        // Reset the processed flags
        resetProcessed();

        var foundclusters = [];

        // Check all tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (!tile.processed) {
                    // Find all attached tiles
                    var foundcluster = findCluster(i, j, false, false, true);

                    // There must be a tile in the cluster
                    if (foundcluster.length <= 0) {
                        continue;
                    }

                    // Check if the cluster is floating
                    var floating = true;
                    for (var k=0; k<foundcluster.length; k++) {
                        if (foundcluster[k].y == 0) {
                            // Tile is attached to the roof
                            floating = false;
                            break;
                        }
                    }

                    if (floating) {
                        // Found a floating cluster
                        foundclusters.push(foundcluster);
                    }
                }
            }
        }

        return foundclusters;
    }

    // Reset the processed flags
    function resetProcessed() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].processed = false;
            }
        }
    }

    // Reset the removed flags
    function resetRemoved() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].removed = false;
            }
        }
    }

    // Get the neighbors of the specified tile
    function getNeighbors(tile) {
        var tilerow = (tile.y + rowoffset) % 2; // Even or odd row
        var neighbors = [];

        // Get the neighbor offsets for the specified tile
        var n = neighborsoffsets[tilerow];

        // Get the neighbors
        for (var i=0; i<n.length; i++) {
            // Neighbor coordinate
            var nx = tile.x + n[i][0];
            var ny = tile.y + n[i][1];

            // Make sure the tile is valid
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                neighbors.push(level.tiles[nx][ny]);
            }
        }

        return neighbors;
    }

    function updateFps(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(framecount / fpstime);

            // Reset time and framecount
            fpstime = 0;
            framecount = 0;
        }

        // Increase time and framecount
        fpstime += dt;
        framecount++;
    }

    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x * level.scale + (width * level.scale - textdim.width)/2, y * level.scale);
    }

    // Render the game
    function render() {
        // Draw the frame around the game
        drawFrame();

        var yoffset =  level.tilesize/2;

        // Draw level background
        context.fillStyle = "#8c8c8c";
        context.fillRect(level.x - 4 * level.scale, level.y - 4 * level.scale, level.width + 8 * level.scale, level.height + 4 * level.scale - yoffset);

        // Render tiles
        renderTiles();

        // Draw level bottom
        context.fillStyle = "#656565";
        context.fillRect(level.x - 4 * level.scale, level.y - 4 * level.scale + level.height + 4 * level.scale - yoffset, level.width + 8 * level.scale, 2*level.tilesize + 3 * level.scale);

        // Draw score
        context.fillStyle = "#ffffff";
        context.font = `${18 * level.scale}px Verdana`;
        var scorex = level.x + level.width - 150;
        var scorey = level.y+level.height + level.tilesize - yoffset - 8;
        drawCenterText("Score:", scorex, scorey, 150);
        context.font = `${24 * level.scale}px Verdana`;
        drawCenterText(score, scorex, scorey + 30, 150);

        // Render cluster
        if (showcluster) {
            renderCluster(cluster, 255, 128, 128);

            for (var i=0; i<floatingclusters.length; i++) {
                var col = Math.floor(100 + 100 * i / floatingclusters.length);
                renderCluster(floatingclusters[i], col, col, col);
            }
        }


        // Render player bubble
        renderPlayer();

        // Game Over overlay
        if (gamestate == gamestates.gameover) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x - 4 * level.scale, level.y - 4 * level.scale, level.width + 8 * level.scale, level.height + 2 * level.tilesize + 8 * level.scale - yoffset);

            context.fillStyle = "#ffffff";
            context.font = `${24 * level.scale}px Verdana`;
            drawCenterText("Game Over!", level.x, level.y + level.height / 2 + 10, level.width);
            drawCenterText("Click to start", level.x, level.y + level.height / 2 + 40, level.width);
        }
    }

    // Draw a frame around the game
    function drawFrame() {
        // Draw background
        context.fillStyle = "#e8eaec";
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw header
        context.fillStyle = "#303030";
        context.fillRect(0, 0, canvas.width, 79 * level.scale);

        // Draw title
        context.fillStyle = "#ffffff";
        context.font = `${24 * level.scale}px Verdana`;
        context.fillText("Bubble Shooter Example - Rembound.com", 10 * level.scale, 37 * level.scale);

        // Display fps
        context.fillStyle = "#ffffff";
        context.font = `${12 * level.scale}px Verdana`;
        context.fillText("Fps: " + fps, 13 * level.scale, 57 * level.scale);
    }

    // Render tiles
    function renderTiles() {
        // Top to bottom
        for (var j=0; j<level.rows; j++) {
            for (var i=0; i<level.columns; i++) {
                // Get the tile
                var tile = level.tiles[i][j];

                // Get the shift of the tile for animation
                var shift = tile.shift;

                // Calculate the tile coordinates
                var coord = getTileCoordinate(i, j);

                // Check if there is a tile present
                if (tile.type >= 0) {
                    // Support transparency
                    context.save();
                    context.globalAlpha = tile.alpha;

                    // Draw the tile using the color
                    drawBubble(coord.tilex, coord.tiley + shift, tile.type);

                    context.restore();
                }
            }
        }
    }

    // Render cluster
    function renderCluster(cluster, r, g, b) {
        for (var i=0; i<cluster.length; i++) {
            // Calculate the tile coordinates
            var coord = getTileCoordinate(cluster[i].x, cluster[i].y);

            // Draw the tile using the color
            context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
            context.fillRect(coord.tilex+level.tilesize/4, coord.tiley+level.tilesize/4, level.tilesize/2, level.tilesize/2);
        }
    }

    // Render the player bubble
    function renderPlayer() {
        var centerx = player.x + level.tilesize/2;
        var centery = player.y + level.tilesize/2;

        // Draw player background circle
        context.fillStyle = "#7a7a7a";
        context.beginPath();
        context.arc(centerx, centery, level.radius+12 * level.scale, 0, 2*Math.PI, false);
        context.fill();
        context.lineWidth = 2 * level.scale;
        context.strokeStyle = "#8c8c8c";
        context.stroke();

        // Draw the angle
        context.lineWidth = 2 * level.scale;
        context.strokeStyle = "#0000ff";
        context.beginPath();
        context.moveTo(centerx, centery);
        context.lineTo(centerx + 1.5*level.tilesize * Math.cos(player.angle), centery - 1.5*level.tilesize * Math.sin(player.angle));
        context.stroke();

        // Draw the next bubble
        drawBubble(player.nextbubble.x, player.nextbubble.y, player.nextbubble.tiletype);

        // Draw the bubble
        if (player.bubble.visible) {
            drawBubble(player.bubble.x, player.bubble.y, player.bubble.tiletype);
        }

    }

    // Get the tile coordinate
    function getTileCoordinate(column, row) {
        var tilex = level.x + column * level.tilesize;

        // X offset for odd or even rows
        if ((row + rowoffset) % 2) {
            tilex += level.tilesize/2;
        }

        var tiley = level.y + row * level.rowheight;
        return { tilex: tilex, tiley: tiley };
    }

    // Get the closest grid position
    function getGridPosition(x, y) {
        var gridy = Math.floor((y - level.y) / level.rowheight);

        // Check for offset
        var xoffset = 0;
        if ((gridy + rowoffset) % 2) {
            xoffset = level.tilesize / 2;
        }
        var gridx = Math.floor(((x - xoffset) - level.x) / level.tilesize);

        return { x: gridx, y: gridy };
    }


    // Draw the bubble
    function drawBubble(x, y, index) {
        if (index < 0 || index >= bubblecolors)
            return;

        // Draw the bubble sprite
        context.drawImage(bubbleimage, index * 40, 0, 40, 40, x, y, level.tilesize, level.tilesize);
    }

    // Start a new game
    function newGame() {
        // Reset score
        score = 0;

        turncounter = 0;
        rowoffset = 0;

        // Set the gamestate to ready
        setGameState(gamestates.ready);

        // Create the level
        createLevel();

        // Init the next bubble and set the current bubble
        nextBubble();
        nextBubble();
    }

    // Create a random level
    function createLevel() {
        // Create a level with random tiles
        for (var j=0; j<level.rows; j++) {
            var randomtile = randRange(0, bubblecolors-1);
            var count = 0;
            for (var i=0; i<level.columns; i++) {
                if (count >= 2) {
                    // Change the random tile
                    var newtile = randRange(0, bubblecolors-1);

                    // Make sure the new tile is different from the previous tile
                    if (newtile == randomtile) {
                        newtile = (newtile + 1) % bubblecolors;
                    }
                    randomtile = newtile;
                    count = 0;
                }
                count++;

                if (j < level.rows/2) {
                    level.tiles[i][j].type = randomtile;
                } else {
                    level.tiles[i][j].type = -1;
                }
            }
        }
    }

    // Create a random bubble for the player
    function nextBubble() {
        // Set the current bubble
        player.tiletype = player.nextbubble.tiletype;
        player.bubble.tiletype = player.nextbubble.tiletype;
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.visible = true;

        // Get a random type from the existing colors
        var nextcolor = getExistingColor();

        // Set the next bubble
        player.nextbubble.tiletype = nextcolor;
    }

    // Get a random existing color
    function getExistingColor() {
        existingcolors = findColors();

        var bubbletype = 0;
        if (existingcolors.length > 0) {
            bubbletype = existingcolors[randRange(0, existingcolors.length-1)];
        }

        return bubbletype;
    }

    // Get a random int between low and high, inclusive
    function randRange(low, high) {
        return Math.floor(low + Math.random()*(high-low+1));
    }

    // Shoot the bubble
    function shootBubble() {
        // Shoot the bubble in the direction of the mouse
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.angle = player.angle;
        player.bubble.tiletype = player.tiletype;

        // Set the gamestate
        setGameState(gamestates.shootbubble);
    }

    // On mouse movement
    function onMouseMove(e) {
        // Get the mouse position
        var pos = getMousePos(canvas, e);

        // Get the mouse angle
        var mouseangle = Math.atan2((player.y + level.tilesize / 2) - pos.y, pos.x - (player.x + level.tilesize / 2));

        // Restrict angle to 8, 172 degrees
        var lbound = 0.13962634015954636; // 8
        var ubound = 3.001966313430247; // 172

        // Set the player angle
        player.angle = [lbound, mouseangle - Math.PI * Math.floor(mouseangle / Math.PI), ubound].sort()[1];
    }

    // On mouse button click
    function onMouseDown(e) {
        // Get the mouse position
        var pos = getMousePos(canvas, e);

        if (gamestate == gamestates.ready) {
            shootBubble();
        } else if (gamestate == gamestates.gameover) {
            newGame();
        }
    }

    // On Touch Start
    function touchHandleStart(e) {
        e.preventDefault();
        var targetTouch = e.targetTouches[0];
        onMouseMove(targetTouch);
        if (0) {
            touch = {
                identifyer: targetTouch.identifyer,
                timeStamp: e.timeStamp
            };
            var d = {
                timeStamp: touch.timeStamp,
                touchPos: getMousePos(canvas, targetTouch)
            };
            var node = document.createElement("LI");
            var textnode =
                document.createTextNode(`touchHandleStart(${JSON.stringify(d)})`);
            node.appendChild(textnode);
            document.getElementById("main").appendChild(node)
        }
    }

    // On Touch Move
    function touchHandleMove(e) {
        e.preventDefault();
        var targetTouch = e.targetTouches[0];
        onMouseMove(targetTouch);
        if (0) {
            var d = {
                timeDelta: e.timeStamp - touch.timeStamp,
                touchPos: getMousePos(canvas, targetTouch)
            };
            var node = document.createElement("LI");
            var textnode =
                document.createTextNode(`touchHandleMove(${JSON.stringify(d)})`);
            node.appendChild(textnode);
            document.getElementById("main").appendChild(node)
        }
    }

    // On Touch End
    function touchHandleEnd(e) {
        e.preventDefault();
        if (gamestate == gamestates.ready) {
            shootBubble();
        } else if (gamestate == gamestates.gameover) {
            newGame();
        }
        if (0) {
            var targetTouch = e.targetTouches[0];
            var d = {
                timeDelta: e.timeStamp - touch.timeStamp
            };
            touch = {
                identifyer: undefined,
                timeStamp: undefined
            };
            var node = document.createElement("LI");
            var textnode =
                document.createTextNode(`touchHandleEnd(${JSON.stringify(d)})`);
            node.appendChild(textnode);
            document.getElementById("main").appendChild(node)
        }
    }

    // On Touch Cancel
    function touchHandleCancel(e) {
        e.preventDefault();
        if (0) {
            var targetTouch = e.targetTouches[0];
            var d = {
                timeDelta: e.timeStamp - touch.timeStamp
            };
            touch = {
                identifyer: undefined,
                timeStamp: undefined
            };
            var node = document.createElement("LI");
            var textnode =
                document.createTextNode(`touchHandleCancel(${JSON.stringify(d)})`);
            node.appendChild(textnode);
            document.getElementById("main").appendChild(node);
        }
    }

    // Get the mouse position
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width/level.dpr),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height/level.dpr)
        };
    }

    // Call init to start the game
    init();
};