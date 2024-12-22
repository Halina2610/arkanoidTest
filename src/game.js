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

function preload() {
    this.load.image('paddle', 'https://examples.phaser.io/assets/sprites/paddle.png');
    this.load.image('ball', 'https://examples.phaser.io/assets/sprites/ball.png');
    this.load.image('brick', 'https://examples.phaser.io/assets/sprites/brick.png');
}

function create() {
    // Платформа
    paddle = this.physics.add.sprite(400, 550, 'paddle').setImmovable();
    paddle.body.collideWorldBounds = true;

    // Мяч
    ball = this.physics.add.sprite(400, 500, 'ball');
    ball.setCollideWorldBounds(true);
    ball.setBounce(1);
    ball.setVelocity(150, -150);

    // Блоки
    bricks = this.physics.add.staticGroup();
    createBricks.call(this);

    // Счет
    scoreText = this.add.text(16, 16, '', { fontSize: '20px', fill: '#fff' });

    // Высокий счет
    highScoreText = this.add.text(16, 40, '', { fontSize: '20px', fill: '#ff0' });

    // Жизни
    livesText = this.add.text(16, 64, '', { fontSize: '20px', fill: '#fff' });

    // Уровень
    levelText = this.add.text(16, 88, '', { fontSize: '20px', fill: '#fff' });

    // Загрузка состояния игры
    loadGameState.call(this);

    // Текст окончания игры
    gameOverText = this.add.text(400, 300, '', {
        fontSize: '40px',
        fill: '#fff',
    }).setOrigin(0.5);
    gameOverText.setVisible(false);

    // Обработка границ мира
    this.physics.world.on('worldbounds', (body, up, down) => {
        if (down) {
            loseLife.call(this);
        }
    });
    ball.body.setCollideWorldBounds(true);
    ball.body.onWorldBounds = true;

    // Коллизии
    this.physics.add.collider(ball, paddle, hitPaddle, null, this);
    this.physics.add.collider(ball, bricks, hitBrick, null, this);

    // Ввод
    cursors = this.input.keyboard.createCursorKeys();

    // Перезапуск игры при нажатии клавиши 'R'
    this.input.keyboard.on('keydown-R', restartGame, this);
}

function update() {
    // Движение платформы
    if (cursors.left.isDown) {
        paddle.setVelocityX(-paddleSpeed);
    } else if (cursors.right.isDown) {
        paddle.setVelocityX(paddleSpeed);
    } else {
        paddle.setVelocityX(0);
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
    destroyedBricks = destroyedBricks.filter((b) => b !== brickIndex); // Убираем разрушенный блок

    // Проверка на новый высокий счёт
    if (score > highScore) {
        highScore = score;
        highScoreText.setText('High Score: ' + highScore);
        saveHighScore(); // Сохранение нового высокого счёта
    }

    // Переход на следующий уровень, если все блоки уничтожены
    if (bricks.countActive() === 0) {
        nextLevel.call(this);
    }

    // Сохранение состояния игры
    saveGameState();
}

function loseLife() {
    lives -= 1;
    livesText.setText('Lives: ' + lives);

    if (lives === 0) {
        // Сохранение текущего уровня перед окончанием игры
        saveGameState();
        endGame.call(this, 'Game Over! Press R to restart');
    } else {
        resetBallAndPaddle.call(this);
    }
}

function createBricks() {
    const rows = 5 + level - 1; // Количество строк увеличивается с каждым уровнем
    const cols = 10; // Количество колонок можно оставить постоянным

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const brick = bricks.create(80 + x * 70, 50 + y * 35, 'brick');
            // Проверка, был ли блок разрушен
            if (destroyedBricks.includes(`${x},${y}`)) {
                brick.setVisible(false); // Скрываем разрушенные блоки
                brick.disableBody(true, true); // Деактивируем тело, чтобы оно не взаимодействовало
            } else {
                destroyedBricks.push(`${x},${y}`); // Уникальный ключ для блока
            }
        }
    }
}

function resetBallAndPaddle() {
    ball.setPosition(400, 500);
    ball.setVelocity(150, -150);
    paddle.setPosition(400, 550);
}

function nextLevel() {
    level += 1;
    levelText.setText('Level: ' + level);

    // Сброс жизней до 3 для каждого нового уровня
    lives = 3;
    livesText.setText('Lives: ' + lives);

    // Увеличение скорости мяча
    ball.setVelocity(ball.body.velocity.x * 1.2, ball.body.velocity.y * 1.2);

    // Увеличение скорости платформы
    paddleSpeed += 50;

    // Создание новых блоков
    destroyedBricks = []; // Сбрасываем массив разрушенных блоков
    bricks.clear(true, true);
    createBricks.call(this);

    // Сброс мяча и платформы
    resetBallAndPaddle.call(this);

    // Проверка условия выигрыша
    if (level > 3) { // Количество уровней
        endGame.call(this, 'You Win! Press R to restart');
    }

    // Сохранение состояния игры
    saveGameState();
}

// Окончание игры
function endGame(message) {
    gameOverText.setText(message);
    gameOverText.setVisible(true);
    this.physics.pause();
    ball.setVelocity(0);
    paddle.setVelocity(0);
}

// Перезапуск игры
function restartGame() {
    // Удаление состояния игры из localStorage
    localStorage.removeItem('arkanoidGameState');

    // Сброс переменных
    score = 0;
    lives = 3;
    level = 1; // Начинаем с первого уровня
    destroyedBricks = []; // Сбрасываем массив разрушенных блоков

    // Сброс интерфейса
    scoreText.setText('Score: ' + score);
    livesText.setText('Lives: ' + lives);
    levelText.setText('Level: ' + level);
    gameOverText.setVisible(false);
    highScoreText.setText('High Score: ' + highScore); // Отображение высокого счета

    // Воссоздание блоков
    bricks.clear(true, true);
    createBricks.call(this);

    // Сброс мяча и платформы
    resetBallAndPaddle.call(this);

    // Возобновление физики
    this.physics.resume();
}

// Сохранение состояния игры
function saveGameState() {
    const gameState = {
        score: score,
        lives: lives,
        level: level,
        destroyedBricks: destroyedBricks, // Сохраняем разрушенные блоки
    };
    localStorage.setItem('arkanoidGameState', JSON.stringify(gameState));
}

// Загрузка состояния игры
function loadGameState() {
    const savedState = localStorage.getItem('arkanoidGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        score = gameState.score;
        lives = gameState.lives;
        level = gameState.level;
        destroyedBricks = gameState.destroyedBricks || []; // Загружаем разрушенные блоки

        // Обновление текстовых полей
        scoreText.setText('Score: ' + score);
        livesText.setText('Lives: ' + lives);
        levelText.setText('Level: ' + level);
    }
}

// Сохранение высокого счета
function saveHighScore() {
    localStorage.setItem('arkanoidHighScore', highScore);
}

// Загрузка высокого счета
function loadHighScore() {
    const savedHighScore = localStorage.getItem('arkanoidHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore, 10);
        highScoreText.setText('High Score: ' + highScore);
    }
}

// Загрузка высокого счета при старте игры
loadHighScore();