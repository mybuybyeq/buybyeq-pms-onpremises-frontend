import axios from "../api/axios";

export const sendEmail = async ({ reservationId, templateType }) => {
  try {
    const response = await axios.post("/email-templates/send-template-email", {
      template_type: templateType,
      reservation_id: reservationId,
    });
    return response.data;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};
