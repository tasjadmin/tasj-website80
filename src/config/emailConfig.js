export const emailConfig = {
    serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID ?? 'service_w1wiz19',
    memberShipRegistrationTemplateId: process.env.REACT_APP_EMAILJS_REGISTRATION_TEMPLATE_ID ?? 'template_cq90oah',
    eventRegistrationTemplateId: process.env.REACT_APP_EMAILJS_REGISTRATION_TEMPLATE_ID ?? 'template_cq90oah',
    memberShipPaymentConfirmationTemplateId: process.env.REACT_APP_EMAILJS_PAYMENT_CONFIRMATION_TEMPLATE_ID ?? 'template_51k6e7b',
    eventPaymentConfirmationTemplateId: process.env.REACT_APP_EMAILJS_PAYMENT_CONFIRMATION_TEMPLATE_ID ?? 'template_51k6e7b',
    publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY ?? 'ntSYmLSb54n7CBnui'
}