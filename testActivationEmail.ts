import { Brevo } from "./util/email/brevo";
import { sendActivationEmail } from "./util/email/sendActivationEmail";

sendActivationEmail("brylebaligad@gmail.com", "ACTIVATION CODE", new Brevo()).then(() => {
    console.log("SENT")
});