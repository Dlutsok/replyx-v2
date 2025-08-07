// Скрипт для перезапуска Telegram-бота для конкретного пользователя
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const userId = process.argv[2]; // ID пользователя передается как аргумент
if (!userId) {
  console.error('Необходимо указать ID пользователя');
  process.exit(1);
}

const PG_CONNECTION_STRING = 'postgresql://dan@localhost:5432/chat_ai';
const pgPool = new Pool({ connectionString: PG_CONNECTION_STRING });

// Получить токен Telegram для пользователя
async function getTelegramToken(userId) {
  return new Promise((resolve, reject) => {
    pgPool.query(`SELECT users.id as user_id, users.email, telegram_tokens.token as telegram_token, 
                 openai_tokens.token as openai_token
                 FROM users
                 LEFT JOIN telegram_tokens ON telegram_tokens.user_id = users.id
                 LEFT JOIN openai_tokens ON openai_tokens.user_id = users.id
                 WHERE users.id = $1 AND telegram_tokens.token IS NOT NULL`, [userId], (err, res) => {
      if (err) return reject(err);
      if (res.rows.length === 0) return resolve(null);
      resolve(res.rows[0]);
    });
  });
}

// Создать файл-сигнал для перезапуска бота
async function createRestartSignal(user) {
  try {
    const signalDir = path.join(__dirname, 'signals');
    
    // Создаем директорию для сигналов, если её нет
    if (!fs.existsSync(signalDir)) {
      fs.mkdirSync(signalDir, { recursive: true });
    }
    
    // Создаем файл-сигнал для перезапуска бота
    const signalFile = path.join(signalDir, `telegram_restart_${user.user_id}.json`);
    const signalData = {
      user_id: user.user_id,
      email: user.email,
      telegram_token: user.telegram_token,
      openai_token: user.openai_token,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(signalFile, JSON.stringify(signalData, null, 2));
    console.log(`Создан сигнал для перезапуска Telegram-бота (${user.email}, ID: ${user.user_id})`);
    
    // Отправляем HTTP запрос для уведомления telegram_bot_manager
    try {
      await axios.post('http://localhost:8000/api/notify-telegram-bot-manager', { 
        user_id: user.user_id 
      });
      console.log(`HTTP-уведомление для перезапуска Telegram-бота отправлено`);
    } catch (e) {
      console.log(`Не удалось отправить HTTP-уведомление: ${e.message}`);
    }
  } catch (e) {
    console.error(`Ошибка при создании сигнала перезапуска: ${e.message}`);
  }
}

async function main() {
  try {
    const user = await getTelegramToken(userId);
    if (!user) {
      console.log(`Пользователь с ID ${userId} не найден или у него нет токена Telegram`);
      process.exit(0);
    }
    
    await createRestartSignal(user);
    
    // Завершаем работу скрипта
    process.exit(0);
  } catch (e) {
    console.error(`Ошибка при перезапуске Telegram-бота: ${e.message}`);
    process.exit(1);
  }
}

main();