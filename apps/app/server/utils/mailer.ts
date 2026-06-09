/**
 * Envoi d'e-mail côté serveur Nitro.
 * - Dev  : log dans la console (pas de vraie livraison).
 * - Prod : SMTP via nodemailer (SMTP_HOST/PORT/USER/PASS configurés dans .env).
 *
 * Le provider SMTP de prod n'est pas cablé ici (hors scope MVP technique).
 * Remplacer le bloc ELSE par le transport SMTP réel lors du déploiement.
 */
import nodemailer from 'nodemailer'

export async function sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void> {
  const config = useRuntimeConfig()

  if (config.smtpHost) {
    const transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort ?? 587),
      secure: Number(config.smtpPort ?? 587) === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })

    await transport.sendMail({
      from: config.mailFrom ?? 'no-reply@cv-optimizer.fr',
      to: email,
      subject: 'Votre lien de connexion — CV Optimizer',
      text: `Bonjour,\n\nCliquez sur ce lien pour vous connecter (valable 10 minutes) :\n${magicLinkUrl}\n\nSi vous n'avez pas demandé ce lien, ignorez cet e-mail.\n\n— L'équipe CV Optimizer`,
      html: `<p>Bonjour,</p><p>Cliquez sur ce lien pour vous connecter (valable 10 minutes) :</p><p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p><p>Si vous n'avez pas demandé ce lien, ignorez cet e-mail.</p><p>— L'équipe CV Optimizer</p>`,
    })
  } else {
    // Dev : affiche le lien dans la console pour test sans SMTP.
    console.log(`\n[DEV] Magic-link pour ${email}:\n  ${magicLinkUrl}\n`)
  }
}
