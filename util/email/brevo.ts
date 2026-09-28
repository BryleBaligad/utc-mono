import { MailProviderError, type MailProvider } from "./mailprovider"

type BrevoOptions = {
    subject: string
    sender: {
        name: string,
        email: string
    },
    to: Array<{
        name: string,
        email: string
    }>,
    htmlContent?: string
    textContent?: string
}

class Brevo implements MailProvider {
    async send(options: BrevoOptions): Promise<void | string | any> {
        if (!options.htmlContent && !options.textContent) {
            throw new MailProviderError("MissingBody")
        }

        if (!options.subject || !options.sender.email || !options.sender.name || options.to.length == 0) {
            throw new MailProviderError("MissingOptions")
        }

        if (!Bun.env.brevo) {
            throw new MailProviderError("Unauthenticated")
        }

        let reqBody = JSON.stringify(options)

        let reqHeaders = new Headers()
        reqHeaders.append("accept", "application/json")
        reqHeaders.append("content-type", "application/json")
        reqHeaders.append("api-key", Bun.env.brevo)

        let response = await fetch("https://api.brevo.com/v3/smtp/email", {
            headers: reqHeaders,
            body: reqBody,
            method: "POST"
        })

        return response
    }
}