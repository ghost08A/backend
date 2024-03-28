const nodemailer = require("nodemailer");
const sendEmail = async (email, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "Teeraphat.j47@gmail.com",
        pass: "sysk bkdf bste tqta",
      },
    });
    await transporter.sendMail(
      {
        from: "Teeraphat.j47@gmail.com",
        to: email,
        subject: subject,
        html: htmlContent,
      },
      function (error, info) {
        if (error) {
          console.log(error);
        }
      }
    );
    console.log("email sent successfully");
  } catch (error) {
    console.log("email not sent");
    console.log(error);
  }
};
module.exports = sendEmail;
