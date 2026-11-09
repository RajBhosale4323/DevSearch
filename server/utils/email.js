const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASSWORD
        }
    });
}

async function sendEmailAsync(to, subject, text) {
    if (!transporter) {
        console.warn('SMTP transporter not configured. Email not sent to:', to);
        return false;
    }

    try {
        await transporter.sendMail({
            from: MAIL_FROM,
            to,
            subject,
            text
        });
        console.log(`Email successfully sent to ${to}`);
        return true;
    } catch (err) {
        console.error(`Failed to send email to ${to}:`, err.message);
        return false;
    }
}

module.exports = {
    sendEmailAsync
};
