function drawTitleScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  text("My Game", width / 2, height / 2 - 60);
  drawButton(width / 2, height / 2, 200, 50, "Start");
}