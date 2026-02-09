import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: '127.0.0.1',
    port: 1025,
    secure: false, // true for 465, false for other ports
    auth: {
        user: '', // Mailpit doesn't need auth by default
        pass: ''
    }
});

export async function sendVerificationEmail(email: string, token: string, username: string) {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:2567'}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
        from: '"Asteroids MMO" <noreply@asteroids.ddev.site>',
        to: email,
        subject: 'Verify your pilot credentials',
        text: `Welcome, Commander ${username}!\n\nPlease verify your email by clicking the link: ${verificationUrl}`,
        html: `
            <div style="font-family: sans-serif; background: #0b0e14; color: #fff; padding: 40px; border-radius: 12px;">
                <h1 style="color: #4facfe;">Welcome, Commander ${username}!</h1>
                <p>Your registration for Asteroids MMO is almost complete.</p>
                <p>Click the button below to verify your neural link and activate your account:</p>
                <div style="margin: 30px 0;">
                    <a href="${verificationUrl}" style="background: #4facfe; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Neural Link</a>
                </div>
                <p style="font-size: 0.8rem; color: #666;">If the button doesn't work, copy and paste this link: <br> ${verificationUrl}</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Verification email sent to ${email}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[MAIL] Error sending email to ${email}:`, error);
        return false;
    }
}
