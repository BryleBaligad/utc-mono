import { Brevo } from "./brevo"
import type { MailProvider } from "./mailprovider"

export async function sendActivationEmail(email: string, activationCode: string, provider: MailProvider) {
    let emailContent = (await Bun.file("./static/mail/activation.html").text())
        .replaceAll("%%activation_code%%", activationCode)
        .replaceAll("%%email%%", email)

    if (provider instanceof Brevo) {
        provider.send({
            subject: "Account Activation",
            sender: {
                email: "noreply@noreply.baligad.net",
                name: "noreply"
            },
            to: [{
                email,
                name: email
            }],
            htmlContent: emailContent
        })
    }
}