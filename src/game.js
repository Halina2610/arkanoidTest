const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: {
        preload,
        create,
        update,
    },
};

const game = new Phaser.Game(config);

let paddle, ball, bricks, cursors;
let score = 0;
let scoreText;
let highScore = 0; // Переменная для высокого счета
let highScoreText; // Текст для отображения высокого счета
let lives = 3; // Количество жизней
let livesText;
let level = 1; // Текущий уровень
let levelText;
let paddleSpeed = 300; // Начальная скорость платформы
let gameOverText;
let destroyedBricks = []; // Для хранения разрушенных блоков
let ballLaunched = false; // Флаг для проверки состояния шарика

function preload() {
    this.load.image('paddle', '/src/assets/player.png');
    this.load.image('ball', '/src/assets/birds.png');
    this.load.image('brick', '/src/assets/klipartz.png');
    this.load.image('background', '/src/assets/fon-dlia-urovnia.webp');
}

function create() {
    // Установка фонового изображения
    this.add.image(400, 300, 'background').setOrigin(0.5).setDepth(-1);

    paddle = this.physics.add.sprite(400, 550, 'paddle').setImmovable();
    paddle.body.collideWorldBounds = true;

    ball = this.physics.add.sprite(400, 500, 'ball');
    ball.setCollideWorldBounds(true);
    ball.setBounce(1);

    bricks = this.physics.add.staticGroup();
    createBricks.call(this);

    scoreText = this.add.text(16, 16, '', { fontSize: '20px', fill: '#fff' });
    highScoreText = this.add.text(16, 40, '', { fontSize: '20px', fill: '#ff0' });
    livesText = this.add.text(16, 64, '', { fontSize: '20px', fill: '#fff' });
    levelText = this.add.text(16, 88, '', { fontSize: '20px', fill: '#fff' });

    loadGameState.call(this);

    gameOverText = this.add.text(400, 300, '', {
        fontSize: '40px',
        fill: '#fff',
    }).setOrigin(0.5);
    gameOverText.setVisible(false);

    this.physics.world.on('worldbounds', (body, up, down) => {
        if (down) {
            loseLife.call(this);
        }
    });
    ball.body.setCollideWorldBounds(true);
    ball.body.onWorldBounds = true;

    this.physics.add.collider(ball, paddle, hitPaddle, null, this);
    this.physics.add.collider(ball, bricks, hitBrick, null, this);

    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', restartGame, this);
    this.input.keyboard.on('keydown-SPACE', launchBall, this); // Обработчик запуска шарика
}

function update() {
    if (cursors.left.isDown) {
        paddle.setVelocityX(-paddleSpeed);
    } else if (cursors.right.isDown) {
        paddle.setVelocityX(paddleSpeed);
    } else {
        paddle.setVelocityX(0);
    }

    // Если шарик еще не запущен, он следует за платформой
    if (!ballLaunched) {
        ball.x = paddle.x;
    }
}

function launchBall() {
    if (!ballLaunched) {
        ball.setVelocity(150, -150);
        ballLaunched = true;
    }
}

function hitPaddle(ball, paddle) {
    const diff = ball.x - paddle.x;
    ball.setVelocityX(10 * diff);
}

function hitBrick(ball, brick) {
    const brickIndex = `${Math.round((brick.x - 80) / 70)},${Math.round((brick.y - 50) / 35)}`;
    brick.destroy();
    score += 10;
    scoreText.setText('Score: ' + score);
    destroyedBricks = destroyedBricks.filter((b) => b !== brickIndex);

    if (score > highScore) {
        highScore = score;
        highScoreText.setText('High Score: ' + highScore);
        saveHighScore();
    }

    if (bricks.countActive() === 0) {
        nextLevel.call(this);
    }

    saveGameState();
}

function loseLife() {
    lives -= 1;
    livesText.setText('Lives: ' + lives);

    if (lives === 0) {
        saveGameState();
        endGame.call(this, 'Game Over! Press R to restart');
    } else {
        resetBallAndPaddle.call(this);
    }
}

function createBricks() {
    const rows = 5 + level - 1;
    const cols = 10;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const brick = bricks.create(80 + x * 70, 50 + y * 35, 'brick');
            if (destroyedBricks.includes(`${x},${y}`)) {
                brick.setVisible(false);
                brick.disableBody(true, true);
            } else {
                destroyedBricks.push(`${x},${y}`);
            }
        }
    }
}

function resetBallAndPaddle() {
    ballLaunched = false; // Сбрасываем флаг запуска
    ball.setPosition(paddle.x, 500); // Шарик на платформе
    ball.setVelocity(0);
    paddle.setPosition(400, 550);
}

function nextLevel() {
    level += 1;
    levelText.setText('Level: ' + level);

    lives = 3;
    livesText.setText('Lives: ' + lives);

    ball.setVelocity(ball.body.velocity.x * 1.2, ball.body.velocity.y * 1.2);
    paddleSpeed += 50;

    destroyedBricks = [];
    bricks.clear(true, true);
    createBricks.call(this);

    resetBallAndPaddle.call(this);

    if (level > 3) {
        endGame.call(this, 'You Win! Press R to restart');
    }

    saveGameState();
}

function endGame(message) {
    gameOverText.setText(message);
    gameOverText.setVisible(true);
    this.physics.pause();
    ball.setVelocity(0);
    paddle.setVelocity(0);
}

function restartGame() {
    localStorage.removeItem('arkanoidGameState');

    score = 0;
    lives = 3;
    level = 1;
    destroyedBricks = [];

    scoreText.setText('Score: ' + score);
    livesText.setText('Lives: ' + lives);
    levelText.setText('Level: ' + level);
    gameOverText.setVisible(false);
    highScoreText.setText('High Score: ' + highScore);

    bricks.clear(true, true);
    createBricks.call(this);

    resetBallAndPaddle.call(this);

    this.physics.resume();
}

function saveGameState() {
    const gameState = {
        score: score,
        lives: lives,
        level: level,
        destroyedBricks: destroyedBricks,
    };
    localStorage.setItem('arkanoidGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('arkanoidGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        score = gameState.score;
        lives = gameState.lives;
        level = gameState.level;
        destroyedBricks = gameState.destroyedBricks || [];

        scoreText.setText('Score: ' + score);
        livesText.setText('Lives: ' + lives);
        levelText.setText('Level: ' + level);
    }
}

function saveHighScore() {
    localStorage.setItem('arkanoidHighScore', highScore);
}

function loadHighScore() {
    const savedHighScore = localStorage.getItem('arkanoidHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore, 10);
        highScoreText.setText('High Score: ' + highScore);
    }
}

loadHighScore();
