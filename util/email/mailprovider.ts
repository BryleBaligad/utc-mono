export interface MailProvider {
    send(options: any): void
}

export class MailProviderError implements Error {
    name: string = "Mail Error"
    message: string

    constructor(type: "MissingBody" | "MissingOptions" | "Unauthenticated") {
        switch (type) {
            case "MissingBody":
                this.message = "Email body is missing from options"
                break

            case "MissingOptions":
                this.message = "Options are incomplete"
                break

            case "Unauthenticated":
                this.message = "Environment has no authentication token"
                break
        }
    }
}