import emailjs from '@emailjs/browser';
import { emailConfig } from '../config/emailConfig'

const sendEmail = (templateId, templateParams, notificationType) => {
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID || emailConfig.serviceId;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || emailConfig.publicKey;

    emailjs.send(serviceId, templateId, templateParams, publicKey)
        .then((response) => {
            if (notificationType === 1) {
                alert("Successfully membership registered and details sent to your mail");
            } else if (notificationType === 2) {
                alert("Successfully Event registered and details sent to your mail");
            } else if (notificationType === 3) {
                alert("Successfully Payment confirmation details sent to user's mail");
            }
            // notificationType 0 or = silent success
        }, (error) => {
            console.error(error);
            if (notificationType === 0) alert("Failed to send email: " + (error.text || "Unknown error"));
        });
};

export const sendEmailForMemberRegistration = (params) => {
    const templateId = emailConfig.memberShipRegistrationTemplateId;
    sendEmail(templateId, params, 1);
};

export const sendEmailForEventRegistration = (params) => {
    const templateId = emailConfig.eventRegistrationTemplateId;
    sendEmail(templateId, params, 2);
};


export const sendEmailForMemberShipPaymentConfirmation = (params) => {
    const templateId = emailConfig.memberShipPaymentConfirmationTemplateId;
    sendEmail(templateId, params, 3);
};

export const sendEmailForEventPaymentConfirmation = (params) => {
    const templateId = emailConfig.eventPaymentConfirmationTemplateId;
    sendEmail(templateId, params, 3);
};

export const sendInvoice = (params) => {
    const templateId = emailConfig.invoiceTemplateId; // This might be missing in config but keeping for now
    sendEmail(templateId, params, 3);
};
