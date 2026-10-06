export type AccountsPOSTRequest = {
    username: string,
    password: string,
    role?: string,
    activated?: string | boolean,
    name?: string,
    account_details?: {
        first_name: string,
        middle_name?: string,
        last_name: string,
        mobile_number: string,
        email_address?: string,
        note?: string,
        additional_fields?: string
    }
}