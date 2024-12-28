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
    this.load.image('paddle', '/assets/images/elements/player.png');
    this.load.image('ball', '/assets/images/balls/birds.png');
    this.load.image('brick', '/assets/images/elements/klipartz.png');
    this.load.image('background', '/assets/images/background/fon-dlia-urovnia.webp');
    this.load.image('background_level2', '/assets/images/background/fon-dlia-igry-15.webp');
    this.load.image('background_level3', '/assets/images/background/angry-birds-1-igra-4.webp');
    this.load.image('ball_level2', '/assets/images/balls/birds(1).png');
    this.load.image('ball_level3', '/assets/images/balls/birds(2).png');
}

function create() {
    // Установка фонового изображения
    this.add.image(400, 300, 'background').setOrigin(0.5).setDepth(-1);

    paddle = this.physics.add.sprite(400, 550, 'paddle').setImmovable().setDepth(1);
    paddle.body.collideWorldBounds = true;

    ball = this.physics.add.sprite(400, 522, 'ball');
    ball.setCollideWorldBounds(true);
    ball.setBounce(1).setDepth(1);

    bricks = this.physics.add.staticGroup();
    createBricks.call(this);

    // Пример добавления фона для текста
    const textPadding = 5;
    const textWidth = 400;
    const textHeight = 30;

    // Фон для счета
    const scoreBackground = this.add.rectangle(16 + textPadding, config.height - 120 + textPadding, textWidth, textHeight, 0x000000, 0.2);
    scoreText = this.add.text(16, config.height - 120, 'Score: 0', { fontSize: '20px', fontWeight: 'bold', fill: '#ffffff' }).setDepth(0);

    // Фон для высокого счета
    const highScoreBackground = this.add.rectangle(16 + textPadding, config.height - 90 + textPadding, textWidth, textHeight, 0x000000, 0.2);
    highScoreText = this.add.text(16, config.height - 90, 'High Score: 0', { fontSize: '20px', fontWeight: 'bold', fill: '#962e9d' }).setDepth(0);
    // Фон для жизней
    const livesBackground = this.add.rectangle(16 + textPadding, config.height - 60 + textPadding, textWidth, textHeight, 0x000000, 0.2);
    livesText = this.add.text(16, config.height - 60, 'Lives: 3', { fontSize: '20px', fontWeight: 'bold', fill: '#ffffff' }).setDepth(0);

    // Фон для уровня
    const levelBackground = this.add.rectangle(16 + textPadding, config.height - 30 + textPadding, textWidth, textHeight, 0x000000, 0.2);
    levelText = this.add.text(16, config.height - 30, 'Level: 1', { fontSize: '20px', fontWeight: 'bold', fill: 'rgb(255,255,255)' }).setDepth(0);

    loadGameState.call(this);

    gameOverText = this.add.text(config.width / 2, config.height / 1.5, '', {
        fontSize: '40px',
        fontWeight: 'bold',
        fill: '#ff002f',
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
    ball.setPosition(paddle.x, 522); // Шарик на платформе
    ball.setVelocity(0);
    paddle.setPosition(400, 550);
}

function endGame(message) {
    gameOverText.setText(message);
    gameOverText.setVisible(true);
    this.physics.pause();
}

function saveGameState() {
    const gameState = {
        score: score,
        highScore: highScore,
        level: level,
        lives: lives,
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGameState() {
    const gameState = JSON.parse(localStorage.getItem('gameState'));
    if (gameState) {
        score = gameState.score || 0;
        highScore = gameState.highScore || 0;
        level = gameState.level || 1;
        lives = gameState.lives || 3;

        scoreText.setText('Score: ' + score);
        highScoreText.setText('High Score: ' + highScore);
        livesText.setText('Lives: ' + lives);
        levelText.setText('Level: ' + level);
    } else {
        // Убедитесь, что значения инициализируются корректно при отсутствии данных
        highScore = 0;
        highScoreText.setText('High Score: ' + highScore);
    }
}


function saveHighScore() {
    localStorage.setItem('highScore', highScore);
}

function restartGame() {
    // Сброс игровых переменных
    score = 0;
    lives = 3;
    level = 1;
    paddleSpeed = 300; // Сброс скорости платформы
    scoreText.setText('Score: 0');
    highScoreText.setText('High Score: ' + highScore);
    livesText.setText('Lives: 3');
    levelText.setText('Level: 1');
    gameOverText.setVisible(false);

    // Сброс фона на начальный
    this.add.image(400, 300, 'background').setOrigin(0.5).setDepth(-1);

    // Сброс текстуры шарика на начальный
    ball.setTexture('ball');

    // Очистка разрушенных блоков и создание новых
    destroyedBricks = [];
    bricks.clear(true, true);
    createBricks.call(this);

    // Сброс платформы и шарика
    resetBallAndPaddle.call(this);

    // Возобновление физики
    this.physics.resume();

    // Сохранение состояния игры
    saveGameState();
}

function nextLevel() {
    // Эффект затемнения
    const fadeOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 1).setDepth(10); // Чёрный слой поверх
    fadeOverlay.alpha = 0; // Прозрачность слоя

    this.tweens.add({
        targets: fadeOverlay,
        alpha: 1, // Полностью затемняет
        duration: 1000, // Длительность эффекта
        onComplete: () => {
            // Переход на следующий уровень
            level += 1;
            if (level > 3) {
                endGame.call(this, 'You Win! Press R to restart');
                return;
            }
            setupNextLevel.call(this);

            // Эффект восстановления экрана
            this.tweens.add({
                targets: fadeOverlay,
                alpha: 0, // Снова прозрачный
                duration: 1000, // Длительность восстановления
                onComplete: () => fadeOverlay.destroy(), // Удалить слой после анимации
            });
        },
    });
}

function setupNextLevel() {
    levelText.setText('Level: ' + level);
    lives = 3;
    livesText.setText('Lives: ' + lives);

    // Очистка и создание кирпичей
    destroyedBricks = [];
    bricks.clear(true, true);
    createBricks.call(this);

    resetBallAndPaddle.call(this);

    // Изменение текстур в зависимости от уровня
    if (level === 2) {
        this.add.image(400, 300, 'background_level2').setOrigin(0.5).setDepth(-1);
        ball.setTexture('ball_level2');
    } else if (level === 3) {
        this.add.image(400, 300, 'background_level3').setOrigin(0.5).setDepth(-1);
        ball.setTexture('ball_level3');
    }

    saveGameState();
}
