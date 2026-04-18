const nodemailer = require("nodemailer");

async function sendBackupSubmissionEmail({ to, backupId }) {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true
  });

  const info = await transporter.sendMail({
    from: "no-reply@renewal-portal.local",
    to,
    subject: "Renewed backup submitted",
    text: `Your backup #${backupId} has been renewed and submitted by employee.`
  });

  return {
    accepted: info.accepted,
    messageId: info.messageId
  };
}

module.exports = {
  sendBackupSubmissionEmail
};
