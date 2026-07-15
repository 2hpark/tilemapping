function drawScreenA() {
  background(20);

  // Everything inside push/pop is drawn in world coordinates
  push();
  translate(width / 2, height / 2);
  scale(camZoom); // translate to centre and scale the world translate
  translate(-width / 2, -height / 2); // then translate the world by camera top-left in world pixels
  translate(-camX, -camY);

  drawBackground();

  // if player is near y lvel of fish area
  if (player.y > TILE_SIZE * (tileData.mapHeight - tileData.mapHeight / 7)) {
    // add end of fish area boundary later
    drawTiles(fishArea); // fish area
    console.log("fish area drawn");
  }

  if (gameState === STATE_PLAY) {
    updateCamera();
    updateInvincibility();

    updateMoveSpeed();
    handleInput();
    applyBounce();

    // ADDED — tile physics: solid blockage, hazards, checkpoints
    resolveSolidCollisions();
    checkWhirlpools();
    checkCollectables();
    checkHazardCollisions();
    checkCheckpoints();
    checkObstaclePlayerCollision(); // was defined but never called
    checkWindTileContact();

    drawObstacles();
    drawTiles(tileData);

    drawPlayer();

    if (fishareaOverlay) {
      const fishAreaOffsetX = TILE_SIZE * (tileData.mapWidth - 33);
      const fishAreaOffsetY = TILE_SIZE * tileData.mapHeight;
      image(fishareaOverlay, fishAreaOffsetX, fishAreaOffsetY);
    }
  }

  pop(); // restore screen coordinates

  drawMinimap();

  if (gameState === STATE_WIND_END) {
    drawWindEndOverlay();
  }
}
function checkWindTileContact() {
  if (gameState !== STATE_PLAY) return;

  for (const t of windTiles) {
    const closestX = constrain(player.x, t.x, t.x + t.w);
    const closestY = constrain(player.y, t.y, t.y + t.h);
    const d = dist(player.x, player.y, closestX, closestY);

    if (d < player.r) {
      gameState = STATE_WIND_END;
      return;
    }
  }
}

function drawWindEndOverlay() {
  push();
  noStroke();
  fill(0, 0, 0, 190);
  rect(width / 2, height / 2, width, height);

  imageMode(CENTER);
  if (titleFrame1Img) {
    image(titleFrame1Img, width / 2, height / 2, width * 0.8, height * 0.8);
  } else {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(28);
    text("You reached the wind tiles", width / 2, height / 2);
  }
  pop();
}

// ------------------------------------------------------------
// updateCamera()
// Smoothly moves the camera toward the player each frame.
// Clamps so the camera never shows outside the world.
// ------------------------------------------------------------
function updateCamera() {
  let visibleW = width / camZoom;
  let visibleH = height / camZoom;

  let targetX = player.x - width / 2;
  let targetY = player.y - height / 2;

  targetX = constrain(targetX, 0, WORLD_W - width);
  targetY = constrain(targetY, 0, WORLD_H - height);

  camX = lerp(camX, targetX, CAM_SMOOTHING);
  camY = lerp(camY, targetY, CAM_SMOOTHING);
}

// ------------------------------------------------------------
// ADDED — updateInvincibility()
// Counts down the player's invincibility window after taking a
// hit (from spikes or obstacles) and clears the flag at zero.
// If you already decrement invincibleTimer somewhere else in your
// full project, remove this function to avoid double-counting.
// ------------------------------------------------------------
function updateInvincibility() {
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }
}

// ============================================================
// ADDED — TILE PHYSICS
// ============================================================

// ------------------------------------------------------------
// processJsonLayers()
// Helper function to extract and categorize tiles from a JSON
// file's layers. Can be called for tileData, fishArea, or any
// other future JSON files to build a unified collision system.
// Applies world offsets so fishArea tiles are positioned correctly.
// ------------------------------------------------------------
function processJsonLayers(
  jsonFile,
  checkpointTiles,
  coinTiles,
  offsetX = 0,
  offsetY = 0,
) {
  if (!jsonFile || !jsonFile.layers) return;

  for (const layer of jsonFile.layers) {
    const isWater = layer.name === "water";
    const isSolid = SOLID_LAYERS.includes(layer.name);
    const isHazard = HAZARD_LAYERS.includes(layer.name);
    const isCheckpoint = layer.name === CHECKPOINT_LAYER;
    const isCoin = layer.name === COLLECTABLE_LAYER;
    const isWhirlpool = layer.name === WHIRLPOOL_LAYER;
    const isWind = layer.name === "wind";

    if (
      !isSolid &&
      !isHazard &&
      !isCheckpoint &&
      !isCoin &&
      !isWhirlpool &&
      !isWater &&
      !isWind
    )
      continue;

    for (const t of layer.tiles) {
      const rect = {
        x: t.x * TILE_SIZE + offsetX,
        y: t.y * TILE_SIZE + offsetY,
        w: TILE_SIZE,
        h: TILE_SIZE,
        tx: t.x,
        ty: t.y,
      };
      if (isSolid) solidTiles.push(rect);
      else if (isHazard) hazardTiles.push(rect);
      else if (isCheckpoint) checkpointTiles.push(rect);
      else if (isCoin) coinTiles.push(rect);
      else if (isWhirlpool) whirlpoolTiles.push(rect);
      else if (isWind) windTiles.push(rect);
      else if (isWater) waterTiles.push(rect);
    }
  }
}