import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApologyEmail({ to, html }) {
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: "i owe you an apology",
    html: `<div style="font-family: system-ui; line-height: 1.6;">${html.replace(/\n/g, "<br>")}</div>`
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
