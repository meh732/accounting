import express from 'express';
import dotenv from 'dotenv';
// Using fetch for bot APIs to avoid additional dependencies for now
dotenv.config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BALE_TOKEN = process.env.BALE_BOT_TOKEN;

// Dummy data to simulate responses
const generateReport = () => {
    return "📊 *گزارش مالی حسابداری مَه*\n\nموجودی صندوق: 25,000,000 ریال\nموجودی بانک: 140,000,000 ریال\n\nتعداد مشتریان بدهکار: 5\nتعداد چک‌های در جریان: 2";
};

const sendTelegramMessage = async (chatId, text, replyMarkup = null) => {
    if (!TELEGRAM_TOKEN) return;
    try {
        const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
        if (replyMarkup) body.reply_markup = replyMarkup;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) {
        console.error("Telegram Error:", e.message);
    }
};

const sendBaleMessage = async (chatId, text, replyMarkup = null) => {
    if (!BALE_TOKEN) return;
    try {
        const body = { chat_id: chatId, text };
        if (replyMarkup) body.reply_markup = replyMarkup; // Bale supports similar inline keyboards
        await fetch(`https://tapi.bale.ai/bot${BALE_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) {
        console.error("Bale Error:", e.message);
    }
};

const handleUpdate = (update, platform) => {
    const message = update.message;
    const callbackQuery = update.callback_query;

    if (message && message.text) {
        const chatId = message.chat.id;
        const text = message.text;

        if (text === '/start') {
            const replyMarkup = {
                inline_keyboard: [
                    [{ text: "📊 گزارش مانده حساب‌ها و بانک‌ها", callback_data: "report_balances" }],
                    [{ text: "🧾 ثبت فاکتور فروش / خرید", callback_data: "register_invoice" }],
                    [{ text: "💳 پرداخت فاکتور", callback_data: "pay_invoice" }]
                ]
            };
            const welcomeText = "به ربات دستیار حسابداری مَه خوش آمدید. \n\nلطفاً یکی از گزینه‌های زیر را از طریق دکمه‌های شیشه‌ای انتخاب کنید:";
            if (platform === 'telegram') sendTelegramMessage(chatId, welcomeText, replyMarkup);
            if (platform === 'bale') sendBaleMessage(chatId, welcomeText, replyMarkup);
        }
    } else if (callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        let responseText = "";
        if (data === "report_balances") {
            responseText = generateReport();
        } else if (data === "register_invoice") {
            responseText = "برای ثبت فاکتور از طریق ربات، ابتدا باید شماره مشتری و اقلام را وارد کنید.\n(این بخش نیازمند اتصال به دیتابیس مرکزی است)";
        } else if (data === "pay_invoice") {
            responseText = "لطفاً شماره فاکتور را برای پرداخت ارسال کنید.";
        }

        if (platform === 'telegram') sendTelegramMessage(chatId, responseText);
        if (platform === 'bale') sendBaleMessage(chatId, responseText);
    }
};

// Webhook endpoints
app.post('/webhook/telegram', (req, res) => {
    handleUpdate(req.body, 'telegram');
    res.sendStatus(200);
});

app.post('/webhook/bale', (req, res) => {
    handleUpdate(req.body, 'bale');
    res.sendStatus(200);
});

const PORT = process.env.BOT_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Bot Webhook Server running on port ${PORT}`);
    console.log(`Telegram Token: ${TELEGRAM_TOKEN ? 'Configured' : 'Not Configured'}`);
    console.log(`Bale Token: ${BALE_TOKEN ? 'Configured' : 'Not Configured'}`);
});
