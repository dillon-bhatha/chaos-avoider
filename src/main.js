import Phaser from 'phaser';
import { W, H } from './constants.js';
import { Boot } from './scenes/Boot.js';
import { MainMenu } from './scenes/MainMenu.js';
import { SoloMenu } from './scenes/SoloMenu.js';
import { MultiMenu } from './scenes/MultiMenu.js';
import { OnlineMenu } from './scenes/OnlineMenu.js';
import { MusicMenu } from './scenes/MusicMenu.js';
import { Game } from './scenes/Game.js';
import { GameOver } from './scenes/GameOver.js';

new Phaser.Game({
  type: Phaser.CANVAS,
  width: W,
  height: H,
  resolution: 2,
  backgroundColor: '#0a0a1a',
  scene: [Boot, MainMenu, SoloMenu, MultiMenu, OnlineMenu, MusicMenu, Game, GameOver],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
    parent: 'game',
  },
});
