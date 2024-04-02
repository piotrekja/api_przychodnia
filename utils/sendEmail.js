require('dotenv').config();
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const emailCreateAccount = (temppass) => `<p>Dzień dobry,</p> </br>
Twoje konto w aplikacji ${process.env.COMPANY_NAME} zostało utworzone. Poniżej znajduje się hasło tymczasowe do tego konta, które należy użyć przy pierwszym logowaniu na stronie administracyjnej {${process.env.ADMIN_PAGE}.</br>
<p>Twoje hasło tymczasowe to:  <b>${temppass}</b> </p>
<p></p>

Pozdrawiamy
<h3 style="margin-top:-0px">Zespół ${process.env.COMPANY_NAME} </h3>
<img src="${process.env.COMPANY_LOGO_SRC}" alt="Orthosport logo" width="150"></br>
<p><i>Niniejszy email został wygenerowany automatycznie i prosimy na niego nie odpowiadać.</i></p>`

exports.createAccountEmail = async (res, email, temppass) => {
  const msg = {
    // to: 'a@a.a', // Change to your recipient
    from: { email: process.env.COMPANY_EMAIL, name: process.env.COMPANY_NAME },
    subject: 'Nowe konto w aplikacji',
    text: 'easy to do anywhere, with Node.js',
    html: emailCreateAccount(temppass),
    personalizations: [
      {
        "to": [
          { "email": email }
        ],
        "cc": [
          { "email": "recipient2@example.com" }
        ],
        // "bcc": [
        //   { "email": 'a@a.a' }
        // ]
      }
    ]
  }

  try {
    await sgMail.send(msg)
  } catch (e) {
    return { status: 'problem', msg: e }
  }
}